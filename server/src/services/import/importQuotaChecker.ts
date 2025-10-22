import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { processResults } from "../../api/analytics/utils.js";
import { getOrganizationSubscriptionInfo } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";

export interface MonthlyQuotaInfo {
  month: string; // "202501" format
  used: number;
  limit: number;
  remaining: number;
}

export class ImportQuotaTracker {
  private monthlyUsage: Map<string, number>;
  private readonly monthlyLimit: number;
  private readonly historicalWindowMonths: number;
  private readonly oldestAllowedMonth: string;

  private constructor(
    monthlyUsage: Map<string, number>,
    monthlyLimit: number,
    historicalWindowMonths: number,
    oldestAllowedMonth: string
  ) {
    this.monthlyUsage = monthlyUsage;
    this.monthlyLimit = monthlyLimit;
    this.historicalWindowMonths = historicalWindowMonths;
    this.oldestAllowedMonth = oldestAllowedMonth;
  }

  static async create(organizationId: string): Promise<ImportQuotaTracker> {
    if (!IS_CLOUD) {
      return new ImportQuotaTracker(new Map(), Infinity, Infinity, "190001");
    }

    const subscriptionInfo = await getOrganizationSubscriptionInfo(organizationId);
    if (!subscriptionInfo) {
      throw new Error(`No subscription found for organization ${organizationId}`);
    }

    const monthlyLimit = subscriptionInfo.eventLimit;
    const historicalWindowMonths = subscriptionInfo.tierInfo.monthsAllowed;

    const oldestAllowedDate = DateTime.now().minus({ months: historicalWindowMonths }).startOf("month");
    const oldestAllowedMonth = oldestAllowedDate.toFormat("yyyyMM");

    const siteRecords = await db
      .select({ siteId: sites.siteId })
      .from(sites)
      .where(eq(sites.organizationId, organizationId));

    const siteIds = siteRecords.map(s => s.siteId);

    if (siteIds.length === 0) {
      return new ImportQuotaTracker(new Map(), monthlyLimit, historicalWindowMonths, oldestAllowedMonth);
    }

    const monthlyUsage = await ImportQuotaTracker.queryMonthlyUsage(siteIds, oldestAllowedDate.toFormat("yyyy-MM-dd"));

    return new ImportQuotaTracker(monthlyUsage, monthlyLimit, historicalWindowMonths, oldestAllowedMonth);
  }

  private static async queryMonthlyUsage(siteIds: number[], startDate: string): Promise<Map<string, number>> {
    const monthlyUsage = new Map<string, number>();

    if (siteIds.length === 0) {
      return monthlyUsage;
    }

    const grandfatheredSites = siteIds.filter(id => id < 2000);
    const newSites = siteIds.filter(id => id >= 2000);

    try {
      // Query grandfathered sites (pageviews only)
      if (grandfatheredSites.length > 0) {
        const grandfatheredResult = await clickhouse.query({
          query: `
            SELECT
              toYYYYMM(timestamp) as month,
              COUNT(*) as count
            FROM events
            WHERE site_id IN (${grandfatheredSites.join(",")})
              AND type = 'pageview'
              AND timestamp >= toDate('${startDate}')
            GROUP BY month
            ORDER BY month
          `,
          format: "JSONEachRow",
        });

        const rows = await processResults<{ month: string; count: string }>(grandfatheredResult);
        for (const row of rows) {
          const existing = monthlyUsage.get(row.month) || 0;
          monthlyUsage.set(row.month, existing + parseInt(row.count, 10));
        }
      }

      // Query new sites (all event types)
      if (newSites.length > 0) {
        const newSitesResult = await clickhouse.query({
          query: `
            SELECT
              toYYYYMM(timestamp) as month,
              COUNT(*) as count
            FROM events
            WHERE site_id IN (${newSites.join(",")})
              AND type IN ('pageview', 'custom_event', 'performance')
              AND timestamp >= toDate('${startDate}')
            GROUP BY month
            ORDER BY month
          `,
          format: "JSONEachRow",
        });

        const rows = await processResults<{ month: string; count: string }>(newSitesResult);
        for (const row of rows) {
          const existing = monthlyUsage.get(row.month) || 0;
          monthlyUsage.set(row.month, existing + parseInt(row.count, 10));
        }
      }

      return monthlyUsage;
    } catch (error) {
      console.error(`Error querying ClickHouse for monthly usage:`, error);
      return new Map();
    }
  }

  canImportEvent(timestamp: string): boolean {
    if (this.monthlyLimit === Infinity) {
      return true;
    }

    const dt = DateTime.fromFormat(timestamp, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });
    if (!dt.isValid) {
      console.warn(`Invalid timestamp format: ${timestamp}`);
      return false;
    }

    const month = dt.toFormat("yyyyMM");

    if (month < this.oldestAllowedMonth) {
      return false;
    }

    const used = this.monthlyUsage.get(month) || 0;
    if (used >= this.monthlyLimit) {
      return false;
    }

    this.monthlyUsage.set(month, used + 1);
    return true;
  }

  getMonthQuota(month: string): MonthlyQuotaInfo {
    const used = this.monthlyUsage.get(month) || 0;
    return {
      month,
      used,
      limit: this.monthlyLimit,
      remaining: Math.max(0, this.monthlyLimit - used),
    };
  }

  getAllMonthQuotas(): MonthlyQuotaInfo[] {
    const quotas: MonthlyQuotaInfo[] = [];

    if (this.monthlyLimit === Infinity) {
      return quotas;
    }

    const now = DateTime.now();
    for (let i = 0; i < this.historicalWindowMonths; i++) {
      const monthDate = now.minus({ months: i }).startOf("month");
      const month = monthDate.toFormat("yyyyMM");
      quotas.push(this.getMonthQuota(month));
    }

    return quotas.reverse();
  }

  getSummary(): {
    totalMonthsInWindow: number;
    monthsAtCapacity: number;
    monthsWithSpace: number;
    oldestAllowedMonth: string;
  } {
    if (this.monthlyLimit === Infinity) {
      return {
        totalMonthsInWindow: this.historicalWindowMonths,
        monthsAtCapacity: 0,
        monthsWithSpace: this.historicalWindowMonths,
        oldestAllowedMonth: this.oldestAllowedMonth,
      };
    }

    const quotas = this.getAllMonthQuotas();
    const monthsAtCapacity = quotas.filter(q => q.remaining === 0).length;

    return {
      totalMonthsInWindow: this.historicalWindowMonths,
      monthsAtCapacity,
      monthsWithSpace: quotas.length - monthsAtCapacity,
      oldestAllowedMonth: this.oldestAllowedMonth,
    };
  }
}

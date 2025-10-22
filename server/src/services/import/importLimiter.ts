import { IS_CLOUD } from "../../lib/const.js";
import { db } from "../../db/postgres/postgres.js";
import { and, count, eq, inArray } from "drizzle-orm";
import { importStatus, sites } from "../../db/postgres/schema.js";
import { ImportQuotaTracker } from "./importQuotaChecker.js";

export class ImportLimiter {
  private static readonly CONCURRENT_IMPORT_LIMIT = 1;

  static async checkConcurrentImportLimit(siteId: number): Promise<
    | {
        allowed: false;
        reason: string;
      }
    | {
        allowed: true;
        organizationId: string;
      }
  > {
    const [siteResult] = await db
      .select({ organizationId: sites.organizationId })
      .from(sites)
      .where(eq(sites.siteId, siteId))
      .limit(1);

    if (!siteResult) {
      return { allowed: false, reason: "Site not found." };
    }

    if (!IS_CLOUD) {
      return { allowed: true, organizationId: siteResult.organizationId };
    }

    const [concurrentImportResult] = await db
      .select({ count: count() })
      .from(importStatus)
      .where(
        and(
          eq(importStatus.organizationId, siteResult.organizationId),
          inArray(importStatus.status, ["pending", "processing"])
        )
      );

    if (concurrentImportResult.count >= this.CONCURRENT_IMPORT_LIMIT) {
      return {
        allowed: false,
        reason: `Only ${this.CONCURRENT_IMPORT_LIMIT} concurrent import allowed per organization.`,
      };
    }

    return { allowed: true, organizationId: siteResult.organizationId };
  }

  static async createQuotaTracker(organizationId: string): Promise<ImportQuotaTracker> {
    return ImportQuotaTracker.create(organizationId);
  }
}

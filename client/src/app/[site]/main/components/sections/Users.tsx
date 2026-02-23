"use client";

import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { useGetOverview } from "../../../../../api/analytics/hooks/useGetOverview";
import { useGetOverviewBucketed } from "../../../../../api/analytics/hooks/useGetOverviewBucketed";
import { useStore } from "../../../../../lib/store";
import NumberFlow from "@number-flow/react";
import { SparklinesChart } from "../MainSection/SparklinesChart";
import { useState } from "react";

export function Users() {
  const { site, bucket } = useStore();
  const [isHovering, setIsHovering] = useState(false);

  const { data: overviewData, isLoading: isOverviewLoading } = useGetOverview({
    site,
  });

  const { data: bucketedData, isLoading: isBucketedLoading } = useGetOverviewBucketed({
    site,
    bucket,
  });

  const totalUsers = overviewData?.data?.users ?? 0;
  const sparklinesData = bucketedData?.data?.map((d: any) => ({
    value: d.users,
    time: d.time,
  })) ?? [];

  return (
    <Card className="h-[483px]">
      {(isOverviewLoading || isBucketedLoading) && <CardLoader />}
      <CardContent className="mt-2 h-full flex flex-col">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
          <div>Unique Users</div>
          <div>Total</div>
        </div>
        <div 
          className="flex flex-col items-center justify-center flex-grow"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="text-sm font-medium text-muted-foreground mb-1">Total Unique Users</div>
          <div className="text-4xl font-medium mb-8">
            <NumberFlow respectMotionPreference={false} value={totalUsers} format={{ notation: "compact" }} />
          </div>
          <div className="w-full h-[100px] mt-4 px-4">
            <SparklinesChart data={sparklinesData} isHovering={isHovering} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

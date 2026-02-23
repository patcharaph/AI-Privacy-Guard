"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminCostSummary,
  getAdminDailyRange,
  getAdminErrorLogs,
  getAdminFeedbackSummary,
  getAdminOverview,
  getAdminProcessingLogs,
  getAdminQuotaSummary,
} from "@/lib/api";
import {
  AdminErrorBox,
  AdminErrorTable,
  AdminHeader,
  AdminKpiCards,
  AdminProcessingTable,
  AdminSignals,
  AdminTrends,
} from "@/components/admin";

type RangeOption = 7 | 30 | 90;

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<RangeOption>(30);
  const [processingOffset, setProcessingOffset] = useState(0);
  const processingLimit = 20;

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverview,
    refetchInterval: 60_000,
  });

  const dailyRangeQuery = useQuery({
    queryKey: ["admin", "daily-range", days],
    queryFn: () => getAdminDailyRange(days),
  });

  const costQuery = useQuery({
    queryKey: ["admin", "cost-summary", days],
    queryFn: () => getAdminCostSummary(days),
  });

  const errorLogsQuery = useQuery({
    queryKey: ["admin", "errors", 50],
    queryFn: () => getAdminErrorLogs(50),
    refetchInterval: 60_000,
  });

  const processingLogsQuery = useQuery({
    queryKey: ["admin", "processing", processingLimit, processingOffset],
    queryFn: () => getAdminProcessingLogs(processingLimit, processingOffset),
  });

  const feedbackQuery = useQuery({
    queryKey: ["admin", "feedback-summary"],
    queryFn: getAdminFeedbackSummary,
  });

  const quotaQuery = useQuery({
    queryKey: ["admin", "quota-summary"],
    queryFn: getAdminQuotaSummary,
  });

  const dailyTrendRows = useMemo(() => {
    const rows = dailyRangeQuery.data?.summaries ?? [];
    return [...rows].sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyRangeQuery.data?.summaries]);

  const maxRequests = useMemo(() => {
    if (dailyTrendRows.length === 0) {
      return 1;
    }
    return Math.max(...dailyTrendRows.map((row) => row.total_requests), 1);
  }, [dailyTrendRows]);

  const maxCost = useMemo(() => {
    const rows = costQuery.data?.daily_breakdown ?? [];
    if (rows.length === 0) {
      return 1;
    }
    return Math.max(...rows.map((row) => row.cost_usd), 1);
  }, [costQuery.data?.daily_breakdown]);

  const lastUpdated = useMemo(() => {
    const times = [
      overviewQuery.dataUpdatedAt,
      dailyRangeQuery.dataUpdatedAt,
      errorLogsQuery.dataUpdatedAt,
      processingLogsQuery.dataUpdatedAt,
      costQuery.dataUpdatedAt,
      feedbackQuery.dataUpdatedAt,
      quotaQuery.dataUpdatedAt,
    ].filter((value) => value > 0);
    if (times.length === 0) {
      return "Not updated yet";
    }
    return new Date(Math.max(...times)).toLocaleString();
  }, [
    costQuery.dataUpdatedAt,
    dailyRangeQuery.dataUpdatedAt,
    errorLogsQuery.dataUpdatedAt,
    feedbackQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    processingLogsQuery.dataUpdatedAt,
    quotaQuery.dataUpdatedAt,
  ]);

  const isRefreshing = queryClient.isFetching({ queryKey: ["admin"] }) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <AdminHeader
          days={days}
          onRangeChange={(option) => {
            setDays(option);
            setProcessingOffset(0);
          }}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
        />

        {overviewQuery.isError && <AdminErrorBox message={overviewQuery.error.message} />}

        <AdminKpiCards overview={overviewQuery.data} />

        <AdminTrends
          days={days}
          dailyRows={dailyTrendRows}
          maxRequests={maxRequests}
          dailyError={dailyRangeQuery.isError ? dailyRangeQuery.error.message : undefined}
          costSummary={costQuery.data}
          maxCost={maxCost}
          costError={costQuery.isError ? costQuery.error.message : undefined}
        />

        <AdminSignals
          feedback={feedbackQuery.data}
          quota={quotaQuery.data}
          feedbackError={feedbackQuery.isError ? feedbackQuery.error.message : undefined}
          quotaError={quotaQuery.isError ? quotaQuery.error.message : undefined}
        />

        <AdminProcessingTable
          data={processingLogsQuery.data}
          error={processingLogsQuery.isError ? processingLogsQuery.error.message : undefined}
          processingOffset={processingOffset}
          processingLimit={processingLimit}
          onPrev={() => setProcessingOffset((prev) => Math.max(0, prev - processingLimit))}
          onNext={() => {
            const count = processingLogsQuery.data?.count ?? 0;
            if (count >= processingLimit) {
              setProcessingOffset((prev) => prev + processingLimit);
            }
          }}
        />

        <AdminErrorTable
          data={errorLogsQuery.data}
          error={errorLogsQuery.isError ? errorLogsQuery.error.message : undefined}
        />
      </main>
    </div>
  );
}

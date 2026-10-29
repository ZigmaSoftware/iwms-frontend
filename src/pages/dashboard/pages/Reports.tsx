import { lazy, Suspense, useState } from "react";
import { BarChart3, CalendarDays, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DailyWasteComparisonList = lazy(
  () =>
    import(
      "@/pages/admin/modules/reports/wasteReports/dailyWasteComparison/dailyWasteComparisonList"
    ),
);
const MonthlyWasteComparisonListPage = lazy(
  () =>
    import(
      "@/pages/admin/modules/reports/wasteReports/monthlyWasteComparison/MonthlyWasteComparisonListPage"
    ),
);

type WasteReportTab = "daily" | "monthly";

export default function Reports() {
  const [activeReport, setActiveReport] = useState<WasteReportTab>("daily");

  return (
    <div className="pb-4">
      {/* the Daily / Monthly switch lives in the header card (no separate tab row) */}
      <Tabs
        value={activeReport}
        onValueChange={(value) => setActiveReport(value as WasteReportTab)}
        className="mx-auto w-full max-w-[1920px] space-y-4 px-3 pt-4 sm:px-5"
      >
        <Card className="overflow-hidden border-emerald-100 bg-white shadow-sm dark:border-white/10 dark:bg-(--admin-surfaceAlt)">
          <CardContent className="relative px-5 py-4">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl dark:bg-emerald-400/10" />
            <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-semibold">Waste Insights Hub</span>
                </div>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Daily & Monthly Waste Comparisons</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Live collection weight, trips, coverage, and waste composition restricted to your assigned hierarchy.
                </p>
              </div>
              <TabsList className="h-auto gap-1 rounded-xl border bg-slate-50 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                <TabsTrigger
                  value="daily"
                  className="gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-emerald-400 dark:data-[state=active]:text-emerald-950"
                >
                  <CalendarDays className="h-4 w-4" />
                  Daily
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-emerald-400 dark:data-[state=active]:text-emerald-950"
                >
                  <BarChart3 className="h-4 w-4" />
                  Monthly
                </TabsTrigger>
              </TabsList>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="daily" className="mt-0">
          <Suspense fallback={<ReportPanelFallback />}>
            <DailyWasteComparisonList embedded />
          </Suspense>
        </TabsContent>
        <TabsContent value="monthly" className="mt-0">
          <Suspense fallback={<ReportPanelFallback />}>
            <MonthlyWasteComparisonListPage embedded />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportPanelFallback() {
  return (
    <div className="min-h-[420px] animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-(--admin-surfaceAlt)">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="mt-4 h-4 max-w-xl rounded bg-slate-100" />
      <div className="mt-8 h-48 rounded-xl bg-slate-100" />
    </div>
  );
}

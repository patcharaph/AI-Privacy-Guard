import { AdminCostSummary, AdminDailySummary } from "@/lib/api";
import { AdminErrorBox } from "./AdminErrorBox";
import { AdminPanel } from "./AdminPanel";
import { formatCurrency } from "./helpers";

export function AdminTrends({
  days,
  dailyRows,
  maxRequests,
  dailyError,
  costSummary,
  maxCost,
  costError,
}: {
  days: number;
  dailyRows: AdminDailySummary[];
  maxRequests: number;
  dailyError?: string;
  costSummary?: AdminCostSummary;
  maxCost: number;
  costError?: string;
}) {
  return (
    <section className="grid lg:grid-cols-2 gap-6">
      <AdminPanel title={`Daily Activity (${days} days)`}>
        {dailyError && <AdminErrorBox message={dailyError} />}
        <div className="space-y-3">
          {dailyRows.slice(-10).map((row) => (
            <div key={row.date} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{row.date}</span>
                <span className="text-slate-600">
                  {row.total_requests} req, {row.total_errors} err
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-primary-500"
                  style={{ width: `${(row.total_requests / maxRequests) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {dailyRows.length === 0 && (
            <p className="text-sm text-slate-500">No daily activity found.</p>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title={`Daily Cost (${days} days)`}>
        {costError && <AdminErrorBox message={costError} />}
        <div className="space-y-3">
          {(costSummary?.daily_breakdown ?? []).slice(-10).map((row) => (
            <div key={row.date} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{row.date}</span>
                <span className="text-slate-600">{formatCurrency(row.cost_usd)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-emerald-500"
                  style={{ width: `${(row.cost_usd / maxCost) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {!costSummary?.daily_breakdown.length && (
            <p className="text-sm text-slate-500">No cost data found.</p>
          )}
        </div>
      </AdminPanel>
    </section>
  );
}

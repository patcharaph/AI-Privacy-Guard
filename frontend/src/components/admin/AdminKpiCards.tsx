import { AdminOverview } from "@/lib/api";
import { compactNumber, formatCurrency } from "./helpers";

export function AdminKpiCards({ overview }: { overview?: AdminOverview }) {
  return (
    <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Total Requests</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {compactNumber(overview?.processing.total_requests ?? 0)}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Requests Today</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {compactNumber(overview?.processing.requests_today ?? 0)}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Avg Processing Time</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {overview?.processing.avg_processing_time_ms ?? 0} ms
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Total Detections</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {compactNumber(overview?.processing.total_detections ?? 0)}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Errors Today</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {compactNumber(overview?.errors.errors_today ?? 0)}
        </p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Estimated Cost Today</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {formatCurrency(overview?.cost.today_estimated_usd ?? 0)}
        </p>
      </div>
    </section>
  );
}

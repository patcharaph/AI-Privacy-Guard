import { AdminOverview } from "@/lib/api";
import { compactNumber, formatCurrency } from "./helpers";

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "bg-primary-50 border-primary-200"
          : "bg-white border-slate-200"
      }`}
    >
      <p className={`text-sm ${accent ? "text-primary-600" : "text-slate-500"}`}>{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent ? "text-primary-900" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

export function AdminKpiCards({ overview }: { overview?: AdminOverview }) {
  const last24h = overview?.last_24h;

  return (
    <div className="space-y-4">
      {/* All-time & Today */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Requests" value={compactNumber(overview?.processing.total_requests ?? 0)} />
        <KpiCard label="Requests Today" value={compactNumber(overview?.processing.requests_today ?? 0)} />
        <KpiCard label="Avg Processing Time" value={`${overview?.processing.avg_processing_time_ms ?? 0} ms`} />
        <KpiCard label="Total Detections" value={compactNumber(overview?.processing.total_detections ?? 0)} />
        <KpiCard label="Errors Today" value={compactNumber(overview?.errors.errors_today ?? 0)} />
        <KpiCard label="Estimated Cost Today" value={formatCurrency(overview?.cost.today_estimated_usd ?? 0)} />
      </section>

      {/* Last 24 Hours */}
      <section>
        <h3 className="text-sm font-medium text-primary-700 mb-2">Last 24 Hours</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard accent label="Requests (24h)" value={compactNumber(last24h?.requests ?? 0)} />
          <KpiCard accent label="Images Processed (24h)" value={compactNumber(last24h?.images_processed ?? 0)} />
          <KpiCard accent label="Detections (24h)" value={compactNumber(last24h?.detections ?? 0)} />
          <KpiCard accent label="Avg Time (24h)" value={`${last24h?.avg_processing_time_ms ?? 0} ms`} />
          <KpiCard accent label="Errors (24h)" value={compactNumber(last24h?.errors ?? 0)} />
          <KpiCard accent label="Cost (24h)" value={formatCurrency(last24h?.estimated_cost_usd ?? 0)} />
        </div>
      </section>
    </div>
  );
}

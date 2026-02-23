import { AdminProcessingLogsResponse } from "@/lib/api";
import { AdminErrorBox } from "./AdminErrorBox";
import { AdminPanel } from "./AdminPanel";
import { formatCurrency, formatDateTime, toNumber } from "./helpers";

export function AdminProcessingTable({
  data,
  error,
  processingOffset,
  processingLimit,
  onPrev,
  onNext,
}: {
  data?: AdminProcessingLogsResponse;
  error?: string;
  processingOffset: number;
  processingLimit: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <AdminPanel title="Recent Processing Requests">
      {error && <AdminErrorBox message={error} />}
      <div className="overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Time</th>
              <th className="text-left px-3 py-2 font-medium">Request ID</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Images</th>
              <th className="text-left px-3 py-2 font-medium">Detections</th>
              <th className="text-left px-3 py-2 font-medium">Mode</th>
              <th className="text-left px-3 py-2 font-medium">Duration</th>
              <th className="text-left px-3 py-2 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs ?? []).map((row) => (
              <tr key={`${row.request_id}-${row.timestamp}`} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-700">{formatDateTime(row.timestamp)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.request_id}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${row.status === "success" ? "badge-success" : "badge-warning"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">{toNumber(row.image_count)}</td>
                <td className="px-3 py-2 text-slate-700">{toNumber(row.total_detections)}</td>
                <td className="px-3 py-2 text-slate-700">{row.blur_mode}</td>
                <td className="px-3 py-2 text-slate-700">{toNumber(row.processing_time_ms)} ms</td>
                <td className="px-3 py-2 text-slate-700">
                  {formatCurrency(toNumber(row.estimated_cost_usd))}
                </td>
              </tr>
            ))}
            {!(data?.logs.length ?? 0) && (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={8}>
                  No processing logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={onPrev}
          disabled={processingOffset === 0}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50"
        >
          Previous
        </button>
        <p className="text-sm text-slate-600">
          Showing {processingOffset + 1}-{processingOffset + (data?.count ?? 0)}
        </p>
        <button
          onClick={onNext}
          disabled={(data?.count ?? 0) < processingLimit}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </AdminPanel>
  );
}

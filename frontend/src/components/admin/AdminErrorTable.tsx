import { AdminErrorLogsResponse } from "@/lib/api";
import { AdminErrorBox } from "./AdminErrorBox";
import { AdminPanel } from "./AdminPanel";
import { formatDateTime } from "./helpers";

export function AdminErrorTable({
  data,
  error,
}: {
  data?: AdminErrorLogsResponse;
  error?: string;
}) {
  return (
    <AdminPanel title="Recent Errors">
      {error && <AdminErrorBox message={error} />}
      <div className="overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Time</th>
              <th className="text-left px-3 py-2 font-medium">Request ID</th>
              <th className="text-left px-3 py-2 font-medium">Endpoint</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs ?? []).map((row) => (
              <tr key={`${row.request_id}-${row.timestamp}`} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-700">{formatDateTime(row.timestamp)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.request_id}</td>
                <td className="px-3 py-2 text-slate-700">{row.endpoint}</td>
                <td className="px-3 py-2 text-slate-700">{row.error_type}</td>
                <td className="px-3 py-2 text-slate-700">{row.status_code}</td>
                <td className="px-3 py-2 text-slate-700">{row.error_message}</td>
              </tr>
            ))}
            {!(data?.logs.length ?? 0) && (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={6}>
                  No error logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}

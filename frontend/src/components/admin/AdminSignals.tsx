import { AdminFeedbackSummary, AdminQuotaSummary } from "@/lib/api";
import { AdminErrorBox } from "./AdminErrorBox";
import { AdminPanel } from "./AdminPanel";
import { formatDateTime } from "./helpers";

export function AdminSignals({
  feedback,
  quota,
  feedbackError,
  quotaError,
}: {
  feedback?: AdminFeedbackSummary;
  quota?: AdminQuotaSummary;
  feedbackError?: string;
  quotaError?: string;
}) {
  return (
    <section className="grid lg:grid-cols-2 gap-6">
      <AdminPanel title="Feedback Summary">
        {feedbackError && <AdminErrorBox message={feedbackError} />}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-semibold text-slate-900">{feedback?.total_feedback ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Face</p>
            <p className="text-lg font-semibold text-slate-900">{feedback?.by_type.face ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">License Plate</p>
            <p className="text-lg font-semibold text-slate-900">
              {feedback?.by_type.license_plate ?? 0}
            </p>
          </div>
        </div>
        <div className="max-h-52 overflow-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Time</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Comment</th>
              </tr>
            </thead>
            <tbody>
              {(feedback?.recent_feedback ?? []).slice(0, 10).map((row, idx) => (
                <tr key={`${row.id ?? "feedback"}-${idx}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(row.timestamp ?? "")}</td>
                  <td className="px-3 py-2 text-slate-700">{row.missed_type ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{row.comment || "-"}</td>
                </tr>
              ))}
              {!(feedback?.recent_feedback.length ?? 0) && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={3}>
                    No feedback yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel title="Quota Requests">
        {quotaError && <AdminErrorBox message={quotaError} />}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-semibold text-slate-900">{quota?.total_requests ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Unique Emails</p>
            <p className="text-lg font-semibold text-slate-900">{quota?.unique_emails ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Unique IPs</p>
            <p className="text-lg font-semibold text-slate-900">{quota?.unique_ips ?? 0}</p>
          </div>
        </div>
        <div className="max-h-52 overflow-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Time</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">Use Case</th>
              </tr>
            </thead>
            <tbody>
              {(quota?.recent_requests ?? []).slice(0, 10).map((row, idx) => (
                <tr key={`${row.id ?? "quota"}-${idx}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(row.timestamp ?? "")}</td>
                  <td className="px-3 py-2 text-slate-700">{row.email || "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{row.use_case || "-"}</td>
                </tr>
              ))}
              {!(quota?.recent_requests.length ?? 0) && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={3}>
                    No quota requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </section>
  );
}

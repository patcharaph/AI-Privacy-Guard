import { RefreshCw } from "lucide-react";

type RangeOption = 7 | 30 | 90;

export function AdminHeader({
  days,
  onRangeChange,
  onRefresh,
  lastUpdated,
  isRefreshing,
}: {
  days: RangeOption;
  onRangeChange: (value: RangeOption) => void;
  onRefresh: () => void;
  lastUpdated: string;
  isRefreshing: boolean;
}) {
  return (
    <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">Last updated: {lastUpdated}</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((option) => (
            <button
              key={option}
              onClick={() => onRangeChange(option as RangeOption)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                days === option
                  ? "bg-primary-600 border-primary-600 text-white"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option}d
            </button>
          ))}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}

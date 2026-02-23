import { AlertCircle } from "lucide-react";

export function AdminErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

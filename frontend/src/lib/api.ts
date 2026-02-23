const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  detection_type: "face" | "license_plate";
  enabled: boolean;
}

export interface ProcessedImageResult {
  image_id: string;
  original_filename: string;
  original_image_base64: string;
  processed_image_base64: string;
  detections: BoundingBox[];
  processing_time_ms: number;
}

export interface ProcessingResponse {
  success: boolean;
  message: string;
  results: ProcessedImageResult[];
  total_processing_time_ms: number;
  images_processed: number;
  total_detections: number;
}

export interface ProcessingOptions {
  blur_mode: "gaussian" | "pixelation" | "emoji";
  blur_intensity: number;
  detect_faces: boolean;
  detect_plates: boolean;
  detection_sensitivity?: number;
  emoji?: string;
  emoji_key?: string;
}

export interface FeedbackRequest {
  missed_type: "face" | "license_plate";
  comment?: string;
  image_id?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  feedback_id: string;
}

export async function processImages(
  files: File[],
  options: ProcessingOptions
): Promise<ProcessingResponse> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  formData.append("blur_mode", options.blur_mode);
  formData.append("blur_intensity", options.blur_intensity.toString());
  formData.append("detect_faces", options.detect_faces.toString());
  formData.append("detect_plates", options.detect_plates.toString());
  if (options.detection_sensitivity !== undefined) {
    formData.append(
      "detection_sensitivity",
      options.detection_sensitivity.toString()
    );
  }
  if (options.emoji) {
    formData.append("emoji", options.emoji);
  }
  if (options.emoji_key) {
    formData.append("emoji_key", options.emoji_key);
  }

  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function submitFeedback(
  feedback: FeedbackRequest
): Promise<FeedbackResponse> {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{
  status: string;
  version: string;
  models_loaded: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return response.json();
}

export interface QuotaResponse {
  used: number;
  limit: number;
  remaining: number;
}

export async function getQuota(): Promise<QuotaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/quota`);
  return response.json();
}

export interface RequestQuotaResponse {
  success: boolean;
  message: string;
  request_id: string;
}

export async function requestExtraQuota(useCase: string, email: string): Promise<RequestQuotaResponse> {
  const formData = new FormData();
  formData.append("use_case", useCase);
  formData.append("email", email);

  const response = await fetch(`${API_BASE_URL}/api/request-quota`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

function getAdminHeaders(): HeadersInit {
  if (!ADMIN_API_KEY) {
    return {};
  }
  return {
    "X-Admin-Key": ADMIN_API_KEY,
  };
}

async function adminGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAdminHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP error ${response.status}`);
  }

  return response.json();
}

export interface AdminOverview {
  uptime_info: {
    started_at: string;
    uptime_seconds: number;
    uptime_human: string;
  };
  processing: {
    total_requests: number;
    total_images_processed: number;
    total_detections: number;
    avg_processing_time_ms: number;
    requests_today: number;
  };
  feedback: {
    total_count: number;
    face_count: number;
    plate_count: number;
  };
  quota: {
    total_requests: number;
    unique_emails: number;
  };
  errors: {
    total_count: number;
    errors_today: number;
  };
  cost: {
    total_estimated_usd: number;
    today_estimated_usd: number;
    avg_cost_per_request_usd: number;
  };
}

export interface AdminDailySummary {
  date: string;
  total_requests: number;
  total_images_processed: number;
  total_faces_detected: number;
  total_plates_detected: number;
  total_detections: number;
  total_errors: number;
  total_processing_time_ms: number;
  avg_processing_time_ms: number;
  total_file_size_bytes: number;
  estimated_total_cost_usd: number;
  unique_ips: number;
  blur_mode_counts: Record<string, number>;
}

export interface AdminDailyRangeResponse {
  summaries: AdminDailySummary[];
  days: number;
}

export interface AdminFeedbackSummary {
  total_feedback: number;
  by_type: Record<string, number>;
  recent_feedback: Array<Record<string, string>>;
  daily_counts: Record<string, number>;
}

export interface AdminQuotaSummary {
  total_requests: number;
  unique_emails: number;
  unique_ips: number;
  recent_requests: Array<Record<string, string>>;
  daily_counts: Record<string, number>;
}

export interface AdminCostSummary {
  total_cost_usd: number;
  daily_breakdown: Array<{
    date: string;
    cost_usd: number;
  }>;
  avg_cost_per_request_usd: number;
  avg_cost_per_day_usd: number;
}

export interface AdminErrorLog {
  timestamp: string;
  request_id: string;
  endpoint: string;
  client_ip: string;
  error_type: string;
  error_message: string;
  status_code: string | number;
}

export interface AdminErrorLogsResponse {
  logs: AdminErrorLog[];
  count: number;
}

export interface AdminProcessingLog {
  timestamp: string;
  request_id: string;
  client_ip: string;
  image_count: string | number;
  total_file_size_bytes: string | number;
  blur_mode: string;
  detect_faces: string | boolean;
  detect_plates: string | boolean;
  detection_sensitivity: string | number;
  faces_detected: string | number;
  plates_detected: string | number;
  total_detections: string | number;
  processing_time_ms: string | number;
  estimated_cost_usd: string | number;
  status: string;
  error_message: string;
}

export interface AdminProcessingLogsResponse {
  logs: AdminProcessingLog[];
  count: number;
  limit: number;
  offset: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return adminGet<AdminOverview>("/api/admin/overview");
}

export async function getAdminDailyRange(days: number): Promise<AdminDailyRangeResponse> {
  return adminGet<AdminDailyRangeResponse>(`/api/admin/processing/daily/range?days=${days}`);
}

export async function getAdminFeedbackSummary(): Promise<AdminFeedbackSummary> {
  return adminGet<AdminFeedbackSummary>("/api/admin/feedback/summary");
}

export async function getAdminQuotaSummary(): Promise<AdminQuotaSummary> {
  return adminGet<AdminQuotaSummary>("/api/admin/quota/summary");
}

export async function getAdminCostSummary(days: number): Promise<AdminCostSummary> {
  return adminGet<AdminCostSummary>(`/api/admin/cost/summary?days=${days}`);
}

export async function getAdminErrorLogs(limit: number): Promise<AdminErrorLogsResponse> {
  return adminGet<AdminErrorLogsResponse>(`/api/admin/errors/logs?limit=${limit}`);
}

export async function getAdminProcessingLogs(
  limit: number,
  offset: number
): Promise<AdminProcessingLogsResponse> {
  return adminGet<AdminProcessingLogsResponse>(
    `/api/admin/processing/logs?limit=${limit}&offset=${offset}`
  );
}

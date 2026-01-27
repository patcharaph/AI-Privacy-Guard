const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  emoji?: string;
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
  if (options.emoji) {
    formData.append("emoji", options.emoji);
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
  return response.json();
}

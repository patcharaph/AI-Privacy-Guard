from pydantic import BaseModel
from typing import Optional


class ProcessingLogEntry(BaseModel):
    timestamp: str
    request_id: str
    client_ip: str
    image_count: int
    total_file_size_bytes: int
    blur_mode: str
    detect_faces: bool
    detect_plates: bool
    detection_sensitivity: int
    faces_detected: int
    plates_detected: int
    total_detections: int
    processing_time_ms: float
    estimated_cost_usd: float
    status: str
    error_message: str


class ErrorLogEntry(BaseModel):
    timestamp: str
    request_id: str
    endpoint: str
    client_ip: str
    error_type: str
    error_message: str
    status_code: int


class DailySummary(BaseModel):
    date: str
    total_requests: int
    total_images_processed: int
    total_faces_detected: int
    total_plates_detected: int
    total_detections: int
    total_errors: int
    total_processing_time_ms: float
    avg_processing_time_ms: float
    total_file_size_bytes: int
    estimated_total_cost_usd: float
    unique_ips: int
    blur_mode_counts: dict[str, int]


class MonthlySummary(BaseModel):
    month: str
    total_requests: int
    total_images_processed: int
    total_detections: int
    total_errors: int
    total_processing_time_ms: float
    avg_processing_time_ms: float
    estimated_total_cost_usd: float
    unique_ips: int
    busiest_day: Optional[str] = None
    busiest_day_requests: int = 0


class FeedbackSummary(BaseModel):
    total_feedback: int
    by_type: dict[str, int]
    recent_feedback: list[dict]
    daily_counts: dict[str, int]


class QuotaSummary(BaseModel):
    total_requests: int
    unique_emails: int
    unique_ips: int
    recent_requests: list[dict]
    daily_counts: dict[str, int]


class CostSummary(BaseModel):
    total_cost_usd: float
    daily_breakdown: list[dict]
    avg_cost_per_request_usd: float
    avg_cost_per_day_usd: float


class AdminOverview(BaseModel):
    uptime_info: dict
    processing: dict
    feedback: dict
    quota: dict
    errors: dict
    cost: dict

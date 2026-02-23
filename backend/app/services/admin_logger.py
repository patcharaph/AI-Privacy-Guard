import csv
import logging
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

LOGS_DIR = Path(__file__).resolve().parents[2] / "logs"

PROCESSING_LOG = LOGS_DIR / "processing_requests.csv"
ERROR_LOG = LOGS_DIR / "errors.csv"
FEEDBACK_LOG = LOGS_DIR / "feedback.csv"
QUOTA_LOG = LOGS_DIR / "quota_requests.csv"

PROCESSING_HEADERS = [
    "timestamp", "request_id", "client_ip", "image_count",
    "total_file_size_bytes", "blur_mode", "detect_faces", "detect_plates",
    "detection_sensitivity", "faces_detected", "plates_detected",
    "total_detections", "processing_time_ms", "estimated_cost_usd",
    "status", "error_message",
]

ERROR_HEADERS = [
    "timestamp", "request_id", "endpoint", "client_ip",
    "error_type", "error_message", "status_code",
]


class AdminLogger:
    """Centralized logging and aggregation for admin dashboard."""

    def __init__(self) -> None:
        self._startup_time = time.time()
        LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _append_csv(path: Path, headers: list[str], row: dict) -> None:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        file_exists = path.exists()
        with path.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)

    @staticmethod
    def _read_csv(path: Path) -> list[dict]:
        if not path.exists():
            return []
        try:
            with path.open(newline="", encoding="utf-8") as f:
                return list(csv.DictReader(f))
        except Exception as e:
            logger.error(f"Failed to read {path}: {e}")
            return []

    @staticmethod
    def estimate_cost(processing_time_ms: float) -> float:
        cost = (processing_time_ms / 1000.0) * settings.COST_PER_CPU_SECOND
        return round(cost, 6)

    # ------------------------------------------------------------------
    # Write methods
    # ------------------------------------------------------------------

    def log_processing_request(
        self,
        request_id: str,
        client_ip: str,
        image_count: int,
        total_file_size_bytes: int,
        blur_mode: str,
        detect_faces: bool,
        detect_plates: bool,
        detection_sensitivity: int,
        faces_detected: int,
        plates_detected: int,
        total_detections: int,
        processing_time_ms: float,
        status: str,
        error_message: str = "",
    ) -> None:
        cost = self.estimate_cost(processing_time_ms)
        self._append_csv(PROCESSING_LOG, PROCESSING_HEADERS, {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id,
            "client_ip": client_ip,
            "image_count": image_count,
            "total_file_size_bytes": total_file_size_bytes,
            "blur_mode": blur_mode,
            "detect_faces": detect_faces,
            "detect_plates": detect_plates,
            "detection_sensitivity": detection_sensitivity,
            "faces_detected": faces_detected,
            "plates_detected": plates_detected,
            "total_detections": total_detections,
            "processing_time_ms": round(processing_time_ms, 2),
            "estimated_cost_usd": cost,
            "status": status,
            "error_message": error_message,
        })

    def log_error(
        self,
        request_id: str,
        endpoint: str,
        client_ip: str,
        error_type: str,
        error_message: str,
        status_code: int,
    ) -> None:
        self._append_csv(ERROR_LOG, ERROR_HEADERS, {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id,
            "endpoint": endpoint,
            "client_ip": client_ip,
            "error_type": error_type,
            "error_message": error_message,
            "status_code": status_code,
        })

    # ------------------------------------------------------------------
    # Read methods
    # ------------------------------------------------------------------

    def get_processing_logs(self, limit: int = 100, offset: int = 0) -> list[dict]:
        rows = self._read_csv(PROCESSING_LOG)
        rows.reverse()  # newest first
        return rows[offset:offset + limit]

    def get_error_logs(self, limit: int = 50) -> list[dict]:
        rows = self._read_csv(ERROR_LOG)
        rows.reverse()
        return rows[:limit]

    # ------------------------------------------------------------------
    # Aggregation methods
    # ------------------------------------------------------------------

    def _safe_int(self, val: str, default: int = 0) -> int:
        try:
            return int(val)
        except (ValueError, TypeError):
            return default

    def _safe_float(self, val: str, default: float = 0.0) -> float:
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    def get_daily_summary(self, date_str: str | None = None) -> dict:
        if date_str is None:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        rows = self._read_csv(PROCESSING_LOG)
        day_rows = [r for r in rows if r.get("timestamp", "").startswith(date_str)]

        if not day_rows:
            return {
                "date": date_str, "total_requests": 0, "total_images_processed": 0,
                "total_faces_detected": 0, "total_plates_detected": 0,
                "total_detections": 0, "total_errors": 0,
                "total_processing_time_ms": 0, "avg_processing_time_ms": 0,
                "total_file_size_bytes": 0, "estimated_total_cost_usd": 0,
                "unique_ips": 0, "blur_mode_counts": {},
            }

        total_requests = len(day_rows)
        total_images = sum(self._safe_int(r.get("image_count")) for r in day_rows)
        faces = sum(self._safe_int(r.get("faces_detected")) for r in day_rows)
        plates = sum(self._safe_int(r.get("plates_detected")) for r in day_rows)
        detections = sum(self._safe_int(r.get("total_detections")) for r in day_rows)
        errors = sum(1 for r in day_rows if r.get("status") != "success")
        total_time = sum(self._safe_float(r.get("processing_time_ms")) for r in day_rows)
        total_size = sum(self._safe_int(r.get("total_file_size_bytes")) for r in day_rows)
        total_cost = sum(self._safe_float(r.get("estimated_cost_usd")) for r in day_rows)
        unique_ips = len({r.get("client_ip") for r in day_rows})
        blur_counts = dict(Counter(r.get("blur_mode", "unknown") for r in day_rows))

        return {
            "date": date_str,
            "total_requests": total_requests,
            "total_images_processed": total_images,
            "total_faces_detected": faces,
            "total_plates_detected": plates,
            "total_detections": detections,
            "total_errors": errors,
            "total_processing_time_ms": round(total_time, 2),
            "avg_processing_time_ms": round(total_time / total_requests, 2),
            "total_file_size_bytes": total_size,
            "estimated_total_cost_usd": round(total_cost, 6),
            "unique_ips": unique_ips,
            "blur_mode_counts": blur_counts,
        }

    def get_daily_summaries(self, days: int = 30) -> list[dict]:
        summaries = []
        today = datetime.now(timezone.utc).date()
        for i in range(days):
            d = today - timedelta(days=i)
            summary = self.get_daily_summary(d.isoformat())
            if summary["total_requests"] > 0:
                summaries.append(summary)
        return summaries

    def get_monthly_summary(self, month_str: str | None = None) -> dict:
        if month_str is None:
            month_str = datetime.now(timezone.utc).strftime("%Y-%m")

        rows = self._read_csv(PROCESSING_LOG)
        month_rows = [r for r in rows if r.get("timestamp", "").startswith(month_str)]

        if not month_rows:
            return {
                "month": month_str, "total_requests": 0, "total_images_processed": 0,
                "total_detections": 0, "total_errors": 0,
                "total_processing_time_ms": 0, "avg_processing_time_ms": 0,
                "estimated_total_cost_usd": 0, "unique_ips": 0,
                "busiest_day": None, "busiest_day_requests": 0,
            }

        total_requests = len(month_rows)
        total_images = sum(self._safe_int(r.get("image_count")) for r in month_rows)
        detections = sum(self._safe_int(r.get("total_detections")) for r in month_rows)
        errors = sum(1 for r in month_rows if r.get("status") != "success")
        total_time = sum(self._safe_float(r.get("processing_time_ms")) for r in month_rows)
        total_cost = sum(self._safe_float(r.get("estimated_cost_usd")) for r in month_rows)
        unique_ips = len({r.get("client_ip") for r in month_rows})

        # Find busiest day
        day_counts: dict[str, int] = defaultdict(int)
        for r in month_rows:
            day = r.get("timestamp", "")[:10]
            day_counts[day] += 1
        busiest_day = max(day_counts, key=day_counts.get) if day_counts else None
        busiest_count = day_counts.get(busiest_day, 0) if busiest_day else 0

        return {
            "month": month_str,
            "total_requests": total_requests,
            "total_images_processed": total_images,
            "total_detections": detections,
            "total_errors": errors,
            "total_processing_time_ms": round(total_time, 2),
            "avg_processing_time_ms": round(total_time / total_requests, 2),
            "estimated_total_cost_usd": round(total_cost, 6),
            "unique_ips": unique_ips,
            "busiest_day": busiest_day,
            "busiest_day_requests": busiest_count,
        }

    def get_feedback_summary(self) -> dict:
        rows = self._read_csv(FEEDBACK_LOG)
        total = len(rows)
        by_type: dict[str, int] = defaultdict(int)
        daily_counts: dict[str, int] = defaultdict(int)

        for r in rows:
            by_type[r.get("missed_type", "unknown")] += 1
            day = r.get("timestamp", "")[:10]
            if day:
                daily_counts[day] += 1

        recent = rows[-10:]
        recent.reverse()

        return {
            "total_feedback": total,
            "by_type": dict(by_type),
            "recent_feedback": recent,
            "daily_counts": dict(daily_counts),
        }

    def get_quota_summary(self) -> dict:
        rows = self._read_csv(QUOTA_LOG)
        total = len(rows)
        emails = {r.get("email", "").strip().lower() for r in rows if r.get("email", "").strip()}
        ips = {r.get("ip") for r in rows if r.get("ip")}
        daily_counts: dict[str, int] = defaultdict(int)

        for r in rows:
            day = r.get("timestamp", "")[:10]
            if day:
                daily_counts[day] += 1

        recent = rows[-10:]
        recent.reverse()

        return {
            "total_requests": total,
            "unique_emails": len(emails),
            "unique_ips": len(ips),
            "recent_requests": recent,
            "daily_counts": dict(daily_counts),
        }

    def get_cost_summary(self, days: int = 30) -> dict:
        rows = self._read_csv(PROCESSING_LOG)
        today = datetime.now(timezone.utc).date()
        cutoff = (today - timedelta(days=days)).isoformat()

        filtered = [r for r in rows if r.get("timestamp", "") >= cutoff]
        total_cost = sum(self._safe_float(r.get("estimated_cost_usd")) for r in filtered)
        total_requests = len(filtered)

        daily: dict[str, float] = defaultdict(float)
        for r in filtered:
            day = r.get("timestamp", "")[:10]
            if day:
                daily[day] += self._safe_float(r.get("estimated_cost_usd"))

        daily_breakdown = [
            {"date": d, "cost_usd": round(c, 6)}
            for d, c in sorted(daily.items())
        ]
        active_days = len(daily_breakdown)

        return {
            "total_cost_usd": round(total_cost, 6),
            "daily_breakdown": daily_breakdown,
            "avg_cost_per_request_usd": round(total_cost / total_requests, 6) if total_requests else 0,
            "avg_cost_per_day_usd": round(total_cost / active_days, 6) if active_days else 0,
        }

    def get_overview(self) -> dict:
        uptime_seconds = time.time() - self._startup_time
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)

        proc_rows = self._read_csv(PROCESSING_LOG)
        error_rows = self._read_csv(ERROR_LOG)
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        total_requests = len(proc_rows)
        total_images = sum(self._safe_int(r.get("image_count")) for r in proc_rows)
        total_detections = sum(self._safe_int(r.get("total_detections")) for r in proc_rows)
        total_time = sum(self._safe_float(r.get("processing_time_ms")) for r in proc_rows)
        requests_today = sum(1 for r in proc_rows if r.get("timestamp", "").startswith(today_str))

        total_cost = sum(self._safe_float(r.get("estimated_cost_usd")) for r in proc_rows)
        today_cost = sum(
            self._safe_float(r.get("estimated_cost_usd"))
            for r in proc_rows if r.get("timestamp", "").startswith(today_str)
        )

        errors_today = sum(1 for r in error_rows if r.get("timestamp", "").startswith(today_str))

        feedback_rows = self._read_csv(FEEDBACK_LOG)
        face_count = sum(1 for r in feedback_rows if r.get("missed_type") == "face")
        plate_count = sum(1 for r in feedback_rows if r.get("missed_type") == "license_plate")

        quota_rows = self._read_csv(QUOTA_LOG)
        quota_emails = {r.get("email", "").strip().lower() for r in quota_rows if r.get("email", "").strip()}

        return {
            "uptime_info": {
                "started_at": datetime.fromtimestamp(self._startup_time, tz=timezone.utc).isoformat(),
                "uptime_seconds": round(uptime_seconds),
                "uptime_human": f"{hours}h {minutes}m",
            },
            "processing": {
                "total_requests": total_requests,
                "total_images_processed": total_images,
                "total_detections": total_detections,
                "avg_processing_time_ms": round(total_time / total_requests, 2) if total_requests else 0,
                "requests_today": requests_today,
            },
            "feedback": {
                "total_count": len(feedback_rows),
                "face_count": face_count,
                "plate_count": plate_count,
            },
            "quota": {
                "total_requests": len(quota_rows),
                "unique_emails": len(quota_emails),
            },
            "errors": {
                "total_count": len(error_rows),
                "errors_today": errors_today,
            },
            "cost": {
                "total_estimated_usd": round(total_cost, 6),
                "today_estimated_usd": round(today_cost, 6),
                "avg_cost_per_request_usd": round(total_cost / total_requests, 6) if total_requests else 0,
            },
        }


# Singleton
admin_logger = AdminLogger()

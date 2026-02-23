import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.core.config import settings

from app.services.admin_logger import admin_logger

logger = logging.getLogger(__name__)


def require_admin_key(x_admin_key: str | None = Header(default=None)) -> None:
    expected_key = settings.ADMIN_API_KEY
    if not expected_key:
        logger.warning("ADMIN_API_KEY is not configured. Admin endpoints are open.")
        return

    if x_admin_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized admin access")


admin_router = APIRouter(dependencies=[Depends(require_admin_key)])


@admin_router.get("/overview")
async def admin_overview():
    """High-level dashboard overview combining all data sources."""
    return admin_logger.get_overview()


@admin_router.get("/processing/logs")
async def admin_processing_logs(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """Recent processing request logs (newest first), paginated."""
    logs = admin_logger.get_processing_logs(limit=limit, offset=offset)
    return {"logs": logs, "count": len(logs), "limit": limit, "offset": offset}


@admin_router.get("/processing/daily")
async def admin_daily_summary(
    date: str = Query(default=None, description="YYYY-MM-DD, default today"),
):
    """Daily aggregated processing stats."""
    return admin_logger.get_daily_summary(date_str=date)


@admin_router.get("/processing/daily/range")
async def admin_daily_range(
    days: int = Query(default=30, ge=1, le=365),
):
    """Daily summaries for the last N days (only days with activity)."""
    summaries = admin_logger.get_daily_summaries(days=days)
    return {"summaries": summaries, "days": days}


@admin_router.get("/processing/monthly")
async def admin_monthly_summary(
    month: str = Query(default=None, description="YYYY-MM, default current month"),
):
    """Monthly aggregated processing stats."""
    return admin_logger.get_monthly_summary(month_str=month)


@admin_router.get("/feedback/summary")
async def admin_feedback_summary():
    """Aggregated feedback statistics from feedback.csv."""
    return admin_logger.get_feedback_summary()


@admin_router.get("/quota/summary")
async def admin_quota_summary():
    """Aggregated quota request statistics from quota_requests.csv."""
    return admin_logger.get_quota_summary()


@admin_router.get("/errors/logs")
async def admin_error_logs(
    limit: int = Query(default=50, ge=1, le=500),
):
    """Recent error logs (newest first)."""
    logs = admin_logger.get_error_logs(limit=limit)
    return {"logs": logs, "count": len(logs)}


@admin_router.get("/cost/summary")
async def admin_cost_summary(
    days: int = Query(default=30, ge=1, le=365),
):
    """Cost estimation summary over a time period with daily breakdown."""
    return admin_logger.get_cost_summary(days=days)

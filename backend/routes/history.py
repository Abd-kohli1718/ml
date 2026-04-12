"""
history.py — Routes for fetching analysis history and trends.

GET /api/history         — past analysis records (Protected)
GET /api/history/trend   — trend summary (Protected)
"""

from fastapi import APIRouter, Query, Depends

from backend.auth import get_current_user
from backend.services.history import get_history, get_trend
from backend.schemas import HistoryResponse, TrendSummary

router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
async def fetch_history(
    period: str = Query("all", description="Time period: day, week, month, year, all"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    user: dict = Depends(get_current_user),
):
    """Fetch past voice analysis records for the authenticated user."""
    user_id = user["sub"]
    result = get_history(user_id=user_id, period=period, limit=limit)
    return HistoryResponse(**result)


@router.get("/history/trend", response_model=TrendSummary)
async def fetch_trend(
    period: str = Query("month", description="Time period: day, week, month, year, all"),
    user: dict = Depends(get_current_user),
):
    """Get a trend summary for the authenticated user's voice health."""
    user_id = user["sub"]
    result = get_trend(user_id=user_id, period=period)
    return TrendSummary(**result)

"""
schemas.py — Pydantic response models for the Voice Health API.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FeatureDeviation(BaseModel):
    """A single feature's deviation from baseline."""
    name: str
    z_score: float


class AnalysisResult(BaseModel):
    """Response model for POST /api/analyze."""
    id: Optional[str] = None
    user_id: str
    status: str                          # "Stable" / "Slight Change" / "High Risk"
    deviation_score: float               # raw z-score
    health_score: int                    # 0-100 (100 = perfectly healthy)
    observations: list[str]              # clinical observation bullets
    summary: str                         # one-line assessment
    medical_note: str                    # safety disclaimer
    explanation: list[FeatureDeviation]  # top deviating features
    audio_url: Optional[str] = None
    created_at: Optional[str] = None


class HistoryRecord(BaseModel):
    """A single historical analysis entry."""
    id: str
    user_id: str
    status: str
    deviation_score: float
    health_score: Optional[int] = None
    observations: list[str] = []
    summary: Optional[str] = None
    explanation: list[FeatureDeviation] = []
    audio_url: Optional[str] = None
    created_at: str


class HistoryResponse(BaseModel):
    """Response model for GET /api/history."""
    user_id: str
    period: str
    count: int
    records: list[HistoryRecord]


class TrendSummary(BaseModel):
    """Response model for GET /api/history/trend."""
    user_id: str
    period: str
    trend: str              # "improving" / "stable" / "declining" / "insufficient_data"
    trend_summary: str      # human-readable description
    record_count: int
    avg_score: Optional[float] = None
    latest_score: Optional[float] = None


# --- Auth Models ---

class UserProfile(BaseModel):
    """User profile from the profiles table."""
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AuthResponse(BaseModel):
    """Response model for auth endpoints (sign-in, refresh)."""
    access_token: str
    refresh_token: str
    expires_in: Optional[int] = None
    token_type: str = "bearer"
    user: Optional[UserProfile] = None

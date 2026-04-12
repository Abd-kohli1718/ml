"""
records.py — CRUD operations on the voice_records table in Supabase.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from backend.db.supabase_client import get_supabase

TABLE = "voice_records"


def insert_record(data: dict) -> dict:
    """
    Insert a new analysis record into voice_records.

    Parameters
    ----------
    data : dict with keys matching the table columns:
        user_id, status, deviation_score, health_score,
        observations, summary, medical_note, explanation,
        audio_url, audio_filename

    Returns
    -------
    dict — the inserted row (from Supabase response)
    """
    supabase = get_supabase()
    response = supabase.table(TABLE).insert(data).execute()
    return response.data[0] if response.data else {}


def fetch_records(
    user_id: str,
    period: str = "all",
    limit: int = 50,
) -> list[dict]:
    """
    Fetch voice records for a user, optionally filtered by time period.

    Parameters
    ----------
    user_id : str
    period  : "day" | "week" | "month" | "year" | "all"
    limit   : max number of records to return

    Returns
    -------
    list[dict] — records sorted by created_at descending
    """
    supabase = get_supabase()
    query = (
        supabase.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )

    # Apply time filter
    cutoff = _get_cutoff(period)
    if cutoff:
        query = query.gte("created_at", cutoff.isoformat())

    response = query.execute()
    return response.data or []


def _get_cutoff(period: str) -> Optional[datetime]:
    """Convert a period string to a UTC cutoff datetime."""
    now = datetime.now(timezone.utc)
    mapping = {
        "day": timedelta(days=1),
        "week": timedelta(weeks=1),
        "month": timedelta(days=30),
        "year": timedelta(days=365),
    }
    delta = mapping.get(period)
    if delta:
        return now - delta
    return None  # "all" — no cutoff

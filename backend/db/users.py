"""
users.py — CRUD operations on the profiles table in Supabase.
"""

from backend.db.supabase_client import get_supabase

TABLE = "profiles"


def get_profile(user_id: str) -> dict | None:
    """
    Fetch a user's profile by their auth UUID.

    Returns the profile dict or None if not found.
    """
    supabase = get_supabase()
    response = (
        supabase.table(TABLE)
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data


def upsert_profile(user_id: str, data: dict) -> dict:
    """
    Create or update a user's profile.

    Parameters
    ----------
    user_id : str — auth.users UUID
    data    : dict with optional keys: email, full_name, avatar_url

    Returns
    -------
    dict — the upserted profile row
    """
    supabase = get_supabase()
    payload = {"id": user_id, **data, "updated_at": "now()"}
    response = (
        supabase.table(TABLE)
        .upsert(payload)
        .execute()
    )
    return response.data[0] if response.data else {}

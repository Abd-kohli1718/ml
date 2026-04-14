"""
supabase_client.py — Initialize and expose the Supabase client.

Uses SUPABASE_SERVICE_ROLE_KEY (if available) to bypass Row-Level Security,
since the backend has already authenticated the user via JWT.
Falls back to SUPABASE_ANON_KEY for development.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()  # loads .env from project root

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
# Prefer service role key (bypasses RLS), fall back to anon key
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")

_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client.  Fails fast if env vars are missing."""
    global _client
    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Missing Supabase credentials. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in your .env file."
        )

    _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

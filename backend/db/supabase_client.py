"""
supabase_client.py — Initialize and expose the Supabase client.

Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment variables
(loaded via python-dotenv at startup).
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()  # loads .env from project root

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client.  Fails fast if env vars are missing."""
    global _client
    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError(
            "Missing Supabase credentials. "
            "Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file."
        )

    _client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _client

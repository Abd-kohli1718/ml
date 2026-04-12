"""
storage.py — Upload audio files to Supabase Storage.

Uses the 'voice-recordings' bucket (must be created in the Supabase
Dashboard and set to public for URL access).
"""

import uuid
import os
from backend.db.supabase_client import get_supabase

BUCKET_NAME = "voice-recordings"


def upload_audio(file_bytes: bytes, original_filename: str, user_id: str = "default") -> str:
    """
    Upload an audio file to Supabase Storage.

    Parameters
    ----------
    file_bytes        : raw file content
    original_filename : original name for extension detection
    user_id           : used as folder prefix in storage

    Returns
    -------
    str — public URL of the uploaded file
    """
    ext = os.path.splitext(original_filename)[1] or ".wav"
    storage_path = f"{user_id}/{uuid.uuid4().hex}{ext}"

    supabase = get_supabase()

    # Determine content type
    content_types = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
        ".m4a": "audio/mp4",
    }
    content_type = content_types.get(ext.lower(), "application/octet-stream")

    # Upload to storage
    supabase.storage.from_(BUCKET_NAME).upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": content_type},
    )

    # Get public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
    return public_url

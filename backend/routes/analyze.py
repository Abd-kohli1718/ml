"""
analyze.py — Route for uploading audio and running the ML analysis pipeline.

POST /api/analyze  (Protected — requires Bearer token)
    - Extracts user_id from JWT
    - Saves temp file -> runs ML -> uploads to Supabase Storage -> inserts DB record
    - Returns the structured analysis result
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from backend.auth import get_current_user
from backend.services.analysis import run_analysis
from backend.db.storage import upload_audio
from backend.db.records import insert_record
from backend.schemas import AnalysisResult

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_audio(
    audio: UploadFile = File(..., description="Audio file (.wav, .mp3, etc.)"),
    user: dict = Depends(get_current_user),
):
    """
    Upload an audio file, run voice biomarker analysis, store the result,
    and return the structured analysis. Requires authentication.
    """
    user_id = user["sub"]

    # Validate file type
    allowed_ext = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm"}
    _, ext = os.path.splitext(audio.filename or "upload.wav")
    if ext.lower() not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed_ext)}",
        )

    # Read the file content
    file_bytes = await audio.read()

    # Save to a temp file for ML processing
    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, f"upload{ext}")
    try:
        with open(tmp_path, "wb") as f:
            f.write(file_bytes)

        # Run ML analysis
        result = await run_analysis(tmp_path)
        if result is None:
            raise HTTPException(
                status_code=422,
                detail="Feature extraction failed. The audio file may be too short, silent, or corrupted.",
            )

        # Upload audio to Supabase Storage
        audio_url = None
        try:
            audio_url = upload_audio(
                file_bytes=file_bytes,
                original_filename=audio.filename or "upload.wav",
                user_id=user_id,
            )
        except Exception as e:
            # Storage upload is non-critical — analysis still succeeds
            print(f"[WARNING] Audio upload to storage failed: {e}")

        # Insert record into database
        db_record = {}
        try:
            db_record = insert_record({
                "user_id": user_id,
                "status": result["status"],
                "deviation_score": result["deviation_score"],
                "health_score": result["health_score"],
                "observations": result["observations"],
                "summary": result["summary"],
                "medical_note": result["medical_note"],
                "explanation": result["explanation"],
                "audio_url": audio_url,
                "audio_filename": audio.filename,
            })
        except Exception as e:
            print(f"[WARNING] Database insert failed: {e}")

        return AnalysisResult(
            id=db_record.get("id"),
            user_id=user_id,
            status=result["status"],
            deviation_score=result["deviation_score"],
            health_score=result["health_score"],
            observations=result["observations"],
            summary=result["summary"],
            medical_note=result["medical_note"],
            explanation=result["explanation"],
            audio_url=audio_url,
            created_at=db_record.get("created_at"),
        )

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        if os.path.isdir(tmp_dir):
            os.rmdir(tmp_dir)

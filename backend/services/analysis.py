"""
analysis.py — Service that wraps the existing ML pipeline (src/predict.py)
              for the FastAPI layer.

Key responsibility: convert the raw ML dict output into an API-friendly
format with a 0–100 health score.

NOTE: The src/ directory contains a realtime.py that shadows the `realtime`
package used by `supabase`. To avoid import conflicts, we add src/ to
sys.path ONLY during ML execution and remove it immediately after.
"""

import sys
import os
import asyncio
import importlib
from concurrent.futures import ThreadPoolExecutor

# Path to src/ — NOT added to sys.path at module level to avoid import conflicts
_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_src_dir = os.path.join(_project_root, "src")

# Thread pool for running CPU-bound ML code without blocking the event loop
_executor = ThreadPoolExecutor(max_workers=2)


def _compute_health_score(deviation_score: float) -> int:
    """
    Convert a deviation score to a 0-100 health score.

    Mapping:
        0.0 deviation  ->  100 (perfect)
        1.3 deviation  ->   70 (threshold for Slight Change)
        1.6 deviation  ->   50 (threshold for High Risk)
        3.0+ deviation ->    0 (severe)
    """
    score = max(0.0, 100.0 - (deviation_score * 33.3))
    return int(min(100, max(0, round(score))))


def _run_predict(filepath: str):
    """
    Run predict() with src/ temporarily on sys.path.
    This isolation prevents src/realtime.py from shadowing
    the `realtime` package used by supabase.
    """
    # Temporarily add src/ to path
    added = False
    if _src_dir not in sys.path:
        sys.path.insert(0, _src_dir)
        added = True

    try:
        # Import (or re-import) predict from src/
        predict_mod = importlib.import_module("predict")
        return predict_mod.predict(filepath)
    finally:
        # Remove src/ from path to restore clean namespace
        if added and _src_dir in sys.path:
            sys.path.remove(_src_dir)


async def run_analysis(filepath: str) -> dict | None:
    """
    Run the full ML pipeline on an audio file asynchronously.

    Returns
    -------
    dict with keys: status, deviation_score, health_score,
         observations, summary, medical_note, explanation
    None if feature extraction fails.
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(_executor, _run_predict, filepath)

    if result is None:
        return None

    # Transform the explanation from list of tuples to list of dicts
    explanation = [
        {"name": name, "z_score": round(z, 4)}
        for name, z in result.get("explanation", [])
    ]

    return {
        "status": result["status"],
        "deviation_score": round(result["deviation_score"], 4),
        "health_score": _compute_health_score(result["deviation_score"]),
        "observations": result.get("observations", []),
        "summary": result.get("summary", ""),
        "medical_note": result.get("medical_note", ""),
        "explanation": explanation,
    }


"""
history.py — Service for time-filtered history queries and trend aggregation.
"""

from backend.db.records import fetch_records


def get_history(user_id: str, period: str = "all", limit: int = 50) -> dict:
    """
    Fetch analysis history for a user with optional time filtering.

    Returns
    -------
    dict with keys: user_id, period, count, records
    """
    records = fetch_records(user_id=user_id, period=period, limit=limit)

    # Normalize the explanation field from DB (stored as JSONB)
    for r in records:
        if isinstance(r.get("explanation"), list):
            r["explanation"] = [
                {"name": e.get("name", ""), "z_score": e.get("z_score", 0)}
                for e in r["explanation"]
            ]
        else:
            r["explanation"] = []

        if not isinstance(r.get("observations"), list):
            r["observations"] = []

    return {
        "user_id": user_id,
        "period": period,
        "count": len(records),
        "records": records,
    }


def get_trend(user_id: str, period: str = "month") -> dict:
    """
    Compute a trend summary from historical records.

    Compares the average deviation score of the first half of records
    against the second half to determine direction.

    Returns
    -------
    dict with keys: user_id, period, trend, trend_summary,
         record_count, avg_score, latest_score
    """
    records = fetch_records(user_id=user_id, period=period, limit=100)

    if len(records) < 2:
        return {
            "user_id": user_id,
            "period": period,
            "trend": "insufficient_data",
            "trend_summary": "Not enough records to determine a trend (need at least 2).",
            "record_count": len(records),
            "avg_score": None,
            "latest_score": records[0]["deviation_score"] if records else None,
        }

    scores = [r["deviation_score"] for r in records]

    # Records come back newest-first, so reverse for chronological order
    scores_chrono = list(reversed(scores))

    mid = len(scores_chrono) // 2
    first_half_avg = sum(scores_chrono[:mid]) / mid
    second_half_avg = sum(scores_chrono[mid:]) / (len(scores_chrono) - mid)

    diff = second_half_avg - first_half_avg
    tolerance = 0.1

    if diff > tolerance:
        trend = "declining"
        trend_summary = (
            f"Voice stability DECREASING over time. "
            f"Deviation rose from {scores_chrono[0]:.2f} to {scores_chrono[-1]:.2f} "
            f"across {len(scores_chrono)} samples."
        )
    elif diff < -tolerance:
        trend = "improving"
        trend_summary = (
            f"Voice stability IMPROVING over time. "
            f"Deviation dropped from {scores_chrono[0]:.2f} to {scores_chrono[-1]:.2f} "
            f"across {len(scores_chrono)} samples."
        )
    else:
        avg = sum(scores_chrono) / len(scores_chrono)
        trend = "stable"
        trend_summary = (
            f"Voice stability CONSISTENT over time. "
            f"Deviation stayed around {avg:.2f} across {len(scores_chrono)} samples."
        )

    avg_score = sum(scores) / len(scores)

    return {
        "user_id": user_id,
        "period": period,
        "trend": trend,
        "trend_summary": trend_summary,
        "record_count": len(records),
        "avg_score": round(avg_score, 4),
        "latest_score": round(scores[0], 4),  # newest first
    }

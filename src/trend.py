"""
trend.py - Simulate and analyze voice progression over time.

Takes multiple audio samples (treated as day1, day2, day3, ...),
computes deviation scores for each, and reports the trend.

Usage:
    from trend import analyze_trend
    result = analyze_trend(file_list, baseline_mean, baseline_std)
"""

from feature_extractor import extract_features
from anomaly import detect_anomaly
from utils import get_logger

logger = get_logger(__name__)


def analyze_trend(file_paths, baseline_mean, baseline_std):
    """
    Analyze voice progression across multiple samples over time.

    Parameters
    ----------
    file_paths     : list[str]  - audio files in chronological order (day1, day2, ...)
    baseline_mean  : np.ndarray - baseline mean vector
    baseline_std   : np.ndarray - baseline std vector

    Returns
    -------
    dict with keys:
        daily_results  - list of per-day result dicts
        trend          - "improving" / "stable" / "declining"
        trend_summary  - human-readable trend description
    """
    daily_results = []

    for i, path in enumerate(file_paths):
        day_label = "Day %d" % (i + 1)
        feats = extract_features(path)
        if feats is None:
            logger.warning("Skipping %s - feature extraction failed", path)
            continue

        result = detect_anomaly(baseline_mean, baseline_std, feats)
        result["day"] = day_label
        result["file"] = path
        daily_results.append(result)

    if len(daily_results) < 2:
        return {
            "daily_results": daily_results,
            "trend": "insufficient_data",
            "trend_summary": "Not enough samples to determine a trend (need at least 2).",
        }

    # --- Determine trend direction ---
    scores = [r["deviation_score"] for r in daily_results]

    # Simple linear trend: compare first half average vs second half average
    mid = len(scores) // 2
    first_half_avg = sum(scores[:mid]) / mid
    second_half_avg = sum(scores[mid:]) / (len(scores) - mid)

    diff = second_half_avg - first_half_avg

    # Use a small tolerance to avoid noise
    tolerance = 0.1
    if diff > tolerance:
        trend = "declining"
        trend_summary = ("Voice stability DECREASING over time. "
                         "Deviation rose from %.2f to %.2f across %d samples."
                         % (scores[0], scores[-1], len(scores)))
    elif diff < -tolerance:
        trend = "improving"
        trend_summary = ("Voice stability IMPROVING over time. "
                         "Deviation dropped from %.2f to %.2f across %d samples."
                         % (scores[0], scores[-1], len(scores)))
    else:
        trend = "stable"
        trend_summary = ("Voice stability CONSISTENT over time. "
                         "Deviation stayed around %.2f across %d samples."
                         % (sum(scores) / len(scores), len(scores)))

    return {
        "daily_results": daily_results,
        "trend": trend,
        "trend_summary": trend_summary,
    }


def print_trend(trend_result):
    """Pretty-print a trend analysis result."""
    print("")
    print("=" * 60)
    print("  VOICE PROGRESSION OVER TIME")
    print("=" * 60)

    for r in trend_result["daily_results"]:
        print("  %-8s | Score: %.4f | Status: %s"
              % (r["day"], r["deviation_score"], r["status"]))

    print("-" * 60)

    trend = trend_result["trend"]
    arrow = {"declining": ">>>", "improving": "<<<", "stable": "==="}
    print("  Trend: %s %s" % (arrow.get(trend, "???"), trend.upper()))
    print("")
    print("  %s" % trend_result["trend_summary"])
    print("=" * 60)
    print("")

"""
anomaly.py - Detect vocal anomalies by comparing a new feature vector
             against the user's baseline voice profile.

Scoring method:
    deviation = |feature - baseline_mean| / baseline_std   (z-score per feature)
    overall_score = mean of all per-feature deviations

Classification (calibrated to observed data):
    score < 1.3   ->  Stable
    score <= 1.6  ->  Slight Change
    score > 1.6   ->  High Risk
"""

import numpy as np

from config import THRESHOLD_LOW, THRESHOLD_MEDIUM, FEATURE_NAMES
from health_interpreter import interpret
from utils import get_logger

logger = get_logger(__name__)


def compute_deviation(baseline_mean, baseline_std, feature_vector):
    """
    Calculate per-feature z-scores and an overall deviation score.

    Returns
    -------
    overall_score   : float        - mean z-score across all features
    per_feature     : np.ndarray   - individual z-scores
    """
    per_feature = np.abs(feature_vector - baseline_mean) / baseline_std
    overall_score = float(np.mean(per_feature))
    return overall_score, per_feature


def classify(score):
    """Map a deviation score to a human-readable status label."""
    if score < THRESHOLD_LOW:
        return "Stable"
    elif score <= THRESHOLD_MEDIUM:
        return "Slight Change"
    else:
        return "High Risk"


def explain(per_feature, top_n=5):
    """
    Return the top_n features with the largest deviation,
    sorted descending.  Each entry is (feature_name, z_score).
    """
    indices = np.argsort(per_feature)[::-1][:top_n]
    return [(FEATURE_NAMES[i], float(per_feature[i])) for i in indices]


def detect_anomaly(baseline_mean, baseline_std, feature_vector, top_n=5):
    """
    Full anomaly-detection pipeline with clinical health interpretation.

    Parameters
    ----------
    baseline_mean   : baseline mean vector
    baseline_std    : baseline std vector
    feature_vector  : new sample's feature vector
    top_n           : how many top-changed features to report

    Returns
    -------
    dict with keys:
        status           - "Stable" / "Slight Change" / "High Risk"
        deviation_score  - float
        explanation      - list of (feature_name, z_score) tuples
        observations     - list[str] clinical health signals
        summary          - str overall assessment
        medical_note     - str safety disclaimer
    """
    score, per_feature = compute_deviation(baseline_mean, baseline_std, feature_vector)
    status = classify(score)
    top_features = explain(per_feature, top_n=top_n)

    # Generate clinical interpretation with directional context
    health = interpret(
        feature_deltas=top_features,
        deviation_score=score,
        status=status,
        feature_values=feature_vector,
        baseline_mean=baseline_mean,
    )

    logger.info("Anomaly check -> score=%.4f  status=%s", score, status)
    return {
        "status": status,
        "deviation_score": score,
        "explanation": top_features,
        "observations": health["observations"],
        "summary": health["summary"],
        "medical_note": health["medical_note"],
    }


# --- Quick self-test ---
if __name__ == "__main__":
    from config import N_FEATURES
    mean = np.zeros(N_FEATURES)
    std  = np.ones(N_FEATURES)

    # Strong deviation
    strong = np.ones(N_FEATURES) * 5.0
    r = detect_anomaly(mean, std, strong)
    print("Status:", r["status"])
    for obs in r["observations"]:
        print(" -", obs)
    print(r["summary"])

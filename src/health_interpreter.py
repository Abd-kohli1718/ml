"""
health_interpreter.py - Convert technical vocal biomarker deviations into
                        medically meaningful, non-diagnostic health insights.

This module is purely rule-based (no APIs, no NLP models).
It maps feature-level z-scores to clinical language using directional
context (increased / decreased) and generates:

    1. Key Observations   - bullet-point health signals
    2. Summary            - one-line overall assessment
    3. Medical Note       - safety disclaimer

IMPORTANT: This is NOT a diagnostic tool. All language uses hedging:
           "possible", "may indicate", "suggests".
"""

from config import TOP_K_FEATURES


# ---------------------------------------------------------------------------
# Directional health-signal mapping
# Each entry: feature_name -> (observation_if_increased, observation_if_decreased)
# ---------------------------------------------------------------------------
HEALTH_SIGNALS = {
    "pitch_mean": (
        "Elevated vocal pitch (may indicate vocal strain or tension)",
        "Lowered vocal pitch (may suggest fatigue or vocal cord changes)",
    ),
    "pitch_std": (
        "Increased voice instability (possible tremor-related issue)",
        "Unusually stable pitch (possible reduced vocal expressiveness)",
    ),
    "energy_mean": (
        "Increased vocal energy (possible compensatory effort)",
        "Reduced breath strength (may indicate respiratory weakness)",
    ),
    "energy_std": (
        "Irregular breathing pattern (suggests inconsistent respiratory effort)",
        "Unusually steady energy (possible reduced vocal dynamics)",
    ),
    "zcr_mean": (
        "Elevated speech noisiness (may suggest airway obstruction)",
        "Reduced speech activity (possible slowed articulation)",
    ),
    "zcr_std": (
        "Inconsistent speech rhythm (may indicate motor coordination changes)",
        "Unusually regular speech rhythm",
    ),
    "spectral_centroid_mean": (
        "Shift in voice brightness (may indicate tone instability)",
        "Reduced voice clarity (possible vocal fatigue)",
    ),
    "spectral_centroid_std": (
        "Unstable voice tone quality (suggests vocal control changes)",
        "Unusually consistent tone (possible reduced expressiveness)",
    ),
    "speech_rate": (
        "Increased speaking pace (possible anxiety or agitation)",
        "Reduced speech rate (may suggest neurological slowing or fatigue)",
    ),
    "pause_count": (
        "Frequent pauses in speech (possible breathlessness or hesitation)",
        "Fewer pauses than baseline (possible rushed speech pattern)",
    ),
    "avg_pause_duration": (
        "Prolonged pauses between words (possible cognitive or respiratory strain)",
        "Shorter pauses than baseline (possible compensatory speech behavior)",
    ),
}

# All MFCC features share one interpretation
_MFCC_SIGNAL = (
    "Irregular vocal tract patterns (suggests changes in voice quality)",
    "Shift in vocal characteristics (possible subtle voice changes)",
)
for _i in range(1, 14):
    HEALTH_SIGNALS["mfcc_%d" % _i] = _MFCC_SIGNAL


# ---------------------------------------------------------------------------
# Severity-based summary templates
# ---------------------------------------------------------------------------
SUMMARY_TEMPLATES = {
    "Stable": (
        "Voice biomarkers are within normal range. "
        "No significant deviations from baseline detected."
    ),
    "Slight Change": (
        "Voice biomarkers show mild deviation from baseline, "
        "suggesting possible early physiological changes. "
        "Continued monitoring is recommended."
    ),
    "High Risk": (
        "Voice biomarkers show noticeable deviation from baseline, "
        "indicating potential physiological changes. "
        "Consider medical consultation if changes persist."
    ),
}

MEDICAL_NOTE = (
    "DISCLAIMER: This is NOT a medical diagnosis. "
    "It is an AI-powered early warning system based on vocal biomarker analysis. "
    "If changes persist or worsen, please consult a healthcare professional."
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def interpret(feature_deltas, deviation_score, status, feature_values=None,
              baseline_mean=None):
    """
    Generate a structured clinical interpretation from raw ML output.

    Parameters
    ----------
    feature_deltas : list of (feature_name, z_score)
        Top-K features sorted by deviation (from anomaly.explain()).
    deviation_score : float
        Overall deviation score.
    status : str
        "Stable" / "Slight Change" / "High Risk"
    feature_values : np.ndarray, optional
        The actual feature vector (used for directionality).
    baseline_mean : np.ndarray, optional
        Baseline mean vector (used for directionality).

    Returns
    -------
    dict with keys:
        observations  - list[str]   bullet-point health signals
        summary       - str         one-line overall assessment
        medical_note  - str         safety disclaimer
    """
    observations = []
    seen_texts = set()

    # Take only top K features
    top_k = feature_deltas[:TOP_K_FEATURES]

    for feat_name, z_score in top_k:
        if z_score < 0.5:
            # Skip negligible deviations
            continue

        # Determine direction if we have the raw values
        direction = _get_direction(feat_name, feature_values, baseline_mean)

        # Look up the health signal
        signals = HEALTH_SIGNALS.get(feat_name)
        if signals:
            if direction == "increased":
                text = signals[0]
            elif direction == "decreased":
                text = signals[1]
            else:
                # Unknown direction — use the increased variant (more common)
                text = signals[0]
        else:
            text = "Change in %s detected" % feat_name

        # De-duplicate (e.g. multiple MFCCs map to same text)
        if text not in seen_texts:
            seen_texts.add(text)
            observations.append(text)

    # If nothing significant, provide a positive message
    if not observations:
        observations.append(
            "No significant vocal changes detected. Voice profile appears healthy."
        )

    summary = SUMMARY_TEMPLATES.get(status, SUMMARY_TEMPLATES["Stable"])

    return {
        "observations": observations,
        "summary": summary,
        "medical_note": MEDICAL_NOTE,
    }


def _get_direction(feat_name, feature_values, baseline_mean):
    """
    Determine if a feature increased or decreased relative to baseline.
    Returns "increased", "decreased", or "unknown".
    """
    if feature_values is None or baseline_mean is None:
        return "unknown"

    from config import FEATURE_NAMES
    try:
        idx = list(FEATURE_NAMES).index(feat_name)
    except ValueError:
        return "unknown"

    diff = feature_values[idx] - baseline_mean[idx]
    if diff > 0:
        return "increased"
    elif diff < 0:
        return "decreased"
    return "unknown"

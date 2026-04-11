"""
predict.py - End-to-end prediction pipeline for voice biomarker analysis.

Connects:  feature_extractor -> baseline -> anomaly -> result

Usage:
    from predict import predict
    result = predict("path/to/recording.wav")
"""

import numpy as np

from feature_extractor import extract_features, extract_features_from_audio
from baseline import load_baseline
from anomaly import detect_anomaly
from utils import get_logger, print_result

logger = get_logger(__name__)


def predict(filepath):
    """
    Run the full voice biomarker analysis on a .wav file.

    Steps
    -----
    1. Extract features from the audio file.
    2. Load the saved baseline profile.
    3. Compute deviation and classify anomaly.
    4. Return a result dict.

    Returns
    -------
    dict  with keys: status, deviation_score, explanation
    None  if feature extraction fails.
    """
    # Step 1 - Feature extraction
    features = extract_features(filepath)
    if features is None:
        logger.error("Feature extraction failed for %s", filepath)
        return None

    # Step 2 - Load baseline
    baseline_mean, baseline_std = load_baseline()

    # Step 3 - Anomaly detection
    result = detect_anomaly(baseline_mean, baseline_std, features)

    logger.info("Prediction complete -> %s", result["status"])
    return result


def predict_from_audio(audio, sr=16000):
    """
    Same pipeline but accepts a raw numpy waveform (for real-time mode).
    """
    features = extract_features_from_audio(audio, sr)
    baseline_mean, baseline_std = load_baseline()
    result = detect_anomaly(baseline_mean, baseline_std, features)
    logger.info("Real-time prediction -> %s", result["status"])
    return result


# --- CLI entry point ---
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python predict.py <path_to_wav>")
        sys.exit(1)

    result = predict(sys.argv[1])
    if result:
        print_result(result)

"""
predict.py - End-to-end prediction pipeline for voice biomarker analysis.

Strategy:
    1. Try the trained ML classifier (voice_classifier.pkl) first.
    2. If no classifier exists, fall back to the z-score baseline method.

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


def _try_classifier(features):
    """
    Attempt to use the trained ML classifier.
    Returns a result dict if classifier exists, None otherwise.
    """
    try:
        from train_classifier import predict_with_classifier
        ml_result = predict_with_classifier(features)
        if ml_result is None:
            return None
        
        # Convert ML classifier output to the standard result format
        from health_interpreter import interpret
        
        # Map ML confidence to a deviation score
        # Higher confidence of "changed" = higher deviation
        if ml_result["label"] == "changed":
            deviation_score = 1.0 + (ml_result["confidence"] * 1.5)
        else:
            deviation_score = (1.0 - ml_result["confidence"]) * 1.3
        
        # Map to status
        if ml_result["label"] == "normal" and ml_result["confidence"] > 0.6:
            status = "Stable"
        elif ml_result["label"] == "changed" and ml_result["confidence"] > 0.7:
            status = "High Risk"
        else:
            status = "Slight Change"
        
        # Get baseline for directional context in interpretation
        try:
            baseline_mean, baseline_std = load_baseline()
            per_feature = np.abs(features - baseline_mean) / baseline_std
            from anomaly import explain
            top_features = explain(per_feature, top_n=5)
        except Exception:
            top_features = []
            baseline_mean = features  # fallback
        
        # Generate clinical interpretation
        health = interpret(
            feature_deltas=top_features,
            deviation_score=deviation_score,
            status=status,
            feature_values=features,
            baseline_mean=baseline_mean,
        )
        
        logger.info("ML Classifier prediction -> %s (confidence: %.1f%%)",
                    status, ml_result["confidence"] * 100)
        
        return {
            "status": status,
            "deviation_score": deviation_score,
            "explanation": top_features,
            "observations": health["observations"],
            "summary": health["summary"],
            "medical_note": health["medical_note"],
            "ml_confidence": ml_result["confidence"],
            "ml_label": ml_result["label"],
        }
    except ImportError:
        return None
    except Exception as e:
        logger.warning("Classifier failed, falling back to z-score: %s", e)
        return None


def predict(filepath):
    """
    Run the full voice biomarker analysis on an audio file.

    Steps
    -----
    1. Extract features from the audio file.
    2. Try ML classifier first (if trained).
    3. Fall back to z-score baseline method.
    4. Return a result dict.

    Returns
    -------
    dict  with keys: status, deviation_score, explanation, observations, summary
    None  if feature extraction fails.
    """
    # Step 1 - Feature extraction
    features = extract_features(filepath)
    if features is None:
        logger.error("Feature extraction failed for %s", filepath)
        return None

    # Step 2 - Try ML classifier
    result = _try_classifier(features)
    if result is not None:
        logger.info("Prediction complete (ML) -> %s", result["status"])
        return result

    # Step 3 - Fallback: Z-score baseline
    baseline_mean, baseline_std = load_baseline()
    result = detect_anomaly(baseline_mean, baseline_std, features)
    logger.info("Prediction complete (z-score) -> %s", result["status"])
    return result


def predict_from_audio(audio, sr=16000):
    """
    Same pipeline but accepts a raw numpy waveform (for real-time mode).
    """
    features = extract_features_from_audio(audio, sr)
    if features is None:
        return None

    # Try ML classifier first
    result = _try_classifier(features)
    if result is not None:
        return result

    # Fallback to z-score
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

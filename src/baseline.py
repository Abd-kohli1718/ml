"""
baseline.py - Build and persist a baseline voice profile.

The baseline is the statistical summary (mean and std) of a user's
normal voice.  It serves as the reference point for anomaly detection.
"""

import os
import numpy as np
import pickle

from config import MODELS_DIR, N_FEATURES
from utils import get_logger, ensure_dir

logger = get_logger(__name__)

BASELINE_FILE = os.path.join(MODELS_DIR, "baseline.pkl")


def build_baseline(feature_vectors):
    """
    Compute baseline profile from multiple normal-voice feature vectors.

    Parameters
    ----------
    feature_vectors : list of np.ndarray
        Each array has shape (N_FEATURES,).

    Returns
    -------
    baseline_mean : np.ndarray of shape (N_FEATURES,)
    baseline_std  : np.ndarray of shape (N_FEATURES,)
    """
    if not feature_vectors:
        raise ValueError("Cannot build baseline from an empty list of feature vectors.")

    matrix = np.stack(feature_vectors)
    baseline_mean = np.mean(matrix, axis=0)
    baseline_std  = np.std(matrix, axis=0)

    # Guard against zero std (would cause division-by-zero in anomaly scoring)
    baseline_std[baseline_std == 0] = 1e-8

    logger.info("Baseline built from %d samples - %d features each",
                len(feature_vectors), N_FEATURES)
    return baseline_mean, baseline_std


def save_baseline(baseline_mean, baseline_std):
    """Serialize baseline to disk.  Returns the saved file path."""
    ensure_dir(MODELS_DIR)
    payload = {"mean": baseline_mean, "std": baseline_std}
    with open(BASELINE_FILE, "wb") as f:
        pickle.dump(payload, f)
    logger.info("Baseline saved -> %s", BASELINE_FILE)
    return BASELINE_FILE


def load_baseline():
    """
    Load a previously saved baseline.

    Returns
    -------
    (baseline_mean, baseline_std)

    Raises
    ------
    FileNotFoundError  if no saved baseline exists.
    """
    if not os.path.isfile(BASELINE_FILE):
        raise FileNotFoundError(
            "No baseline found at %s. "
            "Record normal samples first and run build_baseline()." % BASELINE_FILE
        )
    with open(BASELINE_FILE, "rb") as f:
        payload = pickle.load(f)
    logger.info("Baseline loaded <- %s", BASELINE_FILE)
    return payload["mean"], payload["std"]


# --- Quick self-test ---
if __name__ == "__main__":
    dummy = [np.random.randn(N_FEATURES) for _ in range(10)]
    mean, std = build_baseline(dummy)
    save_baseline(mean, std)
    m2, s2 = load_baseline()
    assert np.allclose(mean, m2) and np.allclose(std, s2)
    print("Baseline build -> save -> load round-trip OK")

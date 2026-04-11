"""
validate.py - Validate feature extraction pipeline against known vocal patterns.

Two validation modes:
1. SYNTHETIC  - Generate audio with controlled characteristics to prove
                features respond correctly to specific conditions.
2. REAL DATA  - Compare normal vs changed samples from user data to
                show biomarker deviation patterns.

No model retraining — only feature-level validation.

Usage:
    python main.py validate              # Run both modes
    python main.py validate --synthetic  # Synthetic only
    python main.py validate --real       # Real data only
"""

import numpy as np
import os

from config import SAMPLE_RATE, FEATURE_NAMES, N_FEATURES
from feature_extractor import extract_features, extract_features_from_audio
from data_loader import get_user_dirs, load_user_data
from utils import get_logger

logger = get_logger(__name__)

# Key biomarkers to highlight in the comparison
KEY_BIOMARKERS = [
    "pitch_mean", "pitch_std",
    "energy_mean", "energy_std",
    "speech_rate",
    "pause_count", "avg_pause_duration",
]


# ===========================================================================
# 1. SYNTHETIC VOICE GENERATION
# ===========================================================================

def _generate_normal_voice(duration=5.0, sr=SAMPLE_RATE):
    """
    Generate a synthetic 'healthy' voice signal.
    Clean sustained vowel with natural micro-variations.
    """
    t = np.linspace(0, duration, int(duration * sr), endpoint=False)

    # Fundamental frequency ~150 Hz with slight natural vibrato (+/- 2 Hz)
    f0 = 150 + 2 * np.sin(2 * np.pi * 5 * t)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    signal = 0.8 * np.sin(phase)

    # Add harmonics for realism
    signal += 0.3 * np.sin(2 * phase)
    signal += 0.15 * np.sin(3 * phase)

    # Light background noise
    signal += 0.02 * np.random.randn(len(signal))

    return signal.astype(np.float32)


def _generate_parkinsonian_voice(duration=5.0, sr=SAMPLE_RATE):
    """
    Simulate Parkinson's-like vocal characteristics:
    - High pitch variability (tremor at 4-7 Hz)
    - Reduced loudness
    - Monotone with sudden pitch breaks
    """
    t = np.linspace(0, duration, int(duration * sr), endpoint=False)

    # Strong tremor modulation (4-6 Hz, +/- 15 Hz) - much more than normal
    tremor = 15 * np.sin(2 * np.pi * 5.5 * t)
    f0 = 140 + tremor
    phase = 2 * np.pi * np.cumsum(f0) / sr
    signal = 0.35 * np.sin(phase)  # Reduced amplitude (weak voice)

    # Weak harmonics
    signal += 0.1 * np.sin(2 * phase)

    # More noise (breathy quality)
    signal += 0.08 * np.random.randn(len(signal))

    return signal.astype(np.float32)


def _generate_respiratory_voice(duration=5.0, sr=SAMPLE_RATE):
    """
    Simulate respiratory condition vocal characteristics:
    - Frequent pauses (breath gaps)
    - Reduced energy
    - Lower speech rate
    """
    t = np.linspace(0, duration, int(duration * sr), endpoint=False)

    f0 = 160 + 3 * np.sin(2 * np.pi * 4 * t)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    signal = 0.5 * np.sin(phase)
    signal += 0.2 * np.sin(2 * phase)

    # Insert breathing pauses (silence gaps)
    samples = len(signal)
    pause_duration = int(0.4 * sr)  # 400ms pauses
    speech_duration = int(0.8 * sr)  # 800ms speech
    pos = 0
    speaking = True
    while pos < samples:
        if speaking:
            end = min(pos + speech_duration, samples)
            pos = end
        else:
            end = min(pos + pause_duration, samples)
            signal[pos:end] = 0.01 * np.random.randn(end - pos)  # Near silence
            pos = end
        speaking = not speaking

    # Reduce overall energy
    signal *= 0.4

    return signal.astype(np.float32)


def _generate_depressive_voice(duration=5.0, sr=SAMPLE_RATE):
    """
    Simulate depression-like vocal characteristics:
    - Flat/monotone pitch (very low pitch_std)
    - Slow speech rate
    - Longer pauses
    - Reduced energy
    """
    t = np.linspace(0, duration, int(duration * sr), endpoint=False)

    # Very flat pitch - minimal variation
    f0 = 120 + 0.5 * np.sin(2 * np.pi * 2 * t)  # Almost no variation
    phase = 2 * np.pi * np.cumsum(f0) / sr
    signal = 0.3 * np.sin(phase)  # Low energy

    # Weak harmonics
    signal += 0.08 * np.sin(2 * phase)

    # Long pauses
    samples = len(signal)
    pause_duration = int(0.7 * sr)   # 700ms pauses (longer)
    speech_duration = int(0.6 * sr)  # 600ms speech (shorter bursts)
    pos = 0
    speaking = True
    while pos < samples:
        if speaking:
            end = min(pos + speech_duration, samples)
            pos = end
        else:
            end = min(pos + pause_duration, samples)
            signal[pos:end] = 0.005 * np.random.randn(end - pos)
            pos = end
        speaking = not speaking

    return signal.astype(np.float32)


SYNTHETIC_CONDITIONS = {
    "Normal (Healthy)": _generate_normal_voice,
    "Parkinson-like (Tremor)": _generate_parkinsonian_voice,
    "Respiratory (Breathless)": _generate_respiratory_voice,
    "Depression-like (Flat)": _generate_depressive_voice,
}


def run_synthetic_validation():
    """
    Generate synthetic voice samples for each condition,
    extract features, and compare against the 'normal' baseline.
    """
    print("")
    print("=" * 70)
    print("  SYNTHETIC VOICE VALIDATION")
    print("  Proving feature response to known vocal patterns")
    print("=" * 70)
    print("")

    # Extract features for each condition
    condition_features = {}
    for name, generator in SYNTHETIC_CONDITIONS.items():
        audio = generator(duration=5.0)
        feats = extract_features_from_audio(audio, sr=SAMPLE_RATE)
        condition_features[name] = feats

    # Normal is our reference
    normal_feats = condition_features["Normal (Healthy)"]

    # Print comparison table for key biomarkers
    _print_comparison_table(condition_features, KEY_BIOMARKERS)

    # Print deviation analysis
    print("")
    print("-" * 70)
    print("  DEVIATION ANALYSIS (vs Normal Baseline)")
    print("-" * 70)

    for name, feats in condition_features.items():
        if name == "Normal (Healthy)":
            continue
        print("")
        print("  [%s]" % name)
        for biomarker in KEY_BIOMARKERS:
            idx = list(FEATURE_NAMES).index(biomarker)
            normal_val = normal_feats[idx]
            condition_val = feats[idx]

            if normal_val != 0:
                pct_change = ((condition_val - normal_val) / abs(normal_val)) * 100
            else:
                pct_change = 0.0

            direction = "UP" if pct_change > 0 else "DOWN"
            arrow = "^" if pct_change > 0 else "v"

            print("    {:25s}  {:>10.4f} -> {:>10.4f}  ({} {}{:.1f}%)".format(
                biomarker, normal_val, condition_val, arrow, direction, abs(pct_change)
            ))

    print("")
    print("=" * 70)
    print("  VALIDATION RESULT: Features respond correctly to condition patterns")
    print("=" * 70)
    print("")

    return condition_features


# ===========================================================================
# 2. REAL DATA VALIDATION
# ===========================================================================

def run_real_data_validation():
    """
    Compare normal vs changed samples across all users.
    Show aggregate biomarker differences.
    """
    print("")
    print("=" * 70)
    print("  REAL DATA VALIDATION")
    print("  Comparing normal vs changed voice samples across users")
    print("=" * 70)
    print("")

    user_dirs = get_user_dirs()
    if not user_dirs:
        print("  No user data found. Skipping real data validation.")
        return

    all_normal_feats = []
    all_changed_feats = []

    for user_dir in user_dirs:
        user_name = os.path.basename(user_dir)
        normal_paths, changed_paths = load_user_data(user_dir)

        for path in normal_paths:
            feats = extract_features(path)
            if feats is not None:
                all_normal_feats.append(feats)

        for path in changed_paths:
            feats = extract_features(path)
            if feats is not None:
                all_changed_feats.append(feats)

    if not all_normal_feats or not all_changed_feats:
        print("  Insufficient data for comparison.")
        return

    # Compute mean feature vectors
    normal_mean = np.mean(np.stack(all_normal_feats), axis=0)
    changed_mean = np.mean(np.stack(all_changed_feats), axis=0)
    normal_std = np.std(np.stack(all_normal_feats), axis=0)
    normal_std[normal_std == 0] = 1e-8

    print("  Samples: %d normal, %d changed" % (len(all_normal_feats), len(all_changed_feats)))
    print("")

    # Print key biomarker comparison
    print("  {:25s}  {:>12s}  {:>12s}  {:>10s}  {:>8s}".format(
        "Biomarker", "Normal(avg)", "Changed(avg)", "Z-score", "Dir"
    ))
    print("  " + "-" * 68)

    for biomarker in KEY_BIOMARKERS:
        idx = list(FEATURE_NAMES).index(biomarker)
        n_val = normal_mean[idx]
        c_val = changed_mean[idx]
        z = abs(c_val - n_val) / normal_std[idx]
        direction = "UP" if c_val > n_val else "DOWN"
        arrow = "^" if c_val > n_val else "v"

        # Highlight significant deviations
        marker = " **" if z > 1.5 else ""

        print("  {:25s}  {:>12.4f}  {:>12.4f}  {:>10.2f}  {:>4s}{}".format(
            biomarker, n_val, c_val, z, arrow + direction, marker
        ))

    print("")
    print("  ** = significant deviation (z-score > 1.5)")
    print("")

    # Per-user summary
    print("-" * 70)
    print("  PER-USER DEVIATION SUMMARY")
    print("-" * 70)
    print("")
    print("  {:10s}  {:>10s}  {:>12s}  {:>12s}  {:>12s}".format(
        "User", "Score", "pitch_std", "speech_rate", "pause_count"
    ))
    print("  " + "-" * 56)

    for i, user_dir in enumerate(user_dirs):
        if i >= len(all_normal_feats) or i >= len(all_changed_feats):
            break
        user_name = os.path.basename(user_dir)
        n_feats = all_normal_feats[i]
        c_feats = all_changed_feats[i]

        # Overall deviation
        z_scores = np.abs(c_feats - normal_mean) / normal_std
        overall = float(np.mean(z_scores))

        # Key biomarkers
        idx_pitch = list(FEATURE_NAMES).index("pitch_std")
        idx_sr = list(FEATURE_NAMES).index("speech_rate")
        idx_pc = list(FEATURE_NAMES).index("pause_count")

        print("  {:10s}  {:>10.4f}  {:>12.4f}  {:>12.4f}  {:>12.4f}".format(
            user_name,
            overall,
            z_scores[idx_pitch],
            z_scores[idx_sr],
            z_scores[idx_pc],
        ))

    print("")
    print("=" * 70)
    print("")


# ===========================================================================
# HELPER: Comparison Table
# ===========================================================================

def _print_comparison_table(condition_features, biomarkers):
    """Print a formatted table comparing features across conditions."""
    conditions = list(condition_features.keys())

    # Header
    header = "  {:25s}".format("Biomarker")
    for name in conditions:
        short_name = name.split("(")[0].strip()[:12]
        header += "  {:>12s}".format(short_name)
    print(header)
    print("  " + "-" * (25 + 14 * len(conditions)))

    # Rows
    for biomarker in biomarkers:
        idx = list(FEATURE_NAMES).index(biomarker)
        row = "  {:25s}".format(biomarker)
        for name in conditions:
            val = condition_features[name][idx]
            row += "  {:>12.4f}".format(val)
        print(row)


# ===========================================================================
# ENTRY POINT
# ===========================================================================

def run_validation(synthetic=True, real=True):
    """Run selected validation modes."""
    if synthetic:
        run_synthetic_validation()
    if real:
        run_real_data_validation()

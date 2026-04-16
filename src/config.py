"""
config.py - Central configuration for the Voice Biomarker ML project.

All constants, paths, and thresholds live here so every other module
imports from a single source of truth.
"""

import os

# --- Audio Settings ---
SAMPLE_RATE = 16000           # Hz - standard for speech processing
N_MFCC = 13                   # Number of Mel-frequency cepstral coefficients
AUDIO_DURATION = 15           # Max recording duration in seconds (real-time mode)
SUPPORTED_EXTENSIONS = (".wav", ".mp3", ".ogg", ".flac", ".m4a")

# --- Project Paths ---
# Resolve paths relative to the project root (one level above src/)
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

DATA_RAW_DIR = os.path.join(_PROJECT_ROOT, "data", "raw")
MODELS_DIR = os.path.join(_PROJECT_ROOT, "models")
RECORDINGS_DIR = os.path.join(_PROJECT_ROOT, "recordings")

# --- Anomaly Detection Thresholds (calibrated to observed data) ---
THRESHOLD_LOW = 1.8           # < this  -> Stable
THRESHOLD_MEDIUM = 2.5        # <= this -> Slight Change
# Anything above THRESHOLD_MEDIUM -> High Risk

# --- Interpretation Settings ---
TOP_K_FEATURES = 3            # Show only top K features in health interpretation

# --- Feature-to-Health Explanation Mapping ---
# Converts technical feature names into human-readable health insights
FEATURE_HEALTH_MAP = {
    "pitch_mean":              "change in vocal pitch (possible tension or fatigue)",
    "pitch_std":               "voice instability or tremor",
    "energy_mean":             "reduced breath strength",
    "energy_std":              "irregular breathing pattern",
    "zcr_mean":                "change in speech activity",
    "zcr_std":                 "inconsistent speech rhythm",
    "spectral_centroid_mean":  "shift in voice brightness / clarity",
    "spectral_centroid_std":   "unstable voice tone quality",
    "speech_rate":             "change in speaking pace (possible fatigue or breathlessness)",
    "pause_count":             "abnormal pause frequency (possible hesitation or breathlessness)",
    "avg_pause_duration":      "prolonged pauses between words (possible cognitive or respiratory change)",
    "jitter":                  "vocal fold vibration instability (key Parkinson's / neurological indicator)",
    "shimmer":                 "voice amplitude irregularity (possible vocal cord lesion or fatigue)",
    "hnr":                     "change in voice clarity / breathiness (harmonics-to-noise ratio)",
}
# All MFCC features map to the same health explanation
for _i in range(1, N_MFCC + 1):
    FEATURE_HEALTH_MAP[f"mfcc_{_i}"] = "voice pattern irregularity"

# --- Feature Names (for interpretability) ---
# Order must match the vector returned by feature_extractor.extract_features()
FEATURE_NAMES = (
    [f"mfcc_{i+1}" for i in range(N_MFCC)]
    + ["pitch_mean", "pitch_std"]
    + ["energy_mean", "energy_std"]
    + ["zcr_mean", "zcr_std"]
    + ["spectral_centroid_mean", "spectral_centroid_std"]
    + ["speech_rate", "pause_count", "avg_pause_duration"]
    + ["jitter", "shimmer", "hnr"]
)

# Total feature count
N_FEATURES = len(FEATURE_NAMES)

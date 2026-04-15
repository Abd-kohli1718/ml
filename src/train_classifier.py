"""
train_classifier.py - Train a real ML classifier on the dysphonia dataset.

Uses the F_Con/M_Con (healthy) and F_Dys/M_Dys (dysphonia) wav datasets
plus the original data/raw user recordings. Applies data augmentation to
expand the training set, then trains a GradientBoosting classifier.

The trained model is saved to models/voice_classifier.pkl and is
automatically used by predict.py when available.

Usage:
    cd voice-health-ml
    python src/train_classifier.py
"""

import os
import sys
import random
import time
import numpy as np
import pickle
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

from config import MODELS_DIR, FEATURE_NAMES, SAMPLE_RATE, SUPPORTED_EXTENSIONS
from feature_extractor import extract_features, extract_features_from_audio
from augment import augment_audio
from utils import get_logger, ensure_dir

logger = get_logger(__name__)

# --- Paths to external datasets ---
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_DATASET_ROOT = os.path.abspath(os.path.join(_PROJECT_ROOT, ".."))

EXTERNAL_DATASETS = {
    "normal": [
        os.path.join(_DATASET_ROOT, "F_Con"),
        os.path.join(_DATASET_ROOT, "M_Con"),
    ],
    "changed": [
        os.path.join(_DATASET_ROOT, "F_Dys"),
        os.path.join(_DATASET_ROOT, "M_Dys"),
    ],
}

# Internal dataset (data/raw/userX/normal and data/raw/userX/changed)
INTERNAL_DATA = os.path.join(_PROJECT_ROOT, "data", "raw")

CLASSIFIER_FILE = os.path.join(MODELS_DIR, "voice_classifier.pkl")

# How many files to sample from each external dataset folder
MAX_FILES_PER_FOLDER = 200  # 200 * 4 folders = 800 base files, ~7200 with augmentation


def collect_wav_files(directory, max_files=None):
    """Recursively collect .wav files from a directory."""
    wav_files = []
    if not os.path.isdir(directory):
        logger.warning("Directory not found: %s", directory)
        return wav_files

    for root, _, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(".wav"):
                wav_files.append(os.path.join(root, f))

    # Shuffle and limit
    random.shuffle(wav_files)
    if max_files and len(wav_files) > max_files:
        wav_files = wav_files[:max_files]

    return wav_files


def collect_internal_files():
    """Collect audio files from data/raw/userX/{normal,changed}."""
    normal_files = []
    changed_files = []

    if not os.path.isdir(INTERNAL_DATA):
        return normal_files, changed_files

    for user_dir in sorted(os.listdir(INTERNAL_DATA)):
        user_path = os.path.join(INTERNAL_DATA, user_dir)
        if not os.path.isdir(user_path):
            continue

        normal_dir = os.path.join(user_path, "normal")
        changed_dir = os.path.join(user_path, "changed")

        if os.path.isdir(normal_dir):
            for f in os.listdir(normal_dir):
                if f.lower().endswith(SUPPORTED_EXTENSIONS):
                    normal_files.append(os.path.join(normal_dir, f))

        if os.path.isdir(changed_dir):
            for f in os.listdir(changed_dir):
                if f.lower().endswith(SUPPORTED_EXTENSIONS):
                    changed_files.append(os.path.join(changed_dir, f))

    return normal_files, changed_files


def extract_features_safe(filepath):
    """Extract features with error handling."""
    try:
        return extract_features(filepath)
    except Exception:
        return None


def build_dataset():
    """
    Collect files from all sources, extract features, apply augmentation.
    Returns X (feature matrix) and y (labels: 0=normal, 1=changed).
    """
    print("\n" + "=" * 60)
    print("  VOICE HEALTH ML - Dataset Builder")
    print("=" * 60)

    # --- Collect file paths ---
    normal_files = []
    changed_files = []

    # 1. External datasets (F_Con, M_Con, F_Dys, M_Dys)
    for folder in EXTERNAL_DATASETS["normal"]:
        files = collect_wav_files(folder, max_files=MAX_FILES_PER_FOLDER)
        normal_files.extend(files)
        print("  [OK] %s: %d wav files" % (os.path.basename(folder), len(files)))

    for folder in EXTERNAL_DATASETS["changed"]:
        files = collect_wav_files(folder, max_files=MAX_FILES_PER_FOLDER)
        changed_files.extend(files)
        print("  [OK] %s: %d wav files" % (os.path.basename(folder), len(files)))

    # 2. Internal dataset (data/raw)
    int_normal, int_changed = collect_internal_files()
    normal_files.extend(int_normal)
    changed_files.extend(int_changed)
    print("  [OK] Internal data: %d normal, %d changed" % (len(int_normal), len(int_changed)))

    total_base = len(normal_files) + len(changed_files)
    print("\n  Total base files: %d normal + %d changed = %d" % (len(normal_files), len(changed_files), total_base))

    # --- Extract features ---
    print("\n  Extracting features...")
    X_features = []
    y_labels = []

    total = len(normal_files) + len(changed_files)
    processed = 0
    failed = 0

    import librosa

    for filepath, label in [(f, 0) for f in normal_files] + [(f, 1) for f in changed_files]:
        processed += 1
        if processed % 25 == 0 or processed == total:
            sys.stdout.write("\r    [%d/%d] Processing... (%d failed)" % (processed, total, failed))
            sys.stdout.flush()

        # Extract original features
        feats = extract_features_safe(filepath)
        if feats is None:
            failed += 1
            continue

        X_features.append(feats)
        y_labels.append(label)

        # Augment: load audio and generate variations
        try:
            audio, sr = librosa.load(filepath, sr=SAMPLE_RATE, duration=10)
            if len(audio) < SAMPLE_RATE:  # Skip very short files
                continue

            augmented_clips = augment_audio(audio, sr)
            for aug_audio in augmented_clips:
                aug_feats = extract_features_from_audio(aug_audio, sr)
                if aug_feats is not None:
                    X_features.append(aug_feats)
                    y_labels.append(label)
        except Exception:
            pass  # Augmentation failure is non-critical

    print("\n\n  Feature extraction complete!")
    X = np.array(X_features)
    y = np.array(y_labels)

    n_normal = int(np.sum(y == 0))
    n_changed = int(np.sum(y == 1))
    print("  Final dataset: %d samples x %d features" % (X.shape[0], X.shape[1]))
    print("  Classes: %d normal (healthy) / %d changed (dysphonia)" % (n_normal, n_changed))

    return X, y


def train():
    """Train the voice health classifier and save it."""
    X, y = build_dataset()

    if len(X) < 20:
        print("\n  [FAIL] Not enough samples to train. Need at least 20, got:", len(X))
        return None

    print("\n" + "=" * 60)
    print("  Training Classifier...")
    print("=" * 60)

    # Build pipeline: Scaler + GradientBoosting
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            subsample=0.8,
            random_state=42
        ))
    ])

    # Cross-validation
    n_splits = min(5, min(int(np.sum(y == 0)), int(np.sum(y == 1))))
    if n_splits >= 2:
        cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
        print("\n  Running %d-fold cross-validation..." % n_splits)
        scores = cross_val_score(pipeline, X, y, cv=cv, scoring='accuracy')
        print("  [OK] Cross-val accuracy: %.1f%% (+/- %.1f%%)" % (scores.mean() * 100, scores.std() * 100))

    # Train on full dataset
    print("\n  Training on full dataset...")
    start = time.time()
    pipeline.fit(X, y)
    elapsed = time.time() - start
    print("  [OK] Training completed in %.1fs" % elapsed)

    # Classification report on training set
    y_pred = pipeline.predict(X)
    print("\n  Training Set Classification Report:")
    print("  " + "-" * 50)
    report = classification_report(y, y_pred, target_names=["Normal", "Dysphonia"], digits=3)
    for line in report.split("\n"):
        print("  %s" % line)

    # Feature importance
    importances = pipeline['classifier'].feature_importances_
    top_features = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)[:10]
    print("\n  Top 10 Most Important Features:")
    print("  " + "-" * 40)
    for name, imp in top_features:
        bar = "#" * int(imp * 100)
        print("    %-30s  %.4f  %s" % (name, imp, bar))

    # Save model
    ensure_dir(MODELS_DIR)
    with open(CLASSIFIER_FILE, 'wb') as f:
        pickle.dump(pipeline, f)
    print("\n  [OK] Model saved -> %s" % CLASSIFIER_FILE)

    # Also rebuild baseline from normal samples for fallback
    print("\n" + "=" * 60)
    print("  Rebuilding baseline (fallback for z-score method)...")
    normal_features = X[y == 0]
    baseline_mean = np.mean(normal_features, axis=0)
    baseline_std = np.std(normal_features, axis=0)
    baseline_std[baseline_std < 1e-8] = 1e-8  # Prevent division by zero

    baseline_file = os.path.join(MODELS_DIR, "baseline.pkl")
    with open(baseline_file, 'wb') as f:
        pickle.dump({"mean": baseline_mean, "std": baseline_std}, f)
    print("  [OK] Baseline saved -> %s" % baseline_file)

    print("\n" + "=" * 60)
    print("  ** Training complete! Your model is ready. **")
    print("=" * 60 + "\n")

    return pipeline


def predict_with_classifier(feature_vector):
    """
    Predict using the trained classifier.
    Returns dict with label, confidence, and probabilities.
    Returns None if no trained classifier exists (falls back to z-score).
    """
    if not os.path.isfile(CLASSIFIER_FILE):
        return None

    with open(CLASSIFIER_FILE, 'rb') as f:
        pipeline = pickle.load(f)

    X = feature_vector.reshape(1, -1)
    prediction = pipeline.predict(X)[0]
    probabilities = pipeline.predict_proba(X)[0]

    return {
        "label": "normal" if prediction == 0 else "changed",
        "confidence": float(max(probabilities)),
        "prob_normal": float(probabilities[0]),
        "prob_changed": float(probabilities[1]),
    }


if __name__ == "__main__":
    train()

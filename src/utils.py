"""
utils.py - Shared helper functions used across the project.

Keeps re-usable logic (normalization, safe I/O, logging) in one place.
"""

import os
import logging
import numpy as np


# --- Logger Setup ---
def get_logger(name="voice-biomarker"):
    """Return a consistently-formatted logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        fmt = logging.Formatter(
            "[%(asctime)s] %(levelname)s | %(name)s | %(message)s",
            datefmt="%H:%M:%S",
        )
        handler.setFormatter(fmt)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


# --- Audio Normalization ---
def normalize_audio(audio):
    """
    Peak-normalize an audio waveform to [-1, 1].
    Returns a zero array unchanged to avoid division by zero.
    """
    peak = np.max(np.abs(audio))
    if peak == 0:
        return audio
    return audio / peak


# --- Audio Preprocessing / Noise Reduction ---
def pre_emphasis(audio, coeff=0.97):
    """
    Apply pre-emphasis filter to boost high frequencies.
    This compensates for the natural roll-off in speech and
    improves SNR for downstream feature extraction.
    """
    return np.append(audio[0], audio[1:] - coeff * audio[:-1])


def reduce_noise(audio, sr=16000, noise_duration=0.5):
    """
    Simple spectral-subtraction noise reduction.

    Steps:
    1. Estimate noise profile from the first `noise_duration` seconds
       (assumed to be silence / ambient noise).
    2. Compute STFT of the full signal.
    3. Subtract the estimated noise magnitude spectrum.
    4. Reconstruct the cleaned signal via ISTFT.

    Uses only numpy + librosa — no heavy external libs.
    """
    import librosa

    # Number of samples in the noise estimation window
    n_noise = int(noise_duration * sr)
    if n_noise >= len(audio):
        # Audio too short to estimate noise — skip
        return audio

    # STFT parameters
    n_fft = 2048
    hop_length = 512

    # Full signal STFT
    stft_full = librosa.stft(audio, n_fft=n_fft, hop_length=hop_length)
    mag_full = np.abs(stft_full)
    phase_full = np.angle(stft_full)

    # Noise profile: mean magnitude from the first noise_duration seconds
    stft_noise = librosa.stft(audio[:n_noise], n_fft=n_fft, hop_length=hop_length)
    noise_profile = np.mean(np.abs(stft_noise), axis=1, keepdims=True)

    # Spectral subtraction (floor at zero to avoid negative magnitudes)
    mag_cleaned = np.maximum(mag_full - noise_profile, 0.0)

    # Reconstruct
    stft_cleaned = mag_cleaned * np.exp(1j * phase_full)
    audio_cleaned = librosa.istft(stft_cleaned, hop_length=hop_length, length=len(audio))

    return audio_cleaned


def preprocess_audio(audio, sr=16000):
    """
    Full preprocessing pipeline: noise reduction -> pre-emphasis -> normalize.
    Call this before feature extraction.
    """
    audio = reduce_noise(audio, sr=sr)
    audio = pre_emphasis(audio)
    audio = normalize_audio(audio)
    return audio


# --- Safe File Loading ---
def safe_load_audio(filepath, sr=16000):
    """
    Load an audio file safely with librosa.
    Returns (audio_array, sample_rate) or (None, None) on failure.
    """
    import librosa

    logger = get_logger()
    if not os.path.isfile(filepath):
        logger.error("File not found: %s", filepath)
        return None, None
    try:
        audio, sample_rate = librosa.load(filepath, sr=sr)
        logger.info("Loaded %s - %.1fs @ %dHz",
                     os.path.basename(filepath),
                     len(audio) / sample_rate,
                     sample_rate)
        return audio, sample_rate
    except Exception as e:
        logger.error("Failed to load %s: %s", filepath, e)
        return None, None


# --- Directory Helpers ---
def ensure_dir(path):
    """Create directory (and parents) if it doesn't exist. Returns the path."""
    os.makedirs(path, exist_ok=True)
    return path


# --- Pretty Printing ---
def print_result(result):
    """Print a prediction result in clinical report format."""
    status = result.get("status", "N/A")
    score = result.get("deviation_score", 0)

    print("")
    print("=" * 60)
    print("  VOICE BIOMARKER ANALYSIS REPORT")
    print("=" * 60)
    print("")
    print("  Voice Status    : %s" % status)
    print("  Deviation Score : %.4f" % score)
    print("")

    # Key Observations (clinical insights)
    observations = result.get("observations", [])
    if observations:
        print("-" * 60)
        print("  Key Observations:")
        for obs in observations:
            print("    - %s" % obs)
        print("")

    # Summary
    summary = result.get("summary", "")
    if summary:
        print("-" * 60)
        print("  Summary:")
        print("    %s" % summary)
        print("")

    # Medical Note
    medical_note = result.get("medical_note", "")
    if medical_note:
        print("-" * 60)
        print("  Medical Note:")
        print("    %s" % medical_note)
        print("")

    # Technical feature breakdown (for reference)
    explanation = result.get("explanation", [])
    if explanation:
        print("-" * 60)
        print("  Technical Details (Top Feature Deviations):")
        for feat, delta in explanation:
            print("    - {:30s}  delta = {:.4f}".format(feat, delta))

    print("=" * 60)
    print("")

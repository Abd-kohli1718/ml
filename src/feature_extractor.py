"""
feature_extractor.py - Extract vocal biomarker features from audio.

This is the heart of the pipeline. For every audio input it produces a
fixed-length feature vector capturing:

    Feature                   What it captures
    -------                   ----------------
    MFCC (1-13)               Vocal tract shape / timbre
    Pitch mean / std          Fundamental frequency and tremor
    Energy mean / std         Breath strength and dynamics
    ZCR mean / std            Speech activity / noisiness
    Spectral centroid m/s     Voice brightness / clarity
    Speech rate               Speaking pace (voiced / total duration)
    Pause count               Number of silent gaps
    Avg pause duration        Mean length of pauses (seconds)

Output vector length = 13 + 2 + 2 + 2 + 2 + 1 + 1 + 1 = 24
"""

import os
import numpy as np
import librosa

from config import SAMPLE_RATE, N_MFCC
from utils import preprocess_audio, safe_load_audio, get_logger

logger = get_logger(__name__)


# --- Individual Feature Extractors ---

def _extract_mfcc(audio, sr):
    """Return mean of each MFCC coefficient -> (N_MFCC,) vector."""
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=N_MFCC)
    return np.mean(mfccs, axis=1)


def _extract_pitch(audio, sr):
    """
    Estimate fundamental frequency (F0) using pyin.
    Returns [pitch_mean, pitch_std].
    Unvoiced frames (NaN) are ignored.
    """
    f0, voiced_flag, _ = librosa.pyin(
        audio, fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"), sr=sr
    )
    # Keep only voiced frames
    if f0 is not None:
        f0_voiced = f0[~np.isnan(f0)]
    else:
        f0_voiced = np.array([0.0])
    if len(f0_voiced) == 0:
        f0_voiced = np.array([0.0])
    return np.array([np.mean(f0_voiced), np.std(f0_voiced)])


def _extract_energy(audio):
    """RMS energy -> [mean, std].  Captures breath strength."""
    rms = librosa.feature.rms(y=audio)[0]
    return np.array([np.mean(rms), np.std(rms)])


def _extract_zcr(audio):
    """Zero-crossing rate -> [mean, std].  Indicates speech activity."""
    zcr = librosa.feature.zero_crossing_rate(y=audio)[0]
    return np.array([np.mean(zcr), np.std(zcr)])


def _extract_spectral_centroid(audio, sr):
    """Spectral centroid -> [mean, std].  Measures voice brightness."""
    centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
    return np.array([np.mean(centroid), np.std(centroid)])


def _extract_speech_rate(audio, sr):
    """
    Estimate speech rate as the ratio of voiced duration to total duration.

    Method: Use RMS energy to find voiced segments. Frames above a threshold
    are considered voiced. speech_rate = voiced_time / total_time.

    Returns [speech_rate] as a single-element array.
    """
    # Frame-level RMS energy
    rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
    total_frames = len(rms)

    if total_frames == 0:
        return np.array([0.0])

    # Threshold: frames with energy > 10% of max are considered voiced
    threshold = 0.1 * np.max(rms)
    voiced_frames = np.sum(rms > threshold)

    speech_rate = voiced_frames / total_frames
    return np.array([speech_rate])


def _extract_pause_patterns(audio, sr):
    """
    Detect pauses (silent segments) in the audio.

    Method:
    - Compute frame-level RMS energy
    - Frames below threshold = silence
    - Group consecutive silent frames into pauses
    - Count pauses and compute average pause duration

    Returns [pause_count, avg_pause_duration_seconds]
    """
    hop_length = 512
    rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=hop_length)[0]

    if len(rms) == 0:
        return np.array([0.0, 0.0])

    # Threshold: frames below 10% of max energy are silent
    threshold = 0.1 * np.max(rms)
    is_silent = rms < threshold

    # Find pause boundaries (groups of consecutive silent frames)
    pauses = []
    in_pause = False
    pause_start = 0

    for i, silent in enumerate(is_silent):
        if silent and not in_pause:
            # Pause begins
            in_pause = True
            pause_start = i
        elif not silent and in_pause:
            # Pause ends
            in_pause = False
            pause_length_frames = i - pause_start
            # Only count pauses longer than 3 frames (~96ms) to ignore micro-gaps
            if pause_length_frames >= 3:
                pause_duration = pause_length_frames * hop_length / sr
                pauses.append(pause_duration)

    # Handle pause that extends to the end
    if in_pause:
        pause_length_frames = len(is_silent) - pause_start
        if pause_length_frames >= 3:
            pause_duration = pause_length_frames * hop_length / sr
            pauses.append(pause_duration)

    pause_count = len(pauses)
    avg_pause_duration = np.mean(pauses) if pauses else 0.0

    return np.array([float(pause_count), avg_pause_duration])


# --- Core extraction pipeline ---

def _run_extraction(audio, sr):
    """Extract all features from a preprocessed audio array. Returns (24,) vector."""
    mfcc          = _extract_mfcc(audio, sr)
    pitch         = _extract_pitch(audio, sr)
    energy        = _extract_energy(audio)
    zcr           = _extract_zcr(audio)
    centroid      = _extract_spectral_centroid(audio, sr)
    speech_rate   = _extract_speech_rate(audio, sr)
    pause_pattern = _extract_pause_patterns(audio, sr)

    return np.concatenate([mfcc, pitch, energy, zcr, centroid,
                           speech_rate, pause_pattern])


# --- Public API ---

def extract_features(filepath):
    """
    Full feature extraction pipeline for a single audio file.

    Pipeline: load -> preprocess (noise reduction + pre-emphasis + normalize)
              -> extract 24 biomarker features.

    Parameters
    ----------
    filepath : str
        Path to an audio file (.wav, .mp3, etc.)

    Returns
    -------
    np.ndarray of shape (24,)  or  None on failure.
    """
    # 1. Load audio
    audio, sr = safe_load_audio(filepath, sr=SAMPLE_RATE)
    if audio is None:
        return None

    # 2. Preprocess: noise reduction + pre-emphasis + normalize
    audio = preprocess_audio(audio, sr=sr)

    # 3. Extract all features
    feature_vector = _run_extraction(audio, sr)

    logger.info("Extracted %d features from %s",
                len(feature_vector), os.path.basename(filepath))
    return feature_vector


def extract_features_from_audio(audio, sr=SAMPLE_RATE):
    """
    Same pipeline but accepts a raw numpy waveform instead of a file path.
    Useful for real-time mode where audio is already in memory.
    """
    audio = preprocess_audio(audio, sr=sr)
    return _run_extraction(audio, sr)


# --- Quick self-test ---
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python feature_extractor.py <path_to_audio>")
        sys.exit(1)
    feats = extract_features(sys.argv[1])
    if feats is not None:
        from config import FEATURE_NAMES
        print("\nFeature vector (%d dims):" % len(feats))
        for name, val in zip(FEATURE_NAMES, feats):
            print("  {:30s}  {: .6f}".format(name, val))

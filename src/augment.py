"""
augment.py - Audio data augmentation for expanding the training dataset.

Each original audio clip is transformed into multiple variations to
increase the effective dataset size without needing new recordings.
"""

import numpy as np
import librosa

from utils import get_logger

logger = get_logger(__name__)


def augment_audio(audio, sr=16000):
    """
    Generate multiple augmented versions of an audio clip.

    Augmentations applied:
    - Time stretching (faster / slower speaking)
    - Pitch shifting (higher / lower voice)
    - Background noise injection
    - Volume variation

    Parameters
    ----------
    audio : np.ndarray - raw audio waveform
    sr    : int        - sample rate

    Returns
    -------
    list[np.ndarray] - augmented audio clips (does NOT include original)
    """
    augmented = []

    # 1. Time stretch (simulates faster/slower speech)
    for rate in [0.9, 1.1]:
        try:
            stretched = librosa.effects.time_stretch(audio, rate=rate)
            augmented.append(stretched)
        except Exception:
            pass

    # 2. Pitch shift (simulates different vocal registers)
    for steps in [-1.5, 1.5]:
        try:
            shifted = librosa.effects.pitch_shift(audio, sr=sr, n_steps=steps)
            augmented.append(shifted)
        except Exception:
            pass

    # 3. Add noise at different levels (simulates noisy environments)
    for noise_level in [0.003, 0.008]:
        noise = noise_level * np.random.randn(len(audio))
        augmented.append((audio + noise).astype(np.float32))

    # 4. Volume variation (simulates speaking closer/further from mic)
    for gain in [0.6, 1.4]:
        augmented.append((audio * gain).astype(np.float32))

    return augmented  # 8 extra samples per original

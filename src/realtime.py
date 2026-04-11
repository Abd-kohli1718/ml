"""
realtime.py - Record live audio from the microphone and run voice biomarker analysis.

Flow:
    1. Record 10-15 seconds of audio via sounddevice.
    2. Save the recording as a .wav file.
    3. Pass it through the prediction pipeline.
    4. Print the result.

Usage:
    python realtime.py                   # default 10s recording
    python realtime.py --duration 15     # custom duration
"""

import os
import argparse
import datetime
import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wav

from config import SAMPLE_RATE, AUDIO_DURATION, RECORDINGS_DIR
from predict import predict
from utils import get_logger, ensure_dir, print_result

logger = get_logger(__name__)


def record_audio(duration=AUDIO_DURATION, sr=SAMPLE_RATE):
    """
    Record audio from the default microphone.

    Parameters
    ----------
    duration : int   - seconds to record
    sr       : int   - sample rate

    Returns
    -------
    np.ndarray  - mono waveform of shape (duration * sr,)
    """
    print("\nRecording for %d seconds... Speak now!" % duration)
    audio = sd.rec(int(duration * sr), samplerate=sr, channels=1, dtype="float32")
    sd.wait()  # block until recording is finished
    print("Recording complete.\n")
    return audio.flatten()


def save_recording(audio, sr=SAMPLE_RATE):
    """
    Save a numpy waveform to a timestamped .wav file.

    Returns the file path.
    """
    ensure_dir(RECORDINGS_DIR)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = "recording_%s.wav" % timestamp
    filepath = os.path.join(RECORDINGS_DIR, filename)

    # Scale float32 [-1, 1] -> int16 for WAV compatibility
    audio_int16 = np.int16(audio * 32767)
    wav.write(filepath, sr, audio_int16)

    logger.info("Saved recording -> %s", filepath)
    return filepath


def main():
    parser = argparse.ArgumentParser(description="Real-time voice biomarker analysis")
    parser.add_argument(
        "--duration", type=int, default=10,
        help="Recording duration in seconds (default: 10)"
    )
    args = parser.parse_args()

    # 1. Record
    audio = record_audio(duration=args.duration)

    # 2. Save
    filepath = save_recording(audio)

    # 3. Predict
    result = predict(filepath)

    # 4. Display
    if result:
        print_result(result)
    else:
        print("Analysis failed. Check the logs above.")


if __name__ == "__main__":
    main()

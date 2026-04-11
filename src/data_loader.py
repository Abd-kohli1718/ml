"""
data_loader.py - Load audio file paths and labels from the structured data folder.

Expected folder layout (per-user):
    data/raw/
      user1/
        normal/    <- healthy baseline recordings (.wav, .mp3, etc.)
        changed/   <- recordings with vocal changes
      user2/
        normal/
        changed/
      ...

Returns parallel lists of file paths and their labels.
"""

import os

from config import DATA_RAW_DIR, SUPPORTED_EXTENSIONS
from utils import get_logger

logger = get_logger(__name__)

# Label constants
LABEL_NORMAL = "normal"
LABEL_CHANGED = "changed"


def _is_audio_file(filename):
    """Check if a filename has a supported audio extension."""
    return filename.lower().endswith(SUPPORTED_EXTENSIONS)


def _collect_audio_files(directory, label):
    """Walk directory and return (paths, labels) for every audio file found."""
    paths = []
    labels = []

    if not os.path.isdir(directory):
        return paths, labels

    for root, _, files in os.walk(directory):
        for fname in sorted(files):
            if _is_audio_file(fname):
                paths.append(os.path.join(root, fname))
                labels.append(label)

    return paths, labels


def get_user_dirs():
    """Return sorted list of user folder paths inside data/raw/."""
    if not os.path.isdir(DATA_RAW_DIR):
        logger.warning("Data directory not found: %s", DATA_RAW_DIR)
        return []
    dirs = []
    for name in sorted(os.listdir(DATA_RAW_DIR)):
        full = os.path.join(DATA_RAW_DIR, name)
        if os.path.isdir(full):
            dirs.append(full)
    return dirs


def load_user_data(user_dir):
    """
    Load audio files for a single user.

    Parameters
    ----------
    user_dir : str   - path to a user folder (e.g. data/raw/user1)

    Returns
    -------
    normal_paths  : list[str]
    changed_paths : list[str]
    """
    normal_dir = os.path.join(user_dir, "normal")
    changed_dir = os.path.join(user_dir, "changed")

    normal_paths, _ = _collect_audio_files(normal_dir, LABEL_NORMAL)
    changed_paths, _ = _collect_audio_files(changed_dir, LABEL_CHANGED)

    user_name = os.path.basename(user_dir)
    logger.info("%s: %d normal, %d changed files",
                user_name, len(normal_paths), len(changed_paths))
    return normal_paths, changed_paths


def load_dataset():
    """
    Scan all user folders and collect audio files.

    Returns
    -------
    X_paths  : list[str]   - absolute paths to audio files
    y_labels : list[str]   - corresponding labels ("normal" | "changed")
    """
    X_paths = []
    y_labels = []

    for user_dir in get_user_dirs():
        normal_paths, changed_paths = load_user_data(user_dir)
        X_paths.extend(normal_paths)
        y_labels.extend([LABEL_NORMAL] * len(normal_paths))
        X_paths.extend(changed_paths)
        y_labels.extend([LABEL_CHANGED] * len(changed_paths))

    logger.info("Total dataset: %d files (%d normal, %d changed)",
                len(X_paths),
                y_labels.count(LABEL_NORMAL),
                y_labels.count(LABEL_CHANGED))
    return X_paths, y_labels


# --- Quick self-test ---
if __name__ == "__main__":
    paths, labels = load_dataset()
    for p, l in zip(paths[:10], labels[:10]):
        print("  [{:>7s}]  {}".format(l, p))

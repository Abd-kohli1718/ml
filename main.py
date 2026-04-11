"""
main.py - Entry point for the Voice Health ML pipeline.

Data layout:
    data/raw/
      user1/normal/   <- baseline recordings
      user1/changed/  <- altered voice recordings
      user2/normal/
      user2/changed/
      ...

Commands:
    python main.py build                    # Build baseline from ALL users' normal samples
    python main.py build --user user1       # Build baseline from one user
    python main.py analyze path/to/file.mp3 # Analyze a specific file
    python main.py test                     # Build baseline + analyze all changed samples
    python main.py trend --user user1       # Show voice progression over time
    python main.py live --duration 10       # Record from mic and analyze
"""

import sys
import os
import argparse

# Ensure src/ is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from config import DATA_RAW_DIR
from data_loader import load_dataset, load_user_data, get_user_dirs, LABEL_NORMAL
from feature_extractor import extract_features
from baseline import build_baseline, save_baseline
from predict import predict
from utils import get_logger, print_result

logger = get_logger("main")


def cmd_build(args):
    """Build baseline from normal voice samples."""

    # Collect normal file paths
    normal_paths = []

    if args.user:
        # Single user mode
        user_dir = os.path.join(DATA_RAW_DIR, args.user)
        if not os.path.isdir(user_dir):
            print("User folder not found: %s" % user_dir)
            sys.exit(1)
        normals, _ = load_user_data(user_dir)
        normal_paths = normals
    else:
        # All users mode
        for user_dir in get_user_dirs():
            normals, _ = load_user_data(user_dir)
            normal_paths.extend(normals)

    if not normal_paths:
        print("No audio files found in normal folders under %s" % DATA_RAW_DIR)
        print("Expected structure: data/raw/userX/normal/*.mp3 or *.wav")
        sys.exit(1)

    print("Building baseline from %d normal samples..." % len(normal_paths))

    feature_vectors = []
    for path in normal_paths:
        feats = extract_features(path)
        if feats is not None:
            feature_vectors.append(feats)
        else:
            print("  Warning: skipped %s" % os.path.basename(path))

    if not feature_vectors:
        print("Feature extraction failed for all files.")
        sys.exit(1)

    mean, std = build_baseline(feature_vectors)
    save_baseline(mean, std)
    print("Baseline saved (%d samples, %d features)" % (len(feature_vectors), len(mean)))


def cmd_analyze(args):
    """Analyze a single audio file against the baseline."""
    filepath = args.file
    if not os.path.isfile(filepath):
        print("File not found: %s" % filepath)
        sys.exit(1)

    result = predict(filepath)
    if result:
        print_result(result)
    else:
        print("Analysis failed.")


def cmd_test(args):
    """Test: build baseline from normal, then analyze all changed samples."""
    print("=== Running full test across all users ===\n")

    # First build baseline from all normal samples
    normal_paths = []
    changed_paths = []
    for user_dir in get_user_dirs():
        normals, changed = load_user_data(user_dir)
        normal_paths.extend(normals)
        changed_paths.extend(changed)

    if not normal_paths:
        print("No normal audio files found.")
        sys.exit(1)

    # Build baseline
    print("Building baseline from %d normal samples..." % len(normal_paths))
    feature_vectors = []
    for path in normal_paths:
        feats = extract_features(path)
        if feats is not None:
            feature_vectors.append(feats)

    mean, std = build_baseline(feature_vectors)
    save_baseline(mean, std)
    print("Baseline ready.\n")

    # Now analyze changed samples
    if not changed_paths:
        print("No changed audio files to test against.")
        return

    print("Analyzing %d changed samples...\n" % len(changed_paths))
    for path in changed_paths:
        print("--- %s ---" % os.path.basename(path))
        result = predict(path)
        if result:
            print_result(result)


def cmd_trend(args):
    """Show voice progression over time for a user."""
    from trend import analyze_trend, print_trend
    from baseline import load_baseline

    user_dir = os.path.join(DATA_RAW_DIR, args.user)
    if not os.path.isdir(user_dir):
        print("User folder not found: %s" % user_dir)
        sys.exit(1)

    # Build baseline from this user's normal samples
    normals, changed = load_user_data(user_dir)

    if not normals:
        print("No normal samples found for %s" % args.user)
        sys.exit(1)

    # Build baseline from normal
    feature_vectors = []
    for path in normals:
        feats = extract_features(path)
        if feats is not None:
            feature_vectors.append(feats)

    from baseline import build_baseline, save_baseline
    mean, std = build_baseline(feature_vectors)
    save_baseline(mean, std)

    # Use changed samples as progression (sorted by filename = day1, day2, ...)
    if not changed:
        print("No changed samples found for %s to analyze progression." % args.user)
        return

    changed_sorted = sorted(changed)
    print("Analyzing %d samples as day1, day2, ... for %s\n" % (len(changed_sorted), args.user))

    trend_result = analyze_trend(changed_sorted, mean, std)
    print_trend(trend_result)


def cmd_validate(args):
    """Validate feature extraction against known vocal patterns."""
    from validate import run_validation

    run_synthetic = args.synthetic or (not args.synthetic and not args.real)
    run_real = args.real or (not args.synthetic and not args.real)
    run_validation(synthetic=run_synthetic, real=run_real)


def cmd_live(args):
    """Record from microphone and analyze."""
    from realtime import record_audio, save_recording

    audio = record_audio(duration=args.duration)
    filepath = save_recording(audio)
    result = predict(filepath)
    if result:
        print_result(result)
    else:
        print("Analysis failed.")


def main():
    parser = argparse.ArgumentParser(
        description="Voice Health ML - Vocal Biomarker Analysis Pipeline"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # build
    p_build = subparsers.add_parser("build", help="Build baseline from normal samples")
    p_build.add_argument("--user", type=str, default=None,
                         help="Build from a specific user folder (e.g. user1)")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="Analyze an audio file")
    p_analyze.add_argument("file", type=str, help="Path to audio file (.wav/.mp3)")

    # test
    subparsers.add_parser("test", help="Build baseline + analyze all changed samples")

    # trend
    p_trend = subparsers.add_parser("trend", help="Show voice progression over time")
    p_trend.add_argument("--user", type=str, required=True,
                         help="User folder to analyze (e.g. user1)")

    # validate
    p_validate = subparsers.add_parser("validate", help="Validate features against known patterns")
    p_validate.add_argument("--synthetic", action="store_true",
                            help="Run synthetic voice validation only")
    p_validate.add_argument("--real", action="store_true",
                            help="Run real data validation only")

    # live
    p_live = subparsers.add_parser("live", help="Record and analyze from microphone")
    p_live.add_argument("--duration", type=int, default=10,
                        help="Recording duration in seconds (default: 10)")

    args = parser.parse_args()

    if args.command == "build":
        cmd_build(args)
    elif args.command == "analyze":
        cmd_analyze(args)
    elif args.command == "test":
        cmd_test(args)
    elif args.command == "trend":
        cmd_trend(args)
    elif args.command == "validate":
        cmd_validate(args)
    elif args.command == "live":
        cmd_live(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

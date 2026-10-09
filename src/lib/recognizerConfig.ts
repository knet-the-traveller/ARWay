// Minimum top cosine similarity needed to accept a match
export const MIN_SCORE = 0.64;

// Top score must beat the runner-up by at least this much
export const MIN_MARGIN = 0.03;

// The same place must win this many scans in a row before it is shown
export const CONFIRM_FRAMES = 3;

// Minimum gap between scans, measured from the end of the previous scan
export const SCAN_INTERVAL_MS = 1000;

// Size to which images/frames are resized before inference (center-cropped)
export const INPUT_SIZE = 224;

// The model to use for feature extraction
export const MODEL_ID = "Xenova/clip-vit-base-patch32";

// Cache version for reference embeddings
export const REFERENCE_VERSION = 2;

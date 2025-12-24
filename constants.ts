import { Vector3 } from 'three';

// --- Colors ---
export const COLORS = {
  TREE_TOP: '#1cbd62',
  TREE_BOTTOM: '#1FAA6A',
  SPIRAL_LIGHT: '#fff1a1',
  DECORATION_GOLD: '#f2e24e',
  DECORATION_RED: '#ff421c',
  BACKGROUND: '#050505',
  POLAROID_FRAME: '#ffffff',
  POLAROID_BACK: '#1a1a1a',
  // New Additions
  STAR: '#fff5b6',
  STAR_GLOW: '#ffdd00',
  PRESENTS: ['#D32F2F', '#388E3C', '#1976D2', '#7B1FA2', '#FBC02D', '#E64A19'], // Deep festive colors
  RIBBON: '#F5F5F5',
};

// --- Dimensions & Geometry ---
export const TREE_CONFIG = {
  HEIGHT: 14, // Slightly taller for elegance
  RADIUS_BOTTOM: 6,
  PARTICLE_COUNT: 10000, // Slightly reduced for performance while keeping density
  PARTICLE_SIZE: 0.25,
};

export const SPIRAL_CONFIG = {
  LOOPS: 5.5,
  THICKNESS: 0.05,
  RADIUS_OFFSET: 0.6,
};

export const CAMERA_CONFIG = {
  FOV: 50,
  DEFAULT_POS: new Vector3(0, 0, 32),
  ZOOM_IN_POS: new Vector3(0, 0, 9), // Close up for details
  LOOK_AT_OFFSET: new Vector3(0, -1, 0),
  // Bounds for panning in Hand Mode
  MIN_HEIGHT: -4,
  MAX_HEIGHT: 5,
};

// --- Hand Gestures ---
export const GESTURE_THRESHOLDS = {
  PINCH_DISTANCE: 0.04,
  SPREAD_DISTANCE: 0.18,
  SMOOTHING_FACTOR: 0.08, // Smoother camera
  PAN_SENSITIVITY: 6.0,
};

// --- Placeholders ---
export const PLACEHOLDER_TYPES = {
  SNOWFLAKE: 'snowflake',
  BELL: 'bell',
  TREE: 'tree',
} as const;

export const DEFAULT_PHOTOS_COUNT = 30;

export const INSTAGRAM_WEBHOOK_URL = process.env.INSTAGRAM_WEBHOOK_URL || '';

if (!INSTAGRAM_WEBHOOK_URL) {
  console.error('INSTAGRAM_WEBHOOK_URL is not defined. Instagram import will not work. Please set it in your environment variables.');
}

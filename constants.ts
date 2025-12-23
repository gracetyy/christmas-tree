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
  PARTICLE_COUNT: 12000, // Higher density for lush look
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

// --- Google Drive Config ---
// NOTE: To make Google Drive integration work, you must replace these with valid credentials
// from your Google Cloud Console (https://console.cloud.google.com).
// Enable "Google Picker API" and "Google Drive API".
export const GOOGLE_CONFIG = {
  CLIENT_ID: '', // e.g., '123456789-abc...apps.googleusercontent.com'
  API_KEY: '',     // e.g., 'AIzaSy...'
  // Scopes needed to pick files and read their metadata/thumbnails
  SCOPES: 'https://www.googleapis.com/auth/drive.readonly',
  APP_ID: '', // Optional: Project Number
};

export const INSTAGRAM_WEBHOOK_URL = 'https://api.nodex.bubblelab.ai/webhook/user_37EmoKBG44kKLc360SSkgwuw2ZR/bWUbzY17ZCXn';

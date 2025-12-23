export enum ControlMode {
  MOUSE = 'MOUSE',
  HAND = 'HAND',
}

export enum ZoomLevel {
  FULL_TREE = 'FULL_TREE',
  ZOOMED_IN = 'ZOOMED_IN',
}

export enum InteractionMode {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

export interface PhotoData {
  id: string;
  url: string; // Data URL or Image URL
  placeholderType?: 'snowflake' | 'bell' | 'tree';
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number]; // x, y, z
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingResult {
  landmarks: HandLandmark[][];
}

// Custom Event Types for 3D interactions
export type PhotoUploadHandler = (id: string, file: File) => void;
export type BulkUploadHandler = (files: FileList) => void;
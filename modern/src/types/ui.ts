/**
 * UI state and configuration types
 */

export interface UIState {
  sidebarOpen: boolean;
  sidebarTab: 'details' | 'filters' | 'statistics';
  menuOpen: string | null;
  loadingProgress: number;
  loadingMessage: string;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  duration?: number;
}

export interface ViewportState {
  zoom: number;
  rotation: [number, number, number];
  target: [number, number, number];
  mode: '2d' | '3d';
}

/**
 * A one-shot instruction for the camera, carried out by `CameraController`
 * inside the canvas. `seq` changes on every request, so repeating the same
 * request (zoom in twice) is seen as two requests.
 */
export type CameraRequest =
  | { kind: 'zoom'; factor: number; seq: number }
  | { kind: 'fit'; resetDirection: boolean; seq: number };

export interface GraphSettings {
  // Visual
  showLabels: boolean;
  showNodeDetails: boolean;
  nodeScale: number;
  edgeWidth: number;

  // Simulation
  linkDistance: number;
  chargeStrength: number;
  gravity: number;
  friction: number;

  // Performance
  maxFPS: number;
  lodEnabled: boolean;

  // Accessibility
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: () => void;
}

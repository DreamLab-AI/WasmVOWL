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

/**
 * NggExplorer `setParam` keys (vowl-wasm 0.4.0). Every key is always set, so
 * `resetSettings` restores the engine exactly.
 */
export interface LayoutSettings {
  /** Many-body repulsion; positive repels. Engine default 2000. */
  charge: number;
  /** Spring rest length, world units. Engine default 60. */
  linkDistance: number;
  /** Collision disc radius, world units; nodes settle at least twice it apart. 0 turns collision off. */
  collideRadius: number;
  /** Share of an overlap resolved per collision pass, 0..1. */
  collideStrength: number;
  /** Collision passes per tick, 1..16. */
  collideIterations: number;
  /** Rigid pull of each disconnected component towards the centre, 0..1. 0 turns it off. */
  componentGravity: number;
  [key: string]: number;
}

export interface GraphSettings {
  // Visual
  showLabels: boolean;
  showNodeDetails: boolean;
  nodeScale: number;
  edgeWidth: number;

  /** Layout engine parameters, sent as they are to vowl-wasm's NggExplorer
   *  through @dreamlab-ai/ontomark-graph (`layout.setParams`). */
  layout: LayoutSettings;

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

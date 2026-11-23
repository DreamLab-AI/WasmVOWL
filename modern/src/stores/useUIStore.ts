/**
 * UI state management
 */

import { create } from 'zustand';
import type { UIState, Notification, ViewportState, GraphSettings, CameraRequest } from '../types/ui';

interface UIStore extends UIState {
  viewport: ViewportState;
  settings: GraphSettings;
  /** Latest camera instruction for `CameraController`; null until the first. */
  cameraRequest: CameraRequest | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarTab: (tab: UIState['sidebarTab']) => void;
  setMenuOpen: (menu: string | null) => void;
  setLoadingProgress: (progress: number, message?: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setRotation: (rotation: [number, number, number]) => void;
  setTarget: (target: [number, number, number]) => void;
  toggleViewMode: () => void;
  /** Move the camera towards (factor > 1) or away from (factor < 1) its target. */
  zoomCamera: (factor: number) => void;
  /** Frame the whole graph; `resetDirection` also returns to the default view angle. */
  fitCamera: (options?: { resetDirection?: boolean }) => void;

  // Settings
  updateSettings: (settings: Partial<GraphSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: GraphSettings = {
  showLabels: true,
  showNodeDetails: true,
  nodeScale: 1.0,
  edgeWidth: 2.0,
  linkDistance: 100,
  chargeStrength: -300,
  gravity: 0.1,
  friction: 0.9,
  maxFPS: 60,
  lodEnabled: true,
  highContrast: false,
  reducedMotion: false
};

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  sidebarOpen: true,
  sidebarTab: 'details',
  menuOpen: null,
  loadingProgress: 0,
  loadingMessage: '',
  notifications: [],

  viewport: {
    zoom: 1,
    rotation: [0, 0, 0],
    target: [0, 0, 0],
    mode: '2d'
  },

  settings: defaultSettings,

  cameraRequest: null,

  // Actions
  toggleSidebar: () => set((state) => ({
    sidebarOpen: !state.sidebarOpen
  })),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  setMenuOpen: (menu) => set({ menuOpen: menu }),

  setLoadingProgress: (progress, message) => set({
    loadingProgress: progress,
    loadingMessage: message || ''
  }),

  addNotification: (notification) => set((state) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification = { ...notification, id };

    // Auto-remove after duration (default 5s)
    if (notification.duration !== 0) {
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id)
        }));
      }, notification.duration || 5000);
    }

    return {
      notifications: [...state.notifications, newNotification]
    };
  }),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),

  // Viewport
  setZoom: (zoom) => set((state) => ({
    viewport: { ...state.viewport, zoom }
  })),

  setRotation: (rotation) => set((state) => ({
    viewport: { ...state.viewport, rotation }
  })),

  setTarget: (target) => set((state) => ({
    viewport: { ...state.viewport, target }
  })),

  toggleViewMode: () => set((state) => ({
    viewport: {
      ...state.viewport,
      mode: state.viewport.mode === '2d' ? '3d' : '2d'
    }
  })),

  zoomCamera: (factor) => set((state) => ({
    cameraRequest: { kind: 'zoom', factor, seq: (state.cameraRequest?.seq ?? 0) + 1 }
  })),

  fitCamera: (options) => set((state) => ({
    cameraRequest: {
      kind: 'fit',
      resetDirection: options?.resetDirection ?? false,
      seq: (state.cameraRequest?.seq ?? 0) + 1
    }
  })),

  // Settings
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  resetSettings: () => set({ settings: defaultSettings })
}));

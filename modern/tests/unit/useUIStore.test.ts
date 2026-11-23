/**
 * Unit tests for useUIStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RECOMMENDED_LAYOUT_PARAMS } from '@dreamlab-ai/ontomark-graph/layout';
import { useUIStore } from '@/stores/useUIStore';
import type { GraphSettings } from '@/types/ui';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset the whole store, not only the settings: viewport mode and the
    // notification list otherwise leak from one test into the next.
    useUIStore.setState(useUIStore.getInitialState(), true);
  });

  describe('Initial State', () => {
    it('should have default view mode as 2d', () => {
      const { viewport } = useUIStore.getState();
      expect(viewport.mode).toBe('2d');
    });

    it('should have default viewport state', () => {
      const { viewport } = useUIStore.getState();
      expect(viewport.zoom).toBe(1);
      expect(viewport.rotation).toEqual([0, 0, 0]);
      expect(viewport.target).toEqual([0, 0, 0]);
    });

    it('defaults the layout to the engine charge and link distance with the recommended readability parameters', () => {
      const { settings } = useUIStore.getState();
      expect(settings.layout).toEqual({ charge: 2000, linkDistance: 60, ...RECOMMENDED_LAYOUT_PARAMS });
    });

    it('should have zero loading progress initially', () => {
      const { loadingProgress } = useUIStore.getState();
      expect(loadingProgress).toBe(0);
    });

    it('should have empty notifications initially', () => {
      const { notifications } = useUIStore.getState();
      expect(notifications).toEqual([]);
    });
  });

  describe('View Mode', () => {
    it('should toggle view mode from 2d to 3d', () => {
      const store = useUIStore.getState();
      store.toggleViewMode();

      const { viewport } = useUIStore.getState();
      expect(viewport.mode).toBe('3d');
    });

    it('should toggle view mode from 3d to 2d', () => {
      const store = useUIStore.getState();
      store.toggleViewMode(); // 2d -> 3d
      store.toggleViewMode(); // 3d -> 2d

      const { viewport } = useUIStore.getState();
      expect(viewport.mode).toBe('2d');
    });
  });

  describe('Viewport Operations', () => {
    it('should set zoom level', () => {
      const store = useUIStore.getState();
      store.setZoom(2.5);

      const { viewport } = useUIStore.getState();
      expect(viewport.zoom).toBe(2.5);
    });

    it('should set rotation', () => {
      const store = useUIStore.getState();
      store.setRotation([45, 90, 0]);

      const { viewport } = useUIStore.getState();
      expect(viewport.rotation).toEqual([45, 90, 0]);
    });

    it('should set target', () => {
      const store = useUIStore.getState();
      store.setTarget([100, 200, 0]);

      const { viewport } = useUIStore.getState();
      expect(viewport.target).toEqual([100, 200, 0]);
    });
  });

  describe('Camera requests', () => {
    it('starts with no request', () => {
      expect(useUIStore.getState().cameraRequest).toBeNull();
    });

    it('queues a zoom step with a fresh sequence number each time', () => {
      const store = useUIStore.getState();
      store.zoomCamera(1.2);
      const first = useUIStore.getState().cameraRequest;
      expect(first).toMatchObject({ kind: 'zoom', factor: 1.2 });
      store.zoomCamera(1.2);
      const second = useUIStore.getState().cameraRequest;
      expect(second!.seq).toBeGreaterThan(first!.seq);
    });

    it('queues a fit, optionally resetting the view direction', () => {
      const store = useUIStore.getState();
      store.fitCamera();
      expect(useUIStore.getState().cameraRequest).toMatchObject({ kind: 'fit', resetDirection: false });
      store.fitCamera({ resetDirection: true });
      expect(useUIStore.getState().cameraRequest).toMatchObject({ kind: 'fit', resetDirection: true });
    });
  });

  describe('Settings Operations', () => {
    it('should update settings', () => {
      const store = useUIStore.getState();
      const updates: Partial<GraphSettings> = { nodeScale: 1.5, showLabels: false };
      store.updateSettings(updates);

      const { settings } = useUIStore.getState();
      expect(settings.nodeScale).toBe(1.5);
      expect(settings.showLabels).toBe(false);
    });

    it('merges layout parameters over the current ones', () => {
      const store = useUIStore.getState();
      store.updateLayout({ linkDistance: 90 });
      store.updateLayout({ collideRadius: 14 });

      const { layout } = useUIStore.getState().settings;
      expect(layout).toMatchObject({ linkDistance: 90, collideRadius: 14, charge: 2000 });
    });

    it('should reset settings, layout included, to defaults', () => {
      const store = useUIStore.getState();
      store.updateLayout({ linkDistance: 250, charge: 500 });
      store.updateSettings({ nodeScale: 2 });

      store.resetSettings();

      const { settings } = useUIStore.getState();
      expect(settings.nodeScale).toBe(1);
      expect(settings.layout).toEqual({ charge: 2000, linkDistance: 60, ...RECOMMENDED_LAYOUT_PARAMS });
    });
  });

  describe('Loading State', () => {
    it('should set loading progress', () => {
      const store = useUIStore.getState();
      store.setLoadingProgress(50, 'Loading...');

      const { loadingProgress, loadingMessage } = useUIStore.getState();
      expect(loadingProgress).toBe(50);
      expect(loadingMessage).toBe('Loading...');
    });

    it('should set loading progress without message', () => {
      const store = useUIStore.getState();
      store.setLoadingProgress(75);

      const { loadingProgress, loadingMessage } = useUIStore.getState();
      expect(loadingProgress).toBe(75);
      expect(loadingMessage).toBe('');
    });
  });

  describe('Notifications', () => {
    it('should add a notification', () => {
      const store = useUIStore.getState();
      store.addNotification({
        type: 'info',
        message: 'Test notification',
        duration: 0 // Don't auto-remove
      });

      const { notifications } = useUIStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test notification');
    });

    it('should add multiple notifications', () => {
      const store = useUIStore.getState();
      store.addNotification({
        type: 'info',
        message: 'First notification',
        duration: 0
      });
      store.addNotification({
        type: 'success',
        message: 'Second notification',
        duration: 0
      });

      const { notifications } = useUIStore.getState();
      expect(notifications).toHaveLength(2);
    });

    it('should remove a notification by id', () => {
      const store = useUIStore.getState();
      store.addNotification({
        type: 'info',
        message: 'Test notification',
        duration: 0
      });

      const notifications = useUIStore.getState().notifications;
      const notificationId = notifications[0].id;

      const storeAgain = useUIStore.getState();
      storeAgain.removeNotification(notificationId);

      const finalNotifications = useUIStore.getState().notifications;
      expect(finalNotifications).toHaveLength(0);
    });

    it('should handle different notification types', () => {
      const store = useUIStore.getState();
      const types = ['info', 'success', 'warning', 'error'] as const;

      types.forEach((type) => {
        store.addNotification({
          type,
          message: `${type} notification`,
          duration: 0
        });
      });

      const { notifications } = useUIStore.getState();
      expect(notifications).toHaveLength(4);
      expect(notifications[0].type).toBe('info');
      expect(notifications[1].type).toBe('success');
      expect(notifications[2].type).toBe('warning');
      expect(notifications[3].type).toBe('error');
    });
  });

  describe('Sidebar State', () => {
    it('should toggle sidebar', () => {
      const store = useUIStore.getState();
      const initialState = store.sidebarOpen;

      store.toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(!initialState);

      store.toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(initialState);
    });

    it('should set sidebar tab', () => {
      const store = useUIStore.getState();
      store.setSidebarTab('filters');

      expect(useUIStore.getState().sidebarTab).toBe('filters');
    });
  });

  describe('Menu State', () => {
    it('should set active menu', () => {
      const store = useUIStore.getState();
      store.setMenuOpen('export');

      const { menuOpen } = useUIStore.getState();
      expect(menuOpen).toBe('export');
    });

    it('should clear active menu', () => {
      const store = useUIStore.getState();
      store.setMenuOpen('export');
      store.setMenuOpen(null);

      const { menuOpen } = useUIStore.getState();
      expect(menuOpen).toBeNull();
    });
  });
});

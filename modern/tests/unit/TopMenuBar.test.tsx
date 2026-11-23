/**
 * The menu's view buttons queue camera requests that CameraController
 * carries out. Before this, zoom wrote viewport.zoom, which nothing read.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopMenuBar } from '@/components/UI/TopMenuBar';
import { useUIStore } from '@/stores/useUIStore';

describe('TopMenuBar view buttons', () => {
  beforeEach(() => {
    useUIStore.setState(useUIStore.getInitialState(), true);
  });

  it('zoom in and out request camera zoom steps in opposite directions', () => {
    render(<TopMenuBar />);
    fireEvent.click(screen.getByTitle('Zoom in'));
    const zoomIn = useUIStore.getState().cameraRequest;
    expect(zoomIn).toMatchObject({ kind: 'zoom' });
    expect(zoomIn!.kind === 'zoom' && zoomIn!.factor).toBeGreaterThan(1);

    fireEvent.click(screen.getByTitle('Zoom out'));
    const zoomOut = useUIStore.getState().cameraRequest;
    expect(zoomOut!.seq).toBeGreaterThan(zoomIn!.seq);
    expect(zoomOut!.kind === 'zoom' && zoomOut!.factor).toBeLessThan(1);
  });

  it('fit frames the graph and reset also restores the view angle', () => {
    render(<TopMenuBar />);
    fireEvent.click(screen.getByTitle('Fit graph to view'));
    expect(useUIStore.getState().cameraRequest).toMatchObject({ kind: 'fit', resetDirection: false });
    fireEvent.click(screen.getByTitle('Reset view'));
    expect(useUIStore.getState().cameraRequest).toMatchObject({ kind: 'fit', resetDirection: true });
  });
});

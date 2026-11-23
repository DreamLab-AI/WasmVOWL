/**
 * Moves the camera: keeps a newly loaded graph framed while its layout runs
 * and frames it once more when it settles, and carries out the menu's zoom
 * and fit requests.
 *
 * Following stops as soon as the user takes the camera (drag, wheel or a menu
 * zoom), so the final fit never undoes a deliberate view. Lives inside the R3F
 * canvas and does its work in `useFrame`: this child's effects run before the
 * simulation hook (in its parent) has seeded positions; frames see them.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGraphStore } from '../../../stores/useGraphStore';
import { useUIStore } from '../../../stores/useUIStore';
import { fitCamera, graphBounds, visibleInsets, zoomedDistance, DEFAULT_MAX_DISTANCE, type Insets } from '../../../lib/cameraFit';
import { framingPoints } from '../../../lib/nodeGeometry';

/** The default 3D view direction (the old fixed camera at [0, 300, 500]). */
const DIRECTION_3D = new THREE.Vector3(0, 300, 500).normalize();
const DIRECTION_2D = new THREE.Vector3(0, 0, 1);

/** Minimal surface of drei's OrbitControls that this component uses. */
interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
  maxDistance: number;
}

/**
 * What of the canvas the user can see: the window clips it, and elements
 * marked `data-canvas-overlay` (menu bar, sidebar) cover it.
 */
function measureInsets(canvas: HTMLElement): Insets | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  const overlays = [...document.querySelectorAll('[data-canvas-overlay]')].map((el) => el.getBoundingClientRect());
  return visibleInsets(canvas.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, overlays);
}

type Pending = { kind: 'fit'; resetDirection: boolean } | { kind: 'zoom'; factor: number };

/** How often a running layout is re-framed while followed, in ms. */
const FOLLOW_INTERVAL_MS = 300;

export function CameraController({ isRunning }: { isRunning: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as (ControlsLike & THREE.EventDispatcher<{ start: object }>) | null;
  const size = useThree((s) => s.size);
  const canvas = useThree((s) => s.gl.domElement);

  const graphVersion = useGraphStore((s) => s.graphVersion);
  const mode = useUIStore((s) => s.viewport.mode);
  const request = useUIStore((s) => s.cameraRequest);

  const pending = useRef<Pending[]>([]);
  // A request already in the store when this mounts belongs to an earlier canvas.
  const handledSeq = useRef(useUIStore.getState().cameraRequest?.seq ?? 0);
  const wasRunning = useRef(false);
  /** True from a load until the layout settles or the user moves the camera. */
  const following = useRef(false);
  const lastFollow = useRef(-Infinity);

  // A new graph: frame its seeded layout, then follow it while it runs.
  useEffect(() => {
    pending.current.push({ kind: 'fit', resetDirection: true });
    following.current = true;
    lastFollow.current = -Infinity;
  }, [graphVersion]);

  // The user dragging or wheeling the camera ends following.
  useEffect(() => {
    if (!controls?.addEventListener) return;
    const stop = () => {
      following.current = false;
    };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  // Switching 2D/3D: frame from that mode's default angle.
  useEffect(() => {
    pending.current.push({ kind: 'fit', resetDirection: true });
  }, [mode]);

  // The layout settled: frame what it settled into.
  useEffect(() => {
    if (wasRunning.current && !isRunning && following.current) {
      pending.current.push({ kind: 'fit', resetDirection: false });
      following.current = false;
    }
    wasRunning.current = isRunning;
  }, [isRunning]);

  // Menu requests.
  useEffect(() => {
    if (!request || request.seq <= handledSeq.current) return;
    handledSeq.current = request.seq;
    if (request.kind === 'zoom') following.current = false;
    pending.current.push(
      request.kind === 'fit'
        ? { kind: 'fit', resetDirection: request.resetDirection }
        : { kind: 'zoom', factor: request.factor }
    );
  }, [request]);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime * 1000;
    if (following.current && isRunning && now - lastFollow.current >= FOLLOW_INTERVAL_MS) {
      lastFollow.current = now;
      pending.current.push({ kind: 'fit', resetDirection: false });
    }
    if (pending.current.length === 0) return;
    const queue = pending.current;
    pending.current = [];
    const perspective = camera as THREE.PerspectiveCamera;
    const target = controls?.target ?? new THREE.Vector3();
    const is3D = useUIStore.getState().viewport.mode === '3d';

    for (const step of queue) {
      if (step.kind === 'zoom') {
        const offset = new THREE.Vector3().subVectors(perspective.position, target);
        const distance = zoomedDistance(offset.length(), step.factor);
        if (offset.lengthSq() === 0) offset.copy(DIRECTION_2D);
        perspective.position.copy(target).addScaledVector(offset.normalize(), distance);
        continue;
      }

      const nodes = [...useGraphStore.getState().nodes.values()];
      const { nodeScale, showLabels } = useUIStore.getState().settings;
      const bounds = graphBounds(framingPoints(nodes, nodeScale, showLabels), 4);
      if (!bounds) continue;
      const fit = fitCamera(bounds, {
        fovDeg: perspective.fov ?? 50,
        aspect: size.width / Math.max(1, size.height),
        padding: 0.06,
        size,
        insets: measureInsets(canvas)
      });
      let direction: THREE.Vector3;
      if (!is3D) {
        direction = DIRECTION_2D.clone();
      } else if (step.resetDirection) {
        direction = DIRECTION_3D.clone();
      } else {
        direction = new THREE.Vector3().subVectors(perspective.position, target);
        if (direction.lengthSq() === 0) direction = DIRECTION_3D.clone();
        direction.normalize();
      }
      target.set(fit.center[0], fit.center[1], 0);
      perspective.position.copy(target).addScaledVector(direction, fit.distance);
    }

    // Keep the far plane and the orbit limit beyond wherever the camera went.
    const distance = perspective.position.distanceTo(target);
    if (perspective.far < distance * 4) {
      perspective.far = distance * 4;
      perspective.updateProjectionMatrix();
    }
    perspective.lookAt(target);
    if (controls) {
      controls.maxDistance = Math.max(controls.maxDistance, DEFAULT_MAX_DISTANCE, distance);
      controls.update();
    }
    useUIStore.getState().setTarget([target.x, target.y, target.z]);
  });

  return null;
}

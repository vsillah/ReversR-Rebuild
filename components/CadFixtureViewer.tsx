import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';

type ThreeModule = typeof import('three');
type ViewName = 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type ViewerAction = ViewName | 'zoomIn' | 'zoomOut';

const fixedViews: ViewName[] = ['isometric', 'front', 'back', 'left', 'right', 'top', 'bottom'];

const frameStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'clamp(300px, 46vw, 440px)',
  minHeight: 300,
  maxHeight: 440,
  overflow: 'hidden',
  background: '#0b0f10',
  borderRadius: 8,
  touchAction: 'none',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: 6,
  paddingTop: 8,
};

const viewToolbarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(58px, 1fr))',
  flex: '1 1 320px',
  gap: 6,
};

const zoomToolbarStyle: React.CSSProperties = {
  display: 'flex',
  flex: '0 0 auto',
  gap: 6,
};

const controlStyle: React.CSSProperties = {
  appearance: 'none',
  minWidth: 58,
  minHeight: 34,
  padding: '7px 10px',
  border: '1px solid #475a57',
  borderRadius: 6,
  color: '#e8fffa',
  background: '#17211f',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  cursor: 'pointer',
};

const zoomControlStyle: React.CSSProperties = {
  ...controlStyle,
  minWidth: 38,
  width: 38,
  padding: 0,
  fontSize: 20,
  lineHeight: 1,
};

const fallbackStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  color: '#d7e0dc',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  textAlign: 'center',
  background: '#0b0f10',
};

export default function CadFixtureViewer({
  geometry,
  label,
}: {
  geometry: CadInternalTesterFixture['previewGeometry'];
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerActions = useRef<Partial<Record<ViewerAction, () => void>>>({});
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setState('unavailable');
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const mount = async () => {
      try {
        const THREE: ThreeModule = await import('three');
        const host = containerRef.current;
        if (cancelled || !host) return;

        host.innerHTML = '';
        const initialWidth = host.clientWidth || 720;
        const initialHeight = host.clientHeight || 400;
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(initialWidth, initialHeight);
        renderer.setClearColor(0x0b0f10, 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.setAttribute('data-testid', 'cad-fixture-canvas');
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.cursor = 'grab';
        renderer.domElement.style.touchAction = 'none';
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, initialWidth / initialHeight, 0.01, 100);
        const rig = new THREE.Group();
        scene.add(rig);

        let modelGeometry: import('three').BufferGeometry;
        if (geometry.kind === 'stl') {
          const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
          modelGeometry = await new STLLoader().loadAsync(geometry.assetUrl);
          modelGeometry.rotateX(-Math.PI / 2);
          modelGeometry.computeVertexNormals();
        } else {
          const [sx, sy, sz] = geometry.normalizedScale;
          modelGeometry = new THREE.BoxGeometry(sx, sy, sz);
        }

        if (cancelled) {
          modelGeometry.dispose();
          renderer.dispose();
          return;
        }

        modelGeometry.computeBoundingBox();
        const sourceBounds = modelGeometry.boundingBox;
        if (!sourceBounds || sourceBounds.isEmpty()) throw new Error('empty geometry');
        const sourceSize = sourceBounds.getSize(new THREE.Vector3());
        const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
        const largestDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
        if (!Number.isFinite(largestDimension) || largestDimension <= 0) throw new Error('invalid geometry');

        modelGeometry.translate(-sourceCenter.x, -sourceCenter.y, -sourceCenter.z);
        const displayScale = 2.8 / largestDimension;
        modelGeometry.scale(displayScale, displayScale, displayScale);
        modelGeometry.computeBoundingBox();
        modelGeometry.computeBoundingSphere();
        const radius = Math.max(modelGeometry.boundingSphere?.radius ?? 1, 0.5);

        const modelMaterial = new THREE.MeshStandardMaterial({
          color: 0xc4c9cc,
          roughness: 0.42,
          metalness: 0.12,
          side: THREE.DoubleSide,
        });
        const model = new THREE.Mesh(modelGeometry, modelMaterial);
        model.castShadow = true;
        model.receiveShadow = true;
        rig.add(model);

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xe8fffa,
          transparent: true,
          opacity: 0.34,
        });
        const edgeGeometry = new THREE.EdgesGeometry(modelGeometry, 24);
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        rig.add(edges);

        scene.add(new THREE.HemisphereLight(0xe8fff8, 0x172322, 1.75));
        const key = new THREE.DirectionalLight(0xffffff, 3.1);
        key.position.set(4, 6, 5);
        key.castShadow = true;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x74a9ff, 1.35);
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        const floorMaterial = new THREE.MeshStandardMaterial({
          color: 0x111819,
          roughness: 0.94,
          metalness: 0,
        });
        const floorSize = radius * 8;
        const floorY = -radius * 1.3;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = floorY;
        floor.receiveShadow = true;
        scene.add(floor);

        const grid = new THREE.GridHelper(floorSize, 18, 0x43756e, 0x253331);
        grid.position.y = floorY + 0.002;
        scene.add(grid);

        const distanceForViewport = () => {
          const verticalFov = THREE.MathUtils.degToRad(camera.fov);
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          return (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.55;
        };
        const setZoom = (nextZoom: number) => {
          camera.zoom = THREE.MathUtils.clamp(nextZoom, 0.65, 2.4);
          renderer.domElement.dataset.zoom = camera.zoom.toFixed(3);
          camera.updateProjectionMatrix();
        };
        const setView = (name: ViewName) => {
          rig.rotation.set(0, 0, 0);
          camera.zoom = 1;
          renderer.domElement.dataset.zoom = camera.zoom.toFixed(3);
          renderer.domElement.dataset.view = name;
          const distance = distanceForViewport();
          camera.up.set(0, 1, 0);
          // Map the original IGES axes through the -90deg X rotation applied above.
          if (name === 'front') {
            camera.position.set(0, distance, 0.001);
            camera.up.set(0, 0, -1);
          }
          if (name === 'back') {
            camera.position.set(0, -distance, 0.001);
            camera.up.set(0, 0, -1);
          }
          if (name === 'left') {
            camera.position.set(-distance, 0, 0);
            camera.up.set(0, 0, -1);
          }
          if (name === 'right') {
            camera.position.set(distance, 0, 0);
            camera.up.set(0, 0, -1);
          }
          if (name === 'top') {
            camera.position.set(0, 0, -distance);
            camera.up.set(0, -1, 0);
          }
          if (name === 'bottom') {
            camera.position.set(0, 0, distance);
            camera.up.set(0, -1, 0);
          }
          if (name === 'isometric') {
            camera.position.set(distance * 0.78, distance * 0.56, distance * 0.78);
          }
          camera.near = Math.max(distance / 100, 0.01);
          camera.far = distance * 20;
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        };
        viewerActions.current = {
          isometric: () => setView('isometric'),
          front: () => setView('front'),
          back: () => setView('back'),
          left: () => setView('left'),
          right: () => setView('right'),
          top: () => setView('top'),
          bottom: () => setView('bottom'),
          zoomIn: () => setZoom(camera.zoom * 1.2),
          zoomOut: () => setZoom(camera.zoom / 1.2),
        };
        setView('isometric');

        let pointerDown = false;
        let lastX = 0;
        let lastY = 0;
        let pinchDistance: number | null = null;
        const pointers = new Map<number, { x: number; y: number }>();
        let raf = 0;
        const onPointerDown = (event: PointerEvent) => {
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          pointerDown = pointers.size === 1;
          lastX = event.clientX;
          lastY = event.clientY;
          if (pointers.size === 2) {
            const [first, second] = Array.from(pointers.values());
            pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
            pointerDown = false;
          }
          renderer.domElement.style.cursor = pointers.size === 1 ? 'grabbing' : 'default';
          try {
            renderer.domElement.setPointerCapture?.(event.pointerId);
          } catch {}
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!pointers.has(event.pointerId)) return;
          pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.size >= 2) {
            const [first, second] = Array.from(pointers.values());
            const nextDistance = Math.hypot(second.x - first.x, second.y - first.y);
            if (pinchDistance && nextDistance > 0) setZoom(camera.zoom * (nextDistance / pinchDistance));
            pinchDistance = nextDistance;
            return;
          }
          if (!pointerDown) return;
          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          rig.rotation.y += deltaX * 0.009;
          rig.rotation.x = Math.max(-1.2, Math.min(1.2, rig.rotation.x + deltaY * 0.007));
        };
        const onPointerUp = (event: PointerEvent) => {
          pointers.delete(event.pointerId);
          pinchDistance = null;
          pointerDown = pointers.size === 1;
          const remainingPointer = pointers.values().next().value;
          if (remainingPointer) {
            lastX = remainingPointer.x;
            lastY = remainingPointer.y;
          }
          renderer.domElement.style.cursor = pointerDown ? 'grabbing' : 'grab';
          try {
            if (renderer.domElement.hasPointerCapture?.(event.pointerId)) {
              renderer.domElement.releasePointerCapture(event.pointerId);
            }
          } catch {}
        };
        const onWheel = (event: WheelEvent) => {
          event.preventDefault();
          setZoom(camera.zoom * Math.exp(-event.deltaY * 0.001));
        };
        const resize = () => {
          const nextWidth = host.clientWidth || initialWidth;
          const nextHeight = host.clientHeight || initialHeight;
          camera.aspect = nextWidth / nextHeight;
          renderer.setSize(nextWidth, nextHeight);
          setView('isometric');
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerUp);
        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
        resizeObserver?.observe(host);
        window.addEventListener('resize', resize);

        const animate = () => {
          renderer.render(scene, camera);
          raf = window.requestAnimationFrame(animate);
        };
        animate();
        setState('ready');

        cleanup = () => {
          window.cancelAnimationFrame(raf);
          viewerActions.current = {};
          resizeObserver?.disconnect();
          window.removeEventListener('resize', resize);
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('pointercancel', onPointerUp);
          renderer.domElement.removeEventListener('wheel', onWheel);
          modelGeometry.dispose();
          modelMaterial.dispose();
          edgeGeometry.dispose();
          edgeMaterial.dispose();
          floorGeometry.dispose();
          floorMaterial.dispose();
          renderer.dispose();
          if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
        };
      } catch {
        if (!cancelled) setState('unavailable');
      }
    };

    setState('loading');
    mount();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [geometry]);

  return (
    <div>
      <div
        style={frameStyle}
        role="img"
        aria-label={`Interactive three-dimensional visualization of ${label}`}
        data-testid="cad-fixture-canvas-host"
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {state !== 'ready' ? (
          <div style={fallbackStyle} data-testid={`cad-fixture-${state}`}>
            {state === 'loading' ? 'Preparing 3D visualization...' : '3D visualization is unavailable in this browser.'}
          </div>
        ) : null}
      </div>
      <div style={toolbarStyle} role="group" aria-label="Model view and zoom">
        <div style={viewToolbarStyle} role="group" aria-label="Fixed model views">
          {fixedViews.map(view => (
            <button
              key={view}
              type="button"
              style={controlStyle}
              title={view === 'isometric' ? 'Reset to isometric view' : `Show ${view} view`}
              onClick={() => viewerActions.current[view]?.()}
            >
              {view === 'isometric' ? 'Reset' : view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
        <div style={zoomToolbarStyle} role="group" aria-label="Model zoom">
          <button
            type="button"
            style={zoomControlStyle}
            title="Zoom out"
            aria-label="Zoom out"
            onClick={() => viewerActions.current.zoomOut?.()}
          >
            -
          </button>
          <button
            type="button"
            style={zoomControlStyle}
            title="Zoom in"
            aria-label="Zoom in"
            onClick={() => viewerActions.current.zoomIn?.()}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

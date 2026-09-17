import React, { useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';

type ThreeModule = typeof import('three');
type ViewName = 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
type FixedViewName = Exclude<ViewName, 'isometric'>;
type ViewerAction = ViewName | 'zoomIn' | 'zoomOut' | 'compactOpen' | 'compactClosed';

const fixedViews: FixedViewName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

const puckPositions: Record<FixedViewName, React.CSSProperties> = {
  top: { left: 62, top: 4 },
  back: { left: 112, top: 33 },
  right: { left: 112, top: 91 },
  bottom: { left: 62, top: 120 },
  left: { left: 12, top: 91 },
  front: { left: 12, top: 33 },
};

const compactPuckPositions: Record<FixedViewName, React.CSSProperties> = {
  top: { left: 44, top: 3 },
  back: { left: 80, top: 24 },
  right: { left: 80, top: 65 },
  bottom: { left: 44, top: 85 },
  left: { left: 9, top: 65 },
  front: { left: 9, top: 24 },
};

const viewSymbols: Record<'isometric' | 'custom', string> = {
  isometric: '◇',
  custom: '✣',
};

const viewRotations: Record<FixedViewName, number> = {
  top: -90,
  back: -30,
  right: 30,
  bottom: 90,
  left: 150,
  front: 210,
};

function DirectionGlyph({ view, active = false, compact = false }: { view: FixedViewName; active?: boolean; compact?: boolean }) {
  return (
    <span aria-hidden="true" style={{
      display: 'block',
      width: compact ? 16 : 23,
      height: compact ? 19 : 27,
      margin: 'auto',
      background: active ? '#7fe0c0' : '#d8e3df',
      clipPath: 'polygon(0 0, 100% 50%, 0 100%, 29% 50%)',
      transform: `rotate(${viewRotations[view]}deg)`,
      filter: active ? 'drop-shadow(0 0 5px rgba(127, 224, 192, 0.55))' : 'none',
    }} />
  );
}

const frameStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'clamp(300px, 46vw, 440px)',
  minHeight: 300,
  maxHeight: 440,
  overflow: 'hidden',
  background: '#dce6ef',
  borderRadius: 8,
  touchAction: 'none',
};

const viewToolbarStyle: React.CSSProperties = {
  position: 'relative',
  boxSizing: 'border-box',
  width: 168,
  height: 168,
  borderRadius: '50%',
  background: 'rgba(25, 36, 34, 0.97)',
  border: '1px solid rgba(174, 195, 189, 0.72)',
  boxShadow: '0 14px 30px rgba(9, 16, 18, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
};

const puckControlStyle: React.CSSProperties = {
  appearance: 'none',
  position: 'absolute',
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: '50%',
  color: '#d8e3df',
  background: 'transparent',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 21,
  lineHeight: 1,
  cursor: 'pointer',
  outlineOffset: 1,
};

const controlStyle: React.CSSProperties = {
  appearance: 'none',
  minWidth: 44,
  minHeight: 44,
  padding: 0,
  border: '1px solid #475a57',
  borderRadius: '50%',
  color: '#e8fffa',
  background: 'rgba(23, 33, 31, 0.9)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
};

const zoomControlStyle: React.CSSProperties = {
  ...controlStyle,
  minWidth: 44,
  width: 44,
  fontSize: 18,
};

const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const fallbackStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  color: '#344450',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  textAlign: 'center',
  background: '#dce6ef',
};

export default function CadFixtureViewer({
  geometry,
  label,
}: {
  geometry: CadInternalTesterFixture['previewGeometry'];
  label: string;
}) {
  const puckId = useId();
  const [expanded, setExpanded] = useState(false);
  const [compactControls, setCompactControls] = useState(false);
  const [currentView, setCurrentView] = useState<ViewName | 'custom'>('isometric');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const puckRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const viewerActions = useRef<Partial<Record<ViewerAction, () => void>>>({});
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const host = containerRef.current;
    if (!host) return;
    const update = () => setCompactControls(host.clientWidth < 360);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(host);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    viewerActions.current[compactControls && expanded ? 'compactOpen' : 'compactClosed']?.();
  }, [compactControls, expanded, state]);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = window.setTimeout(() => setExpanded(false), 6000);
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlsRef.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      window.clearTimeout(dismiss);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [expanded, currentView]);

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
        renderer.setClearColor(0xdce6ef, 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
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

        // One matte neutral material for every view. White camera-relative lights
        // describe form without the former green/blue world-light color casts.
        const modelMaterial = new THREE.MeshLambertMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
        });
        const model = new THREE.Mesh(modelGeometry, modelMaterial);
        rig.add(model);

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0x454545,
          transparent: true,
          opacity: 0.36,
        });
        const edgeGeometry = new THREE.EdgesGeometry(modelGeometry, 24);
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        rig.add(edges);

        scene.add(new THREE.AmbientLight(0xffffff, 1.4));
        scene.add(camera);
        const lightTarget = new THREE.Object3D();
        lightTarget.position.set(0, 0, -1);
        camera.add(lightTarget);
        const key = new THREE.DirectionalLight(0xffffff, 2);
        key.position.set(-3, 4, 5);
        key.target = lightTarget;
        camera.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.7);
        fill.position.set(4, -2, 3);
        fill.target = lightTarget;
        camera.add(fill);

        // A real scene grid on the view plane, behind the entire rotating model.
        // It shares camera projection/zoom, stays readable edge-on to any source
        // axis, and never implies a calibrated physical dimension.
        const grid = new THREE.GridHelper(radius * 18, 72, 0x9cabb8, 0xc2cfdb);
        scene.add(grid);
        renderer.domElement.dataset.material = 'matte-neutral-aaaaaa';
        renderer.domElement.dataset.grid = 'view-plane';

        const distanceForViewport = () => {
          const verticalFov = THREE.MathUtils.degToRad(camera.fov);
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          return (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.55;
        };
        let userZoom = 1;
        let compactPuckOpen = false;
        const applyZoom = () => {
          camera.zoom = userZoom * (compactPuckOpen ? 0.72 : 1);
          if (compactPuckOpen) {
            const viewportWidth = host.clientWidth || initialWidth;
            const viewportHeight = host.clientHeight || initialHeight;
            camera.setViewOffset(
              viewportWidth,
              viewportHeight,
              Math.round(viewportWidth * 0.1),
              Math.round(viewportHeight * -0.1),
              viewportWidth,
              viewportHeight,
            );
          } else {
            camera.clearViewOffset();
          }
          renderer.domElement.dataset.zoom = userZoom.toFixed(3);
          renderer.domElement.dataset.controlFit = compactPuckOpen ? 'compact-clearance' : 'default';
          camera.updateProjectionMatrix();
        };
        const setZoom = (nextZoom: number) => {
          userZoom = THREE.MathUtils.clamp(nextZoom, 0.65, 2.4);
          applyZoom();
        };
        const updateView = (name: ViewName | 'custom') => {
          setCurrentView(name);
          renderer.domElement.dataset.view = name;
        };
        const setView = (name: ViewName) => {
          updateView(name);
          rig.rotation.set(0, 0, 0);
          userZoom = 1;
          applyZoom();
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
          grid.position.copy(camera.position).normalize().multiplyScalar(-radius * 1.4);
          grid.quaternion.copy(camera.quaternion);
          grid.rotateX(Math.PI / 2);
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
          zoomIn: () => setZoom(userZoom * 1.2),
          zoomOut: () => setZoom(userZoom / 1.2),
          compactOpen: () => {
            compactPuckOpen = true;
            applyZoom();
          },
          compactClosed: () => {
            compactPuckOpen = false;
            applyZoom();
          },
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
            if (pinchDistance && nextDistance > 0) setZoom(userZoom * (nextDistance / pinchDistance));
            pinchDistance = nextDistance;
            return;
          }
          if (!pointerDown) return;
          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          if (deltaX || deltaY) updateView('custom');
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
          setZoom(userZoom * Math.exp(-event.deltaY * 0.001));
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
          grid.geometry.dispose();
          const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
          gridMaterials.forEach(material => material.dispose());
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
        role="group"
        aria-label={`${label} model viewer`}
        data-testid="cad-fixture-canvas-host"
      >
        <div ref={containerRef} role="img" aria-label={`Interactive three-dimensional visualization of ${label}`} style={{ width: '100%', height: '100%' }} />
        {state === 'ready' ? <span data-testid="cad-view-grid-label" style={{ position: 'absolute', left: 10, bottom: 12, maxWidth: 'calc(100% - 125px)', font: '11px system-ui, sans-serif', color: '#405564', pointerEvents: 'none' }} aria-label="View-aligned grid; not a dimensional scale">Unscaled grid</span> : null}
        <div ref={controlsRef} style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }} role="group" aria-label="Model view controls"
          onKeyDown={event => { if (event.key === 'Escape' && expanded) { setExpanded(false); document.querySelector<HTMLButtonElement>(`[aria-controls="${puckId}"]`)?.focus(); } }}>
          <button type="button" style={{ ...controlStyle, opacity: expanded ? 0 : 0.78, pointerEvents: expanded ? 'none' : 'auto' }}
            disabled={state !== 'ready'} aria-expanded={expanded} aria-controls={puckId}
            aria-label={expanded ? 'Collapse orientation controls' : 'Expand orientation controls'}
            title={`${currentView[0].toUpperCase() + currentView.slice(1)} view`}
            onClick={() => setExpanded(value => !value)}>
            {currentView === 'isometric' || currentView === 'custom'
              ? <span aria-hidden="true">{viewSymbols[currentView]}</span>
              : <DirectionGlyph view={currentView} active compact />}
          </button>
          <span role="status" style={visuallyHiddenStyle}>{currentView[0].toUpperCase() + currentView.slice(1)}</span>
          <div ref={puckRef} id={puckId} hidden={!expanded} data-layout={compactControls ? 'compact' : 'standard'} style={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
            <div data-layout={compactControls ? 'compact' : 'standard'} style={{ ...viewToolbarStyle, width: compactControls ? 132 : 168, height: compactControls ? 132 : 168 }} role="group" aria-label="Orientation puck">
              {fixedViews.map(view => (
                <button key={view} type="button" disabled={state !== 'ready'}
                  style={{ ...puckControlStyle, ...(compactControls ? compactPuckPositions[view] : puckPositions[view]) }}
                  title={`${view[0].toUpperCase() + view.slice(1)} view`}
                  aria-label={`Show ${view} view`} aria-pressed={currentView === view}
                  onClick={() => viewerActions.current[view]?.()}>
                  <DirectionGlyph view={view} active={currentView === view} compact={compactControls} />
                </button>
              ))}
              <button type="button" disabled={state !== 'ready'}
                style={{ ...controlStyle, position: 'absolute', left: compactControls ? 42 : 56, top: compactControls ? 42 : 56, width: compactControls ? 48 : 56, height: compactControls ? 48 : 56, minWidth: compactControls ? 48 : 56, minHeight: compactControls ? 48 : 56, background: '#31413e', border: '1px solid rgba(174, 195, 189, 0.6)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)' }}
                title="Reset to fitted isometric view" aria-label="Reset to fitted isometric view"
                onClick={() => viewerActions.current.isometric?.()}><span aria-hidden="true">↺</span></button>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 2, display: 'flex', gap: 6 }} role="group" aria-label="Model zoom">
          <button type="button" style={zoomControlStyle} disabled={state !== 'ready'} title="Zoom out" aria-label="Zoom out"
            onClick={() => viewerActions.current.zoomOut?.()}>-</button>
          <button type="button" style={zoomControlStyle} disabled={state !== 'ready'} title="Zoom in" aria-label="Zoom in"
            onClick={() => viewerActions.current.zoomIn?.()}>+</button>
        </div>
        {state !== 'ready' ? (
          <div style={fallbackStyle} data-testid={`cad-fixture-${state}`}>
            {state === 'loading' ? 'Preparing 3D visualization...' : '3D visualization is unavailable in this browser.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

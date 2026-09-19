import React, { useEffect, useId, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';

type ThreeModule = typeof import('three');
type OrbitViewName = 'front' | 'front-right' | 'right' | 'back-right' | 'back' | 'back-left' | 'left' | 'front-left';
type ElevationViewName = 'top' | 'bottom';
type ViewName = 'isometric' | OrbitViewName | ElevationViewName;
type FixedViewName = Exclude<ViewName, 'isometric'>;
type ViewerAction = ViewName | 'zoomIn' | 'zoomOut' | 'compactOpen' | 'compactClosed';
type ViewerActions = Partial<Record<ViewerAction, () => void>> & {
  zoomTo?: (zoom: number) => void;
};

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2.4;
const ZOOM_EPSILON = 0.001;
const CONTROL_MIN_SCALE = 0.75;
const CONTROL_MAX_SCALE = 0.88;
const scaled = (value: number, scale = 1) => Math.round(value * scale * 100) / 100;
const orbitViews: OrbitViewName[] = ['front', 'front-right', 'right', 'back-right', 'back', 'back-left', 'left', 'front-left'];
const elevationViews: ElevationViewName[] = ['top', 'bottom'];
const fixedViews: FixedViewName[] = [...orbitViews, ...elevationViews];
const isOrbitView = (view: ViewName | 'custom'): view is OrbitViewName => orbitViews.includes(view as OrbitViewName);

const viewLabels: Record<ViewName | 'custom', string> = {
  isometric: 'Isometric',
  front: 'Front',
  'front-right': 'Front-right',
  right: 'Right',
  'back-right': 'Back-right',
  back: 'Back',
  'back-left': 'Back-left',
  left: 'Left',
  'front-left': 'Front-left',
  top: 'Top',
  bottom: 'Bottom',
  custom: 'Custom',
};

const puckPositions: Record<OrbitViewName, React.CSSProperties> = {
  front: { left: 52, top: 2 },
  'front-right': { left: 87, top: 17 },
  right: { left: 102, top: 52 },
  'back-right': { left: 87, top: 87 },
  back: { left: 52, top: 102 },
  'back-left': { left: 17, top: 87 },
  left: { left: 2, top: 52 },
  'front-left': { left: 17, top: 17 },
};

const compactPuckPositions: Record<OrbitViewName, React.CSSProperties> = {
  front: { left: 38, top: 0 },
  'front-right': { left: 65, top: 11 },
  right: { left: 76, top: 38 },
  'back-right': { left: 65, top: 65 },
  back: { left: 38, top: 76 },
  'back-left': { left: 11, top: 65 },
  left: { left: 0, top: 38 },
  'front-left': { left: 11, top: 11 },
};

const viewSymbols: Record<'isometric' | 'custom', string> = {
  isometric: '◇',
  custom: '✣',
};

const viewRotations: Record<OrbitViewName, number> = {
  front: -90,
  'front-right': -45,
  right: 0,
  'back-right': 45,
  back: 90,
  'back-left': 135,
  left: 180,
  'front-left': 225,
};

function DirectionGlyph({ view, active = false, compact = false, scale = 1 }: { view: OrbitViewName; active?: boolean; compact?: boolean; scale?: number }) {
  return (
    <span aria-hidden="true" style={{
      display: 'block',
      width: compact ? scaled(16, scale) : scaled(23, scale),
      height: compact ? scaled(19, scale) : scaled(27, scale),
      margin: 'auto',
      background: active ? '#7fe0c0' : '#d8e3df',
      clipPath: 'polygon(0 0, 100% 50%, 0 100%, 29% 50%)',
      transform: `rotate(${viewRotations[view]}deg)`,
      filter: active ? 'drop-shadow(0 0 5px rgba(127, 224, 192, 0.55))' : 'none',
    }} />
  );
}

function ElevationGlyph({ view, active = false, compact = false, scale = 1 }: { view: ElevationViewName; active?: boolean; compact?: boolean; scale?: number }) {
  const width = compact ? scaled(34, scale) : scaled(42, scale);
  const height = compact ? scaled(12, scale) : scaled(15, scale);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 42 15"
      width={width}
      height={height}
      style={{
        display: 'block',
        margin: 'auto',
        overflow: 'visible',
        transform: view === 'bottom' ? 'rotate(180deg)' : 'none',
        filter: active ? 'drop-shadow(0 0 5px rgba(127, 224, 192, 0.55))' : 'drop-shadow(0 1px 1px rgba(2, 12, 11, 0.18)) drop-shadow(0 0 5px rgba(238, 248, 244, 0.38))',
      }}
    >
      <path
        d="M21 1.4C26.5 6.9 33.3 10.7 40.5 12.7C32.7 11.6 26.2 10.9 21 10.9C15.8 10.9 9.3 11.6 1.5 12.7C8.7 10.7 15.5 6.9 21 1.4Z"
        fill={active ? '#7fe0c0' : '#edf7f3'}
      />
    </svg>
  );
}

function ViewCue({ view, compact = false }: { view: ViewName | 'custom'; compact?: boolean }) {
  if (view === 'isometric' || view === 'custom') return <span aria-hidden="true">{viewSymbols[view]}</span>;
  if (view === 'top' || view === 'bottom') return <ElevationGlyph view={view} active compact={compact} />;
  return <DirectionGlyph view={view} active compact={compact} />;
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

const elevationRingStyle: React.CSSProperties = {
  position: 'relative',
  boxSizing: 'border-box',
  width: 176,
  height: 176,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 50% 50%, rgba(18, 32, 29, 0.04) 0%, rgba(18, 32, 29, 0.04) 79%, rgba(57, 71, 68, 0.54) 80%, rgba(22, 32, 30, 0.6) 100%)',
  border: '1px solid rgba(174, 195, 189, 0.42)',
  boxShadow: '0 12px 24px rgba(9, 16, 18, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  overflow: 'hidden',
};

const viewToolbarStyle: React.CSSProperties = {
  position: 'absolute',
  boxSizing: 'border-box',
  width: 144,
  height: 144,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08), rgba(18, 32, 29, 0.1) 58%, rgba(18, 32, 29, 0.04) 76%)',
  border: '1px solid rgba(207, 224, 219, 0.3)',
  boxShadow: '0 8px 18px rgba(9, 16, 18, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
};

const elevationControlStyle: React.CSSProperties = {
  appearance: 'none',
  position: 'absolute',
  left: 0,
  width: '100%',
  height: '50%',
  padding: 0,
  border: 0,
  color: '#d8e3df',
  background: 'transparent',
  cursor: 'pointer',
  outlineOffset: -4,
};

const puckControlStyle: React.CSSProperties = {
  appearance: 'none',
  position: 'absolute',
  width: 40,
  height: 40,
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
  border: '1px solid rgba(161, 183, 178, 0.46)',
  borderRadius: '50%',
  color: '#e8fffa',
  background: 'rgba(23, 33, 31, 0.58)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  boxShadow: '0 8px 18px rgba(9, 16, 18, 0.16)',
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

const zoomRailPanelBaseStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  borderRadius: 999,
  background: 'rgba(23, 33, 31, 0.24)',
  border: '1px solid rgba(216, 227, 223, 0.12)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  boxShadow: '0 10px 26px rgba(9, 16, 18, 0.12)',
};

const zoomRailPanelStyle: React.CSSProperties = {
  ...zoomRailPanelBaseStyle,
  right: 12,
  bottom: 12,
};

const expandedZoomRailPanelStyle: React.CSSProperties = {
  ...zoomRailPanelBaseStyle,
  left: 12,
  top: 12,
  zIndex: 4,
  pointerEvents: 'auto',
};

const zoomStepButtonBaseStyle: React.CSSProperties = {
  ...zoomControlStyle,
  position: 'relative',
  border: '1px solid rgba(216, 227, 223, 0.18)',
  background: 'rgba(23, 33, 31, 0.34)',
  boxShadow: '0 4px 12px rgba(9, 16, 18, 0.12)',
};

const zoomRailWrapStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  touchAction: 'none',
};

const zoomRailTrackStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  borderRadius: 999,
  transform: 'translateX(-50%)',
  background: 'rgba(161, 183, 178, 0.24)',
  overflow: 'hidden',
  boxShadow: 'inset 0 1px 4px rgba(9, 16, 18, 0.22)',
};

const zoomRailInputStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  zIndex: 3,
};

const zoomThumbStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  borderRadius: '50%',
  transform: 'translateX(-50%)',
  background: '#e8fffa',
  boxShadow: '0 0 0 2px rgba(127, 224, 192, 0.32), 0 4px 10px rgba(9, 16, 18, 0.18)',
  pointerEvents: 'none',
};

const zoomFitButtonStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  padding: 0,
  borderRadius: '50%',
  transform: 'translate(-50%, 50%)',
  border: '1px solid rgba(216, 227, 223, 0.24)',
  color: '#e8fffa',
  background: 'rgba(23, 33, 31, 0.34)',
  boxShadow: '0 4px 12px rgba(9, 16, 18, 0.14)',
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1,
  cursor: 'pointer',
  zIndex: 4,
};

const zoomTickStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  height: 1,
  transform: 'translateX(-50%)',
  background: 'rgba(216, 227, 223, 0.28)',
  pointerEvents: 'none',
};

const zoomButtonTextStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
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
  const [viewerWidth, setViewerWidth] = useState(0);
  const [currentView, setCurrentView] = useState<ViewName | 'custom'>('isometric');
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const puckRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const zoomControlsRef = useRef<HTMLDivElement | null>(null);
  const viewerActions = useRef<ViewerActions>({});
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const host = containerRef.current;
    if (!host) return;
    const update = () => {
      setViewerWidth(host.clientWidth);
      setCompactControls(host.clientWidth < 360);
    };
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
      if (
        event.target instanceof Node
        && !controlsRef.current?.contains(event.target)
        && !zoomControlsRef.current?.contains(event.target)
      ) {
        setExpanded(false);
      }
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
        } else if (geometry.kind === 'mesh') {
          let vertexOffset = 0;
          const positions: number[] = [];
          const indices: number[] = [];
          for (const mesh of geometry.meshes) {
            positions.push(...mesh.positions);
            indices.push(...mesh.indices.map(index => index + vertexOffset));
            vertexOffset += mesh.positions.length / 3;
          }
          modelGeometry = new THREE.BufferGeometry();
          modelGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          modelGeometry.setIndex(indices);
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
        const showEdges = geometry.kind !== 'mesh' || geometry.triangles <= 50000;
        const edgeGeometry = showEdges ? new THREE.EdgesGeometry(modelGeometry, 24) : null;
        if (edgeGeometry) {
          const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
          rig.add(edges);
        }

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
        renderer.domElement.dataset.geometryKind = geometry.kind;

        const distanceForViewport = () => {
          const verticalFov = THREE.MathUtils.degToRad(camera.fov);
          const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
          return (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * 1.55;
        };
        let userZoom = 1;
        let compactPuckOpen = false;
        const publishZoom = () => {
          setZoomLevel(userZoom);
          renderer.domElement.dataset.zoomAtMin = userZoom <= MIN_ZOOM + ZOOM_EPSILON ? 'true' : 'false';
          renderer.domElement.dataset.zoomAtMax = userZoom >= MAX_ZOOM - ZOOM_EPSILON ? 'true' : 'false';
        };
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
          publishZoom();
          camera.updateProjectionMatrix();
        };
        const setZoom = (nextZoom: number) => {
          userZoom = THREE.MathUtils.clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
          applyZoom();
        };
        const updateView = (name: ViewName | 'custom') => {
          setCurrentView(name);
          renderer.domElement.dataset.view = name;
        };
        const setView = (name: ViewName, options: { resetZoom?: boolean } = {}) => {
          updateView(name);
          rig.rotation.set(0, 0, 0);
          if (options.resetZoom) userZoom = 1;
          renderer.domElement.dataset.view = name;
          const distance = distanceForViewport();
          camera.up.set(0, 1, 0);
          // Map the original IGES axes through the -90deg X rotation applied above.
          if (isOrbitView(name)) {
            const diagonalDistance = distance / Math.SQRT2;
            const horizontalViews: Record<OrbitViewName, [number, number, number]> = {
              front: [0, distance, 0.001],
              'front-right': [diagonalDistance, diagonalDistance, 0.001],
              right: [distance, 0, 0],
              'back-right': [diagonalDistance, -diagonalDistance, 0.001],
              back: [0, -distance, 0.001],
              'back-left': [-diagonalDistance, -diagonalDistance, 0.001],
              left: [-distance, 0, 0],
              'front-left': [-diagonalDistance, diagonalDistance, 0.001],
            };
            camera.position.set(...horizontalViews[name]);
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
          applyZoom();
        };
        viewerActions.current = {
          isometric: () => setView('isometric', { resetZoom: true }),
          zoomIn: () => setZoom(userZoom * 1.2),
          zoomOut: () => setZoom(userZoom / 1.2),
          zoomTo: (zoom: number) => setZoom(zoom),
          compactOpen: () => {
            compactPuckOpen = true;
            applyZoom();
          },
          compactClosed: () => {
            compactPuckOpen = false;
            applyZoom();
          },
        };
        fixedViews.forEach(view => {
          viewerActions.current[view] = () => setView(view);
        });
        setView('isometric', { resetZoom: true });

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
          edgeGeometry?.dispose();
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

  const currentViewLabel = viewLabels[currentView];
  const controlScale = Math.max(CONTROL_MIN_SCALE, Math.min(CONTROL_MAX_SCALE, (viewerWidth || 520) / 620));
  const scalePosition = (style: React.CSSProperties) => ({
    ...style,
    left: typeof style.left === 'number' ? scaled(style.left, controlScale) : style.left,
    top: typeof style.top === 'number' ? scaled(style.top, controlScale) : style.top,
  });
  const puckSize = scaled(compactControls ? 144 : 176, controlScale);
  const innerPuckSize = scaled(compactControls ? 116 : 144, controlScale);
  const innerPuckOffset = (puckSize - innerPuckSize) / 2;
  const orbitButtonSize = Math.max(24, scaled(34, controlScale));
  const resetButtonSize = Math.max(32, scaled(compactControls ? 42 : 48, controlScale));
  const resetButtonOffset = (innerPuckSize - resetButtonSize) / 2;
  const elevationButtonBackground = (view: ElevationViewName) => currentView === view
    ? 'radial-gradient(circle at 50% 50%, rgba(127, 224, 192, 0.18), rgba(127, 224, 192, 0.05) 60%, transparent 72%)'
    : 'transparent';
  const zoomProgress = Math.max(0, Math.min(1, (zoomLevel - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)));
  const zoomInProgress = zoomProgress;
  const zoomOutProgress = 1 - zoomProgress;
  const fitZoomProgress = Math.max(0, Math.min(1, (1 - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)));
  const zoomSliderValue = Math.round(zoomProgress * 100);
  const zoomButtonSize = Math.max(32, scaled(38, controlScale));
  const zoomRailWrapWidth = Math.max(32, scaled(38, controlScale));
  const zoomRailWrapHeight = Math.max(72, scaled(96, controlScale));
  const zoomRailInset = scaled(7, controlScale);
  const zoomRailInnerHeight = zoomRailWrapHeight - zoomRailInset * 2;
  const zoomThumbSize = scaled(16, controlScale);
  const zoomThumbBottom = Math.round(zoomProgress * zoomRailInnerHeight) - zoomThumbSize / 2;
  const zoomFitButtonSize = Math.max(22, scaled(28, controlScale));
  const zoomFitBottom = Math.round(fitZoomProgress * zoomRailInnerHeight) + zoomRailInset;
  const canZoomOut = state === 'ready' && zoomLevel > MIN_ZOOM + ZOOM_EPSILON;
  const canZoomIn = state === 'ready' && zoomLevel < MAX_ZOOM - ZOOM_EPSILON;
  const zoomStepButtonStyle = (enabled: boolean): React.CSSProperties => {
    return {
      ...zoomStepButtonBaseStyle,
      minHeight: zoomButtonSize,
      minWidth: zoomButtonSize,
      width: zoomButtonSize,
      height: zoomButtonSize,
      fontSize: scaled(18, controlScale),
      color: enabled ? '#e8fffa' : 'rgba(232, 255, 250, 0.38)',
      cursor: enabled ? 'pointer' : 'not-allowed',
      opacity: enabled ? 0.82 : 0.5,
    };
  };
  const setZoomFromSlider = (value: number) => {
    const progress = Math.max(0, Math.min(1, value / 100));
    viewerActions.current.zoomTo?.(MIN_ZOOM + progress * (MAX_ZOOM - MIN_ZOOM));
  };
  const zoomRailPlacementStyle = {
    ...(expanded ? expandedZoomRailPanelStyle : zoomRailPanelStyle),
    gap: scaled(6, controlScale),
    padding: scaled(6, controlScale),
  };
  const zoomRailStyle = {
    ...zoomRailWrapStyle,
    width: zoomRailWrapWidth,
    height: zoomRailWrapHeight,
  };
  const zoomRailTrackScaledStyle = {
    ...zoomRailTrackStyle,
    top: zoomRailInset,
    bottom: zoomRailInset,
    width: scaled(6, controlScale),
  };
  const zoomThumbScaledStyle = {
    ...zoomThumbStyle,
    width: zoomThumbSize,
    height: zoomThumbSize,
  };
  const zoomFitScaledStyle = {
    ...zoomFitButtonStyle,
    width: zoomFitButtonSize,
    height: zoomFitButtonSize,
    minWidth: zoomFitButtonSize,
    minHeight: zoomFitButtonSize,
    fontSize: scaled(14, controlScale),
  };
  const zoomTickScaledStyle = {
    ...zoomTickStyle,
    width: scaled(16, controlScale),
  };

  return (
    <div>
      <div
        style={frameStyle}
        role="group"
        aria-label={`${label} model viewer`}
        data-testid="cad-fixture-canvas-host"
      >
        <div ref={containerRef} role="img" aria-label={`Interactive three-dimensional visualization of ${label}`} style={{ width: '100%', height: '100%' }} />
        <div ref={controlsRef} style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }} role="group" aria-label="Model view controls"
          onKeyDown={event => { if (event.key === 'Escape' && expanded) { setExpanded(false); document.querySelector<HTMLButtonElement>(`[aria-controls="${puckId}"]`)?.focus(); } }}>
          <button type="button" style={{ ...controlStyle, opacity: expanded ? 0 : 0.78, pointerEvents: expanded ? 'none' : 'auto' }}
            disabled={state !== 'ready'} aria-expanded={expanded} aria-controls={puckId}
            aria-label={expanded ? 'Collapse orientation controls' : 'Expand orientation controls'}
            title={`${currentViewLabel} view`}
            onClick={() => setExpanded(value => !value)}>
            <ViewCue view={currentView} compact />
          </button>
          <span role="status" style={visuallyHiddenStyle}>{currentViewLabel}</span>
          <div ref={puckRef} id={puckId} hidden={!expanded} data-layout={compactControls ? 'compact' : 'standard'} style={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
            <div data-layout={compactControls ? 'compact' : 'standard'} style={{ ...elevationRingStyle, width: puckSize, height: puckSize }} role="group" aria-label="Orientation puck">
              <span aria-hidden="true" style={{
                position: 'absolute',
                left: compactControls ? 8 : 10,
                right: compactControls ? 8 : 10,
                top: '50%',
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(216, 227, 223, 0.32) 18%, rgba(216, 227, 223, 0.32) 82%, transparent)',
                boxShadow: '0 1px 0 rgba(0, 0, 0, 0.24)',
                transform: 'translateY(-0.5px)',
                pointerEvents: 'none',
              }} />
              {elevationViews.map(view => (
                <button key={view} type="button" disabled={state !== 'ready'}
                  style={{
                    ...elevationControlStyle,
                    top: view === 'top' ? 0 : '50%',
                    borderRadius: view === 'top' ? `${puckSize / 2}px ${puckSize / 2}px 0 0` : `0 0 ${puckSize / 2}px ${puckSize / 2}px`,
                    background: elevationButtonBackground(view),
                  }}
                  title={`${viewLabels[view]} view`}
                  aria-label={`Show ${view} view`} aria-pressed={currentView === view}
                  onClick={() => viewerActions.current[view]?.()}>
                  <span style={{ position: 'absolute', left: '50%', ...(view === 'top' ? { top: scaled(compactControls ? 6 : 8, controlScale) } : { bottom: scaled(compactControls ? 6 : 8, controlScale) }), transform: 'translateX(-50%)', opacity: 1 }}>
                    <ElevationGlyph view={view} active={currentView === view} compact={compactControls} scale={controlScale} />
                  </span>
                </button>
              ))}
              <div style={{ ...viewToolbarStyle, left: innerPuckOffset, top: innerPuckOffset, width: innerPuckSize, height: innerPuckSize }}>
              {orbitViews.map(view => (
                <button key={view} type="button" disabled={state !== 'ready'}
                  style={{ ...puckControlStyle, width: orbitButtonSize, height: orbitButtonSize, fontSize: scaled(21, controlScale), ...scalePosition(compactControls ? compactPuckPositions[view] : puckPositions[view]) }}
                  title={`${viewLabels[view]} view`}
                  aria-label={`Show ${view} view`} aria-pressed={currentView === view}
                  onClick={() => viewerActions.current[view]?.()}>
                  <DirectionGlyph view={view} active={currentView === view} compact={compactControls} scale={controlScale} />
                </button>
              ))}
              <button type="button" disabled={state !== 'ready'}
                style={{ ...controlStyle, position: 'absolute', left: resetButtonOffset, top: resetButtonOffset, width: resetButtonSize, height: resetButtonSize, minWidth: resetButtonSize, minHeight: resetButtonSize, background: 'rgba(49, 65, 62, 0.28)', border: '1px solid rgba(207, 224, 219, 0.32)', boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)' }}
                title="Reset to fitted isometric view" aria-label="Reset to fitted isometric view"
                onClick={() => viewerActions.current.isometric?.()}><span aria-hidden="true">↺</span></button>
              </div>
            </div>
          </div>
        </div>
        <div ref={zoomControlsRef} style={zoomRailPlacementStyle} role="group" aria-label="Model zoom">
          <span aria-live="polite" aria-label="Zoom level" style={visuallyHiddenStyle}>{canZoomIn ? 'Zoom can increase.' : 'Maximum zoom reached.'} {canZoomOut ? 'Zoom can decrease.' : 'Minimum zoom reached.'}</span>
          <button type="button" data-testid="cad-zoom-in" data-zoom-meter={zoomInProgress.toFixed(3)} style={zoomStepButtonStyle(canZoomIn)} disabled={!canZoomIn} title={canZoomIn ? 'Zoom in' : 'Maximum zoom reached'} aria-label={canZoomIn ? 'Zoom in' : 'Zoom in unavailable; maximum zoom reached'}
            onClick={() => viewerActions.current.zoomIn?.()}><span style={zoomButtonTextStyle}>+</span></button>
          <div style={zoomRailStyle} data-testid="cad-zoom-rail">
            <span aria-hidden="true" style={zoomRailTrackScaledStyle}>
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${zoomSliderValue}%`, background: 'linear-gradient(180deg, #7fe0c0, rgba(127, 224, 192, 0.78))' }} />
            </span>
            {[0, 25, 50, 75, 100].map(tick => (
              <span key={tick} aria-hidden="true" style={{ ...zoomTickScaledStyle, bottom: zoomRailInset + (tick / 100) * zoomRailInnerHeight }} />
            ))}
            <span aria-hidden="true" style={{ ...zoomThumbScaledStyle, bottom: zoomRailInset + zoomThumbBottom }} />
            <button type="button" data-testid="cad-zoom-fit" style={{ ...zoomFitScaledStyle, bottom: zoomFitBottom, opacity: state === 'ready' ? 0.86 : 0.5 }} disabled={state !== 'ready'}
              title="Reset zoom to fitted view" aria-label="Reset zoom to fitted view"
              onClick={() => viewerActions.current.zoomTo?.(1)}>⌾</button>
            <input
              type="range"
              data-testid="cad-zoom-slider"
              min={0}
              max={100}
              step={1}
              value={zoomSliderValue}
              disabled={state !== 'ready'}
              aria-label="Zoom level"
              aria-valuetext={canZoomIn || canZoomOut ? 'Model zoom adjusted' : 'Model zoom unavailable'}
              style={zoomRailInputStyle}
              onChange={event => setZoomFromSlider(Number(event.currentTarget.value))}
            />
          </div>
          <button type="button" data-testid="cad-zoom-out" data-zoom-meter={zoomOutProgress.toFixed(3)} style={zoomStepButtonStyle(canZoomOut)} disabled={!canZoomOut} title={canZoomOut ? 'Zoom out' : 'Minimum zoom reached'} aria-label={canZoomOut ? 'Zoom out' : 'Zoom out unavailable; minimum zoom reached'}
            onClick={() => viewerActions.current.zoomOut?.()}><span style={zoomButtonTextStyle}>-</span></button>
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

import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { CadInternalTesterFixture } from '../utils/cadInternalTesterPreview';

type ThreeModule = typeof import('three');

const frameStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'clamp(240px, 35vw, 320px)',
  minHeight: 240,
  maxHeight: 320,
  overflow: 'hidden',
  background: '#0b0f10',
  touchAction: 'none',
};

const canvasHostStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
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

export default function CadPublicCubeViewer({
  geometry,
}: {
  geometry: CadInternalTesterFixture['previewGeometry'];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (Platform.OS !== 'web' || geometry.kind !== 'box') {
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
        const width = host.clientWidth || 720;
        const height = host.clientHeight || 360;
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x0b0f10, 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.setAttribute('data-testid', 'cad-public-cube-canvas');
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.cursor = 'grab';
        renderer.domElement.style.touchAction = 'none';
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0b0f10, 7, 13);

        const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
        camera.position.set(3.7, 2.8, 4.6);
        camera.lookAt(0, 0.35, 0);

        const rig = new THREE.Group();
        rig.rotation.set(-0.16, -0.55, 0);
        rig.position.y = 0.72;
        scene.add(rig);

        const [sx, sy, sz] = geometry.normalizedScale;
        const cubeGeometry = new THREE.BoxGeometry(sx * 1.9, sy * 1.9, sz * 1.9);
        const cubeMaterial = new THREE.MeshStandardMaterial({
          color: 0x49c6b3,
          roughness: 0.36,
          metalness: 0.18,
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true;
        cube.receiveShadow = true;
        rig.add(cube);

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xe8fffa,
          transparent: true,
          opacity: 0.82,
        });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cubeGeometry), edgeMaterial);
        rig.add(edges);

        scene.add(new THREE.HemisphereLight(0xe8fff8, 0x1b2425, 1.8));
        const key = new THREE.DirectionalLight(0xffffff, 3.2);
        key.position.set(4, 6, 4);
        key.castShadow = true;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x69a7ff, 1.6);
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        const floorMaterial = new THREE.MeshStandardMaterial({
          color: 0x111819,
          roughness: 0.9,
          metalness: 0,
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.25;
        floor.receiveShadow = true;
        scene.add(floor);

        const grid = new THREE.GridHelper(9, 18, 0x43756e, 0x253331);
        grid.position.y = -0.24;
        scene.add(grid);

        let pointerDown = false;
        let lastX = 0;
        let lastY = 0;
        let raf = 0;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

        const onPointerDown = (event: PointerEvent) => {
          pointerDown = true;
          lastX = event.clientX;
          lastY = event.clientY;
          renderer.domElement.style.cursor = 'grabbing';
          renderer.domElement.setPointerCapture?.(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!pointerDown) return;
          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          rig.rotation.y += deltaX * 0.009;
          rig.rotation.x = Math.max(-0.62, Math.min(0.46, rig.rotation.x + deltaY * 0.006));
        };
        const onPointerUp = (event: PointerEvent) => {
          pointerDown = false;
          renderer.domElement.style.cursor = 'grab';
          if (renderer.domElement.hasPointerCapture?.(event.pointerId)) {
            renderer.domElement.releasePointerCapture(event.pointerId);
          }
        };
        const resize = () => {
          const nextWidth = host.clientWidth || width;
          const nextHeight = host.clientHeight || height;
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, nextHeight);
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointercancel', onPointerUp);
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
        resizeObserver?.observe(host);
        window.addEventListener('resize', resize);

        const animate = () => {
          if (!pointerDown && !reduceMotion) rig.rotation.y += 0.0024;
          renderer.render(scene, camera);
          raf = window.requestAnimationFrame(animate);
        };
        animate();
        setState('ready');

        cleanup = () => {
          window.cancelAnimationFrame(raf);
          resizeObserver?.disconnect();
          window.removeEventListener('resize', resize);
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('pointercancel', onPointerUp);
          cubeGeometry.dispose();
          cubeMaterial.dispose();
          edgeMaterial.dispose();
          edges.geometry.dispose();
          floor.geometry.dispose();
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

  return React.createElement(
    'div',
    {
      style: frameStyle,
      role: 'img',
      'aria-label': 'Interactive three-dimensional visualization of the normalized public cube fixture',
      'data-testid': 'cad-public-cube-canvas-host',
    },
    React.createElement('div', { ref: containerRef, style: canvasHostStyle }),
    state !== 'ready'
      ? React.createElement(
        'div',
        { style: fallbackStyle, 'data-testid': `cad-public-cube-${state}` },
        state === 'loading' ? 'Preparing 3D fixture visualization...' : '3D visualization is unavailable in this browser.'
      )
      : null
  );
}

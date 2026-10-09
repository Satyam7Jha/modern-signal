"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// A decorative 3D "task board" for the sign-in page: a grid of rounded tiles
// ripples like a wave, and every so often a tile is "completed" and lights up
// in the brand indigo, with a bloom pass making it glow. Three.js is loaded
// lazily, so it only costs anything on the page that shows this component.

const COLUMNS = 22;
const ROWS = 14;
const GAP_X = 1.05;
const GAP_Z = 0.8;
const BACKGROUND = 0x09090b; // zinc-950, matches the panel behind the canvas
const BASE_COLOR = 0x3f3f46; // zinc-700
const DONE_COLOR = 0x6366f1; // indigo-500
const DONE_INTENSITY = 2.8; // > 1 pushes "done" tiles over the bloom threshold
const COMPLETE_EVERY_MS = 650;
const DONE_FOR_MS = 7000;

async function loadThree() {
  const [three, { RoundedBoxGeometry }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] =
    await Promise.all([
      import("three"),
      import("three/addons/geometries/RoundedBoxGeometry.js"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js"),
    ]);
  return { three, RoundedBoxGeometry, EffectComposer, RenderPass, UnrealBloomPass, OutputPass };
}

type ThreeModules = Awaited<ReturnType<typeof loadThree>>;

export function TaskBoardScene({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup = () => {};

    loadThree().then((modules) => {
      if (!disposed) cleanup = buildScene(modules, container);
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={containerRef} aria-hidden className={cn("pointer-events-none", className)} />;
}

function buildScene(modules: ThreeModules, container: HTMLDivElement) {
  const { three, RoundedBoxGeometry, EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = modules;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new three.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(BACKGROUND);
  renderer.toneMapping = three.ACESFilmicToneMapping;
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  const scene = new three.Scene();
  scene.fog = new three.Fog(BACKGROUND, 11, 25); // distant tiles fade into the background

  const camera = new three.PerspectiveCamera(38, 1, 0.1, 100);
  const cameraHome = new three.Vector3(0, 9.5, 13);
  camera.position.copy(cameraHome);

  scene.add(new three.AmbientLight(0xffffff, 0.5));
  const sun = new three.DirectionalLight(0xffffff, 1.5);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  const glow = new three.PointLight(0x8b5cf6, 60, 16, 1.5); // violet light drifting over the board
  glow.position.set(0, 3, 2);
  scene.add(glow);

  // One InstancedMesh draws every tile in a single draw call.
  const geometry = new RoundedBoxGeometry(0.86, 0.14, 0.6, 3, 0.07);
  const material = new three.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 });
  const tiles = new three.InstancedMesh(geometry, material, COLUMNS * ROWS);
  scene.add(tiles);

  const base = new three.Color(BASE_COLOR);
  const done = new three.Color(DONE_COLOR).multiplyScalar(DONE_INTENSITY);
  const doneUntil = new Float32Array(tiles.count); // timestamp until which a tile stays "done"
  const mix = new Float32Array(tiles.count); // 0 = base color, 1 = done color
  const color = new three.Color();
  const dummy = new three.Object3D();

  for (let i = 0; i < tiles.count; i++) {
    if (Math.random() < 0.1) {
      doneUntil[i] = Math.random() * DONE_FOR_MS;
      mix[i] = 1;
    }
    tiles.setColorAt(i, color.copy(base).lerp(done, mix[i]));
  }

  // Post-processing: render, bloom the bright tiles, then tone-map to the screen.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new three.Vector2(1, 1), 0.85, 0.5, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const pointer = { x: 0, y: 0 };
  const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointerMove);

  const resize = () => {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight);
    composer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let lastCompletion = 0;

  const render = (now: number) => {
    const t = now / 1000;

    // "Complete" a random tile every so often.
    if (now - lastCompletion > COMPLETE_EVERY_MS) {
      lastCompletion = now;
      doneUntil[Math.floor(Math.random() * tiles.count)] = now + DONE_FOR_MS;
    }

    let i = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++, i++) {
        const x = (col - (COLUMNS - 1) / 2) * GAP_X;
        const z = (row - (ROWS - 1) / 2) * GAP_Z;
        const wave = Math.sin(x * 0.45 + t * 0.9) * Math.cos(z * 0.55 + t * 0.6);

        // Completed tiles float slightly above the wave.
        dummy.position.set(x, wave * 0.45 + mix[i] * 0.25, z);
        dummy.rotation.set(wave * 0.12, 0, wave * 0.08);
        dummy.updateMatrix();
        tiles.setMatrixAt(i, dummy.matrix);

        const target = doneUntil[i] > now ? 1 : 0;
        if (mix[i] !== target) {
          mix[i] += (target - mix[i]) * 0.06;
          if (Math.abs(target - mix[i]) < 0.01) mix[i] = target;
          tiles.setColorAt(i, color.copy(base).lerp(done, mix[i]));
        }
      }
    }
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;

    glow.position.x = Math.sin(t * 0.4) * 6;
    glow.position.z = Math.cos(t * 0.3) * 3;

    // Gentle parallax towards the pointer.
    camera.position.x += (cameraHome.x + pointer.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (cameraHome.y - pointer.y * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, -0.5, 0);

    composer.render();
  };

  if (reducedMotion) {
    render(0); // a single still frame
  } else {
    renderer.setAnimationLoop(render);
  }

  // Don't burn GPU time while the tab is hidden.
  const onVisibilityChange = () => {
    if (!reducedMotion) renderer.setAnimationLoop(document.hidden ? null : render);
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    renderer.setAnimationLoop(null);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pointermove", onPointerMove);
    resizeObserver.disconnect();
    bloom.dispose();
    composer.dispose();
    tiles.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

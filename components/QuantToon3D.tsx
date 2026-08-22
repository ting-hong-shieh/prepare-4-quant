'use client';

// Ported from `quant-toon-3d.js` in the Quant Drill design canvas: cel-shaded
// progress blocks, a procedural banded sky, inverted-hull outlines and
// gl_PointCoord sparkles. Same scene, wired to React and the npm three build
// instead of a custom element loading three from a CDN.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PALETTE = [0x6b5ae0, 0xff8a5b, 0x33c08c, 0xffc44d, 0x4fa8ff, 0xf06aa8, 0x8de06b];

const lerpHex = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t)) & 0xffffff;
};

export interface QuantToon3DProps {
  done: number;
  total: number;
  /** 0 = morning, 1 = dusk. The sky tracks how much of the book is finished. */
  sky?: number;
  mode?: 'light' | 'dark';
  height?: number;
}

export default function QuantToon3D({ done, total, sky = 0.3, mode = 'dark', height = 330 }: QuantToon3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<() => void>(() => {});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const totalN = Math.max(1, total);
    const doneN = Math.min(totalN, Math.max(0, done));
    const dark = mode === 'dark';
    const skyT = Math.max(0, Math.min(1, sky));
    const inkColor = dark ? 0x08070a : 0x241e1a;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // 2x on a phone quadruples fragment work for no visible gain on flat toon shading.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    camera.position.set(4.4, 3.4, 6.4);
    camera.lookAt(0, 0.35, 0);

    // cel-shading ramp: 4 hard steps, nearest-filtered
    const ramp = new THREE.DataTexture(new Uint8Array([86, 140, 190, 232]), 4, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;

    scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x1a1730 : 0xdcc9ae, dark ? 0.55 : 0.75));
    const key = new THREE.DirectionalLight(0xffffff, dark ? 1.35 : 1.1);
    key.position.set(4, 7, 5);
    scene.add(key);

    const topC = lerpHex(0x9fd0ff, 0x6b4fb0, skyT);
    const botC = lerpHex(0xfff2dc, 0xffb27a, skyT);
    const sunC = lerpHex(0xfff6d8, 0xffd9a0, skyT);
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(dark ? lerpHex(topC, 0x0d0b18, 0.72) : topC) },
          uBot: { value: new THREE.Color(dark ? lerpHex(botC, 0x150f22, 0.68) : botC) },
          uSun: { value: new THREE.Color(sunC) },
          uSunPos: { value: new THREE.Vector3(-0.94, 0.36, 0.18).normalize() },
          uGlow: { value: dark ? 0.3 : 0.7 },
        },
        vertexShader:
          'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: [
          'uniform vec3 uTop,uBot,uSun,uSunPos; uniform float uGlow; varying vec3 vD;',
          'void main(){',
          '  float h = clamp(vD.y*0.5+0.5, 0.0, 1.0);',
          '  float band = floor(h*7.0)/7.0*0.75 + h*0.25;', // the sky is cel-shaded too
          '  vec3 c = mix(uBot, uTop, band);',
          '  float d = max(dot(vD, uSunPos), 0.0);',
          '  c += uSun * pow(d, 22.0) * uGlow;',
          '  c += uSun * pow(d, 3.0) * 0.03 * uGlow;',
          '  gl_FragColor = vec4(c, 1.0);',
          '}',
        ].join('\n'),
      }),
    );
    scene.add(skyMesh);

    const group = new THREE.Group();
    scene.add(group);

    const geo = new RoundedBoxGeometry(1, 1, 1, 5, 0.18);
    const outlineMat = new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide });

    const cubes: THREE.Mesh[] = [];
    const perRow = 3;
    for (let i = 0; i < totalN; i++) {
      const filled = i < doneN;
      const mat = new THREE.MeshToonMaterial({
        color: filled ? PALETTE[i % PALETTE.length] : dark ? 0x3a3550 : 0xffffff,
        gradientMap: ramp,
        transparent: !filled,
        opacity: filled ? 1 : dark ? 0.5 : 0.38,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // inverted-hull outline — the anime ink line
      const ol = new THREE.Mesh(
        geo,
        filled ? outlineMat : new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide, transparent: true, opacity: 0.35 }),
      );
      ol.scale.setScalar(filled ? 1.075 : 1.04);
      mesh.add(ol);

      const level = Math.floor(i / perRow);
      const inRow = i % perRow;
      mesh.position.set(
        (inRow - (perRow - 1) / 2) * 1.16 + (level % 2 ? 0.28 : -0.28),
        level * 1.12 - 0.9,
        level % 2 ? 0.2 : -0.2,
      );
      mesh.rotation.y = (i * 0.13) % 0.4;
      mesh.userData = { baseY: mesh.position.y, phase: i * 0.7, filled };
      group.add(mesh);
      cubes.push(mesh);
    }

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.1, 48),
      new THREE.MeshBasicMaterial({ color: dark ? 0x000006 : 0x2a2118, transparent: true, opacity: dark ? 0.3 : 0.08 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -1.62;
    scene.add(disc);

    // sparkles: procedural 4-point stars, no texture
    const N = 96;
    const sPos = new Float32Array(N * 3);
    const sA = new Float32Array(N);
    const sSize = new Float32Array(N);
    const sVel = new Float32Array(N * 3);
    const sLife = new Float32Array(N);
    const sMax = new Float32Array(N);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sA, 1));
    sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
    const sparkles = new THREE.Points(
      sGeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(dark ? 0xfff0c0 : 0xfff6d8) } },
        vertexShader: [
          'attribute float aAlpha; attribute float aSize; varying float vA;',
          'void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0);',
          '  gl_PointSize = aSize * (230.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 uColor; varying float vA;',
          'void main(){',
          '  vec2 p = (gl_PointCoord - 0.5) * 2.0;',
          '  float r = length(p);',
          '  float arms = max(1.0 - abs(p.x) * 7.0, 0.0) + max(1.0 - abs(p.y) * 7.0, 0.0);',
          '  float a = arms * max(1.0 - r, 0.0) * 0.8 + smoothstep(0.34, 0.0, r);',
          '  a = clamp(a, 0.0, 1.0) * vA;',
          '  if (a < 0.01) discard;',
          '  gl_FragColor = vec4(uColor, a);',
          '}',
        ].join('\n'),
      }),
    );
    scene.add(sparkles);

    const filledCubes = cubes.filter(c => c.userData.filled);
    // Sparkles celebrate finished chapters, so their count follows the number
    // of finished chapters. Spawning the full set regardless meant that at zero
    // or one they all piled onto a single cube and the scene became one white
    // blob — the opposite of celebrating anything.
    const activeSparkles = filledCubes.length
      ? Math.min(N, 16 + filledCubes.length * 16)
      : 0;
    const spawn = (i: number, spread?: number) => {
      const host2 = filledCubes.length ? filledCubes[(Math.random() * filledCubes.length) | 0] : cubes[0];
      const s = spread || 0.85;
      sPos[i * 3] = host2.position.x + (Math.random() - 0.5) * s;
      sPos[i * 3 + 1] = host2.userData.baseY + (Math.random() - 0.5) * s;
      sPos[i * 3 + 2] = host2.position.z + (Math.random() - 0.5) * s;
      sVel[i * 3] = (Math.random() - 0.5) * 0.22;
      sVel[i * 3 + 1] = 0.28 + Math.random() * 0.5;
      sVel[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
      sSize[i] = 6 + Math.random() * 9;
      sLife[i] = 0;
      sMax[i] = 0.9 + Math.random() * 0.8;
    };
    for (let i = 0; i < N; i++) {
      spawn(i);
      sLife[i] = Math.random() * sMax[i];
      sA[i] = 0;
      if (i >= activeSparkles) sSize[i] = 0; // parked: never drawn
    }

    let burstAt = -1e9;
    burstRef.current = () => { burstAt = performance.now() / 1000; };

    let spin = 0;
    let drag: number | null = null;
    let vel = 0;
    const onDown = (e: PointerEvent) => {
      drag = e.clientX; vel = 0;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (drag !== null) { vel = (e.clientX - drag) * 0.006; spin += vel; drag = e.clientX; }
    };
    const onEnd = () => { drag = null; canvas.style.cursor = 'grab'; };
    const onDbl = () => burstRef.current();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointercancel', onEnd);
    canvas.addEventListener('dblclick', onDbl);

    const resize = () => {
      const w = host.clientWidth || 320;
      const h = host.clientHeight || 240;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    let running = true;
    const t0 = performance.now();
    let prev = t0;
    const tick = () => {
      if (!running) { raf = 0; return; }
      const now = performance.now();
      const t = (now - t0) / 1000;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      if (drag === null) { vel *= 0.94; spin += vel + 0.0022; }
      group.rotation.y = spin;
      cubes.forEach((c, i) => {
        c.position.y = c.userData.baseY + Math.sin(t * 1.1 + c.userData.phase) * 0.055;
        c.rotation.z = Math.sin(t * 0.7 + i) * 0.03;
      });

      const bursting = now / 1000 - burstAt < 1.4;
      const rate = bursting ? 4.5 : 1;
      for (let i = 0; i < activeSparkles; i++) {
        sLife[i] += dt * rate;
        if (sLife[i] > sMax[i]) spawn(i, bursting ? 1.9 : 0.85);
        const k = sLife[i] / sMax[i];
        sPos[i * 3] += sVel[i * 3] * dt;
        sPos[i * 3 + 1] += sVel[i * 3 + 1] * dt;
        sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
        sA[i] = Math.sin(k * Math.PI) * (bursting ? 1 : 0.55);
      }
      sGeo.attributes.position.needsUpdate = true;
      sGeo.attributes.aAlpha.needsUpdate = true;
      sGeo.attributes.aSize.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    // Scrolling the home screen past the scene, or backgrounding the tab, should
    // stop the render loop entirely — otherwise a WebGL canvas nobody can see
    // keeps competing with the scroll for frames.
    const resume = () => {
      if (running || document.hidden || !onScreen) return;
      running = true;
      prev = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const suspend = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) resume(); else suspend();
    }, { rootMargin: '80px' });
    io.observe(host);

    const onVisibility = () => (document.hidden ? suspend() : resume());
    document.addEventListener('visibilitychange', onVisibility);

    tick();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onEnd);
      canvas.removeEventListener('pointercancel', onEnd);
      canvas.removeEventListener('dblclick', onDbl);
      renderer.dispose();
      geo.dispose();
      canvas.remove();
    };
  }, [done, total, sky, mode]);

  return <div ref={hostRef} style={{ display: 'block', width: '100%', height, position: 'relative' }} />;
}

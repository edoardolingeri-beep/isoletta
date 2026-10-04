// Renderer, luci, mare e cielo (ciclo giorno/notte).
import * as THREE from 'three';
import type { Disc } from '../config/zones';
import { setNightGlow } from './materials';

const MAX_DISCS = 16;

export interface SkyInfo {
  /** 1 = pieno giorno, 0 = notte */
  day: number;
  night: number;
  /** quanto siamo vicini ad alba/tramonto (0..1) */
  dusk: number;
}

const COL = {
  bgDay: new THREE.Color('#8fe6f5'),
  bgDusk: new THREE.Color('#ffb59a'),
  bgNight: new THREE.Color('#1c2a5e'),
  deepDay: new THREE.Color('#2fc6e0'),
  deepNight: new THREE.Color('#163a78'),
  shallowDay: new THREE.Color('#9af7ea'),
  shallowNight: new THREE.Color('#3b7fb8'),
  sunDay: new THREE.Color('#fff3dc'),
  sunDusk: new THREE.Color('#ffb070'),
  moon: new THREE.Color('#9fb6ff'),
  hemiSkyDay: new THREE.Color('#d6f4ff'),
  hemiSkyNight: new THREE.Color('#5a6cc0'),
};

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly sea: THREE.Mesh;
  readonly sky: SkyInfo = { day: 1, night: 0, dusk: 0 };
  private seaUniforms = {
    uTime: { value: 0 },
    uDiscs: { value: Array.from({ length: MAX_DISCS }, () => new THREE.Vector3()) },
    uCount: { value: 0 },
    uDeep: { value: COL.deepDay.clone() },
    uShallow: { value: COL.shallowDay.clone() },
  };
  private bg = COL.bgDay.clone();
  /** Oscuramento extra durante la pioggia (0..1). */
  rainDim = 0;

  constructor(canvas: HTMLCanvasElement) {
    const isMobile = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 2 : 2.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 220);
    this.scene.background = this.bg;
    this.scene.fog = new THREE.Fog(this.bg, 55, 130);

    this.hemi = new THREE.HemisphereLight(COL.hemiSkyDay, '#ffd9a0', 1.5);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(COL.sunDay, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    const s = this.sun.shadow.camera;
    s.left = -18; s.right = 18; s.top = 18; s.bottom = -18; s.near = 1; s.far = 80;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);

    this.sea = this.makeSea();
    this.scene.add(this.sea);
    this.resize();
  }

  private makeSea(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(260, 260, 120, 120);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0, flatShading: true });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.seaUniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vSeaWorld;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec4 sw = modelMatrix * vec4(transformed, 1.0);
          float fade = 1.0 - smoothstep(30.0, 90.0, length(sw.xz));
          transformed.y += (sin(sw.x * 0.45 + uTime * 1.1) * 0.07 + cos(sw.z * 0.5 + uTime * 0.85) * 0.07
            + sin((sw.x + sw.z) * 0.9 + uTime * 1.6) * 0.035) * (0.4 + 0.6 * fade);
          vSeaWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime; uniform vec3 uDiscs[${MAX_DISCS}]; uniform int uCount;
          uniform vec3 uDeep; uniform vec3 uShallow; varying vec3 vSeaWorld;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec2 p = vSeaWorld.xz;
          float d = 1e5;
          for (int i = 0; i < ${MAX_DISCS}; i++) {
            if (i >= uCount) break;
            vec3 c = uDiscs[i];
            d = min(d, length(p - c.xy) - c.z);
          }
          d += sin(atan(p.y, p.x) * 7.0 + uTime * 0.3) * 0.08;
          float shallow = 1.0 - smoothstep(0.0, 3.2, d);
          vec3 col = mix(uDeep, uShallow, shallow);
          col = mix(col, uDeep * 0.82, smoothstep(14.0, 50.0, length(p)) * 0.6);
          float f1 = 1.0 - smoothstep(0.0, 0.1, abs(d - (0.38 + 0.1 * sin(uTime * 1.5))));
          float f2 = (1.0 - smoothstep(0.0, 0.07, abs(d - (1.15 + 0.3 * sin(uTime * 1.1 + 1.3))))) * 0.5;
          float f3 = (1.0 - smoothstep(0.0, 0.05, abs(d - (2.1 + 0.4 * sin(uTime * 0.8 + 2.0))))) * 0.22;
          float edge = 1.0 - smoothstep(0.1, 0.32, d);
          col = mix(col, vec3(1.0), clamp(f1 + f2 + f3 + edge, 0.0, 1.0));
          float sp = sin(p.x * 2.3 + uTime * 1.7) * sin(p.y * 2.1 - uTime * 1.3);
          col += smoothstep(0.93, 1.0, sp) * 0.22 * (1.0 - shallow);
          diffuseColor.rgb = col;`,
        );
    };
    const sea = new THREE.Mesh(geo, m);
    sea.receiveShadow = true;
    return sea;
  }

  /** Aggiorna le zone di terra usate dal mare per acqua bassa e schiuma. */
  setLand(discs: Disc[]): void {
    const arr = this.seaUniforms.uDiscs.value;
    const n = Math.min(MAX_DISCS, discs.length);
    for (let i = 0; i < n; i++) arr[i].set(discs[i].x, discs[i].z, discs[i].r);
    this.seaUniforms.uCount.value = n;
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // in verticale allarga un po' il campo visivo per vedere tutta l'isola
    this.camera.fov = w < h ? 50 : 34;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Imposta luci e colori per l'ora del giorno.
   * t: 0..1 — il 70% del ciclo è giorno, il resto notte.
   */
  setTimeOfDay(t: number, focus: THREE.Vector3): void {
    const DAY = 0.7;
    let h: number, az: number;
    if (t < DAY) {
      const k = t / DAY;
      h = Math.sin(Math.PI * k);
      az = -Math.PI * 0.5 + Math.PI * k;
    } else {
      const k = (t - DAY) / (1 - DAY);
      h = -Math.sin(Math.PI * k);
      az = -Math.PI * 0.5 + Math.PI * k;
    }
    const day = THREE.MathUtils.smoothstep(h, -0.12, 0.28);
    const dusk = day > 0.01 ? 1 - THREE.MathUtils.smoothstep(Math.abs(h), 0.0, 0.4) : 1 - THREE.MathUtils.smoothstep(-h, 0, 0.25);
    this.sky.day = day;
    this.sky.night = 1 - day;
    this.sky.dusk = dusk;

    const dim = 1 - this.rainDim * 0.35;
    // cielo
    this.bg.copy(COL.bgNight).lerp(COL.bgDay, day).lerp(COL.bgDusk, dusk * 0.55 * day + dusk * 0.25 * (1 - day));
    this.bg.multiplyScalar(dim);
    (this.scene.fog as THREE.Fog).color.copy(this.bg);
    this.seaUniforms.uDeep.value.copy(COL.deepNight).lerp(COL.deepDay, day).multiplyScalar(dim);
    this.seaUniforms.uShallow.value.copy(COL.shallowNight).lerp(COL.shallowDay, day).multiplyScalar(dim);

    // sole / luna
    const elev = day > 0.02 ? Math.max(0.55, h) : 0.9;
    const dir = new THREE.Vector3(Math.cos(az) * 0.8, elev * 1.6, Math.sin(az) * 0.5 + 0.6).normalize();
    this.sun.position.copy(focus).addScaledVector(dir, 40);
    this.sun.target.position.copy(focus);
    this.sun.color.copy(COL.moon).lerp(COL.sunDay, day).lerp(COL.sunDusk, dusk * day);
    this.sun.intensity = (0.45 + 1.65 * day) * dim;
    this.hemi.color.copy(COL.hemiSkyNight).lerp(COL.hemiSkyDay, day);
    this.hemi.intensity = (0.7 + 0.55 * day) * dim;

    setNightGlow(this.sky.night);
  }

  update(time: number): void {
    this.seaUniforms.uTime.value = time;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

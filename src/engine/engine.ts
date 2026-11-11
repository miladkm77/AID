import { GL, Program, PingPong, Target } from '../gl/gl';
import { VERTEX, GEO, GAS, RENDER, MAX_CONTAINERS } from '../gl/shaders';
import { GASES, deltaN, scatterRelative, thermalSpeed, buoyancy, responseSpeed } from '../core/gases';
import { SceneParams, ContainerParams, readSceneParams, readContainerParams, densityFactor, albedo, SCENE_DEFAULTS, CONTAINER_DEFAULTS } from '../core/params';
import { Tier, TIERS, chooseTier } from '../core/tiers';

/** Anything that holds gas: <aid-gas>, <aid-button>, a tab. */
export interface GasContainer {
  readonly el: HTMLElement;
  /** density multiplier from interaction state: 0 = evacuated, 1 = rest, >1 = compressed */
  stateFactor(): number;
  /** an evacuated (disabled) container shows a dashed wall */
  dashed(): boolean;
  /** the wall stays visible while the chamber is empty (an unchecked box, a switch track) */
  shell?(): boolean;
  /** working: the excitation pulses until it returns false */
  busy?(): boolean;
  /** fog everything below, not only the container it covers most (a dialog scrim) */
  veilAll?(): boolean;
}

/** true if `inner` is `outer` or sits inside it, shadow trees included */
function within(outer: Node, inner: Node): boolean {
  let n: Node | null = inner;
  while (n) {
    if (n === outer) return true;
    n = n.parentNode || (n instanceof ShadowRoot ? n.host : null);
  }
  return false;
}

export type View = 'final' | 'density' | 'light' | 'off';

/** scale height of xenon at --aid-weight: 1, in CSS px (artistic: the real value is kilometres) */
const SCALE_HEIGHT = 14;

export interface EngineStats {
  tier: Tier;
  grid: string;
  simHz: number;
  fps: number;
  frameMs: number;
  passes: number;
  state: 'simulating' | 'render-only' | 'asleep';
  error: string;
}

interface Slot {
  c: GasContainer;
  params: ContainerParams;
  pv: number;
  ev: number;
  wv: number;
  /** stacking order inside the scene (the element's z-index) */
  z: number;
  rect: DOMRect | null;
  rad: number;
  veil: string;
  /** ancestors that clip their content (scroll areas), cached between token refreshes */
  clips: Element[];
  lastX: number;
  lastY: number;
  accX: number;
  accY: number;
}

/* Rayleigh λ⁻⁴ weights at 610, 550, 465 nm, normalised to mean 1 */
const RAYLEIGH = (() => {
  const w = [Math.pow(465 / 610, 4), Math.pow(465 / 550, 4), 1];
  const m = (w[0] + w[1] + w[2]) / 3;
  return w.map((x) => x / m);
})();

export class GasEngine {
  private g: GL;
  private gl: WebGL2RenderingContext;
  private P: { geo: Program; gas: Program; render: Program };
  private noise: WebGLTexture;
  private feedTex: WebGLTexture;
  private st: PingPong | null = null;
  private geo: Target | null = null;
  private slots = new Map<GasContainer, Slot>();
  private order: Slot[] = [];

  private uR = new Float32Array(MAX_CONTAINERS * 4);
  private uI = new Float32Array(MAX_CONTAINERS * 4);
  private uM = new Float32Array(MAX_CONTAINERS * 4);
  private uE = new Float32Array(MAX_CONTAINERS * 4);
  private uK = new Float32Array(MAX_CONTAINERS * 4);
  private uC = new Float32Array(MAX_CONTAINERS * 4);
  private warned = false;
  /** all container data, one row of six texels per container (see CONTAINERS in shaders.ts) */
  private cdata = new Float32Array(MAX_CONTAINERS * 24);
  private ctex: WebGLTexture;
  private grav = { x: 0, y: -1, k: 0 };
  private cssAngle = NaN;
  private cssFade = NaN;
  /** tilt reported by the device, in degrees; added to --aid-tilt */
  deviceTilt = 0;
  private n = 0;

  private W = 0;
  private H = 0;
  private SW = 16;
  private SH = 16;
  private feedDpr = 1;
  private feedW = 1;
  private feedH = 1;
  private hasFeed = false;

  scene: SceneParams = { ...SCENE_DEFAULTS };
  tier: Tier = 'efficient';
  view: View = 'final';
  backdropScroll = 0;

  private ptr = { x: -1, y: -1, down: false, over: false, vx: 0, vy: 0, lx: 0, ly: 0, lt: 0, str: 0 };
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private flowT = 0;
  private lastActive = 0;
  private lastParams = 0;
  private frames: number[] = [];
  private visible = true;
  private onscreen = true;
  private stats: EngineStats = { tier: 'efficient', grid: '', simHz: 0, fps: 0, frameMs: 0, passes: 0, state: 'asleep', error: '' };
  private disposers: Array<() => void> = [];
  onStats: ((s: EngineStats) => void) | null = null;

  constructor(private host: HTMLElement, private canvas: HTMLCanvasElement, transparent: boolean, private fixed = false) {
    const gl = canvas.getContext('webgl2', {
      alpha: transparent, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.g = new GL(gl, VERTEX);
    this.P = { geo: this.g.program(GEO), gas: this.g.program(GAS), render: this.g.program(RENDER) };
    this.noise = this.g.noiseTexture();
    this.feedTex = gl.createTexture()!;
    this.ctex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.ctex);
    this.g.texParams(gl.NEAREST, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // 32-bit float textures are not filterable everywhere
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 6, MAX_CONTAINERS, 0, gl.RGBA, gl.FLOAT, null);
    this.bindEvents();
  }

  /* ---------------- containers ---------------- */
  add(c: GasContainer): void {
    if (this.slots.has(c)) return;
    const s: Slot = { c, params: { ...CONTAINER_DEFAULTS }, pv: 0, ev: 0, wv: CONTAINER_DEFAULTS.weight, z: 0, rect: null, rad: 0, veil: '', clips: [], lastX: NaN, lastY: NaN, accX: 0, accY: 0 };
    this.slots.set(c, s);
    this.order.push(s);
    this.refreshParams(true);
    this.wake();
  }

  remove(c: GasContainer): void {
    const s = this.slots.get(c);
    if (!s) return;
    this.slots.delete(c);
    this.order.splice(this.order.indexOf(s), 1);
    if (s.veil) { c.el.style.removeProperty('--_aid-veil-clip'); c.el.style.removeProperty('--_aid-veil-d'); }
    this.wake();
  }

  /* ---------------- backdrop ---------------- */
  /** Use a canvas or image as the content behind the gas. Pass null for a DOM backdrop. */
  setBackdrop(src: HTMLCanvasElement | HTMLImageElement | null, cssWidth?: number, cssHeight?: number): void {
    const gl = this.gl;
    if (!src) { this.hasFeed = false; this.wake(); return; }
    const pw = src instanceof HTMLCanvasElement ? src.width : src.naturalWidth;
    const ph = src instanceof HTMLCanvasElement ? src.height : src.naturalHeight;
    this.feedW = cssWidth || pw;
    this.feedH = cssHeight || ph;
    this.feedDpr = pw / this.feedW;
    gl.bindTexture(gl.TEXTURE_2D, this.feedTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.g.texParams(gl.LINEAR_MIPMAP_LINEAR, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D); // the mip chain is the blurred light field the gas gathers from
    this.hasFeed = true;
    this.wake();
  }

  get maxTextureSize(): number { return this.g.maxTexture; }

  /* ---------------- sizing ---------------- */
  /** the box the canvas covers: the scene element, or the viewport for a fixed scene */
  private frame(): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
    if (!this.fixed) return this.host.getBoundingClientRect();
    const w = document.documentElement.clientWidth || window.innerWidth, h = window.innerHeight;
    return { left: 0, top: 0, right: w, bottom: h, width: w, height: h };
  }

  resize(): void {
    const r = this.frame();
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.refreshParams(true);
    const cfg = TIERS[this.tier];
    // pixel ratio: the device's, capped by the tier, by a pixel budget, and by what this device proved able to keep up with
    let dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap);
    dpr = Math.min(dpr, Math.sqrt(cfg.maxPixels / (this.W * this.H))) * this.scale;
    dpr = Math.max(dpr, 0.5);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.alloc();
    this.collect(0);
    if (cfg.simHz) for (let i = 0; i < 40; i++) this.step(1 / 60);
    this.render();
    this.wake();
  }

  private alloc(): void {
    if (this.st) { this.st.dispose(); this.g.dispose(this.geo!); }
    const cfg = TIERS[this.tier];
    const base = cfg.grid || 48;
    const ar = this.W / this.H;
    this.SW = Math.max(16, Math.round(ar < 1 ? base : base * ar));
    this.SH = Math.max(16, Math.round(ar < 1 ? base / ar : base));
    this.st = this.g.pingPong(this.SW, this.SH);
    this.geo = this.g.target(this.SW, this.SH);
  }

  private refreshParams(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastParams < 250) return;
    this.lastParams = now;
    this.scene = readSceneParams(this.host);
    for (const s of this.order) {
      const cs = getComputedStyle(s.c.el);
      s.params = readContainerParams(s.c.el);
      s.z = parseInt(cs.zIndex, 10) || 0;
      s.clips = [];
      let a: Node | null = s.c.el.parentNode || ((s.c.el.getRootNode() as ShadowRoot).host ?? null);
      while (a && a !== this.host) {
        if (a instanceof Element) { const o = getComputedStyle(a); if (o.overflowX !== 'visible' || o.overflowY !== 'visible') s.clips.push(a); }
        a = a.parentNode || (a instanceof ShadowRoot ? a.host : null);
      }
    }
    let t = chooseTier(this.scene.quality);
    if (t === 'high' && this.capped && this.scene.quality === 'auto') t = 'efficient';
    if (this.host.dataset.aidTier !== t) this.host.dataset.aidTier = t;
    if (t !== this.tier) {
      this.tier = t;
      if (!force) this.resize();
    }
  }

  /* ---------------- geometry ---------------- */
  private collect(dt: number): boolean {
    const hr = this.frame();
    const df = densityFactor(this.scene.temperature);
    let moving = false;
    // gravity: heavy gases settle along it, light gases against it
    const b = buoyancy(GASES[this.scene.gas]);
    const th = (this.scene.tilt + this.deviceTilt) * Math.PI / 180;
    const sgn = b < 0 ? -1 : 1;
    const gx = Math.sin(th) * sgn, gy = -Math.cos(th) * sgn, gk = Math.abs(b) / SCALE_HEIGHT;
    const e = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
    const G = this.grav;
    if (Math.abs(gx - G.x) + Math.abs(gy - G.y) + Math.abs(gk - G.k) * SCALE_HEIGHT > 0.002) moving = true;
    G.x += (gx - G.x) * e; G.y += (gy - G.y) * e; G.k += (gk - G.k) * e;
    // the DOM-backdrop blur follows the settled gas: direction and depth as CSS variables on the scene
    const ang = Math.round(Math.atan2(-gx, -gy) * 180 / Math.PI), fade = Math.round(Math.min(3 / gk, 9999));
    if (ang !== this.cssAngle || fade !== this.cssFade) {
      this.cssAngle = ang; this.cssFade = fade;
      this.host.style.setProperty('--_aid-angle', ang + 'deg');
      this.host.style.setProperty('--_aid-fade-unit', fade + 'px');
    }
    this.n = 0;
    for (const s of this.order) {
      s.rect = null;
      if (this.n >= MAX_CONTAINERS) {
        if (!this.warned) { this.warned = true; console.warn(`AID: more than ${MAX_CONTAINERS} gas containers are visible at once; the rest are drawn without gas.`); }
        break;
      }
      const target = s.c.stateFactor() * s.params.pressure;
      const k = target > s.pv ? (s.c.stateFactor() > 1 ? 14 : 4) : 2.5; // compress fast, release slowly
      s.pv += (target - s.pv) * (dt > 0 ? 1 - Math.exp(-dt * k) : 1);
      if (Math.abs(target - s.pv) > 0.003) moving = true;
      let et = s.c.dashed() ? 0 : s.params.excitation;
      if (et < 1 && s.c.busy?.()) { et = Math.max(et, 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(performance.now() / 1000 * 5))); moving = true; }
      s.ev += (et - s.ev) * (dt > 0 ? 1 - Math.exp(-dt * 7) : 1);
      if (Math.abs(et - s.ev) > 0.003) moving = true;
      s.wv += (s.params.weight - s.wv) * e;
      if (Math.abs(s.params.weight - s.wv) > 0.003) moving = true;
      const r = s.c.el.getBoundingClientRect();
      if (r.width < 1) continue;
      // what is visible of it: the frame, cut by every scrolling ancestor
      let k0 = hr.left, k1 = hr.right, k2 = hr.top, k3 = hr.bottom;
      for (const a of s.clips) { const q = a.getBoundingClientRect(); k0 = Math.max(k0, q.left); k1 = Math.min(k1, q.right); k2 = Math.max(k2, q.top); k3 = Math.min(k3, q.bottom); }
      if (r.bottom <= k2 || r.top >= k3 || r.right <= k0 || r.left >= k1) continue;
      const shell = s.c.shell?.() ?? false;
      const empty = s.pv < 0.004 && !s.c.dashed() && !shell;
      if (empty) continue;
      const j = this.n * 4;
      const x0 = (r.left - hr.left) / this.W, x1 = (r.right - hr.left) / this.W;
      const y0 = 1 - (r.bottom - hr.top) / this.H, y1 = 1 - (r.top - hr.top) / this.H;
      this.uR[j] = x0; this.uR[j + 1] = y0; this.uR[j + 2] = x1; this.uR[j + 3] = y1;
      const rad = parseFloat(getComputedStyle(s.c.el).borderTopLeftRadius) || 0;
      s.rect = r; s.rad = rad;
      this.uI[j] = s.pv * df;
      this.uI[j + 1] = s.params.profile;
      this.uI[j + 2] = rad;
      this.uE[j] = s.ev * Math.min(1, s.pv);
      this.uE[j + 1] = s.wv;
      this.uI[j + 3] = (s.c.dashed() ? -1 : 1) * s.params.membrane * (s.c.dashed() || shell ? 1 : Math.min(1, s.pv * 1.5));
      this.uK[j] = (k0 - hr.left) / this.W; this.uK[j + 1] = 1 - (k3 - hr.top) / this.H; this.uK[j + 2] = (k1 - hr.left) / this.W; this.uK[j + 3] = 1 - (k2 - hr.top) / this.H;
      const col = s.params.excitationColor || GASES[this.scene.gas].emission;
      this.uC[j] = col[0] / 255; this.uC[j + 1] = col[1] / 255; this.uC[j + 2] = col[2] / 255;
      const mx = isNaN(s.lastX) ? 0 : x0 - s.lastX, my = isNaN(s.lastY) ? 0 : y0 - s.lastY;
      s.accX += mx; s.accY += my;
      this.uM[j] = s.accX; this.uM[j + 1] = s.accY;
      if (mx !== 0 || my !== 0) moving = true;
      s.lastX = x0; s.lastY = y0;
      this.n++;
    }
    this.depth();
    return moving;
  }

  /**
   * Depth between containers. The gas of all containers is drawn in one layer under the labels, so on its own a
   * container floating above another would not hide it. Each container that sits above a lower one gets a veil
   * (a CSS layer inside it, clipped to the overlap) that fogs the lower container's wall, gas and label.
   */
  private depth(): void {
    for (const up of this.order) {
      let veil = '';
      const a = up.rect;
      if (a && !up.c.dashed() && up.pv > 0.05) {
        let x0 = 0, y0 = 0, x1 = 0, y1 = 0, rad = 0, best = 0;
        for (const lo of this.order) {
          const b = lo.rect;
          if (!b || lo === up || lo.z > up.z || within(up.c.el, lo.c.el) || within(lo.c.el, up.c.el)) continue;
          // equal z-index: the later element in the document paints on top, as in CSS
          if (lo.z === up.z && !(lo.c.el.compareDocumentPosition(up.c.el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w < 1 || h < 1 || w * h <= best) continue;
          // one veil per container: the lower container it covers most. Clipped to that container's own box,
          // so its rounded shape shows through the upper gas
          best = w * h; x0 = b.left; y0 = b.top; x1 = b.right; y1 = b.bottom; rad = lo.rad;
        }
        if (up.c.veilAll?.()) veil = 'none';
        else if (x1 > x0) {
          const o = 1.5, f = (v: number) => Math.round(v * 2) / 2; // the veil layer is inset by 1.5px to keep the upper wall crisp
          veil = `inset(${f(y0 - a.top - o)}px ${f(a.right - x1 - o)}px ${f(a.bottom - y1 - o)}px ${f(x0 - a.left - o)}px round ${Math.round(rad)}px)`;
        }
      }
      if (veil !== up.veil) {
        up.veil = veil;
        const st = up.c.el.style;
        if (veil) { st.setProperty('--_aid-veil-clip', veil); st.setProperty('--_aid-veil-d', 'block'); }
        else { st.removeProperty('--_aid-veil-clip'); st.removeProperty('--_aid-veil-d'); }
      }
    }
  }

  private setContainers(p: Program): void {
    const gl = this.gl, u = p.u;
    if (u.uCt) {
      const d = this.cdata;
      for (let i = 0; i < this.n; i++) {
        const j = i * 4, o = i * 24;
        d.set(this.uR.subarray(j, j + 4), o); d.set(this.uI.subarray(j, j + 4), o + 4); d.set(this.uE.subarray(j, j + 4), o + 8);
        d.set(this.uK.subarray(j, j + 4), o + 12); d.set(this.uC.subarray(j, j + 4), o + 16); d.set(this.uM.subarray(j, j + 4), o + 20);
      }
      gl.uniform1i(u.uCt, this.g.bind(5, this.ctex));
      if (this.n) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 6, this.n, gl.RGBA, gl.FLOAT, d.subarray(0, this.n * 24));
    }
    if (u.uGv) gl.uniform3f(u.uGv, this.grav.x, this.grav.y, this.grav.k);
    if (u.uN) gl.uniform1i(u.uN, this.n);
    if (u.uPx) gl.uniform2f(u.uPx, this.W, this.H);
    if (u.texel) gl.uniform2f(u.texel, 1 / this.SW, 1 / this.SH);
  }

  private use(p: Program): void {
    this.gl.useProgram(p.p);
    this.setContainers(p);
  }

  /* ---------------- simulation ---------------- */
  private speed(): number { return thermalSpeed(GASES[this.scene.gas], this.scene.temperature); }

  private step(dt: number): void {
    const gl = this.gl, g = this.g, st = this.st!, geo = this.geo!;
    this.time += dt;
    this.use(this.P.geo);
    g.draw(geo);
    this.uM.fill(0); // motion is consumed by one step
    for (const s of this.order) { s.accX = 0; s.accY = 0; }
    const P = this.P.gas, u = P.u;
    this.use(P);
    gl.uniform1i(u.uS, g.bind(0, st.read.tex));
    gl.uniform1i(u.uG, g.bind(1, geo.tex));
    gl.uniform1i(u.uNz, g.bind(2, this.noise));
    const sp = this.speed();
    gl.uniform1f(u.dt, dt);
    const rs = responseSpeed(GASES[this.scene.gas]); // light gases even out faster and stop sooner
    gl.uniform1f(u.c2, 600 * rs);
    gl.uniform1f(u.gam, 4.2 * Math.sqrt(rs));
    gl.uniform1f(u.tAmp, this.scene.temperature * 16 * Math.min(sp, 3));
    gl.uniform1f(u.tSpd, 1.6 * sp);
    gl.uniform1f(u.t, this.time);
    gl.uniform1f(u.vmax, 38);
    gl.uniform1f(u.rk, 1.1);
    gl.uniform1f(u.diff, 0.16);
    gl.uniform4f(u.uPtr, this.ptr.x, this.ptr.y, this.ptr.str, this.ptr.down ? 20 : 26);
    gl.uniform2f(u.uPv, this.ptr.vx, -this.ptr.vy);
    g.draw(st.write);
    st.swap();
  }

  render(): void {
    if (this.geo) { this.use(this.P.geo); this.g.draw(this.geo); }   // the coarse mask the render pass culls with
    if (!this.st) return;
    const gl = this.gl, g = this.g, P = this.P.render, u = P.u, sc = this.scene, gas = GASES[sc.gas];
    this.use(P);
    gl.uniform1i(u.uFeed, g.bind(0, this.feedTex));
    gl.uniform1i(u.uS, g.bind(1, this.st.read.tex));
    gl.uniform1i(u.uNz, g.bind(2, this.noise));
    gl.uniform1i(u.uGt, g.bind(3, this.geo!.tex));
    gl.uniform1f(u.scr, this.hasFeed ? this.backdropScroll / this.feedH : 0);
    gl.uniform1f(u.vf, this.hasFeed ? this.H / this.feedH : 1);
    gl.uniform1f(u.amp, sc.refraction);
    gl.uniform1f(u.dn, deltaN(gas));
    gl.uniform1f(u.sig, 1.5 * scatterRelative(gas));
    gl.uniform1f(u.fdpr, this.feedDpr);
    gl.uniform1f(u.agit, sc.temperature);
    gl.uniform1f(u.glow, sc.glow);
    gl.uniform1f(u.smoke, sc.smoke);
    gl.uniform1f(u.reach, sc.lightReach);
    gl.uniform1f(u.flowT, this.flowT);
    gl.uniform1f(u.hasSim, TIERS[this.tier].simHz > 0 ? 1 : 0);
    gl.uniform1f(u.hasFeed, this.hasFeed ? 1 : 0);
    gl.uniform1f(u.alb, albedo(sc.smoke));
    gl.uniform1i(u.taps, TIERS[this.tier].lightTaps);
    gl.uniform1i(u.mode, this.view === 'density' ? 1 : this.view === 'light' ? 2 : this.view === 'off' ? 3 : 0);
    const cs = getComputedStyle(this.host);
    const scene = rgb(cs.getPropertyValue('--aid-scene-light'), [246, 248, 251]);
    gl.uniform3f(u.scene, scene[0], scene[1], scene[2]);
    gl.uniform1f(u.smix, 0.3);
    const sp = sc.spectral;
    gl.uniform3f(u.tw, 1 + (RAYLEIGH[0] - 1) * sp, 1 + (RAYLEIGH[1] - 1) * sp, 1 + (RAYLEIGH[2] - 1) * sp);
    const mem = rgb(cs.getPropertyValue('--aid-membrane-color'), [24, 34, 52]);
    const ma = parseFloat(cs.getPropertyValue('--aid-membrane-alpha')) || 0.14;
    gl.uniform4f(u.mem, mem[0], mem[1], mem[2], ma);
    gl.uniform4f(u.uPtr, this.ptr.x, this.ptr.y, this.ptr.str, this.ptr.down ? 20 : 26);
    if (!this.hasFeed) { gl.clearColor(0, 0, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT); }
    g.draw(null);
  }

  /* ---------------- scheduling ---------------- */
  wake(): void {
    this.lastActive = performance.now() / 1000;
    if (!this.raf && this.visible && this.onscreen && this.W > 1) {
      this.last = performance.now() / 1000;
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  private tick = (ts: number): void => {
    this.raf = 0;
    const t = ts / 1000;
    const dt = Math.min(Math.max(t - this.last, 0.001), 1 / 15);
    this.last = t;
    this.g.passes = 0;
    this.refreshParams();
    const cfg = TIERS[this.tier];
    const p = this.ptr;
    const want = p.over ? (p.down ? 520 : 110) : 0;
    p.str += (want - p.str) * (1 - Math.exp(-dt * 12));
    p.vx *= Math.exp(-dt * 8);
    p.vy *= Math.exp(-dt * 8);
    let moving = this.collect(dt) || p.str > 2;
    const now = performance.now() / 1000;
    const simOn = cfg.simHz > 0 && ((cfg.ambient && !this.fixed) || moving || now - this.lastActive < 2.2);
    if (simOn || (cfg.simHz === 0 && moving)) this.flowT += dt * this.speed();
    if (simOn) {
      this.acc += dt;
      const h = 1 / cfg.simHz;
      if (this.acc >= h) {
        const n = Math.min(3, Math.round(this.acc / h));
        const sub = Math.min(this.acc, 1 / 15) / n;
        // explicit compressible step: keep each substep ≤ 1/60 s for stability
        for (let i = 0; i < n; i++) { const parts = Math.ceil(sub * 60 - 1e-6); for (let k = 0; k < parts; k++) this.step(sub / parts); }
        this.acc = 0;
      }
    }
    this.render();
    this.frames.push(dt * 1000);
    if (this.frames.length > 90) this.frames.shift();
    const keep = simOn || moving;
    this.report(simOn ? 'simulating' : 'render-only');
    if (keep && this.visible && this.onscreen) this.raf = requestAnimationFrame(this.tick);
    else this.report('asleep');
  };

  /** render-resolution factor found by adapt(); 1 = the tier's own resolution */
  private scale = 1;
  private capped = false;
  private lastAdapt = 0;

  /**
   * Keeps the frame rate up on whatever device this is. While the engine is animating and frames take longer than
   * about 24 ms, the render resolution drops in steps (to 60% at most); if that is not enough, an automatically
   * chosen `high` tier falls back to `efficient`. It never steps back up, so it cannot oscillate.
   */
  private adapt(now: number): void {
    if (now - this.lastAdapt < 1200 || this.frames.length < 24) return;
    // the median, so one long gap (a background tab, a resize) is not mistaken for a slow device
    const avg = [...this.frames].sort((a, b) => a - b)[this.frames.length >> 1];
    if (avg < 24) return;
    this.lastAdapt = now;
    this.frames.length = 0;
    if (this.scale > 0.61) this.scale = Math.max(0.6, this.scale * 0.8);
    else if (this.tier === 'high' && this.scene.quality === 'auto') { this.capped = true; this.refreshParams(true); }
    else return;
    this.resize();
  }

  private lastReport = 0;
  private report(state: EngineStats['state']): void {
    const now = performance.now();
    if (state !== 'asleep') this.adapt(now);
    if (state !== 'asleep' && now - this.lastReport < 500) return;
    this.lastReport = now;
    const avg = this.frames.length ? this.frames.reduce((a, b) => a + b, 0) / this.frames.length : 0;
    const err = this.gl.getError();
    if (err && err !== this.gl.CONTEXT_LOST_WEBGL) this.stats.error = 'gl error 0x' + err.toString(16);
    const cfg = TIERS[this.tier];
    this.stats = { ...this.stats, tier: this.tier, grid: cfg.simHz ? `${this.SW}×${this.SH}` : 'none', simHz: cfg.simHz,
      fps: avg ? 1000 / avg : 0, frameMs: avg, passes: this.g.passes, state };
    this.onStats?.(this.stats);
  }

  get currentStats(): EngineStats { return this.stats; }

  /** Evacuate every container; the regulators refill them. */
  purge(): void {
    for (const s of this.order) s.pv = 0;
    if (this.st) { const gl = this.gl; for (const t of [this.st.read, this.st.write]) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } }
    this.wake();
  }

  /* ---------------- input ---------------- */
  private overGas(x: number, y: number): boolean {
    for (let i = 0; i < this.n; i++) {
      const j = i * 4;
      if (this.uI[j] > 0 && x >= this.uR[j] && x <= this.uR[j + 2] && y >= this.uR[j + 1] && y <= this.uR[j + 3]) return true;
    }
    return false;
  }

  private bindEvents(): void {
    const host = this.host, p = this.ptr;
    const track = (e: PointerEvent, down?: boolean) => {
      if (this.W < 2 || this.H < 2) return;   // a pointer event can arrive before the first layout
      const r = this.frame();
      const now = performance.now() / 1000;
      if (p.lt) { const d = Math.max(now - p.lt, 1 / 240); p.vx = 0.6 * p.vx + 0.4 * ((e.clientX - p.lx) / d); p.vy = 0.6 * p.vy + 0.4 * ((e.clientY - p.ly) / d); }
      p.lx = e.clientX; p.ly = e.clientY; p.lt = now;
      p.x = (e.clientX - r.left) / this.W; p.y = 1 - (e.clientY - r.top) / this.H;
      if (down !== undefined) p.down = down;
      p.over = this.overGas(p.x, p.y) && (p.down || e.pointerType === 'mouse');
      this.wake();
    };
    const on = <K extends keyof HTMLElementEventMap>(t: K, f: (e: HTMLElementEventMap[K]) => void, opt?: AddEventListenerOptions | boolean) => {
      host.addEventListener(t, f as EventListener, opt);
      this.disposers.push(() => host.removeEventListener(t, f as EventListener, opt));
    };
    on('pointermove', (e) => track(e), true);
    on('pointerdown', (e) => { p.lt = 0; track(e, true); }, true);
    on('pointerup', (e) => track(e, false), true);
    on('pointercancel', () => { p.down = false; p.over = false; this.wake(); }, true);
    on('pointerleave', () => { p.down = false; p.over = false; p.lt = 0; this.wake(); });
    const scrolled = () => this.wake();   // any scroll moves containers against the canvas
    window.addEventListener('scroll', scrolled, { capture: true, passive: true });
    this.disposers.push(() => window.removeEventListener('scroll', scrolled, { capture: true }));
    const vis = () => { this.visible = !document.hidden; if (this.visible) this.wake(); };
    document.addEventListener('visibilitychange', vis);
    this.disposers.push(() => document.removeEventListener('visibilitychange', vis));
    const io = new IntersectionObserver((es) => { this.onscreen = es[0].isIntersecting; if (this.onscreen) this.wake(); });
    io.observe(host);
    this.disposers.push(() => io.disconnect());
    const lost = (e: Event) => { e.preventDefault(); this.stats.error = 'GPU context lost'; this.onStats?.(this.stats); };
    this.canvas.addEventListener('webglcontextlost', lost);
    this.disposers.push(() => this.canvas.removeEventListener('webglcontextlost', lost));
  }

  dispose(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
    if (this.st) { this.st.dispose(); this.g.dispose(this.geo!); }
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

function rgb(v: string, fallback: number[]): number[] {
  const parts = v.split(',').map((x) => parseFloat(x));
  const ok = parts.length >= 3 && parts.slice(0, 3).every((x) => isFinite(x));
  return (ok ? parts.slice(0, 3) : fallback).map((x) => x / 255);
}

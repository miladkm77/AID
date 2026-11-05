import { GL, Program, PingPong, Target } from '../gl/gl';
import { VERTEX, GEO, GAS, RENDER, MAX_CONTAINERS } from '../gl/shaders';
import { GASES, deltaN, scatterRelative, thermalSpeed } from '../core/gases';
import { SceneParams, ContainerParams, readSceneParams, readContainerParams, densityFactor, albedo, SCENE_DEFAULTS, CONTAINER_DEFAULTS } from '../core/params';
import { Tier, TIERS, chooseTier } from '../core/tiers';

/** Anything that holds gas: <aid-gas>, <aid-button>, a tab. */
export interface GasContainer {
  readonly el: HTMLElement;
  /** density multiplier from interaction state: 0 = evacuated, 1 = rest, >1 = compressed */
  stateFactor(): number;
  /** an evacuated (disabled) container shows a dashed wall */
  dashed(): boolean;
}

export type View = 'final' | 'density' | 'light';

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

  constructor(private host: HTMLElement, private canvas: HTMLCanvasElement, transparent: boolean) {
    const gl = canvas.getContext('webgl2', {
      alpha: transparent, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.g = new GL(gl, VERTEX);
    this.P = { geo: this.g.program(GEO), gas: this.g.program(GAS), render: this.g.program(RENDER) };
    this.noise = this.g.noiseTexture();
    this.feedTex = gl.createTexture()!;
    this.bindEvents();
  }

  /* ---------------- containers ---------------- */
  add(c: GasContainer): void {
    if (this.slots.has(c)) return;
    const s: Slot = { c, params: { ...CONTAINER_DEFAULTS }, pv: 0, lastX: NaN, lastY: NaN, accX: 0, accY: 0 };
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
  resize(): void {
    const r = this.host.getBoundingClientRect();
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.refreshParams(true);
    const cfg = TIERS[this.tier];
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap);
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
    for (const s of this.order) s.params = readContainerParams(s.c.el);
    const t = chooseTier(this.scene.quality);
    if (t !== this.tier) {
      this.tier = t;
      if (!force) this.resize();
    }
  }

  /* ---------------- geometry ---------------- */
  private collect(dt: number): boolean {
    const hr = this.host.getBoundingClientRect();
    const df = densityFactor(this.scene.temperature);
    let moving = false;
    this.n = 0;
    for (const s of this.order) {
      if (this.n >= MAX_CONTAINERS) break;
      const target = s.c.stateFactor() * s.params.pressure;
      const k = target > s.pv ? (s.c.stateFactor() > 1 ? 14 : 4) : 2.5; // compress fast, release slowly
      s.pv += (target - s.pv) * (dt > 0 ? 1 - Math.exp(-dt * k) : 1);
      if (Math.abs(target - s.pv) > 0.003) moving = true;
      const r = s.c.el.getBoundingClientRect();
      if (r.width < 1 || r.bottom < hr.top || r.top > hr.bottom || r.right < hr.left || r.left > hr.right) continue;
      const empty = s.pv < 0.004 && !s.c.dashed();
      if (empty) continue;
      const j = this.n * 4;
      const x0 = (r.left - hr.left) / this.W, x1 = (r.right - hr.left) / this.W;
      const y0 = 1 - (r.bottom - hr.top) / this.H, y1 = 1 - (r.top - hr.top) / this.H;
      this.uR[j] = x0; this.uR[j + 1] = y0; this.uR[j + 2] = x1; this.uR[j + 3] = y1;
      const rad = parseFloat(getComputedStyle(s.c.el).borderTopLeftRadius) || 0;
      this.uI[j] = s.pv * df;
      this.uI[j + 1] = s.params.profile;
      this.uI[j + 2] = rad;
      this.uI[j + 3] = (s.c.dashed() ? -1 : 1) * s.params.membrane * Math.min(1, s.c.dashed() ? 1 : s.pv * 1.5);
      const mx = isNaN(s.lastX) ? 0 : x0 - s.lastX, my = isNaN(s.lastY) ? 0 : y0 - s.lastY;
      s.accX += mx; s.accY += my;
      this.uM[j] = s.accX; this.uM[j + 1] = s.accY;
      if (mx !== 0 || my !== 0) moving = true;
      s.lastX = x0; s.lastY = y0;
      this.n++;
    }
    return moving;
  }

  private setContainers(p: Program): void {
    const gl = this.gl, u = p.u;
    if (u.uR) gl.uniform4fv(u.uR, this.uR);
    if (u.uI) gl.uniform4fv(u.uI, this.uI);
    if (u.uM) gl.uniform4fv(u.uM, this.uM);
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
    gl.uniform1f(u.c2, 900);
    gl.uniform1f(u.gam, 5.5);
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
    if (!this.st) return;
    const gl = this.gl, g = this.g, P = this.P.render, u = P.u, sc = this.scene, gas = GASES[sc.gas];
    this.use(P);
    gl.uniform1i(u.uFeed, g.bind(0, this.feedTex));
    gl.uniform1i(u.uS, g.bind(1, this.st.read.tex));
    gl.uniform1i(u.uNz, g.bind(2, this.noise));
    gl.uniform1f(u.scr, this.hasFeed ? this.backdropScroll / this.feedH : 0);
    gl.uniform1f(u.vf, this.hasFeed ? this.H / this.feedH : 1);
    gl.uniform1f(u.amp, sc.refraction);
    gl.uniform1f(u.dn, deltaN(gas));
    gl.uniform1f(u.sig, 1.15 * scatterRelative(gas));
    gl.uniform1f(u.lod, Math.log2(14 * this.feedDpr));
    gl.uniform1f(u.smoke, sc.smoke);
    gl.uniform1f(u.reach, sc.lightReach);
    gl.uniform1f(u.flowT, this.flowT);
    gl.uniform1f(u.hasSim, TIERS[this.tier].simHz > 0 ? 1 : 0);
    gl.uniform1f(u.hasFeed, this.hasFeed ? 1 : 0);
    gl.uniform1f(u.alb, albedo(sc.smoke));
    gl.uniform1i(u.taps, TIERS[this.tier].lightTaps);
    gl.uniform1i(u.mode, this.view === 'density' ? 1 : this.view === 'light' ? 2 : 0);
    const cs = getComputedStyle(this.host);
    const scene = rgb(cs.getPropertyValue('--aid-scene-light'), [246, 248, 251]);
    gl.uniform3f(u.scene, scene[0], scene[1], scene[2]);
    gl.uniform1f(u.smix, 0.35);
    const sp = sc.spectral;
    gl.uniform3f(u.tw, 1 + (RAYLEIGH[0] - 1) * sp, 1 + (RAYLEIGH[1] - 1) * sp, 1 + (RAYLEIGH[2] - 1) * sp);
    gl.uniform2f(u.ldir, -0.35, 0.9);
    const mem = rgb(cs.getPropertyValue('--aid-membrane-color'), [24, 34, 52]);
    const ma = parseFloat(cs.getPropertyValue('--aid-membrane-alpha')) || 0.22;
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
    const simOn = cfg.simHz > 0 && (cfg.ambient || moving || now - this.lastActive < 2.2);
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

  private lastReport = 0;
  private report(state: EngineStats['state']): void {
    const now = performance.now();
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
      const r = host.getBoundingClientRect();
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

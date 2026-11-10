import { GasEngine, EngineStats, View } from '../engine/engine';

const sceneCss = `
:host{display:block;position:relative;isolation:isolate;overflow:hidden}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
:host([backdrop="canvas"]) canvas{z-index:0}
:host(:not([backdrop="canvas"])) canvas{z-index:1}
.fail{position:absolute;inset:auto 8px 8px 8px;z-index:3;font:12px/1.5 system-ui,sans-serif;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff}
`;

/**
 * <aid-scene> owns one gas field and one GPU canvas. Every <aid-gas> inside it is a container in that field.
 *
 * backdrop="dom" (default): the page content behind is regular HTML. WebGL cannot read it, so the scene draws
 *   only the gas over it; the containers use a CSS backdrop blur as an approximation of scattering.
 * backdrop="canvas": the content behind is a canvas or image you hand over with setBackdrop(). Full model:
 *   refraction, scattering of the content's own light, absorption.
 *
 * tilt="device": gravity follows the device, so a heavy gas slides to the low side when the phone is tilted.
 *   Browsers that ask for permission (iOS) need enableDeviceTilt() to be called from a tap.
 */
export class AidScene extends HTMLElement {
  engine: GasEngine | null = null;
  private canvas: HTMLCanvasElement;
  private ro: ResizeObserver | null = null;
  private pending: Array<() => void> = [];
  private tiltOn = false;
  error = '';

  static get observedAttributes(): string[] { return ['backdrop', 'view', 'tilt']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = sceneCss;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.part.add('gas');
    root.append(style, this.canvas, document.createElement('slot'));
  }

  connectedCallback(): void {
    if (this.engine || this.error) return;
    try {
      this.engine = new GasEngine(this, this.canvas, this.backdrop !== 'canvas');
      this.engine.onStats = (s: EngineStats) => this.dispatchEvent(new CustomEvent<EngineStats>('aid-stats', { detail: s }));
    } catch (e) {
      this.error = (e as Error).message;
      const f = document.createElement('div');
      f.className = 'fail';
      f.textContent = 'AID: ' + this.error + ' — the interface still works, without the gas.';
      this.shadowRoot!.append(f);
      return;
    }
    this.ro = new ResizeObserver(() => this.engine?.resize());
    this.ro.observe(this);
    this.pending.splice(0).forEach((f) => f());
    if (document.fonts) document.fonts.ready.then(() => this.engine?.resize());
    if (this.getAttribute('tilt') === 'device') this.listenTilt();
  }

  disconnectedCallback(): void {
    this.ro?.disconnect();
    if (this.tiltOn) { window.removeEventListener('deviceorientation', this.onTilt); this.tiltOn = false; }
    this.engine?.dispose();
    this.engine = null;
  }

  attributeChangedCallback(name: string): void {
    if (name === 'view' && this.engine) { this.engine.view = (this.getAttribute('view') as View) || 'final'; this.engine.render(); }
    if (name === 'tilt' && this.engine && this.getAttribute('tilt') === 'device') this.listenTilt();
  }

  private onTilt = (e: DeviceOrientationEvent): void => {
    if (!this.engine || e.gamma == null) return;
    const g = Math.max(-80, Math.min(80, e.gamma)); // left-right tilt of a phone held upright
    if (Math.abs(g - this.engine.deviceTilt) < 0.7) return;
    this.engine.deviceTilt = g;
    this.engine.wake();
  };

  private listenTilt(): void {
    if (this.tiltOn || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    window.addEventListener('deviceorientation', this.onTilt);
    this.tiltOn = true;
  }

  /** Ask for motion access where the browser requires it (call from a tap), then follow the device. Resolves to whether it is on. */
  async enableDeviceTilt(): Promise<boolean> {
    const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!D) return false;
    try { if (typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') return false; } catch { return false; }
    this.listenTilt();
    return this.tiltOn;
  }

  get backdrop(): 'dom' | 'canvas' { return this.getAttribute('backdrop') === 'canvas' ? 'canvas' : 'dom'; }

  /** Run when the engine exists (children may connect before their scene). */
  whenReady(f: () => void): void { if (this.engine) f(); else if (!this.error) this.pending.push(f); }

  /** Hand over the content that sits behind the gas (backdrop="canvas"). Sizes are in CSS pixels. */
  setBackdrop(src: HTMLCanvasElement | HTMLImageElement | null, cssWidth?: number, cssHeight?: number): void {
    this.whenReady(() => this.engine!.setBackdrop(src, cssWidth, cssHeight));
  }

  /** Vertical scroll offset of the backdrop content, in CSS pixels. */
  set backdropScroll(y: number) { if (this.engine) { this.engine.backdropScroll = y; this.engine.wake(); } }
  get backdropScroll(): number { return this.engine?.backdropScroll ?? 0; }

  get maxTextureSize(): number { return this.engine?.maxTextureSize ?? 4096; }
  get stats(): EngineStats | null { return this.engine?.currentStats ?? null; }

  /** Re-read the --aid-* tokens now (they are also polled every 250 ms). */
  refresh(): void { this.engine?.resize(); }
  purge(): void { this.engine?.purge(); }
  wake(): void { this.engine?.wake(); }
}

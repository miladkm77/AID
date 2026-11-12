import { AidGas, findScene } from './gas';

type Kind = 'info' | 'success' | 'warning' | 'danger';
const KIND_CSS = ':host([kind=info]){--aid-excitation-color:var(--aid-info,56,128,232)}' +
  ':host([kind=success]){--aid-excitation-color:var(--aid-success,38,160,105)}' +
  ':host([kind=warning]){--aid-excitation-color:var(--aid-warning,224,150,24)}' +
  ':host([kind=danger]){--aid-excitation-color:var(--aid-danger,214,69,61)}';
const urgent = (el: Element): boolean => { const k = el.getAttribute('kind'); return k === 'danger' || k === 'warning'; };

/**
 * <aid-alert kind="info | success | warning | danger"> — an inline message. The gas is excited in the colour of its kind;
 * put an icon and text inside so the kind never depends on colour alone.
 */
export class AidAlert extends AidGas {
  static get observedAttributes(): string[] { return ['kind']; }
  protected extraCss(): string {
    return ':host{display:flex;justify-content:flex-start;gap:10px;width:100%;padding:12px 14px;border-radius:var(--aid-radius-md,14px);color:inherit;font:inherit;--aid-pressure:.8;--aid-weight:.3;--aid-excitation:.45}' + KIND_CSS;
  }
  connectedCallback(): void { super.connectedCallback(); this.sync(); }
  attributeChangedCallback(): void { this.sync(); super.attributeChangedCallback(); }
  private sync(): void { this.setAttribute('role', urgent(this) ? 'alert' : 'status'); }
}

/**
 * <aid-toast kind> — a short message that leaves by itself. Use the toast() helper rather than creating it by hand.
 * It stays while the pointer or the focus is on it. Fires 'close'.
 */
export class AidToast extends AidGas {
  private timer = 0;
  /** milliseconds before it closes; 0 keeps it until closed */
  duration = 5000;
  protected extraCss(): string {
    return ':host{display:flex;justify-content:flex-start;gap:10px;max-width:min(92vw,420px);padding:12px 16px;border-radius:var(--aid-radius-lg,20px);color:inherit;font:inherit;font-size:.9375em;pointer-events:auto;' +
      '--aid-pressure:1.2;--aid-weight:.2;--aid-excitation:.4;--_aid-bf:blur(12px) saturate(.9);animation:aid-toast-in .18s ease-out}' +
      '@keyframes aid-toast-in{from{opacity:0;transform:translateY(8px)}}' +
      '@media (prefers-reduced-motion:reduce){:host{animation:none}}' + KIND_CSS;
  }
  protected interactive(): boolean { return true; }
  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', urgent(this) ? 'alert' : 'status');
    this.addEventListener('pointerenter', this.hold);
    this.addEventListener('focusin', this.hold);
    this.addEventListener('pointerleave', this.arm);
    this.addEventListener('focusout', this.arm);
    this.arm();
  }
  disconnectedCallback(): void { super.disconnectedCallback(); clearTimeout(this.timer); }
  private hold = (): void => { clearTimeout(this.timer); };
  private arm = (): void => { clearTimeout(this.timer); if (this.duration > 0) this.timer = window.setTimeout(() => this.close(), this.duration); };
  close(): void { if (!this.isConnected) return; this.dispatchEvent(new Event('close')); this.remove(); }
}

export interface ToastOptions { kind?: Kind; duration?: number; scene?: Element | null; }

/**
 * Show a toast in a scene (the first one on the page by default). Toasts stack at the bottom, newest last.
 * Warnings and errors stay 8 s, others 5 s, unless `duration` says otherwise. Returns the element.
 */
export function toast(message: string | Node, opts: ToastOptions = {}): AidToast | null {
  const scene = (opts.scene || document.querySelector('aid-scene')) as HTMLElement | null;
  if (!scene) return null;
  let region = scene.querySelector(':scope > .aid-toasts') as HTMLElement | null;
  if (!region) {
    region = document.createElement('div');
    region.className = 'aid-toasts';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Notifications');
    scene.append(region);
  }
  region.style.position = scene.hasAttribute('fixed') ? 'fixed' : 'absolute';
  const t = document.createElement('aid-toast') as AidToast;
  if (opts.kind) t.setAttribute('kind', opts.kind);
  t.duration = opts.duration ?? (opts.kind === 'danger' || opts.kind === 'warning' ? 8000 : 5000);
  t.append(message);
  region.append(t);
  return t;
}

/** <aid-menu-item value="…" danger disabled> — a row in a menu. Not a gas container: the menu is. */
export class AidMenuItem extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 12px;border-radius:10px;cursor:pointer;user-select:none;-webkit-user-select:none;font:inherit;color:inherit;white-space:nowrap;outline:0}' +
      ':host(:hover),:host(:focus){background:color-mix(in srgb,currentColor 10%,transparent)}' +
      ':host(:focus-visible){outline:2px solid currentColor;outline-offset:-2px}' +
      ':host([danger]){color:rgb(var(--aid-danger,214,69,61))}' +
      ':host([disabled]){opacity:.5;cursor:not-allowed;background:none}</style><slot></slot>';
  }
  connectedCallback(): void {
    this.setAttribute('role', 'menuitem');
    this.tabIndex = -1;
    if (this.hasAttribute('disabled')) this.setAttribute('aria-disabled', 'true');
  }
}

/**
 * <aid-menu for="buttonId"> — a popover list of actions. The element named by `for` toggles it; or call show(anchor).
 * Arrow keys, Home and End move; Enter or Space choose; Escape, Tab and a click outside close it and focus returns to
 * the anchor. Fires 'select' with detail.value (the item's `value` attribute, or its text) and detail.item.
 */
export class AidMenu extends AidGas {
  static get observedAttributes(): string[] { return ['open']; }
  private anchor: HTMLElement | null = null;
  private trigger: HTMLElement | null = null;
  protected extraCss(): string {
    return ':host{display:none;position:absolute;z-index:950;flex-direction:column;align-items:stretch;justify-content:flex-start;min-width:180px;max-width:min(92vw,320px);max-height:min(70vh,420px);overflow:auto;padding:6px;' +
      'border-radius:var(--aid-radius-md,14px);color:inherit;font:inherit;--aid-pressure:1.2;--aid-weight:.15;--_aid-bf:blur(12px) saturate(.9)}' +
      ':host([open]){display:flex}';
  }
  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'menu');
    if (findScene(this)?.hasAttribute('fixed')) this.style.position = 'fixed';
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKey);
    const id = this.getAttribute('for');
    this.trigger = id ? (this.getRootNode() as Document | ShadowRoot).getElementById(id) : null;
    if (this.trigger) {
      this.trigger.setAttribute('aria-haspopup', 'menu');
      this.trigger.setAttribute('aria-expanded', 'false');
      this.trigger.addEventListener('click', this.onTrigger);
    }
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKey);
    this.trigger?.removeEventListener('click', this.onTrigger);
    this.unlisten();
  }
  attributeChangedCallback(name?: string): void {
    if (name === 'open' && this.isConnected && !this.open) this.unlisten();
    super.attributeChangedCallback();
  }
  get open(): boolean { return this.hasAttribute('open'); }
  get items(): AidMenuItem[] { return (Array.from(this.querySelectorAll('aid-menu-item')) as AidMenuItem[]).filter((i) => !i.hasAttribute('disabled')); }

  show(anchor?: HTMLElement | null): void {
    this.anchor = anchor || this.trigger;
    this.setAttribute('open', '');
    this.place();
    this.anchor?.setAttribute('aria-expanded', 'true');
    this.items[0]?.focus();
    // listen from the next task on, so the click that opened it does not close it
    setTimeout(() => { if (this.open) { document.addEventListener('pointerdown', this.onOutside, true); window.addEventListener('resize', this.onResize); window.addEventListener('scroll', this.onResize, true); } });
  }
  close(refocus = true): void {
    if (!this.open) return;
    this.removeAttribute('open');
    this.anchor?.setAttribute('aria-expanded', 'false');
    if (refocus) this.anchor?.focus();
  }
  private unlisten(): void {
    document.removeEventListener('pointerdown', this.onOutside, true);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onResize, true);
  }

  /** below the anchor, aligned to its inline start; flipped above or shifted when there is no room */
  private place(): void {
    const a = this.anchor?.getBoundingClientRect();
    if (!a) return;
    const fixed = this.style.position === 'fixed';
    const box = fixed ? { left: 0, top: 0, width: document.documentElement.clientWidth, height: window.innerHeight }
      : ((this.offsetParent as HTMLElement | null) || document.body).getBoundingClientRect();
    const w = this.offsetWidth, h = this.offsetHeight, gap = 6, rtl = getComputedStyle(this).direction === 'rtl';
    let x = (rtl ? a.right - w : a.left) - box.left, y = a.bottom + gap - box.top;
    x = Math.max(8, Math.min(x, box.width - w - 8));
    if (y + h > box.height - 8 && a.top - box.top - gap - h >= 8) y = a.top - box.top - gap - h;
    this.style.left = Math.round(x) + 'px';
    this.style.top = Math.round(y) + 'px';
  }

  private onTrigger = (): void => { if (this.open) this.close(); else this.show(); };
  private onResize = (e: Event): void => { if (e.type === 'scroll' && e.target instanceof Node && this.contains(e.target)) return; this.close(false); };
  private onOutside = (e: Event): void => {
    const path = e.composedPath();
    if (path.includes(this) || (this.anchor && path.includes(this.anchor))) return;
    this.close(false);
  };
  private onClick = (e: Event): void => {
    const item = (e.target as Element).closest('aid-menu-item');
    if (!item || item.hasAttribute('disabled')) return;
    this.dispatchEvent(new CustomEvent('select', { detail: { value: item.getAttribute('value') ?? item.textContent?.trim() ?? '', item } }));
    this.close();
  };
  private onKey = (e: KeyboardEvent): void => {
    const items = this.items, i = items.indexOf(document.activeElement as AidMenuItem);
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    if (e.key === 'Tab') { this.close(); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (document.activeElement as HTMLElement | null)?.click(); return; }
    const n = e.key === 'ArrowDown' ? (i + 1) % items.length : e.key === 'ArrowUp' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
    if (n < 0 || !items.length) return;
    e.preventDefault();
    items[n].focus();
  };
}

/**
 * <aid-slider min="0" max="100" step="1" value="40"> — a tube with a filled part and a thumb.
 * Drag, click, arrow keys (right-to-left aware), Page Up / Down (ten steps), Home and End. Fires 'input' while moving and
 * 'change' when a move ends. Give it an aria-label or wrap it in a <label>.
 */
export class AidSlider extends HTMLElement {
  static get observedAttributes(): string[] { return ['value', 'min', 'max', 'step', 'disabled']; }
  private parts: HTMLElement[] = [];
  private dragging = false;
  private last = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block;position:relative;height:32px;min-width:120px;width:100%;touch-action:pan-y;cursor:pointer;outline:0;-webkit-tap-highlight-color:transparent}' +
      ':host([disabled]){cursor:not-allowed;opacity:.55}' +
      '.track{position:absolute;inset-inline:0;top:11px;height:10px;border-radius:5px;display:flex;justify-content:flex-start;--aid-pressure:.12;--aid-weight:0}' +
      '.bar{height:100%;width:calc(12px + var(--_k,0) * (100% - 24px));min-width:0;border-radius:5px;--aid-pressure:2;--aid-weight:0;--aid-excitation:.5;--aid-membrane:0}' +
      /* like the switch, the thumb is also a faint solid disc so it is found at a glance */
      '.thumb{position:absolute;top:4px;inset-inline-start:calc(var(--_k,0) * (100% - 24px));width:24px;height:24px;border-radius:50%;--aid-pressure:1.4;--aid-weight:.1;' +
      'background:color-mix(in srgb,var(--aid-color-surface,#fff) 78%,transparent);box-shadow:0 1px 2px rgba(0,0,0,.2)}' +
      ':host(:focus-visible) .thumb{outline:2px solid currentColor;outline-offset:3px;--aid-excitation:.8}</style>' +
      '<aid-gas class="track"><aid-gas class="bar"></aid-gas></aid-gas><aid-gas class="thumb"></aid-gas>';
    this.parts = Array.from(root.querySelectorAll('aid-gas')) as HTMLElement[];
    // the shell of the track stays visible while it is almost empty
    (this.parts[0] as unknown as { shell: () => boolean }).shell = () => true;
  }

  connectedCallback(): void {
    this.setAttribute('role', 'slider');
    this.addEventListener('pointerdown', this.onDown);
    this.addEventListener('pointermove', this.onMove);
    this.addEventListener('pointerup', this.onUp);
    this.addEventListener('pointercancel', this.onUp);
    this.addEventListener('keydown', this.onKey);
    this.sync();
  }
  disconnectedCallback(): void {
    this.removeEventListener('pointerdown', this.onDown);
    this.removeEventListener('pointermove', this.onMove);
    this.removeEventListener('pointerup', this.onUp);
    this.removeEventListener('pointercancel', this.onUp);
    this.removeEventListener('keydown', this.onKey);
  }
  attributeChangedCallback(): void { if (this.isConnected) this.sync(); }

  private num(name: string, d: number): number { const v = parseFloat(this.getAttribute(name) ?? ''); return isFinite(v) ? v : d; }
  get min(): number { return this.num('min', 0); }
  get max(): number { return Math.max(this.min, this.num('max', 100)); }
  get step(): number { return Math.max(1e-9, this.num('step', 1)); }
  get disabled(): boolean { return this.hasAttribute('disabled'); }
  get value(): number { return this.snap(this.num('value', this.min)); }
  set value(v: number) { this.setAttribute('value', String(this.snap(v))); }

  private snap(v: number): number {
    const s = this.step, n = Math.round((Math.min(this.max, Math.max(this.min, v)) - this.min) / s) * s + this.min;
    return Math.min(this.max, +n.toFixed(6));
  }
  private sync(): void {
    const v = this.value, span = this.max - this.min;
    this.style.setProperty('--_k', String(span > 0 ? (v - this.min) / span : 0));
    this.setAttribute('aria-valuemin', String(this.min));
    this.setAttribute('aria-valuemax', String(this.max));
    this.setAttribute('aria-valuenow', String(v));
    this.tabIndex = this.disabled ? -1 : 0;
    if (this.disabled) this.setAttribute('aria-disabled', 'true'); else this.removeAttribute('aria-disabled');
    for (const p of this.parts) p.toggleAttribute('disabled', this.disabled);
  }
  private set(v: number, done: boolean): void {
    const n = this.snap(v);
    if (n !== this.value) { this.value = n; this.dispatchEvent(new Event('input', { bubbles: true })); }
    if (done && n !== this.last) { this.last = n; this.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  private at(e: PointerEvent): number {
    const r = this.getBoundingClientRect(), pad = 12;
    let k = (e.clientX - r.left - pad) / Math.max(1, r.width - 2 * pad);
    if (getComputedStyle(this).direction === 'rtl') k = 1 - k;
    return this.min + Math.min(1, Math.max(0, k)) * (this.max - this.min);
  }
  private onDown = (e: PointerEvent): void => {
    if (this.disabled || e.button > 0) return;
    this.dragging = true;
    this.last = this.value;
    this.setPointerCapture(e.pointerId);
    this.set(this.at(e), false);
  };
  private onMove = (e: PointerEvent): void => { if (this.dragging) this.set(this.at(e), false); };
  private onUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    const v = this.value;
    if (v !== this.last) { this.last = v; this.dispatchEvent(new Event('change', { bubbles: true })); }
    if (this.hasPointerCapture(e.pointerId)) this.releasePointerCapture(e.pointerId);
  };
  private onKey = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    const rtl = getComputedStyle(this).direction === 'rtl', s = this.step, v = this.value;
    const d = e.key === 'ArrowUp' ? s : e.key === 'ArrowDown' ? -s : e.key === 'ArrowRight' ? (rtl ? -s : s) : e.key === 'ArrowLeft' ? (rtl ? s : -s)
      : e.key === 'PageUp' ? 10 * s : e.key === 'PageDown' ? -10 * s : e.key === 'Home' ? this.min - v : e.key === 'End' ? this.max - v : 0;
    if (!d) return;
    e.preventDefault();
    this.last = v;
    this.set(v + d, true);
  };
}

import type { GasContainer } from '../engine/engine';
import type { AidScene } from './scene';

const gasCss = `
/* container-level tokens are reset here so a container never inherits them from a container around it */
:host{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;-webkit-tap-highlight-color:transparent;
--aid-pressure:1;--aid-membrane:1;--aid-excitation:0;--aid-excitation-color:initial}
:host([hidden]){display:none}
:host([force=focus]){--aid-excitation:.6}
:host::before{content:"";position:absolute;inset:0;border-radius:inherit;z-index:-1;pointer-events:none;
-webkit-backdrop-filter:var(--_aid-bf,none);backdrop-filter:var(--_aid-bf,none);
--_aid-fade:calc(var(--_aid-fade-unit,9999px) / max(var(--aid-weight,.6),.02));
-webkit-mask-image:linear-gradient(var(--_aid-angle,0deg),#000,rgba(0,0,0,.12) var(--_aid-fade));mask-image:linear-gradient(var(--_aid-angle,0deg),#000,rgba(0,0,0,.12) var(--_aid-fade))}
/* depth: where this container floats above a lower one, its gas fogs the lower container (set by the engine) */
:host::after{content:"";position:absolute;inset:1.5px;border-radius:inherit;z-index:-1;pointer-events:none;display:var(--_aid-veil-d,none);
-webkit-backdrop-filter:blur(calc(var(--aid-pressure,1) * 4px));backdrop-filter:blur(calc(var(--aid-pressure,1) * 4px));
background:rgba(var(--aid-scene-light,246,248,251),.14);-webkit-clip-path:var(--_aid-veil-clip,none);clip-path:var(--_aid-veil-clip,none)}
`;

/**
 * <aid-gas> — a sealed container of gas. Its shape is the element's box and border-radius.
 * Density comes from --aid-pressure; interaction state scales it:
 *   disabled → evacuated (0), pressed → compressed (×1.25), otherwise ×1.
 * --aid-excitation makes the gas emit the discharge colour of its species.
 */
/** the scene an element belongs to, looking through shadow trees */
export function findScene(el: Element): AidScene | null {
  let n: Element | null = el;
  while (n) {
    const s = n.closest('aid-scene');
    if (s) return s as AidScene;
    const root = n.getRootNode();
    n = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

export class AidGas extends HTMLElement implements GasContainer {
  protected scene: AidScene | null = null;
  protected pressed = false;
  protected hovered = false;

  static get observedAttributes(): string[] { return ['disabled']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const s = document.createElement('style');
    s.textContent = gasCss + this.extraCss();
    root.append(s, document.createElement('slot'));
  }

  protected extraCss(): string { return ''; }

  get el(): HTMLElement { return this; }

  connectedCallback(): void {
    this.scene = findScene(this);
    if (!this.scene) return;
    const attach = () => this.scene!.whenReady(() => this.scene!.engine!.add(this));
    if (customElements.get('aid-scene')) attach();
    else customElements.whenDefined('aid-scene').then(attach);
    this.addEventListener('pointerdown', this.onDown);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => this.addEventListener(t, this.onUp));
    ['focus', 'blur', 'focusin', 'focusout'].forEach((t) => this.addEventListener(t, this.onFocus));
    this.addEventListener('pointerenter', this.onEnter);
    this.addEventListener('pointerleave', this.onLeave);
  }

  disconnectedCallback(): void {
    this.scene?.engine?.remove(this);
    this.removeEventListener('pointerdown', this.onDown);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => this.removeEventListener(t, this.onUp));
    ['focus', 'blur', 'focusin', 'focusout'].forEach((t) => this.removeEventListener(t, this.onFocus));
    this.removeEventListener('pointerenter', this.onEnter);
    this.removeEventListener('pointerleave', this.onLeave);
  }

  attributeChangedCallback(): void { this.scene?.wake(); }

  get disabled(): boolean { return this.hasAttribute('disabled'); }
  set disabled(v: boolean) { this.toggleAttribute('disabled', v); }

  protected interactive(): boolean { return false; }

  /* focus styles may change --aid-excitation; the engine re-reads tokens when it wakes */
  private onFocus = (): void => { this.scene?.wake(); };

  private onEnter = (e: PointerEvent): void => { if (e.pointerType === 'mouse' && this.interactive() && !this.disabled) { this.hovered = true; this.scene?.wake(); } };
  private onLeave = (): void => { if (this.hovered) { this.hovered = false; this.scene?.wake(); } };

  /** documentation aid: force="hover" | "pressed" | "focus" shows that state without interaction */
  protected forced(s: string): boolean { return this.getAttribute('force') === s; }

  private onDown = (): void => {
    if (!this.interactive() || this.disabled) return;
    this.pressed = true;
    this.setAttribute('data-pressed', '');
    this.scene?.wake();
  };

  private onUp = (): void => {
    if (!this.pressed) return;
    this.pressed = false;
    this.removeAttribute('data-pressed');
    this.scene?.wake();
  };

  /** briefly compress, for keyboard activation */
  protected pulse(): void {
    this.pressed = true;
    this.scene?.wake();
    setTimeout(() => { this.pressed = false; this.scene?.wake(); }, 180);
  }

  /** rest 1, hover 1.1 (the gas gathers), pressed 1.25 (compressed), disabled 0 (evacuated) */
  stateFactor(): number {
    if (this.disabled) return 0;
    if (this.pressed || this.forced('pressed')) return 1.25;
    return this.hovered || this.forced('hover') ? 1.1 : 1;
  }

  dashed(): boolean { return this.disabled; }
  shell(): boolean { return false; }
  busy(): boolean { return false; }
  veilAll(): boolean { return false; }
}

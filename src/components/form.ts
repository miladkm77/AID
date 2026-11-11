import { AidGas } from './gas';

const CHECK = '<svg class="on" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const DASH = '<svg class="mid" viewBox="0 0 24 24"><path d="M6 12h12"/></svg>';
const DOT = '<svg class="on" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" style="fill:currentColor;stroke:none"/></svg>';
const MARK_CSS = 'svg{position:absolute;inset:0;margin:auto;width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity .12s}' +
  ':host([checked]:not([indeterminate])) svg.on,:host([indeterminate]) svg.mid{opacity:1}';
const FOCUS = ':host(:focus-visible),:host([force=focus]){outline:2px solid currentColor;outline-offset:3px;--aid-excitation:.8}';
const OFF = ':host([disabled]){cursor:not-allowed;opacity:.55;--aid-excitation:0}';

/** Toggle a custom control when its surrounding <label> is clicked, and name it after the label. */
function bindLabel(el: HTMLElement, toggle: () => void): () => void {
  const label = el.closest('label');
  if (!label) return () => undefined;
  if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
    if (!label.id) label.id = 'aid-l' + Math.random().toString(36).slice(2, 8);
    el.setAttribute('aria-labelledby', label.id);
  }
  const f = (e: Event) => { if (!el.contains(e.target as Node)) toggle(); };
  label.addEventListener('click', f);
  return () => label.removeEventListener('click', f);
}

/**
 * Shared behaviour of <aid-checkbox>, <aid-radio> and <aid-switch>: a `checked` attribute, Space to toggle,
 * a 'change' event, and a wall that stays visible while the chamber is empty.
 */
abstract class AidToggle extends AidGas {
  static get observedAttributes(): string[] { return ['disabled', 'checked', 'indeterminate']; }
  protected abstract kind: string;
  private unbind: () => void = () => undefined;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", this.kind);
    this.sync();
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKey);
    this.unbind = bindLabel(this, () => this.toggle());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKey);
    this.unbind();
  }

  attributeChangedCallback(): void { this.sync(); super.attributeChangedCallback(); }

  get checked(): boolean { return this.hasAttribute('checked'); }
  set checked(v: boolean) { this.toggleAttribute('checked', v); }

  protected sync(): void {
    this.setAttribute('aria-checked', this.hasAttribute('indeterminate') ? 'mixed' : String(this.checked));
    if (this.disabled) { this.setAttribute('aria-disabled', 'true'); this.tabIndex = -1; }
    else { this.removeAttribute('aria-disabled'); if (this.tabIndex < 0 || !this.hasAttribute('tabindex')) this.tabIndex = 0; }
  }

  protected interactive(): boolean { return true; }
  shell(): boolean { return true; }

  /** user-initiated change */
  toggle(): void {
    if (this.disabled) return;
    this.removeAttribute('indeterminate');
    this.checked = !this.checked;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private onClick = (): void => this.toggle();
  protected onKey = (e: KeyboardEvent): void => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    this.pulse();
    this.toggle();
  };

  /** an unchecked chamber is empty; hovering lets a little gas in; checked is a full, dense chamber */
  stateFactor(): number {
    if (this.disabled) return 0;
    const on = this.checked || this.hasAttribute('indeterminate');
    const k = this.pressed || this.forced('pressed') ? 1.25 : this.hovered || this.forced('hover') ? 1.1 : 1;
    return on ? 1.7 * k : k > 1 ? 0.35 : 0;
  }
}

/** <aid-checkbox checked | indeterminate | disabled> */
export class AidCheckbox extends AidToggle {
  protected kind = 'checkbox';
  protected extraCss(): string {
    return ':host{width:22px;height:22px;border-radius:7px;cursor:pointer;flex:none;color:inherit;--aid-weight:.15}' +
      ':host([checked]),:host([indeterminate]){--aid-excitation:.45}' + FOCUS + OFF + MARK_CSS;
  }
  constructor() { super(); this.shadowRoot!.querySelector('slot')!.insertAdjacentHTML('afterend', CHECK + DASH); }
}

/** <aid-radio name="group" checked>. Radios that share a name within the same root form a group; arrow keys move the choice. */
export class AidRadio extends AidToggle {
  protected kind = 'radio';
  protected extraCss(): string {
    return ':host{width:22px;height:22px;border-radius:50%;cursor:pointer;flex:none;color:inherit;--aid-weight:.15}' +
      ':host([checked]){--aid-excitation:.45}' + FOCUS + OFF + MARK_CSS;
  }
  constructor() { super(); this.shadowRoot!.querySelector('slot')!.insertAdjacentHTML('afterend', DOT); }

  private group(): AidRadio[] {
    const name = this.getAttribute('name');
    if (!name) return [this];
    return Array.from((this.getRootNode() as ParentNode).querySelectorAll(`aid-radio[name="${CSS.escape(name)}"]`)) as AidRadio[];
  }

  protected sync(): void {
    super.sync();
    if (this.disabled || !this.isConnected) return;
    // roving tabindex: the checked radio, or the first one when none is checked
    const g = this.group().filter((r) => !r.disabled), cur = g.find((r) => r.checked) || g[0];
    for (const r of g) r.tabIndex = r === cur ? 0 : -1;
  }

  toggle(): void {
    if (this.disabled || this.checked) return;
    for (const r of this.group()) if (r !== this) r.checked = false;
    this.checked = true;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  protected onKey = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.pulse(); this.toggle(); return; }
    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    if (!step) return;
    e.preventDefault();
    const g = this.group().filter((r) => !r.disabled), n = g[(g.indexOf(this) + step + g.length) % g.length];
    n.focus();
    n.toggle();
  };
}

/** <aid-switch checked>. The thumb is its own chamber: sparse when off, dense when on, and it carries its gas as it moves. */
export class AidSwitch extends AidToggle {
  protected kind = 'switch';
  protected extraCss(): string {
    return ':host{width:48px;height:28px;border-radius:14px;padding:3px;cursor:pointer;flex:none;justify-content:flex-start;--aid-pressure:.2;--aid-weight:0}' +
      ':host([checked]){--aid-pressure:.9;--aid-excitation:.5}' +
      /* the thumb is the one part that must be found at a glance in every state, so it is also a faint solid disc */
      '.thumb{width:22px;height:22px;border-radius:50%;pointer-events:none;--aid-pressure:.8;--aid-weight:.1;transition:margin-inline-start .16s ease;background:color-mix(in srgb,var(--aid-color-surface,#fff) 78%,transparent);box-shadow:0 1px 2px rgba(0,0,0,.2)}' +
      ':host([checked]) .thumb{margin-inline-start:20px;--aid-pressure:2}' +
      '@media (prefers-reduced-motion:reduce){.thumb{transition:none}}' + FOCUS + OFF;
  }
  private thumb: AidGas | null = null;
  constructor() {
    super();
    this.shadowRoot!.querySelector('slot')!.insertAdjacentHTML('afterend', '<aid-gas class="thumb"></aid-gas>');
  }
  protected sync(): void {
    super.sync();
    this.thumb = this.thumb || (this.shadowRoot!.querySelector('.thumb') as AidGas | null);
    if (this.thumb) this.thumb.toggleAttribute('disabled', this.disabled);
  }
  stateFactor(): number {
    if (this.disabled) return 0;
    return this.pressed || this.forced('pressed') ? 1.25 : this.hovered || this.forced('hover') ? 1.1 : 1;
  }
}

/**
 * <aid-chip selected> — a small toggle for filters and tags. Unselected it is an almost empty shell; selected it fills.
 * Add `static` for a chip that does not toggle.
 */
export class AidChip extends AidGas {
  static get observedAttributes(): string[] { return ['disabled', 'selected']; }
  protected extraCss(): string {
    return ':host{cursor:pointer;user-select:none;-webkit-user-select:none;font:inherit;font-size:.8125em;font-weight:500;color:inherit;gap:6px;white-space:nowrap;min-height:32px;padding:0 14px;border-radius:999px;--aid-weight:.3}' +
      ':host([static]){cursor:default}' + FOCUS + OFF;
  }
  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('static')) { this.setAttribute('role', 'button'); this.addEventListener('click', this.onClick); this.addEventListener('keydown', this.onKey); }
    this.sync();
  }
  disconnectedCallback(): void { super.disconnectedCallback(); this.removeEventListener('click', this.onClick); this.removeEventListener('keydown', this.onKey); }
  attributeChangedCallback(): void { this.sync(); super.attributeChangedCallback(); }
  get selected(): boolean { return this.hasAttribute('selected'); }
  set selected(v: boolean) { this.toggleAttribute('selected', v); }
  private sync(): void {
    if (this.hasAttribute('static')) return;
    this.setAttribute('aria-pressed', String(this.selected));
    this.tabIndex = this.disabled ? -1 : 0;
    if (this.disabled) this.setAttribute('aria-disabled', 'true'); else this.removeAttribute('aria-disabled');
  }
  protected interactive(): boolean { return !this.hasAttribute('static'); }
  shell(): boolean { return true; }
  private onClick = (): void => {
    if (this.disabled) return;
    this.selected = !this.selected;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };
  private onKey = (e: KeyboardEvent): void => {
    if (this.disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    this.pulse();
    this.onClick();
  };
  stateFactor(): number {
    if (this.disabled) return 0;
    const k = this.pressed || this.forced('pressed') ? 1.25 : this.hovered || this.forced('hover') ? 1.1 : 1;
    return (this.selected || this.hasAttribute('static') ? 1.1 : 0.22) * k;
  }
}

/**
 * <aid-field><input></aid-field> — the gas chamber around a native input, textarea or select.
 * The native control keeps its own semantics, validation and autofill. The field mirrors its `disabled` state and
 * `aria-invalid`; set `invalid` on the field to force the error state.
 *
 * States: rest · hover · focus (excited, slightly compressed) · invalid (excited in the danger colour) · disabled.
 */
export class AidField extends AidGas {
  static get observedAttributes(): string[] { return ['disabled', 'invalid']; }
  private mo: MutationObserver | null = null;
  protected extraCss(): string {
    return ':host{display:flex;gap:8px;width:100%;min-height:var(--aid-size-md,44px);padding:0 14px;border-radius:var(--aid-radius-md,14px);cursor:text;font:inherit;color:inherit;--aid-pressure:.7;--aid-weight:.35}' +
      '::slotted(input),::slotted(textarea),::slotted(select){flex:1;min-width:0;align-self:stretch;font:inherit;color:inherit;background:transparent;border:0;outline:0;padding:0;margin:0;-webkit-appearance:none;appearance:none}' +
      '::slotted(textarea){padding:11px 0;min-height:88px;resize:vertical}' +
      ':host(:focus-within),:host([force=focus]){--aid-excitation:.55;outline:2px solid color-mix(in srgb,currentColor 60%,transparent);outline-offset:2px}' +
      ':host([invalid]){--aid-excitation:.6;--aid-excitation-color:var(--aid-danger,214,69,61)}' + OFF;
  }
  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.onClick);
    this.mo = new MutationObserver(() => this.mirror());
    this.mo.observe(this, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-invalid'] });
    this.mirror();
  }
  disconnectedCallback(): void { super.disconnectedCallback(); this.removeEventListener('click', this.onClick); this.mo?.disconnect(); }
  get control(): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null { return this.querySelector('input,textarea,select'); }
  private mirror(): void {
    const c = this.control;
    if (!c) return;
    if (c.disabled !== this.disabled) this.toggleAttribute('disabled', c.disabled);
    const bad = c.getAttribute('aria-invalid') === 'true';
    if (c.hasAttribute('aria-invalid') && bad !== this.hasAttribute('invalid')) this.toggleAttribute('invalid', bad);
  }
  private onClick = (e: Event): void => { const c = this.control; if (c && e.target !== c && !c.disabled) c.focus(); };
  protected interactive(): boolean { return true; }
  stateFactor(): number {
    if (this.disabled) return 0;
    if (this.matches(':focus-within') || this.forced('focus')) return 1.2;
    return this.hovered || this.forced('hover') ? 1.1 : 1;
  }
}

/** <aid-card> — a quiet container for grouped content. Low pressure, so its gas lies as a thin layer on the floor. `interactive` adds hover and press. */
export class AidCard extends AidGas {
  protected extraCss(): string {
    return ':host{display:block;border-radius:var(--aid-radius-lg,20px);padding:var(--aid-space-4,16px);color:inherit;--aid-pressure:.3;--aid-weight:.5}' +
      ':host([interactive]){cursor:pointer}';
  }
  protected interactive(): boolean { return this.hasAttribute('interactive'); }
}

/**
 * <aid-progress value="40"> — a tube; the filled part is a dense, excited chamber. Without `value` it is indeterminate.
 */
export class AidProgress extends AidGas {
  static get observedAttributes(): string[] { return ['value', 'disabled']; }
  protected extraCss(): string {
    return ':host{display:flex;justify-content:flex-start;width:100%;height:12px;border-radius:6px;--aid-pressure:.12;--aid-weight:0}' +
      '.bar{height:100%;min-width:0;width:var(--_v,38%);border-radius:6px;--aid-pressure:2;--aid-weight:0;--aid-excitation:.55;--aid-membrane:0;transition:width .25s ease}' +
      ':host(:not([value])) .bar{animation:aid-ind 2.4s ease-in-out infinite}' +
      '@keyframes aid-ind{0%,100%{margin-inline-start:0}50%{margin-inline-start:62%}}' +
      '@media (prefers-reduced-motion:reduce){.bar{transition:none}:host(:not([value])) .bar{animation:none;margin-inline-start:31%}}';
  }
  constructor() { super(); this.shadowRoot!.querySelector('slot')!.insertAdjacentHTML('afterend', '<aid-gas class="bar"></aid-gas>'); }
  connectedCallback(): void { super.connectedCallback(); this.setAttribute('role', 'progressbar'); this.sync(); }
  attributeChangedCallback(): void { this.sync(); super.attributeChangedCallback(); }
  shell(): boolean { return true; }
  private sync(): void {
    const v = this.getAttribute('value');
    if (v === null) { this.style.removeProperty('--_v'); this.removeAttribute('aria-valuenow'); return; }
    const n = Math.max(0, Math.min(100, parseFloat(v) || 0));
    this.style.setProperty('--_v', n + '%');
    this.setAttribute('aria-valuemin', '0'); this.setAttribute('aria-valuemax', '100'); this.setAttribute('aria-valuenow', String(n));
  }
}

/**
 * <aid-dialog open> — a modal. Elevation is fog: the dialog fills the whole scene with a thin gas that veils
 * everything below, and its panel is a dense chamber on top. Escape and a click on the fog close it (unless `persistent`);
 * focus moves into the panel and returns to where it was. Fires 'close'.
 */
export class AidDialog extends AidGas {
  static get observedAttributes(): string[] { return ['open']; }
  private back: Element | null = null;
  protected extraCss(): string {
    return ':host{display:none;position:absolute;inset:0;z-index:1000;padding:16px;border-radius:0;--aid-pressure:.5;--aid-weight:0;--aid-membrane:0}' +
      ':host([open]){display:flex}' +
      '.panel{display:block;width:min(100%,420px);max-height:100%;overflow:auto;border-radius:var(--aid-radius-xl,24px);padding:20px;color:inherit;--aid-pressure:1;--aid-weight:.2}';
  }
  constructor() {
    super();
    const slot = this.shadowRoot!.querySelector('slot')!;
    const panel = document.createElement('aid-gas');
    panel.className = 'panel';
    panel.setAttribute('part', 'panel');
    slot.replaceWith(panel);
    panel.append(slot);
  }
  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    if (this.scene?.hasAttribute('fixed')) this.style.position = 'fixed';
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKey);
    if (this.open) this.enter();
  }
  disconnectedCallback(): void { super.disconnectedCallback(); this.removeEventListener('click', this.onClick); this.removeEventListener('keydown', this.onKey); }
  attributeChangedCallback(name?: string): void {
    if (name === 'open' && this.isConnected) { if (this.open) this.enter(); else this.leave(); }
    super.attributeChangedCallback();
  }
  get open(): boolean { return this.hasAttribute('open'); }
  set open(v: boolean) { this.toggleAttribute('open', v); }
  show(): void { this.open = true; }
  close(): void { if (!this.open) return; this.open = false; this.dispatchEvent(new Event('close')); }
  veilAll(): boolean { return true; }

  private focusables(): HTMLElement[] {
    return (Array.from(this.querySelectorAll('aid-button,aid-chip,aid-checkbox,aid-radio,aid-switch,aid-tab,input,textarea,select,button,a[href],[tabindex]')) as HTMLElement[])
      .filter((e) => !e.hasAttribute('disabled') && e.tabIndex >= 0);
  }
  private enter(): void {
    this.back = document.activeElement;
    queueMicrotask(() => { const f = this.focusables()[0]; if (f) f.focus(); });
  }
  private leave(): void { if (this.back instanceof HTMLElement) this.back.focus(); this.back = null; }
  /* only a click on the fog itself closes; the panel lives in the shadow tree, so the event target alone cannot tell */
  private onClick = (e: Event): void => { if (e.composedPath()[0] === this && !this.hasAttribute('persistent')) this.close(); };
  private onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !this.hasAttribute('persistent')) { e.preventDefault(); this.close(); return; }
    if (e.key !== 'Tab') return;
    const f = this.focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  };
  stateFactor(): number { return this.open ? 1 : 0; }
}

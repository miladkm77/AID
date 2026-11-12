import { AidGas } from './gas';

/**
 * <aid-button> — a gas container that behaves as a button.
 * Activates on click, Enter and Space; fires a regular 'click'.
 *
 *   variant  default | "primary" (excited gas, the accent of the scene's species) | "danger" | "quiet" (almost empty)
 *   size     "sm" | default | "lg"          icon   icon-only, square
 *   loading  the excitation pulses and clicks are ignored
 *
 * States: rest · hover (the gas gathers, ×1.1) · pressed (compressed, ×1.25) · focus (excited) ·
 *         loading (pulsing) · disabled (evacuated, dashed wall).
 */
export class AidButton extends AidGas {
  static get observedAttributes(): string[] { return ['disabled', 'loading', 'variant', 'size']; }

  protected extraCss(): string {
    return ':host{cursor:pointer;user-select:none;-webkit-user-select:none;font:inherit;font-weight:500;color:inherit;gap:8px;white-space:nowrap;min-height:var(--aid-size-md,44px);padding:0 20px;border-radius:999px}' +
      ':host([size=sm]){min-height:var(--aid-size-sm,36px);padding:0 14px;font-size:.875em}' +
      ':host([size=lg]){min-height:var(--aid-size-lg,52px);padding:0 26px;font-size:1.0625em}' +
      ':host([icon]){padding:0;aspect-ratio:1;min-width:var(--aid-size-md,44px)}:host([icon][size=sm]){min-width:var(--aid-size-sm,36px)}:host([icon][size=lg]){min-width:var(--aid-size-lg,52px)}' +
      ':host([variant=primary]){--aid-pressure:1.3;--aid-excitation:.5;font-weight:600}' +
      ':host([variant=danger]){--aid-pressure:1.2;--aid-excitation:.5;--aid-excitation-color:var(--aid-danger,214,69,61)}' +
      ':host([variant=quiet]){--aid-pressure:.2;--aid-membrane:.45}' +
      ':host(:focus-visible),:host([force=focus]){outline:2px solid currentColor;outline-offset:3px;--aid-excitation:.8}' +
      ':host([loading]){cursor:progress}' +
      ':host([disabled]){cursor:not-allowed;opacity:.55;--aid-excitation:0}';
  }

  busy(): boolean { return this.hasAttribute('loading') && !this.disabled; }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    this.syncDisabled();
    this.addEventListener('keydown', this.onKey);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
  }

  attributeChangedCallback(): void {
    this.syncDisabled();
    super.attributeChangedCallback();
  }

  private syncDisabled(): void {
    if (this.disabled) { this.setAttribute('aria-disabled', 'true'); this.tabIndex = -1; }
    else { this.removeAttribute('aria-disabled'); this.tabIndex = 0; }
    if (this.hasAttribute('loading')) this.setAttribute('aria-busy', 'true'); else this.removeAttribute('aria-busy');
  }

  protected interactive(): boolean { return true; }

  private onKey = (e: KeyboardEvent): void => {
    if (this.disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    this.pulse();
    this.click();
  };

  click(): void {
    if (this.disabled || this.hasAttribute('loading')) return;
    super.click();
  }
}

/**
 * <aid-tabs> holds the bar's gas; each <aid-tab> is an inner chamber that is filled only while selected.
 * Changing the tab drains the old chamber and fills the new one. Fires 'change' with detail.index.
 */
export class AidTabs extends AidGas {
  protected extraCss(): string {
    return ':host{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:5px;border-radius:30px}' +
      /* vertical: a side navigation */
      ':host([vertical]){grid-auto-flow:row;grid-auto-columns:auto;gap:2px;padding:6px;border-radius:20px;align-content:start}';
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tablist');
    this.addEventListener('click', this.onClick);
    queueMicrotask(() => this.select(Math.max(0, this.tabs.findIndex((t) => t.selected))));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClick);
  }

  get tabs(): AidTab[] { return Array.from(this.querySelectorAll(':scope > aid-tab')) as AidTab[]; }

  select(i: number): void {
    const v = this.hasAttribute('vertical');
    this.setAttribute('aria-orientation', v ? 'vertical' : 'horizontal');
    this.tabs.forEach((t, j) => { t.selected = j === i; t.toggleAttribute('data-vertical', v); });
    this.scene?.wake();
  }

  private onClick = (e: Event): void => {
    const tab = (e.target as Element).closest('aid-tab') as AidTab | null;
    if (!tab || tab.disabled) return;
    const i = this.tabs.indexOf(tab);
    if (i < 0 || tab.selected) return;
    this.select(i);
    this.dispatchEvent(new CustomEvent('change', { detail: { index: i } }));
  };
}

export class AidTab extends AidGas {
  static get observedAttributes(): string[] { return ['disabled', 'selected']; }

  protected extraCss(): string {
    return ':host{cursor:pointer;flex-direction:column;gap:1px;border-radius:25px;margin:0;user-select:none;-webkit-user-select:none}' +
      ':host([data-vertical]){flex-direction:row;justify-content:flex-start;gap:10px;min-height:44px;padding:0 14px;border-radius:14px}' +
      ':host(:focus-visible){outline:2px solid currentColor;outline-offset:2px}';
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tab');
    this.sync();
    this.addEventListener('keydown', this.onKey);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
  }

  attributeChangedCallback(): void { this.sync(); super.attributeChangedCallback(); }

  get selected(): boolean { return this.hasAttribute('selected'); }
  set selected(v: boolean) { this.toggleAttribute('selected', v); }

  private sync(): void {
    this.setAttribute('aria-selected', String(this.selected));
    this.tabIndex = this.selected ? 0 : -1;
  }

  protected interactive(): boolean { return true; }

  private onKey = (e: KeyboardEvent): void => {
    const bar = this.parentElement as AidTabs | null;
    if (!bar || !(bar instanceof AidTabs)) return;
    const tabs = bar.tabs, i = tabs.indexOf(this);
    let next = -1;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.pulse(); this.click(); return; }
    // RTL-aware arrow navigation
    const rtl = getComputedStyle(this).direction === 'rtl';
    if (bar.hasAttribute('vertical')) {
      if (e.key === 'ArrowUp') next = i - 1;
      if (e.key === 'ArrowDown') next = i + 1;
    } else {
      if (e.key === 'ArrowLeft') next = i + (rtl ? 1 : -1);
      if (e.key === 'ArrowRight') next = i + (rtl ? -1 : 1);
    }
    if (next < 0 || next >= tabs.length) return;
    e.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };

  /** an unselected chamber is empty; it shows no wall */
  stateFactor(): number {
    if (this.disabled || !this.selected) return 0;
    return this.pressed ? 1.25 : 1;
  }
}

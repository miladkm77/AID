import { AidGas } from './gas';

/**
 * <aid-button> — a gas container that behaves as a button.
 * Activates on click, Enter and Space; fires a regular 'click'. Disabled = evacuated container, dashed wall.
 */
export class AidButton extends AidGas {
  protected extraCss(): string {
    return ':host{cursor:pointer;user-select:none;-webkit-user-select:none;font:inherit;color:inherit;min-height:44px;padding:0 20px;border-radius:999px}' +
      ':host([disabled]){cursor:not-allowed;opacity:.6}:host(:focus-visible){outline:2px solid currentColor;outline-offset:4px}';
  }

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
  }

  protected interactive(): boolean { return true; }

  private onKey = (e: KeyboardEvent): void => {
    if (this.disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    this.pulse();
    this.click();
  };

  click(): void {
    if (this.disabled) return;
    super.click();
  }
}

/**
 * <aid-tabs> holds the bar's gas; each <aid-tab> is an inner chamber that is filled only while selected.
 * Changing the tab drains the old chamber and fills the new one. Fires 'change' with detail.index.
 */
export class AidTabs extends AidGas {
  protected extraCss(): string {
    return ':host{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:5px;border-radius:30px}';
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
    this.tabs.forEach((t, j) => (t.selected = j === i));
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
    if (e.key === 'ArrowLeft') next = i + (rtl ? 1 : -1);
    if (e.key === 'ArrowRight') next = i + (rtl ? -1 : 1);
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

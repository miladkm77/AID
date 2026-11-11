/**
 * <aid-icon name="plus"> — line icons on a 24 px grid, 1.75 px stroke, round caps and joins, drawn in currentColor.
 * Icons are not gas containers. Directional icons mirror in right-to-left text unless the `fixed` attribute is set.
 * Give a `label` for an icon that carries meaning on its own; otherwise it is hidden from assistive technology.
 */
export const ICONS: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'chevron-up': 'M5 15l7-7 7 7',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  search: 'M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-4-4',
  home: 'M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  chart: 'M4 20h16M7 20v-7M12 20V5M17 20V10',
  user: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.5v5M8 14.5v5',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 15V4M7 9l5-5 5 5M5 20h14',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 3v5M15 3v5',
  info: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v5.5M12 7.6v.4',
  warning: 'M12 4l9.5 16h-19zM12 10v4.5M12 17v.4',
  error: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9 9l6 6M15 9l-6 6',
  success: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M8 12.5l3 3 5-6',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  star: 'M12 4l2.5 5.2 5.7.8-4.1 4 1 5.7L12 17l-5.1 2.7 1-5.7-4.1-4 5.7-.8z',
  send: 'M4 12l16-8-6 16-3-6.5z',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  refresh: 'M19 6v5h-5M5 18v-5h5M18.4 11A7 7 0 0 0 6 8.5M5.6 13A7 7 0 0 0 18 15.5',
};

const DIRECTIONAL = new Set(['chevron-right', 'chevron-left', 'arrow-right', 'arrow-left', 'send']);

const css = `:host{display:inline-flex;flex:none;width:1.25em;height:1.25em;vertical-align:-.2em;color:inherit}
svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
:host([name="more"]) svg{stroke-width:2.6}
:host([data-flip]) svg{transform:scaleX(-1)}`;

export class AidIcon extends HTMLElement {
  static get observedAttributes(): string[] { return ['name', 'label', 'size']; }
  private path: SVGPathElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const s = document.createElement('style');
    s.textContent = css;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.append(this.path);
    root.append(s, svg);
  }

  connectedCallback(): void { this.sync(); }
  attributeChangedCallback(): void { this.sync(); }

  private sync(): void {
    const name = this.getAttribute('name') || '';
    this.path.setAttribute('d', ICONS[name] || '');
    const size = this.getAttribute('size');
    if (size) { this.style.width = this.style.height = /^\d+$/.test(size) ? size + 'px' : size; }
    const label = this.getAttribute('label');
    if (label) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', label); this.removeAttribute('aria-hidden'); }
    else { this.removeAttribute('role'); this.setAttribute('aria-hidden', 'true'); }
    const rtl = this.isConnected && getComputedStyle(this).direction === 'rtl';
    this.toggleAttribute('data-flip', rtl && DIRECTIONAL.has(name) && !this.hasAttribute('fixed'));
  }

  /** re-check the text direction (call after changing `dir` on an ancestor) */
  refresh(): void { this.sync(); }
}

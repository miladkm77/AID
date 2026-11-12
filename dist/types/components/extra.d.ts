import { AidGas } from './gas';
type Kind = 'info' | 'success' | 'warning' | 'danger';
/**
 * <aid-alert kind="info | success | warning | danger"> — an inline message. The gas is excited in the colour of its kind;
 * put an icon and text inside so the kind never depends on colour alone.
 */
export declare class AidAlert extends AidGas {
    static get observedAttributes(): string[];
    protected extraCss(): string;
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private sync;
}
/**
 * <aid-toast kind> — a short message that leaves by itself. Use the toast() helper rather than creating it by hand.
 * It stays while the pointer or the focus is on it. Fires 'close'.
 */
export declare class AidToast extends AidGas {
    private timer;
    /** milliseconds before it closes; 0 keeps it until closed */
    duration: number;
    protected extraCss(): string;
    protected interactive(): boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private hold;
    private arm;
    close(): void;
}
export interface ToastOptions {
    kind?: Kind;
    duration?: number;
    scene?: Element | null;
}
/**
 * Show a toast in a scene (the first one on the page by default). Toasts stack at the bottom, newest last.
 * Warnings and errors stay 8 s, others 5 s, unless `duration` says otherwise. Returns the element.
 */
export declare function toast(message: string | Node, opts?: ToastOptions): AidToast | null;
/** <aid-menu-item value="…" danger disabled> — a row in a menu. Not a gas container: the menu is. */
export declare class AidMenuItem extends HTMLElement {
    constructor();
    connectedCallback(): void;
}
/**
 * <aid-menu for="buttonId"> — a popover list of actions. The element named by `for` toggles it; or call show(anchor).
 * Arrow keys, Home and End move; Enter or Space choose; Escape, Tab and a click outside close it and focus returns to
 * the anchor. Fires 'select' with detail.value (the item's `value` attribute, or its text) and detail.item.
 */
export declare class AidMenu extends AidGas {
    static get observedAttributes(): string[];
    private anchor;
    private trigger;
    protected extraCss(): string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name?: string): void;
    get open(): boolean;
    get items(): AidMenuItem[];
    show(anchor?: HTMLElement | null): void;
    close(refocus?: boolean): void;
    private unlisten;
    /** below the anchor, aligned to its inline start; flipped above or shifted when there is no room */
    private place;
    private onTrigger;
    private onResize;
    private onOutside;
    private onClick;
    private onKey;
}
/**
 * <aid-slider min="0" max="100" step="1" value="40"> — a tube with a filled part and a thumb.
 * Drag, click, arrow keys (right-to-left aware), Page Up / Down (ten steps), Home and End. Fires 'input' while moving and
 * 'change' when a move ends. Give it an aria-label or wrap it in a <label>.
 */
export declare class AidSlider extends HTMLElement {
    static get observedAttributes(): string[];
    private parts;
    private dragging;
    private last;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private num;
    get min(): number;
    get max(): number;
    get step(): number;
    get disabled(): boolean;
    get value(): number;
    set value(v: number);
    private snap;
    private sync;
    private set;
    private at;
    private onDown;
    private onMove;
    private onUp;
    private onKey;
}
export {};

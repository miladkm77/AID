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
export declare class AidButton extends AidGas {
    static get observedAttributes(): string[];
    protected extraCss(): string;
    busy(): boolean;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    private syncDisabled;
    protected interactive(): boolean;
    private onKey;
    click(): void;
}
/**
 * <aid-tabs> holds the bar's gas; each <aid-tab> is an inner chamber that is filled only while selected.
 * Changing the tab drains the old chamber and fills the new one. Fires 'change' with detail.index.
 */
export declare class AidTabs extends AidGas {
    protected extraCss(): string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    get tabs(): AidTab[];
    select(i: number): void;
    private onClick;
}
export declare class AidTab extends AidGas {
    static get observedAttributes(): string[];
    protected extraCss(): string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get selected(): boolean;
    set selected(v: boolean);
    private sync;
    protected interactive(): boolean;
    private onKey;
    /** an unselected chamber is empty; it shows no wall */
    stateFactor(): number;
}

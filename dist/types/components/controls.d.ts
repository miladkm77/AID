import { AidGas } from './gas';
/**
 * <aid-button> — a gas container that behaves as a button.
 * Activates on click, Enter and Space; fires a regular 'click'. Disabled = evacuated container, dashed wall.
 */
export declare class AidButton extends AidGas {
    protected extraCss(): string;
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

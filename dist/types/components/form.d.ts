import { AidGas } from './gas';
/**
 * Shared behaviour of <aid-checkbox>, <aid-radio> and <aid-switch>: a `checked` attribute, Space to toggle,
 * a 'change' event, and a wall that stays visible while the chamber is empty.
 */
declare abstract class AidToggle extends AidGas {
    static get observedAttributes(): string[];
    protected abstract kind: string;
    private unbind;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get checked(): boolean;
    set checked(v: boolean);
    protected sync(): void;
    protected interactive(): boolean;
    shell(): boolean;
    /** user-initiated change */
    toggle(): void;
    private onClick;
    protected onKey: (e: KeyboardEvent) => void;
    /** an unchecked chamber is empty; hovering lets a little gas in; checked is a full, dense chamber */
    stateFactor(): number;
}
/** <aid-checkbox checked | indeterminate | disabled> */
export declare class AidCheckbox extends AidToggle {
    protected kind: string;
    protected extraCss(): string;
    constructor();
}
/** <aid-radio name="group" checked>. Radios that share a name within the same root form a group; arrow keys move the choice. */
export declare class AidRadio extends AidToggle {
    protected kind: string;
    protected extraCss(): string;
    constructor();
    private group;
    protected sync(): void;
    toggle(): void;
    protected onKey: (e: KeyboardEvent) => void;
}
/** <aid-switch checked>. The thumb is its own chamber: sparse when off, dense when on, and it carries its gas as it moves. */
export declare class AidSwitch extends AidToggle {
    protected kind: string;
    protected extraCss(): string;
    private thumb;
    constructor();
    protected sync(): void;
    stateFactor(): number;
}
/**
 * <aid-chip selected> — a small toggle for filters and tags. Unselected it is an almost empty shell; selected it fills.
 * Add `static` for a chip that does not toggle.
 */
export declare class AidChip extends AidGas {
    static get observedAttributes(): string[];
    protected extraCss(): string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get selected(): boolean;
    set selected(v: boolean);
    private sync;
    protected interactive(): boolean;
    shell(): boolean;
    private onClick;
    private onKey;
    stateFactor(): number;
}
/**
 * <aid-field><input></aid-field> — the gas chamber around a native input, textarea or select.
 * The native control keeps its own semantics, validation and autofill. The field mirrors its `disabled` state and
 * `aria-invalid`; set `invalid` on the field to force the error state.
 *
 * States: rest · hover · focus (excited, slightly compressed) · invalid (excited in the danger colour) · disabled.
 */
export declare class AidField extends AidGas {
    static get observedAttributes(): string[];
    private mo;
    protected extraCss(): string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    get control(): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    private mirror;
    private onClick;
    protected interactive(): boolean;
    stateFactor(): number;
}
/** <aid-card> — a quiet container for grouped content. Low pressure, so its gas lies as a thin layer on the floor. `interactive` adds hover and press. */
export declare class AidCard extends AidGas {
    protected extraCss(): string;
    protected interactive(): boolean;
}
/**
 * <aid-progress value="40"> — a tube; the filled part is a dense, excited chamber. Without `value` it is indeterminate.
 */
export declare class AidProgress extends AidGas {
    static get observedAttributes(): string[];
    protected extraCss(): string;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    shell(): boolean;
    private sync;
}
/**
 * <aid-dialog open> — a modal. Elevation is fog: everything below the dialog is veiled and blurred, and its panel is a
 * dense chamber of gas on top. Escape and a click on the fog close it (unless `persistent`);
 * focus moves into the panel and returns to where it was. Fires 'close'.
 */
export declare class AidDialog extends AidGas {
    static get observedAttributes(): string[];
    private back;
    private ro;
    protected extraCss(): string;
    constructor();
    connectedCallback(): void;
    /** cut the panel's rounded shape out of the fog layer */
    private hole;
    disconnectedCallback(): void;
    attributeChangedCallback(name?: string): void;
    get open(): boolean;
    set open(v: boolean);
    show(): void;
    close(): void;
    veilAll(): boolean;
    private focusables;
    private enter;
    private leave;
    private onClick;
    private onKey;
    stateFactor(): number;
}
export {};

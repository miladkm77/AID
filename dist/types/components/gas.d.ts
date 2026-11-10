import type { GasContainer } from '../engine/engine';
import type { AidScene } from './scene';
/**
 * <aid-gas> — a sealed container of gas. Its shape is the element's box and border-radius.
 * Density comes from --aid-pressure; interaction state scales it:
 *   disabled → evacuated (0), pressed → compressed (×1.25), otherwise ×1.
 * --aid-excitation makes the gas emit the discharge colour of its species.
 */
export declare class AidGas extends HTMLElement implements GasContainer {
    protected scene: AidScene | null;
    protected pressed: boolean;
    static get observedAttributes(): string[];
    constructor();
    protected extraCss(): string;
    get el(): HTMLElement;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get disabled(): boolean;
    set disabled(v: boolean);
    protected interactive(): boolean;
    private onFocus;
    private onDown;
    private onUp;
    /** briefly compress, for keyboard activation */
    protected pulse(): void;
    stateFactor(): number;
    dashed(): boolean;
}

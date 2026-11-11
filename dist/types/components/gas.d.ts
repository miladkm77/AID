import type { GasContainer } from '../engine/engine';
import type { AidScene } from './scene';
/**
 * <aid-gas> — a sealed container of gas. Its shape is the element's box and border-radius.
 * Density comes from --aid-pressure; interaction state scales it:
 *   disabled → evacuated (0), pressed → compressed (×1.25), otherwise ×1.
 * --aid-excitation makes the gas emit the discharge colour of its species.
 */
/** the scene an element belongs to, looking through shadow trees */
export declare function findScene(el: Element): AidScene | null;
export declare class AidGas extends HTMLElement implements GasContainer {
    protected scene: AidScene | null;
    protected pressed: boolean;
    protected hovered: boolean;
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
    private onEnter;
    private onLeave;
    /** documentation aid: force="hover" | "pressed" | "focus" shows that state without interaction */
    protected forced(s: string): boolean;
    private onDown;
    private onUp;
    /** briefly compress, for keyboard activation */
    protected pulse(): void;
    /** rest 1, hover 1.1 (the gas gathers), pressed 1.25 (compressed), disabled 0 (evacuated) */
    stateFactor(): number;
    dashed(): boolean;
    shell(): boolean;
    busy(): boolean;
    veilAll(): boolean;
}

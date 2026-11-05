import { GasEngine, EngineStats } from '../engine/engine';
/**
 * <aid-scene> owns one gas field and one GPU canvas. Every <aid-gas> inside it is a container in that field.
 *
 * backdrop="dom" (default): the page content behind is regular HTML. WebGL cannot read it, so the scene draws
 *   only the gas over it; the containers use a CSS backdrop blur as an approximation of scattering.
 * backdrop="canvas": the content behind is a canvas or image you hand over with setBackdrop(). Full model:
 *   refraction, scattering of the content's own light, absorption.
 */
export declare class AidScene extends HTMLElement {
    engine: GasEngine | null;
    private canvas;
    private ro;
    private pending;
    error: string;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    get backdrop(): 'dom' | 'canvas';
    /** Run when the engine exists (children may connect before their scene). */
    whenReady(f: () => void): void;
    /** Hand over the content that sits behind the gas (backdrop="canvas"). Sizes are in CSS pixels. */
    setBackdrop(src: HTMLCanvasElement | HTMLImageElement | null, cssWidth?: number, cssHeight?: number): void;
    /** Vertical scroll offset of the backdrop content, in CSS pixels. */
    set backdropScroll(y: number);
    get backdropScroll(): number;
    get maxTextureSize(): number;
    get stats(): EngineStats | null;
    /** Re-read the --aid-* tokens now (they are also polled every 250 ms). */
    refresh(): void;
    purge(): void;
    wake(): void;
}

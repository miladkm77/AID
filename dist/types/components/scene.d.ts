import { GasEngine, EngineStats } from '../engine/engine';
/**
 * <aid-scene> owns one gas field and one GPU canvas. Every <aid-gas> inside it is a container in that field.
 *
 * backdrop="dom" (default): the page content behind is regular HTML. WebGL cannot read it, so the scene draws
 *   only the gas over it; the containers use a CSS backdrop blur as an approximation of scattering.
 * backdrop="canvas": the content behind is a canvas or image you hand over with setBackdrop(). Full model:
 *   refraction, scattering of the content's own light, absorption.
 *
 * fixed: for a whole app or page. The canvas covers the viewport instead of the scene's box, so one scene (one GPU
 *   context) serves every container on a scrolling page. Only containers in view are simulated.
 *
 * tilt="device": gravity follows the device, so a heavy gas slides to the low side when the phone is tilted.
 *   Browsers that ask for permission (iOS) need enableDeviceTilt() to be called from a tap.
 */
export declare class AidScene extends HTMLElement {
    engine: GasEngine | null;
    private canvas;
    private ro;
    private pending;
    private tiltOn;
    error: string;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    private onWin;
    private onTilt;
    private listenTilt;
    /** Ask for motion access where the browser requires it (call from a tap), then follow the device. Resolves to whether it is on. */
    enableDeviceTilt(): Promise<boolean>;
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

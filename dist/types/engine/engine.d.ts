import { SceneParams } from '../core/params';
import { Tier } from '../core/tiers';
/** Anything that holds gas: <aid-gas>, <aid-button>, a tab. */
export interface GasContainer {
    readonly el: HTMLElement;
    /** density multiplier from interaction state: 0 = evacuated, 1 = rest, >1 = compressed */
    stateFactor(): number;
    /** an evacuated (disabled) container shows a dashed wall */
    dashed(): boolean;
    /** the wall stays visible while the chamber is empty (an unchecked box, a switch track) */
    shell?(): boolean;
    /** working: the excitation pulses until it returns false */
    busy?(): boolean;
    /** fog everything below, not only the container it covers most (a dialog scrim) */
    veilAll?(): boolean;
}
export type View = 'final' | 'density' | 'light' | 'off';
export interface EngineStats {
    tier: Tier;
    grid: string;
    simHz: number;
    fps: number;
    frameMs: number;
    passes: number;
    state: 'simulating' | 'render-only' | 'asleep';
    error: string;
}
export declare class GasEngine {
    private host;
    private canvas;
    private fixed;
    private g;
    private gl;
    private P;
    private noise;
    private feedTex;
    private st;
    private geo;
    private slots;
    private order;
    private uR;
    private uI;
    private uM;
    private uE;
    private uK;
    private uC;
    private warned;
    /** all container data, one row of six texels per container (see CONTAINERS in shaders.ts) */
    private cdata;
    private ctex;
    private grav;
    private cssAngle;
    private cssFade;
    /** tilt reported by the device, in degrees; added to --aid-tilt */
    deviceTilt: number;
    private n;
    private W;
    private H;
    private SW;
    private SH;
    private feedDpr;
    private feedW;
    private feedH;
    private hasFeed;
    scene: SceneParams;
    tier: Tier;
    view: View;
    backdropScroll: number;
    private ptr;
    private raf;
    private last;
    private acc;
    private time;
    private flowT;
    private lastActive;
    private lastParams;
    private frames;
    private visible;
    private onscreen;
    private stats;
    private disposers;
    onStats: ((s: EngineStats) => void) | null;
    constructor(host: HTMLElement, canvas: HTMLCanvasElement, transparent: boolean, fixed?: boolean);
    add(c: GasContainer): void;
    remove(c: GasContainer): void;
    /** Use a canvas or image as the content behind the gas. Pass null for a DOM backdrop. */
    setBackdrop(src: HTMLCanvasElement | HTMLImageElement | null, cssWidth?: number, cssHeight?: number): void;
    get maxTextureSize(): number;
    /** the box the canvas covers: the scene element, or the viewport for a fixed scene */
    private frame;
    resize(): void;
    private alloc;
    private refreshParams;
    private collect;
    /**
     * Depth between containers. The gas of all containers is drawn in one layer under the labels, so on its own a
     * container floating above another would not hide it. Each container that sits above a lower one gets a veil
     * (a CSS layer inside it, clipped to the overlap) that fogs the lower container's wall, gas and label.
     */
    private depth;
    private setContainers;
    private use;
    private speed;
    private step;
    render(): void;
    wake(): void;
    private tick;
    private lastReport;
    private report;
    get currentStats(): EngineStats;
    /** Evacuate every container; the regulators refill them. */
    purge(): void;
    private overGas;
    private bindEvents;
    dispose(): void;
}

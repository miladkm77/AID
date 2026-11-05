import { SceneParams } from '../core/params';
import { Tier } from '../core/tiers';
/** Anything that holds gas: <aid-gas>, <aid-button>, a tab. */
export interface GasContainer {
    readonly el: HTMLElement;
    /** density multiplier from interaction state: 0 = evacuated, 1 = rest, >1 = compressed */
    stateFactor(): number;
    /** an evacuated (disabled) container shows a dashed wall */
    dashed(): boolean;
}
export type View = 'final' | 'density' | 'light';
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
    constructor(host: HTMLElement, canvas: HTMLCanvasElement, transparent: boolean);
    add(c: GasContainer): void;
    remove(c: GasContainer): void;
    /** Use a canvas or image as the content behind the gas. Pass null for a DOM backdrop. */
    setBackdrop(src: HTMLCanvasElement | HTMLImageElement | null, cssWidth?: number, cssHeight?: number): void;
    get maxTextureSize(): number;
    resize(): void;
    private alloc;
    private refreshParams;
    private collect;
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

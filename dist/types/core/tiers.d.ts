import type { Quality } from './params';
export type Tier = 'static' | 'efficient' | 'high';
export interface TierConfig {
    /** simulation grid cells along the short side; 0 = no simulation */
    grid: number;
    /** cap on device pixel ratio for the output canvas */
    dprCap: number;
    /** simulation rate in Hz; 0 = no simulation */
    simHz: number;
    /** samples used to gather content light */
    lightTaps: number;
    /** keep stirring while idle (costs GPU time continuously) */
    ambient: boolean;
}
export declare const TIERS: Record<Tier, TierConfig>;
/** Conservative tier choice from the signals browsers actually expose. */
export declare function chooseTier(q: Quality): Tier;

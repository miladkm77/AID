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

export const TIERS: Record<Tier, TierConfig> = {
  static:    { grid: 0,   dprCap: 1.25, simHz: 0,  lightTaps: 5,  ambient: false },
  efficient: { grid: 80,  dprCap: 1.5,  simHz: 30, lightTaps: 8,  ambient: false },
  high:      { grid: 128, dprCap: 2,    simHz: 60, lightTaps: 13, ambient: true },
};

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
}

/** Conservative tier choice from the signals browsers actually expose. */
export function chooseTier(q: Quality): Tier {
  if (q === 'static' || q === 'efficient' || q === 'high') return q;
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  const nav = navigator as NavigatorHints;
  const mem = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  if (mem <= 2 || cores <= 2) return 'static';
  if (mem >= 8 && cores >= 8 && (window.devicePixelRatio || 1) >= 2) return 'high';
  return 'efficient';
}

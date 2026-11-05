/**
 * AID — Atmospheric Interface Design.
 * A gas material for user interfaces: sealed containers of noble gas that refract and scatter the light of the
 * content behind them, give way under a finger, and settle without oscillating.
 */
import { AidScene } from './components/scene';
import { AidGas } from './components/gas';
import { AidButton, AidTabs, AidTab } from './components/controls';
export { AidScene, AidGas, AidButton, AidTabs, AidTab };
export { GasEngine } from './engine/engine';
export type { GasContainer, EngineStats, View } from './engine/engine';
export { GASES, AIR_REFRACTIVITY, deltaN, scatterRelative, thermalSpeed } from './core/gases';
export type { GasId, GasSpecies } from './core/gases';
export { SCENE_DEFAULTS, CONTAINER_DEFAULTS, readSceneParams, readContainerParams, densityFactor, kelvin, albedo } from './core/params';
export type { SceneParams, ContainerParams, Quality } from './core/params';
export { TIERS, chooseTier } from './core/tiers';
export type { Tier, TierConfig } from './core/tiers';
export declare function define(): void;

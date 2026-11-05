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

/* DOM backdrop: WebGL cannot read the page, so scattering of the content behind is approximated with a CSS
   backdrop blur scaled by the container's pressure. Marked as an approximation in SPEC.md. */
const GLOBAL_CSS = `
aid-scene:not([backdrop="canvas"]) :is(aid-gas,aid-button,aid-tabs){
  -webkit-backdrop-filter:blur(calc(var(--aid-pressure,1) * 7px)) saturate(.92);
  backdrop-filter:blur(calc(var(--aid-pressure,1) * 7px)) saturate(.92);
}
aid-scene:not([backdrop="canvas"]) aid-tab{-webkit-backdrop-filter:none;backdrop-filter:none}
`;

export function define(): void {
  if (typeof window === 'undefined' || !window.customElements) return;
  if (!document.getElementById('aid-global-css')) {
    const s = document.createElement('style');
    s.id = 'aid-global-css';
    s.textContent = GLOBAL_CSS;
    document.head.append(s);
  }
  const reg: Array<[string, CustomElementConstructor]> = [
    ['aid-scene', AidScene], ['aid-gas', AidGas], ['aid-button', AidButton], ['aid-tabs', AidTabs], ['aid-tab', AidTab],
  ];
  for (const [name, ctor] of reg) if (!customElements.get(name)) customElements.define(name, ctor);
}

define();

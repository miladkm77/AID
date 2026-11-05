import { GasId, parseGas, DEFAULT_GAS } from './gases';

/**
 * AID material parameters. These are AID's own primitives, exposed as CSS custom properties
 * so they can be set in stylesheets like any other design token.
 *
 * Scene level (one gas field per <aid-scene>):
 *   --aid-gas            helium | neon | argon | krypton | xenon
 *   --aid-temperature    0..1   thermal agitation; motion speed ∝ √(T/M)
 *   --aid-refraction     0..400 refraction gain (artistic amplification, same for all gases)
 *   --aid-light-reach    px     how far content light travels into the gas
 *   --aid-smoke          0..1   suspended-particle texture and absorption
 *   --aid-spectral       0..1   wavelength dependence of scattering (0 = neutral grey, 1 = full λ⁻⁴)
 *   --aid-quality        auto | static | efficient | high
 *
 * Container level (each <aid-gas>):
 *   --aid-pressure       0..2   gas density held by this container
 *   --aid-membrane       0..1   visibility of the container wall
 *   --aid-profile        0..1   how far in from the wall the gas reaches full depth
 */
export type Quality = 'auto' | 'static' | 'efficient' | 'high';

export interface SceneParams {
  gas: GasId;
  temperature: number;
  refraction: number;
  lightReach: number;
  smoke: number;
  spectral: number;
  quality: Quality;
}

export interface ContainerParams {
  pressure: number;
  membrane: number;
  profile: number;
}

export const SCENE_DEFAULTS: SceneParams = {
  gas: DEFAULT_GAS,
  temperature: 0.45,
  refraction: 140,
  lightReach: 96,
  smoke: 0.5,
  spectral: 0.1,
  quality: 'auto',
};

export const CONTAINER_DEFAULTS: ContainerParams = { pressure: 1, membrane: 1, profile: 0.8 };

function num(cs: CSSStyleDeclaration, name: string, fallback: number, lo: number, hi: number): number {
  const raw = cs.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const v = parseFloat(raw);
  if (!isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

export function readSceneParams(el: Element): SceneParams {
  const cs = getComputedStyle(el);
  const q = cs.getPropertyValue('--aid-quality').trim() as Quality;
  return {
    gas: parseGas(cs.getPropertyValue('--aid-gas') || SCENE_DEFAULTS.gas),
    temperature: num(cs, '--aid-temperature', SCENE_DEFAULTS.temperature, 0, 1),
    refraction: num(cs, '--aid-refraction', SCENE_DEFAULTS.refraction, 0, 400),
    lightReach: num(cs, '--aid-light-reach', SCENE_DEFAULTS.lightReach, 0, 400),
    smoke: num(cs, '--aid-smoke', SCENE_DEFAULTS.smoke, 0, 1),
    spectral: num(cs, '--aid-spectral', SCENE_DEFAULTS.spectral, 0, 1),
    quality: (['auto', 'static', 'efficient', 'high'] as Quality[]).includes(q) ? q : SCENE_DEFAULTS.quality,
  };
}

export function readContainerParams(el: Element): ContainerParams {
  const cs = getComputedStyle(el);
  return {
    pressure: num(cs, '--aid-pressure', CONTAINER_DEFAULTS.pressure, 0, 2),
    membrane: num(cs, '--aid-membrane', CONTAINER_DEFAULTS.membrane, 0, 1),
    profile: num(cs, '--aid-profile', CONTAINER_DEFAULTS.profile, 0.05, 1),
  };
}

/** Ideal gas at a fixed amount: ρ ∝ p / T. Temperature 0..1 maps to 250..400 K. */
export function densityFactor(temperature01: number): number {
  return 300 / (250 + 150 * temperature01);
}

export function kelvin(temperature01: number): number {
  return Math.round(250 + 150 * temperature01);
}

/** Single-scattering albedo: smoke absorbs part of what it scatters. */
export function albedo(smoke: number): number {
  return 1 - 0.42 * smoke;
}

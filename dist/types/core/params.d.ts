import { GasId } from './gases';
/**
 * AID material parameters. These are AID's own primitives, exposed as CSS custom properties
 * so they can be set in stylesheets like any other design token.
 *
 * Scene level (one gas field per <aid-scene>):
 *   --aid-gas            helium | neon | argon | krypton | xenon
 *   --aid-agitation      0..1   thermal agitation; motion speed ∝ √(T/M). --aid-temperature is accepted as an alias
 *   --aid-refraction     0..400 refraction gain (artistic amplification, same for all gases)
 *   --aid-weight         0..1   how strongly the gas settles: heavy gases pool along gravity, light gases rise.
 *                               Inherited, so it can also be set per container (a bar over text wants less than a button)
 *   --aid-tilt           deg    direction of gravity; 0 = down the screen (a device can drive it, see <aid-scene tilt>)
 *   --aid-light-reach    px     how far content light travels into the gas
 *   --aid-glow           0..2   how strongly the gas takes on the colour of the light it gathers
 *   --aid-smoke          0..1   suspended-particle texture and absorption
 *   --aid-spectral       0..1   wavelength dependence of scattering (0 = neutral grey, 1 = full λ⁻⁴)
 *   --aid-quality        auto | static | efficient | high
 *
 * Container level (each <aid-gas>):
 *   --aid-pressure       0..2   gas density held by this container
 *   --aid-membrane       0..1   visibility of the container wall
 *   --aid-profile        0..1   softness of the gas at the wall (0 = filled to the wall)
 *   --aid-excitation     0..1   glow discharge: the gas emits the colour of its species
 */
export type Quality = 'auto' | 'static' | 'efficient' | 'high';
export interface SceneParams {
    gas: GasId;
    temperature: number;
    refraction: number;
    weight: number;
    tilt: number;
    lightReach: number;
    glow: number;
    smoke: number;
    spectral: number;
    quality: Quality;
}
export interface ContainerParams {
    pressure: number;
    membrane: number;
    profile: number;
    excitation: number;
    weight: number;
}
export declare const SCENE_DEFAULTS: SceneParams;
export declare const CONTAINER_DEFAULTS: ContainerParams;
export declare function readSceneParams(el: Element): SceneParams;
export declare function readContainerParams(el: Element): ContainerParams;
/** Ideal gas at a fixed amount: ρ ∝ p / T. Temperature 0..1 maps to 250..400 K. */
export declare function densityFactor(temperature01: number): number;
export declare function kelvin(temperature01: number): number;
/** Single-scattering albedo: smoke absorbs part of what it scatters. */
export declare function albedo(smoke: number): number;

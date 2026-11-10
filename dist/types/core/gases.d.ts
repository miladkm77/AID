/**
 * Noble-gas species data used by the AID gas material.
 *
 * refractivity: (n − 1) × 10⁶ at 589 nm, 0 °C, 1 atm.
 *   He and air are taken from published tables; Ne, Ar, Kr, Xe are commonly quoted
 *   approximate values and must be checked against a dispersion table before publication.
 * molarMass: g/mol.
 */
export type GasId = 'helium' | 'neon' | 'argon' | 'krypton' | 'xenon';
export interface GasSpecies {
    id: GasId;
    symbol: string;
    refractivity: number;
    molarMass: number;
    /** true when the refractivity value was checked against an opened source */
    refractivitySourced: boolean;
    /** colour of the glow discharge, sRGB 0..255. The colour names are published; the RGB values are approximations. */
    emission: [number, number, number];
}
export declare const AIR_REFRACTIVITY = 293;
/** mean molar mass of dry air, g/mol */
export declare const AIR_MOLAR_MASS = 28.96;
export declare const GASES: Record<GasId, GasSpecies>;
export declare const DEFAULT_GAS: GasId;
export declare function parseGas(v: string | null | undefined): GasId;
/** Refraction contrast against air, ×10⁶. Negative for gases lighter in refractivity than air. */
export declare function deltaN(g: GasSpecies): number;
/** Rayleigh scattering scales with (n − 1)²; xenon is the reference (= 1). */
export declare function scatterRelative(g: GasSpecies): number;
/** Mean molecular speed ∝ √(T/M); xenon at the highest temperature setting = 1. */
export declare function thermalSpeed(g: GasSpecies, temperature01: number): number;
/**
 * Buoyancy in air, relative to xenon (= 1). The force on a parcel of gas is ∝ (ρ_gas − ρ_air) ∝ (M − M_air):
 * positive gases sink and pool, negative gases rise. He −0.24, Ne −0.09, Ar +0.11, Kr +0.54, Xe +1.
 */
export declare function buoyancy(g: GasSpecies): number;
/**
 * How fast pressure differences even out. The speed of sound is ∝ 1/√M (helium ≈ 5.7× xenon); the explicit
 * solver is only stable over a narrower range, so the ratio is compressed to about 2.2×. Xenon = 1.
 */
export declare function responseSpeed(g: GasSpecies): number;

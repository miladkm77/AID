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
}
export declare const AIR_REFRACTIVITY = 293;
export declare const GASES: Record<GasId, GasSpecies>;
export declare const DEFAULT_GAS: GasId;
export declare function parseGas(v: string | null | undefined): GasId;
/** Refraction contrast against air, ×10⁶. Negative for gases lighter in refractivity than air. */
export declare function deltaN(g: GasSpecies): number;
/** Rayleigh scattering scales with (n − 1)²; xenon is the reference (= 1). */
export declare function scatterRelative(g: GasSpecies): number;
/** Mean molecular speed ∝ √(T/M); xenon at the highest temperature setting = 1. */
export declare function thermalSpeed(g: GasSpecies, temperature01: number): number;

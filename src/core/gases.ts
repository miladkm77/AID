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

export const AIR_REFRACTIVITY = 293;
/** mean molar mass of dry air, g/mol */
export const AIR_MOLAR_MASS = 28.96;

export const GASES: Record<GasId, GasSpecies> = {
  helium:  { id: 'helium',  symbol: 'He', refractivity: 36,  molarMass: 4.003,  refractivitySourced: true,  emission: [255, 176, 138] },
  neon:    { id: 'neon',    symbol: 'Ne', refractivity: 67,  molarMass: 20.18,  refractivitySourced: false, emission: [255, 74, 40] },
  argon:   { id: 'argon',   symbol: 'Ar', refractivity: 281, molarMass: 39.95,  refractivitySourced: false, emission: [172, 118, 255] },
  krypton: { id: 'krypton', symbol: 'Kr', refractivity: 427, molarMass: 83.80,  refractivitySourced: false, emission: [212, 194, 255] },
  xenon:   { id: 'xenon',   symbol: 'Xe', refractivity: 702, molarMass: 131.29, refractivitySourced: false, emission: [118, 168, 255] },
};

export const DEFAULT_GAS: GasId = 'xenon';

export function parseGas(v: string | null | undefined): GasId {
  const k = (v || '').trim().toLowerCase();
  const bySymbol = Object.values(GASES).find((g) => g.symbol.toLowerCase() === k);
  if (bySymbol) return bySymbol.id;
  return (k in GASES ? k : DEFAULT_GAS) as GasId;
}

/** Refraction contrast against air, ×10⁶. Negative for gases lighter in refractivity than air. */
export function deltaN(g: GasSpecies): number {
  return g.refractivity - AIR_REFRACTIVITY;
}

/** Rayleigh scattering scales with (n − 1)²; xenon is the reference (= 1). */
export function scatterRelative(g: GasSpecies): number {
  return Math.pow(g.refractivity / GASES.xenon.refractivity, 2);
}

/** Mean molecular speed ∝ √(T/M); xenon at the highest temperature setting = 1. */
export function thermalSpeed(g: GasSpecies, temperature01: number): number {
  return Math.sqrt((temperature01 + 0.05) / 1.05) * Math.sqrt(GASES.xenon.molarMass / g.molarMass);
}

/**
 * Buoyancy in air, relative to xenon (= 1). The force on a parcel of gas is ∝ (ρ_gas − ρ_air) ∝ (M − M_air):
 * positive gases sink and pool, negative gases rise. He −0.24, Ne −0.09, Ar +0.11, Kr +0.54, Xe +1.
 */
export function buoyancy(g: GasSpecies): number {
  return (g.molarMass - AIR_MOLAR_MASS) / (GASES.xenon.molarMass - AIR_MOLAR_MASS);
}

/**
 * How fast pressure differences even out. The speed of sound is ∝ 1/√M (helium ≈ 5.7× xenon); the explicit
 * solver is only stable over a narrower range, so the ratio is compressed to about 2.2×. Xenon = 1.
 */
export function responseSpeed(g: GasSpecies): number {
  return Math.pow(GASES.xenon.molarMass / g.molarMass, 0.22);
}

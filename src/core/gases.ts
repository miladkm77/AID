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

export const AIR_REFRACTIVITY = 293;

export const GASES: Record<GasId, GasSpecies> = {
  helium:  { id: 'helium',  symbol: 'He', refractivity: 36,  molarMass: 4.003,  refractivitySourced: true },
  neon:    { id: 'neon',    symbol: 'Ne', refractivity: 67,  molarMass: 20.18,  refractivitySourced: false },
  argon:   { id: 'argon',   symbol: 'Ar', refractivity: 281, molarMass: 39.95,  refractivitySourced: false },
  krypton: { id: 'krypton', symbol: 'Kr', refractivity: 427, molarMass: 83.80,  refractivitySourced: false },
  xenon:   { id: 'xenon',   symbol: 'Xe', refractivity: 702, molarMass: 131.29, refractivitySourced: false },
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

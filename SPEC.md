# AID Gas Material — Specification v0.1

> **Summary.** AID is a user-interface material, not an effect. Every component (button, bar, tab) is a sealed container of noble gas. The look comes from a physical model: a compressible gas that gives way under a finger and settles without waves, refraction from density gradients, and scattering of the light of the content behind. Every behaviour is labelled *physical*, *approximation* or *artistic*. The material's parameters belong to AID and are set like any other CSS token.

Status: draft · Reference implementation: `aid-gas` 0.1.0 (WebGL2, Web Components) · License: MIT

## 1. Principle

The appearance is derived from a physical state, not drawn. Every behaviour is labelled:

- **Physical** — follows from established physics with real constants.
- **Approximation** — physically motivated, simplified for real time; the simplification is stated.
- **Artistic** — a design decision with no physical claim.

## 2. Material model

### 2.1 Containers

Every component is a sealed container. The gas never leaves it, so reading areas outside containers are never distorted *(Artistic: real gas is unbounded)*. A thin membrane draws the container wall. An evacuated container (disabled) shows a dashed wall.

### 2.2 Gas state

The gas inside all containers of one scene is one 2D field of density ρ and velocity **v**, solved on the GPU at low resolution.

| Equation | Meaning | Label |
|---|---|---|
| ∂ρ/∂t + ∇·(ρ**v**) = 0 | continuity: gas is moved, not created | Physical (semi-Lagrangian, not exactly conservative) |
| ∂**v**/∂t = −c²∇ρ/ρ − γ**v** + **F** | isothermal pressure p = c²ρ, damping γ, forces | Approximation |
| γ ≫ c/L | over-damped: the gas settles without waves or ringing | Artistic (waves read as liquid or jelly) |
| ρ → ρ₀ at rate k | a regulator holds each container at its set pressure | Artistic |
| ρ ∝ p / T | ideal gas at a fixed amount | Physical |

Forces **F**:

- **Finger** — a radial push around the contact point plus a drag along the pointer's motion. Under the finger the gas thins and clears; around it the gas compresses. *(Approximation)*
- **Thermal agitation** — a divergence-free stirring field drawn from moving noise. Its speed scales with mean molecular speed ∝ √(T/M): helium moves about 5.7× faster than xenon at the same temperature. *(Speed ratio: Physical. Field shape: Approximation.)*

Interaction states change density only; size and position never change:

| State | Density factor | Transition |
|---|---|---|
| rest | 1 | — |
| pressed | 1.25 | compress fast (k = 14 s⁻¹) |
| release | back to 1 | relax slowly (k = 2.5 s⁻¹) |
| disabled | 0 (evacuated) | dashed wall |
| tab not selected | 0 | chamber drains |

### 2.3 Optics

Three channels, never merged:

| Channel | Model | Label |
|---|---|---|
| Refraction | Background displaced ∝ ∇(n), with n − 1 = c·(n_gas − n_air) (Gladstone–Dale, dilute mixture). A synthetic background-oriented schlieren. | Physical relation; amplitude **Artistic** (real displacement is sub-pixel) |
| Scattering | Beer–Lambert extinction T = exp(−σρ·w_λ). The same energy is returned as in-scattered light gathered from the surrounding content. σ ∝ (n − 1)²: helium scatters ~1/380 of xenon. | Approximation (single scattering, isotropic gather) |
| Absorption | Single-scattering albedo a = 1 − 0.42·smoke. Pure noble gases do not absorb visible light; absorption stands for suspended particles. | Artistic |
| Emission | None. Noble-gas colours (neon pink, xenon blue-violet) need electrical discharge. | Physical |
| Reflection | None. A gas has no surface; Fresnel reflectance at n ≈ 1.0004 is ~4×10⁻⁸. | Physical |

**Content as light.** Each point of the content behind is a light source. The gas gathers light from a disc of radius `--aid-light-reach`, weighted toward bright, saturated colours (`(0.15 + luma)·(0.35 + 2.6·saturation)`), falling off with distance. Black text emits almost nothing. An image near a container tints the gas before it passes underneath. *(Approximation; the saturation weighting is Artistic.)*

**Scene light.** A theme-defined light (`--aid-scene-light`) is mixed in at 35% and shades the smoke texture from above, which gives the volume its relief. *(Artistic)*

**Spectral weighting.** Scattering strength per channel follows λ⁻⁴ (610 / 550 / 465 nm), blended with neutral by `--aid-spectral`. At 1 the gas looks bluish against dark content and brownish against light content, as real fine smoke does. The default 0.1 keeps it near neutral grey. *(Physical direction, Artistic strength.)*

## 3. Parameters (design tokens)

Scene level, set on `<aid-scene>`:

| Token | Range | Default | Effect |
|---|---|---|---|
| `--aid-gas` | helium · neon · argon · krypton · xenon | xenon | refractivity, scattering, molar mass |
| `--aid-temperature` | 0 – 1 (250 – 400 K) | 0.45 | agitation; also lowers density (ρ ∝ p/T) |
| `--aid-refraction` | 0 – 400 | 140 | refraction gain, same for all gases |
| `--aid-light-reach` | px | 96 | how far content light travels into the gas |
| `--aid-smoke` | 0 – 1 | 0.5 | smoke texture and absorption |
| `--aid-spectral` | 0 – 1 | 0.1 | λ⁻⁴ colour of scattering |
| `--aid-quality` | auto · static · efficient · high | auto | device tier |
| `--aid-scene-light` | r,g,b | 246,248,251 | theme light |
| `--aid-membrane-color` / `-alpha` | r,g,b / 0–1 | 24,34,52 / .22 | wall |

Container level, set on any `<aid-gas>`, `<aid-button>`, `<aid-tabs>`, `<aid-tab>`:

| Token | Range | Default | Effect |
|---|---|---|---|
| `--aid-pressure` | 0 – 2 | 1 | density held by the container |
| `--aid-membrane` | 0 – 1 | 1 | wall visibility |
| `--aid-profile` | 0 – 1 | 0.8 | how far from the wall the gas reaches full depth |

## 4. Gas data

| Gas | (n−1)×10⁶ | vs air ×10⁶ | Scatter vs Xe | M g/mol | Source of n |
|---|---|---|---|---|---|
| Helium | 36 | −257 | 0.003 | 4.003 | List of refractive indices (589 nm, 0 °C, 1 atm) |
| Neon | ≈67 | −226 | 0.009 | 20.18 | approximate, to verify |
| Argon | ≈281 | −12 | 0.16 | 39.95 | approximate, to verify |
| Krypton | ≈427 | +134 | 0.37 | 83.80 | approximate, to verify |
| Xenon | ≈702 | +409 | 1 | 131.29 | approximate, to verify |
| Air | 293 | 0 | — | — | List of refractive indices |

Xenon is the default: the largest refraction and scattering among stable noble gases, and the slowest, calmest motion.

## 5. Backdrops

- `backdrop="canvas"` — the content behind is a canvas or image passed with `setBackdrop()`. Full model.
- `backdrop="dom"` (default) — the content behind is ordinary HTML. WebGL cannot read the page, so the scene draws only the gas (lit by scene light) over it, and containers apply a CSS backdrop blur scaled by pressure as a stand-in for scattering. No refraction, no content light. *(Approximation; platform limit.)*

Native ports can read their own layer content: SwiftUI layer effects (Metal), Android RenderEffect with AGSL, Flutter fragment shaders. The model above is platform-independent.

## 6. Performance

| Tier | Grid (short side) | Sim | Light taps | Idle |
|---|---|---|---|---|
| static | none | off; density analytic, finger dent analytic | 5 | 0 GPU work |
| efficient | 80 | 30 Hz (2 × 1/60 s substeps) | 8 | sleeps 2.2 s after the last change |
| high | 128 | 60 Hz | 13 | continuous gentle stirring |

One simulation step = 2 full-screen passes at grid resolution (geometry, gas). No pressure solve. The render pass returns early for every pixel outside a container. `auto` picks a tier from `prefers-reduced-motion`, `deviceMemory`, `hardwareConcurrency` and pixel ratio.

Not yet measured: sustained FPS, thermal and battery behaviour on real phones (5 and 15 minute sessions).

## 7. Accessibility

- Labels sit in the DOM above the gas and are never refracted.
- `<aid-button>`: role button, Enter / Space, `aria-disabled`. `<aid-tabs>`: role tablist, RTL-aware arrow keys.
- `prefers-reduced-motion` selects the static tier.
- Open: a measured contrast floor for labels over the densest smoke, and a high-contrast mode.

## 8. Open questions

1. Verify Ne, Ar, Kr, Xe refractivity against a dispersion table.
2. A user study: do people describe it as gas, and where does reading break?
3. Mass conservation of the semi-Lagrangian step; a conservative scheme if drift is visible.
4. DOM backdrop: a better scattering stand-in than a CSS blur.
5. Device measurements for every tier.

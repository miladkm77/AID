# AID Gas Material — Specification v0.3

> **Summary.** AID is a user-interface material, not an effect. Every component (button, bar, tab) is a sealed container of noble gas. The look comes from a physical model: a compressible gas that gives way under a finger and settles without waves, a gas that pools under its own weight, takes its colour from the light of the content around it, and bends the background only where it is disturbed. Every behaviour is labelled *physical*, *approximation* or *artistic*. The material's parameters belong to AID and are set like any other CSS token.

Status: draft · Reference implementation: `aid-gas` 0.3.1 (WebGL2, Web Components) · License: MIT

## 1. Principle

The appearance is derived from a physical state, not drawn. Every behaviour is labelled:

- **Physical** — follows from established physics with real constants.
- **Approximation** — physically motivated, simplified for real time; the simplification is stated.
- **Artistic** — a design decision with no physical claim.

## 2. What makes it a gas, not a glass

A translucent panel that blurs and bends what is behind it reads as glass, whatever it is called. Version 0.2 removes every behaviour a lens would have and builds the look from four things only a gas does:

| Signature | What you see | Why a glass cannot do it |
|---|---|---|
| **Settling** | Xenon pools at the bottom of its container like a fog bank with a billowing top; helium collects under the top wall. Tilt the device and the layer slides. | Glass has no weight distribution inside it. |
| **Content light** | The gas takes the colour of the content around it, including an image that is next to the container and not under it. | A backdrop blur can only show what is directly behind it. |
| **Disturbance-only refraction** | At rest the background is veiled but not bent. A finger or thermal motion shows up as shimmer and as light and dark streaks. | A lens bends light at its rim all the time. |
| **Excitation** | An excited container glows in the discharge colour of its gas. | Glass does not emit. |

## 3. Material model

### 3.1 Containers

Every component is a sealed container. The gas never leaves it, so reading areas outside containers are never distorted *(Artistic: real gas is unbounded)*. A thin membrane draws the container wall. An evacuated container (disabled) shows a dashed wall.

**Depth between containers.** A container that floats above another (higher `z-index`, or later in the document at the same `z-index`) fogs the one below: inside the upper container, the lower container's wall, gas and label are blurred and veiled, clipped to the lower container's own shape. Without this the two would read as one flat layer. *(Approximation: the gas of both is still one 2D field; the depth is a veil, not a second simulated layer.)*

### 3.2 Gas state

The gas inside all containers of one scene is one 2D field of density ρ and velocity **v**, solved on the GPU at low resolution.

| Equation | Meaning | Label |
|---|---|---|
| ∂ρ/∂t + ∇·(ρ**v**) = 0 | continuity: gas is moved, not created | Physical (semi-Lagrangian, not exactly conservative) |
| ∂**v**/∂t = −c²∇ln(ρ/ρ_eq) − γ**v** + **F** | isothermal pressure p = c²ρ and weight, applied together relative to the settled profile ρ_eq, so the settled state is an exact equilibrium of the scheme; damping γ; forces | Approximation |
| ρ_eq ∝ exp(−h/H), H = 14 px / (weight · \|b\|), weight per container | a gas that shares its container with air settles along gravity. b is its buoyancy in air, ∝ (M − M_air): He −0.24, Ne −0.09, Ar +0.11, Kr +0.54, Xe +1. Negative gases rise. | Direction and ratios: Physical. Scale height: **Artistic** (heavy gases do pool in air, but the layer is far thicker and mixes over time) |
| c² ∝ M^−0.22, γ ∝ M^−0.11 | light gases even out faster. The speed of sound is ∝ 1/√M (helium ≈ 5.7× xenon); the ratio is compressed to ≈ 2.2× to keep the explicit solver stable | Approximation |
| γ ≫ c/L | over-damped: the gas settles without waves or ringing | Artistic (waves read as liquid or jelly) |
| ρ → ρ₀ at rate k | a regulator holds each container at its set pressure | Artistic |
| ρ ∝ p / T | ideal gas at a fixed amount | Physical |

Forces **F**:

- **Finger** — a radial push around the contact point plus a drag along the pointer's motion. Under the finger the gas thins and clears; around it the gas compresses. *(Approximation)*
- **Agitation** (`--aid-agitation`) — a divergence-free stirring field drawn from moving noise. Its speed scales with mean molecular speed ∝ √(T/M): helium moves about 5.7× faster than xenon at the same temperature. *(Speed ratio: Physical. Field shape: Approximation.)*

Interaction states change density only; size and position never change:

| State | Density factor | Transition |
|---|---|---|
| rest | 1 | — |
| hover | 1.1 | the gas gathers under a pointer (mouse only) |
| pressed | 1.25 | compress fast (k = 14 s⁻¹) |
| release | back to 1 | relax slowly (k = 2.5 s⁻¹) |
| disabled | 0 (evacuated) | dashed wall |
| unchecked box, switch track, unselected chip | 0 – 0.22 | the wall stays visible while the chamber is empty |
| loading | 1, excitation pulsing 0.25 – 0.55 at 0.8 Hz | — |
| tab not selected | 0 | chamber drains |

### 3.3 Optics

Separate channels, never merged:

| Channel | Model | Label |
|---|---|---|
| Refraction | Acts on the *disturbance* δ = ρ − ρ_eq only. The background is displaced ∝ ∇δ·Δn and its brightness changes ∝ −∇²δ·Δn (a shadowgraph), with Δn = n_gas − n_air (Gladstone–Dale). A fine thermal shimmer ∝ agitation · density is added. At rest δ = 0, so a container wall never acts as a lens. For helium and neon Δn is negative and the streaks invert. | Physical relations; amplitude **Artistic** (real displacement is sub-pixel) |
| Scattering | Beer–Lambert extinction T = exp(−σρ·w_λ). The same energy is returned as in-scattered light gathered from the surrounding content. σ ∝ (n − 1)²: helium scatters ~1/380 of xenon. | Approximation (single scattering, isotropic gather) |
| Forward scattering | What is seen through the gas loses detail with depth: the transmitted background is blurred ∝ density (up to ≈ 5 px per unit of density), so text passing behind a bar does not compete with its label. | Approximation (stands for multiple forward scattering) |
| Absorption | Single-scattering albedo a = 1 − 0.42·smoke. Pure noble gases do not absorb visible light; absorption stands for suspended particles. | Artistic |
| Emission | None at rest: noble gases glow only under electrical discharge. `--aid-excitation` models that discharge as a state: the gas emits the colour of its species (He pink-orange, Ne red, Ar violet, Kr lavender, Xe blue). | Colours: Physical (published discharge colours; RGB values approximate). Use as a UI state: **Artistic** |
| Reflection | None. A gas has no surface; Fresnel reflectance at n ≈ 1.0004 is ~4×10⁻⁸. | Physical |

**Content as light.** Each point of the content is a light source. The gas gathers light from rings out to `--aid-light-reach`; every ring reads a blurred copy of the content whose footprint grows with distance, so the rings overlap and no direction is missed. Samples are weighted toward bright, saturated colours (`(0.2 + luma)·(0.4 + 3·saturation)`) and fall off with distance. `--aid-glow` sets how much of the gathered colour the gas keeps. Black text emits almost nothing. An image next to a container tints the side of the gas that faces it. *(Approximation; the saturation weighting and glow gain are Artistic.)*

**Scene light.** A theme-defined light (`--aid-scene-light`) is mixed in at 30%. The smoke texture modulates how much light each wisp returns. Where the gas is thin only the peaks of the texture show, so the top of a settled layer billows. *(Artistic)*

**Spectral weighting.** Scattering strength per channel follows λ⁻⁴ (610 / 550 / 465 nm), blended with neutral by `--aid-spectral`. At 1 the gas looks bluish against dark content and brownish against light content, as real fine smoke does. The default 0.1 keeps it near neutral grey. *(Physical direction, Artistic strength.)*

## 4. Parameters (design tokens)

Scene level, set on `<aid-scene>`:

| Token | Range | Default | Effect |
|---|---|---|---|
| `--aid-gas` | helium · neon · argon · krypton · xenon | xenon | refractivity, scattering, molar mass |
| `--aid-agitation` | 0 – 1 (250 – 400 K) | 0.45 | thermal motion and shimmer; also lowers density (ρ ∝ p/T). `--aid-temperature` is accepted as an alias |
| `--aid-refraction` | 0 – 400 | 140 | gain of displacement, shimmer and shadowgraph, same for all gases |
| `--aid-weight` | 0 – 1 | 0.6 | how strongly the gas settles; 0 fills the container evenly. Inherited: set it lower on a bar that sits over scrolling text so the gas keeps veiling what passes behind the labels |
| `--aid-tilt` | −180° – 180° | 0 | direction of gravity. `<aid-scene tilt="device">` adds the tilt of the device |
| `--aid-light-reach` | px | 140 | how far content light travels into the gas |
| `--aid-glow` | 0 – 2 | 1 | how much of the gathered colour the gas keeps |
| `--aid-smoke` | 0 – 1 | 0.5 | smoke texture and absorption |
| `--aid-spectral` | 0 – 1 | 0.1 | λ⁻⁴ colour of scattering |
| `--aid-quality` | auto · static · efficient · high | auto | device tier |
| `--aid-scene-light` | r,g,b | 246,248,251 | theme light |
| `--aid-membrane-color` / `-alpha` | r,g,b / 0–1 | 24,34,52 / .14 | wall: a soft line about 2 px wide |

Container level, set on any `<aid-gas>`, `<aid-button>`, `<aid-tabs>`, `<aid-tab>`:

| Token | Range | Default | Effect |
|---|---|---|---|
| `--aid-pressure` | 0 – 2 | 1 | density held by the container |
| `--aid-membrane` | 0 – 1 | 1 | wall visibility |
| `--aid-profile` | 0 – 1 | 0.2 | softness of the gas at the wall |
| `--aid-excitation` | 0 – 1 | 0 | glow discharge. Controls set it while they have keyboard focus; primary buttons and checked controls hold a lower level at rest |
| `--aid-excitation-color` | r,g,b | the gas | colour of the excited gas for a semantic state (danger, success, warning, info). **Artistic**: one gas has one discharge colour |

## 5. Gas data

| Gas | (n−1)×10⁶ | vs air ×10⁶ | Scatter vs Xe | M g/mol | Buoyancy vs Xe | Discharge colour | Source of n |
|---|---|---|---|---|---|---|---|
| Helium | 36 | −257 | 0.003 | 4.003 | −0.24 (rises) | pink-orange | List of refractive indices (589 nm, 0 °C, 1 atm) |
| Neon | ≈67 | −226 | 0.009 | 20.18 | −0.09 (rises) | red | approximate, to verify |
| Argon | ≈281 | −12 | 0.16 | 39.95 | +0.11 | violet | approximate, to verify |
| Krypton | ≈427 | +134 | 0.37 | 83.80 | +0.54 | lavender | approximate, to verify |
| Xenon | ≈702 | +409 | 1 | 131.29 | +1 (pools) | blue | approximate, to verify |
| Air | 293 | 0 | — | 28.96 | 0 | — | List of refractive indices |

Discharge colours: LibreTexts, *Gas Discharge Tubes*. Shadowgraph response to the second derivative of the refractive index: Wikipedia, *Shadowgraph*.

Xenon is the default: the largest refraction and scattering among stable noble gases, the heaviest layer, and the slowest, calmest motion. Helium and neon scatter so little that they are close to invisible; they show mostly as shimmer.

### Scene size and limits

A scene covers its own box, or the viewport with the `fixed` attribute (one canvas and one GPU context for a whole app). Container data is passed to the GPU as a texture, so up to 96 containers can be in view at once whatever the uniform limit of the device. A coarse mask from the geometry pass lets the render pass skip the per-container loop for pixels that are not near a container. Containers are clipped to their scrolling ancestors.

## 6. Backdrops

- `backdrop="canvas"` — the content behind is a canvas or image passed with `setBackdrop()`. Full model.
- `backdrop="dom"` (default) — the content behind is ordinary HTML. WebGL cannot read the page, so the scene draws only the gas (lit by scene light) over it, and containers apply a CSS backdrop blur scaled by pressure as a stand-in for scattering. The blur is masked along gravity so it is strongest where the gas has settled. Settling, agitation and excitation work; refraction of the page and content light do not. *(Approximation; platform limit.)*

Native ports can read their own layer content: SwiftUI layer effects (Metal), Android RenderEffect with AGSL, Flutter fragment shaders. The model above is platform-independent.

## 7. Performance

| Tier | Grid (short side) | Sim | Light taps | Idle |
|---|---|---|---|---|
| static | none | off; density analytic, finger dent analytic | 5 | 0 GPU work |
| efficient | 80 | 30 Hz (2 × 1/60 s substeps) | 9 | sleeps 2.2 s after the last change |
| high | 128 | 60 Hz | 13 | continuous gentle stirring |

One simulation step = 2 full-screen passes at grid resolution (geometry, gas). No pressure solve. The render pass returns early for every pixel outside a container. `auto` picks a tier from `prefers-reduced-motion`, `deviceMemory`, `hardwareConcurrency` and pixel ratio.

**Resolution.** The canvas is capped at a pixel budget per tier (1.0, 1.5 and 2.4 million pixels) and the pixel ratio is lowered to fit. While animating, if the median frame takes longer than 24 ms, the render resolution drops in steps of 20% down to 60%; if that is not enough, an automatically chosen `high` tier falls back to `efficient`. It does not step back up. A fixed scene sleeps when idle in every tier. The static tier applies no per-container backdrop blur. A dialog fogs the page with one CSS layer, not with a simulated full-screen gas.

Not yet measured: sustained FPS, thermal and battery behaviour on real phones (5 and 15 minute sessions).

## 8. Accessibility

- Labels sit in the DOM above the gas and are never refracted. At rest the content under a container is veiled but not displaced.
- Focus always keeps a 2 px outline; excitation is added to it, never used alone.
- Selected, checked and invalid states never rely on colour alone: a check, dot or dash icon, a moved thumb, or a message carries them too.
- `<aid-button>`: role button, Enter / Space, `aria-disabled`, `aria-busy` while loading. `<aid-checkbox>`, `<aid-radio>`, `<aid-switch>`: native roles, `aria-checked`, Space; radios use a roving tabindex and arrow keys. `<aid-dialog>`: `role=dialog`, `aria-modal`, focus moves in and returns, Tab is trapped, Escape closes. `<aid-field>` wraps a native control, which keeps its own semantics. `<aid-tabs>`: role tablist, RTL-aware arrow keys.
- `prefers-reduced-motion` selects the static tier.
- Open: a measured contrast floor for labels over the densest smoke, and a high-contrast mode.

## 9. Open questions

1. Verify Ne, Ar, Kr, Xe refractivity against a dispersion table.
2. A user study: do people describe it as gas, and where does reading break?
3. Mass conservation of the semi-Lagrangian step; a conservative scheme if drift is visible.
4. DOM backdrop: a better scattering stand-in than a CSS blur.
5. Device measurements for every tier.
6. Does the settled layer read as gas on a small button, or as a gradient? It reads clearly on bars; small containers need a user test.
7. Light from labels: a label could cast a soft shadow into the lit gas. Not modelled.

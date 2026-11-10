# AID: an interface language made of gas

*Atmospheric Interface Design is a material with weight, pressure and light, and a grammar that maps interface state onto the physics of a gas.*

![AID: sealed containers of xenon over a colourful page](docs/img/00-hero.png)

Every major interface language is built on a metaphor of matter.

Material Design chose paper and ink. Fluent chose acrylic, which Microsoft describes as replicating "the effect of frosted glass", and mica. In 2025 Apple introduced Liquid Glass, a material that is "translucent and behaves like glass in the real world".

Paper, acrylic, mica, glass. Every one of them is a solid. A solid has a surface and a shape, and that is all it has. Nothing inside it can move, compress, heat up or glow.

AID starts from a state of matter that, as far as I can find, no interface language has been built on: **gas**. Specifically the noble gases, helium to xenon, because they are colourless, inert, and differ from each other in exactly the ways a designer can use.

## The idea in one paragraph

In AID every control is a sealed, transparent container holding a quantity of gas. The gas has real properties: a density, a weight relative to air, a refractive index, a temperature. Interface state is not painted on top of the control. It *is* the state of the gas. A pressed button is compressed gas. A disabled button is a vacuum. A focused button is an excited gas, glowing in the colour of its element.

That mapping is what makes AID a language and not a visual effect.

## The grammar: state is a physical quantity

| Interface meaning | Physical quantity | What you see | Status |
|---|---|---|---|
| Emphasis | Pressure | More gas in the container, a deeper layer | Implemented |
| Pressed | Compression | The gas thins under the finger and piles up around it | Implemented |
| Disabled | Vacuum | An evacuated container with a dashed wall | Implemented |
| Selected | A filled chamber | The selected tab holds gas, the others are drained | Implemented |
| Focus | Excitation | The gas glows in its discharge colour | Implemented |
| Elevation | Fogging | A container above another veils the one below | Implemented, as an approximation |
| Context | Illumination | The gas takes the colour of the content near it | Implemented on canvas backdrops |
| Orientation | Weight | The layer of gas follows gravity and the tilt of the device | Implemented |
| Activity | Agitation | Faster thermal motion and shimmer | Parameter exists; not yet bound to a state |

Each row is one variable. Nothing is animated for decoration: when something moves, a physical quantity changed.

## Four things a gas does that a solid cannot

### 1. It has weight

Xenon is about 4.5 times denser than air, and heavy gases pool. In a well-known demonstration a foil boat floats in an apparently empty tank, on an invisible layer of sulfur hexafluoride.

So the gas in an AID container is not spread evenly. Xenon settles into a layer at the bottom with a soft, billowing top, like fog in a valley. Helium is lighter than air and collects under the top wall. How strongly each gas settles follows its real molar mass relative to air.

Because the layer follows gravity, it follows the device. Tilt the phone and the gas slides to the low side.

![The gas slides as the device tilts](docs/img/tilt.gif)

### 2. It is lit by what surrounds it

A noble gas is colourless and has no light of its own. What you see of a fog is the light it catches.

In AID every colour on the screen is a light source. The gas gathers light from a radius around its container and takes on that colour. An image that is *next to* a button, not under it, still tints the side of the gas that faces it.

![One screen in three views: final, density of the gas, and the light it gathers](docs/img/02-views.png)

*Final, the density of the gas alone, and the light the gas picks up. The buttons sit below the image and still take its blue.*

### 3. It bends light only where it is disturbed

A lens bends light at its rim all the time. A gas at rest does not.

At rest, an AID container veils what is behind it and softens it with depth, but does not distort it. Refraction is reserved for disturbance. When a finger pushes the gas, or thermal motion stirs it, the density changes, and only that change bends light. It is drawn as a small displacement and as a shadowgraph, the technique used to photograph shock waves and the heat rising from a flame.

The gas is heavily damped. It settles without ringing, because waves read as liquid.

![Pressing a bar, and half a second after release](docs/img/06-press.png)

### 4. It can be excited

Run a current through a noble gas and it glows in the colour of its element: neon red, argon violet, xenon blue. AID treats that as a state. A control with keyboard focus glows in the colour of the gas it holds.

![An excited button in xenon and in neon](docs/img/04-excitation.png)

## Five gases, five temperaments

The gas is a theme. The values below are physical constants, not style choices.

| Gas | Refractivity (n−1)×10⁶ | Molar mass | Motion vs xenon | In air | Discharge colour |
|---|---|---|---|---|---|
| Helium | 36 | 4.0 | 5.7× | rises | pink-orange |
| Neon | ≈67 | 20.2 | 2.5× | rises slightly | red |
| Argon | ≈281 | 39.9 | 1.8× | sinks slightly | violet |
| Krypton | ≈427 | 83.8 | 1.3× | sinks | lavender |
| Xenon | ≈702 | 131.3 | 1× | pools | blue |

Xenon is the default: it scatters the most light, forms the heaviest layer and moves most calmly. Helium and neon scatter so little that they are close to invisible, which is true to nature and limits their use.

## Depth without shadows

Two containers at different heights must not look like two stickers on one sheet. In AID, a container that floats above another fogs the one below: its wall, its gas and its label. What is deeper is veiled. No drop shadow is involved.

![A floating button over another button](docs/img/05-depth.png)

## Principles

1. **State is physical.** One interface state maps to one quantity of the gas.
2. **Content is the light.** The material has no colour of its own. It takes it from the page.
3. **Calm at rest.** A container at rest never distorts what is behind it. Motion means something changed.
4. **Honest physics.** Every behaviour in the specification is labelled *physical*, *approximation* or *artistic*.

The fourth principle matters to me. The direction and the ratios of settling are physical; the thickness of the layer is artistic, because a real heavy gas pools in a much deeper layer and mixes over time. The discharge colours are the published ones; using a discharge as a focus state is a design decision. A material that borrows from nature should say exactly where it stops borrowing.

## How it relates to what exists

| | Material Design | Fluent | Liquid Glass | AID |
|---|---|---|---|---|
| Metaphor | paper and ink | acrylic and mica | glass | noble gas |
| State of matter | solid | solid | solid | gas |
| Content behind | hidden by opaque surfaces | blurred (acrylic) | reflected and refracted | veiled at rest, refracted only where disturbed |
| Colour from context | from the theme, which on Android can follow the wallpaper | mica is "subtly tinted with the user's desktop background color" | informed by surrounding content | gathered as light from nearby content |

AID is not the first interface to take colour from its surroundings or to react to the motion of the device. Liquid Glass does both. What I have not found elsewhere is the combination that defines AID: a gas as the material, interface state expressed as the state of that gas, weight that depends on the element, and refraction limited to disturbance.

Two related ideas deserve credit. Döring, Sylvester and Schmidt described *ephemeral user interfaces* in 2013: physical interfaces made of fog, water, soap bubbles and other transient materials. And a recent essay sketched "Aqua Design", using the states of water as interface metaphors. AID differs in being an on-screen material with a physical model, a specification and running code.

## What AID is not yet

A design language is more than a material. Google's Material 3 Expressive was backed by 46 research studies with more than 18,000 participants. AID today is one person's proposal. To be explicit:

- It has five components: scene, container, button, tabs and tab. No inputs, cards, sheets or dialogs yet.
- It defines a material and a grammar. It does not yet define typography, colour, layout or iconography.
- It has no user research. The central question is untested: do people see gas, and can they read through it?
- Frame rate, heat and battery are unmeasured on real phones.
- It runs on the web. Native ports to SwiftUI with Metal, Android with AGSL, and Flutter are possible but not built.
- On ordinary HTML pages the browser does not let WebGL read the page, so content light and refraction need the content on a canvas.
- My search for earlier work was careful but not exhaustive.

## Try it

AID is open source under the MIT licence: WebGL2 and Web Components, with every parameter exposed as a CSS custom property.

```html
<aid-scene style="--aid-gas: xenon">
  <aid-button>Approve</aid-button>
  <aid-tabs>
    <aid-tab selected>Home</aid-tab>
    <aid-tab>Reports</aid-tab>
  </aid-tabs>
</aid-scene>
```

- Lab: [miladkm77.github.io/aid/lab.html](https://miladkm77.github.io/aid/lab.html)
- Source and specification: [github.com/miladkm77/aid](https://github.com/miladkm77/aid)

Switch the gas from xenon to helium, drag the tilt slider, and press a bar. If it reads as glass to you, tell me where. If you want to build a component, a native port or a user study, I would like to hear from you.

*Milad Karami Motlaq*

---

### Sources

- Apple, [Apple introduces a delightful and elegant new software design](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) (2025).
- Microsoft Learn, [Materials in Windows](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/materials).
- Android Authority, [report on Material 3 Expressive and its research](https://www.androidauthority.com/google-material-3-expressive-details-3554486/) (2025).
- T. Döring, A. Sylvester, A. Schmidt, [Ephemeral user interfaces](https://interactions.acm.org/archive/view/july-august-2013/ephemeral-user-interfaces), *ACM Interactions* (2013).
- [Liquid Glass has reignited ideas that never quite disappeared](https://medium.com/design-bootcamp/liquid-glass-has-reignited-ideas-that-never-quite-disappeared-eca658d00853), Bootcamp.
- LibreTexts, [Gas Discharge Tubes](https://chem.libretexts.org/Ancillary_Materials/Demos_Techniques_and_Experiments/Lecture_Demonstrations/Additional_Demos/Gas_Discharge_Tubes).
- Wikipedia, [Shadowgraph](https://en.wikipedia.org/wiki/Shadowgraph).
- Gizmodo, [Watch a model boat float on a sea of gas](https://gizmodo.com/watch-a-model-boat-float-on-a-sea-of-gas-5875071).

# AID · Atmospheric Interface Design

AID is a design system whose material is a noble gas: not glass, not flat colour. Every button, bar and tab is a sealed container of gas. The gas pools under its own weight, a finger pushes it aside, it settles back without waves, and the colours of the content around it light it up. Xenon is the default gas.

- **Not glass.** There is no surface, no specular highlight and no lens. At rest the gas veils the background without bending it; refraction appears only where the gas is disturbed.
- **Weight.** Xenon is 4.5 times denser than air, so it settles into a layer at the bottom of its container. Helium rises. Tilt the device and the layer slides.
- **Content is the light.** An image next to a button tints the gas that faces it.
- **Depth.** A container that floats above another fogs the one below.
- **Not flat.** Depth comes from density: where the gas is thicker, it scatters more and bends the background more.
- **Honest about physics.** Every behaviour in [SPEC.md](SPEC.md) is labelled *physical*, *approximation* or *artistic*.

**Live:** https://miladkm77.github.io/aid/ · lab: https://miladkm77.github.io/aid/lab.html

Why it is built this way: [My gas interface looked like glass. Four things fixed it.](ARTICLE.md)

## Quick start

```html
<script type="module" src="dist/aid.js"></script>

<aid-scene style="--aid-gas: xenon; --aid-temperature: .45">
  <aid-gas class="bar">Files</aid-gas>
  <aid-button>Approve</aid-button>
  <aid-button disabled>Send</aid-button>
  <aid-tabs>
    <aid-tab selected>Home</aid-tab>
    <aid-tab>Reports</aid-tab>
  </aid-tabs>
</aid-scene>
```

## Parameters

The parameters belong to AID and are plain CSS custom properties:

```css
aid-scene { --aid-gas: xenon;        /* helium | neon | argon | krypton | xenon */
            --aid-agitation: .45;    /* thermal motion and shimmer, 0-1 */
            --aid-refraction: 140;   /* gain of displacement, shimmer and shadowgraph */
            --aid-weight: .6;        /* how strongly the gas settles, 0-1 */
            --aid-tilt: 0;           /* direction of gravity in degrees */
            --aid-light-reach: 140;  /* px: how far content light travels into the gas */
            --aid-glow: 1;           /* how much of the gathered colour the gas keeps */
            --aid-smoke: .5;         /* smoke texture and absorption */
            --aid-spectral: .1;      /* colour of scattering; 0 is neutral grey */
            --aid-quality: auto; }   /* auto | static | efficient | high */
.bar      { --aid-pressure: 1.2;     /* density held by one container */
            --aid-weight: .25; }     /* a bar over scrolling text settles less */
.primary  { --aid-excitation: .8; }  /* glow discharge in the colour of the gas */
```

The full list, the physical model and the label of every behaviour are in [SPEC.md](SPEC.md).

## Components

`<aid-scene>`, `<aid-gas>`, `<aid-button>`, `<aid-tabs>`, `<aid-tab>`. Buttons respond to Enter and Space, tabs to the arrow keys (right-to-left aware), and `prefers-reduced-motion` selects the static tier. `<aid-scene tilt="device">` lets gravity follow the device.

## Two backdrop modes

- `backdrop="dom"` (default): the content behind is ordinary HTML. WebGL cannot read the page, so only the gas is drawn, with a CSS backdrop blur standing in for scattering. Settling and excitation work; refraction of the page and content light do not.
- `backdrop="canvas"`: the content behind is a canvas or image passed with `scene.setBackdrop(canvas)`. The full model runs: refraction and content light.

## Performance

| Tier | Simulation | Light taps |
|---|---|---|
| static | none, analytic | 5 |
| efficient | 80-cell grid, 30 Hz | 9 |
| high | 128-cell grid, 60 Hz | 13 |

The engine runs only when something changes and sleeps when idle. Sustained frame rate, heat and battery have not yet been measured on real phones.

## Development

```
npm install
npm run build      # dist/aid.js (ESM), dist/aid.min.js (IIFE, global AID), types
npm run typecheck
npx http-server .  # or python3 -m http.server, then open /demo/
npm run pages      # rebuilds the static site in docs/
```

## Status

Version 0.2. Open items: verifying the refractivity of Ne, Ar, Kr and Xe against a dispersion table, a user study, device measurements, and more components (card, input, modal).

## License

MIT © Milad Karami Motlaq

# AID · Atmospheric Interface Design

AID is a design system whose material is a noble gas: not glass, not flat colour. Every button, bar and tab is a sealed container of gas. A finger pushes the gas aside, the gas settles back without waves, and the colours of the content behind it light the gas up. Xenon is the default gas.

- **Not glass.** There is no surface, no specular highlight and no magnifying lens. The material is a volume.
- **Not flat.** Depth comes from density: where the gas is thicker, it scatters more and bends the background more.
- **Honest about physics.** Every behaviour in [SPEC.md](SPEC.md) is labelled *physical*, *approximation* or *artistic*.

**Live:** https://miladkm77.github.io/aid/ · lab: https://miladkm77.github.io/aid/lab.html

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
            --aid-temperature: .45;  /* agitation, 0-1 */
            --aid-refraction: 140;   /* refraction gain */
            --aid-light-reach: 96px; /* how far content light travels into the gas */
            --aid-smoke: .5;         /* smoke texture and absorption */
            --aid-spectral: .1;      /* colour of scattering; 0 is neutral grey */
            --aid-quality: auto; }   /* auto | static | efficient | high */
.bar      { --aid-pressure: 1.2; }   /* density held by one container */
```

The full list, the physical model and the label of every behaviour are in [SPEC.md](SPEC.md).

## Components

`<aid-scene>`, `<aid-gas>`, `<aid-button>`, `<aid-tabs>`, `<aid-tab>`. Buttons respond to Enter and Space, tabs to the arrow keys (right-to-left aware), and `prefers-reduced-motion` selects the static tier.

## Two backdrop modes

- `backdrop="dom"` (default): the content behind is ordinary HTML. WebGL cannot read the page, so only the gas is drawn, with a CSS backdrop blur standing in for scattering. No refraction and no content light.
- `backdrop="canvas"`: the content behind is a canvas or image passed with `scene.setBackdrop(canvas)`. The full model runs: refraction and content light.

## Performance

| Tier | Simulation | Light taps |
|---|---|---|
| static | none, analytic | 5 |
| efficient | 80-cell grid, 30 Hz | 8 |
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

Version 0.1. Open items: verifying the refractivity of Ne, Ar, Kr and Xe against a dispersion table, a user study, device measurements, and more components (card, input, modal).

## License

MIT © Milad Karami Motlaq

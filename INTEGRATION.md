# Integrating AID into a product

A guide for whoever (person or coding agent) adds AID to an existing web app. Read it fully before changing code.

## 1. Install (pin a version)

```bash
npm i github:miladkm77/aid#v0.4.0
```

Any commit hash works in place of the tag (`#<hash>`), which is the safest pin for a product.

```js
import 'aid-gas';            // registers the elements and injects the foundation tokens
```

No build step is needed: the package ships `dist/aid.js` (ES module; the minified build is 75 kB) and TypeScript types.
Without a bundler, copy `dist/aid.js` into the app's static files and load it with `<script type="module" src="/aid.js"></script>`,
or use `https://cdn.jsdelivr.net/gh/miladkm77/aid@v0.4.0/dist/aid.js`.

## 2. One scene for the whole app

Wrap the app shell once, as high as possible, and never nest scenes:

```html
<aid-scene fixed>
  <!-- the whole app -->
</aid-scene>
```

- `fixed` gives one viewport-sized canvas and one GPU context however long the pages are.
- No ancestor of the scene may have `transform`, `filter` or `perspective` (they break `position: fixed`).
- Content inside the scene must not put an opaque layer with `z-index` above 1 over gas containers; the gas is drawn at `z-index: 1`, labels at 2.
- Server-side rendering: the elements are plain custom elements. Import `aid-gas` only in the browser (`useEffect`, `onMounted`, dynamic import).

## 3. Replace controls, keep behaviour

| Existing | AID | Notes |
|---|---|---|
| button | `<aid-button>` | `variant="primary\|danger\|quiet"`, `size="sm\|lg"`, `icon`, `loading`, `disabled`. Fires a normal `click`. One primary per view. |
| text input, textarea, select | `<aid-field><input …></aid-field>` | Keep the native control and all of its attributes, bindings and validation. `aria-invalid="true"` on the control shows the error state. |
| checkbox, radio, switch | `<aid-checkbox>`, `<aid-radio name>`, `<aid-switch>` | State is the `checked` attribute/property; listen to `change`. They are not form-associated: mirror the value into your form state or a hidden input. |
| filter pills, tags | `<aid-chip>` | `selected`; `static` for a non-interactive tag. |
| tab bar | `<aid-tabs><aid-tab selected>` | `change` event with `detail.index`. |
| card, panel | `<aid-card>` | Use sparingly: plain content does not need a container. |
| modal | `<aid-dialog>` | `show()`, `close()`, `open`; `close` event; `persistent`. |
| progress | `<aid-progress value="40">` | No `value` = indeterminate. |
| inline message, banner | `<aid-alert kind="info\|success\|warning\|danger">` | Announces itself: `role="status"`, or `role="alert"` for warning and danger. |
| toast, snackbar | `toast('Saved', { kind: 'success' })` | Imported from `aid-gas`. `duration` in ms (0 keeps it open). Returns the element; it fires `close`. |
| dropdown menu, action sheet | `<aid-menu for="triggerId"><aid-menu-item value="…">` | `select` event with `detail.value`. `danger` and `disabled` on items. Not a replacement for a native `select`. |
| range input | `<aid-slider min max step value>` | `input` while dragging, `change` on release. Not form-associated. |
| sidebar navigation | `<aid-tabs vertical>` | Same events as the horizontal bar. |
| data table | `<div class="aid-table-wrap"><table class="aid-table">` | Keep the app's own table logic; the class only styles it. Row actions are `aid-button variant="quiet" size="sm"`. |
| icons | `<aid-icon name="…">` | 36 icons; keep the app's own icon set for anything missing. |

In React, custom-element events need `ref` + `addEventListener` (React 18) or work directly as `onChange`-style props only for native events; boolean attributes are set as `disabled={x || undefined}`. In Vue, tell the compiler the tags are custom elements (`isCustomElement: tag => tag.startsWith('aid-')`).

## 4. Tokens

Foundation tokens are injected on `:root` with zero specificity. Override them in the app's own CSS:

```css
:root { --aid-font: "Vazirmatn", system-ui, sans-serif; }
aid-scene { --aid-gas: xenon; --aid-quality: auto; }
```

Use `--aid-color-bg`, `--aid-color-surface`, `--aid-color-ink`, `--aid-color-ink-muted`, `--aid-color-line` for the page itself so light and dark stay consistent. Force a theme with `data-aid-theme="light|dark"` on `<html>`.
Right-to-left works from `dir="rtl"`; nothing else is needed.

## 5. Performance rules

- Leave `--aid-quality: auto`. The engine picks a tier, caps the canvas at a pixel budget, and lowers its resolution if frames get slow.
- Gas is for controls and bars. Do not wrap page sections, table rows or long lists in gas containers. Up to 96 containers can be in view; aim for under 30.
- Do not animate the size or position of containers continuously.
- Test on a mid-range Android phone, not only on a laptop.

## 6. Accessibility that must survive the migration

- Every icon-only button needs `aria-label`.
- Keep visible text labels for fields (`<label>` around or `for`).
- Error states need a text message, not only the red glow.
- Check keyboard order after the change: Tab through each screen once.

## 7. How to proceed in an existing codebase

1. Find the app shell and the shared UI components (Button, Input, Modal…). Change those wrappers first, not each call site.
2. Add the scene and the import; ship one screen behind it and look at it in light, dark and at 390 px width.
3. Migrate buttons and fields, then selection controls, then dialogs.
4. Leave data tables, charts and long text outside gas containers.
5. Report anything AID lacks (table, menu, toast, slider, date picker are not built yet) instead of improvising a gas version.

Reference: [design system page](https://miladkm77.github.io/aid/system.html) · [SPEC.md](SPEC.md)

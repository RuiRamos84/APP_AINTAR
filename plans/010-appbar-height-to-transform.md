# 010 — Convert AppBar's self-contained scroll-compact sizing to transform

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, ~6 declarations touched (3 converted, 2 kept
  with documented justification — see Problem)

## Problem

`frontend-v2/src/shared/components/layout/AppBar.jsx` derives five
scroll-dependent size variables (lines 116-121):

```js
// frontend-v2/src/shared/components/layout/AppBar.jsx:116-121 — current
const toolbarHeight = { xs: scrolled ? 48 : 64, sm: scrolled ? 54 : 72 };
const logoHeight   = { xs: scrolled ? 28 : 34, sm: scrolled ? 30 : 40 };
const tabHeight    = scrolled ? 54 : 64;
const avatarSize   = scrolled ? 36 : 40; // mínimo 36px — touch target WCAG
const tabFontSize  = scrolled ? '0.74rem' : '0.79rem';
const tabIconSize  = scrolled ? 18 : 20;
```

Four of these drive layout-affecting CSS transitions (`avatarSize` is
handled separately in plan 011, since its transition is a `transition: 'all
0.35s ease'` finding, not a named-property one):

```jsx
// AppBar.jsx:145-150 — Toolbar, current
<Toolbar sx={{
  minHeight: toolbarHeight,
  px: { xs: 1.5, sm: 3 },
  gap: 1,
  transition: 'min-height 0.35s ease',
}}>
```
```jsx
// AppBar.jsx:170-176 — Logo, current
<Box
  component="img"
  src={logoSrc}
  alt="AINTAR"
  sx={{ height: logoHeight, width: 'auto', transition: 'height 0.35s ease' }}
/>
```
```jsx
// AppBar.jsx:196-210 — Tabs, current
<Tabs
  ...
  sx={{
    minHeight: tabHeight,
    mr: 2,
    transition: 'min-height 0.35s ease',
    '& .MuiTab-root': {
      minHeight: tabHeight,
      textTransform: 'none',
      fontWeight: 500,
      fontSize: tabFontSize,
      minWidth: { sm: 80, md: 100 },
      px: { sm: 1.5, md: 2 },
      color: theme.palette.text.secondary,
      transition: 'min-height 0.35s ease, font-size 0.35s ease, color 0.2s',
    },
  }}
>
```
```jsx
// AppBar.jsx:222 — Tab icon, current
<module.icon sx={{ fontSize: tabIconSize, transition: 'font-size 0.35s ease' }} />
```

Per AUDIT.md category 5, `min-height`/`height`/`font-size` all trigger
layout + paint on every animation frame and should be `transform`/`opacity`
where possible.

**Investigation found a real architectural coupling that limits how much of
this can be safely converted.** `frontend-v2/src/shared/components/layout/Sidebar.jsx:60`
reads the *same* `scrolled` boolean independently, not by measuring AppBar's
rendered DOM:

```js
// Sidebar.jsx:60 — current
const navbarH = useNavbarCompact() ? 54 : 72; // sincronizado com AppBar (sm breakpoint)
```

Sidebar then uses `navbarH` to set its own `marginTop` and `height: calc(100vh
- ${navbarH}px)` (Sidebar.jsx:416-418). This is a real, deliberate coupling
(see the inline comment) between the Toolbar's actual rendered height and
where the Sidebar physically starts.

`transform: scale()` never changes an element's layout box — only its
painted appearance. If `toolbarHeight`'s `min-height` transition is replaced
with "always render at the larger size, visually scale down," the Toolbar's
*real* box stays at the larger height while Sidebar (reading the same
`scrolled` flag independently) moves up assuming the Toolbar got shorter —
producing a visible gap or overlap between the AppBar and the Sidebar every
time the page is scrolled past the compact threshold. This is not a
cosmetic nitpick; it would break the layout.

The same problem applies to `tabHeight`: at the compact breakpoint its value
(54) is deliberately set equal to `toolbarHeight.sm`'s compact value (54) —
the Tabs' own `minHeight` is one of the things establishing how tall the
Toolbar needs to be. `min-height` is a floor: if Tabs' real box stays fixed
at the larger value (64) while only visually scaled down, the Toolbar's
actual rendered height would grow to fit the (unshrunk) Tabs box regardless
of what `toolbarHeight` says, silently defeating the compacting effect for
the reason it exists.

`logoHeight` (28-34px depending on breakpoint) and `tabFontSize`/`tabIconSize`
do **not** have this problem — they're always smaller than the Toolbar's own
`minHeight` floor even at its smallest state (48px), so nothing downstream
depends on their real box size shrinking; they're purely decorative sizing
within a box whose real height is already governed by `toolbarHeight`.

## Target

**Converted to `transform: scale()`** (safe — no downstream layout
dependency):

```jsx
// target — Logo
<Box
  component="img"
  src={logoSrc}
  alt="AINTAR"
  sx={{
    height: { xs: 34, sm: 40 }, // always the larger, un-scaled size
    width: 'auto',
    transform: {
      xs: scrolled ? 'scale(0.8235)' : 'scale(1)', // 28/34
      sm: scrolled ? 'scale(0.75)'   : 'scale(1)', // 30/40
    },
    transformOrigin: 'left center',
    transition: 'transform 0.35s ease',
  }}
/>
```

```jsx
// target — Tab icon (inside the .map over accessibleModules)
<module.icon
  sx={{
    fontSize: 20, // always the larger, un-scaled size
    transform: scrolled ? 'scale(0.9)' : 'scale(1)', // 18/20
    transition: 'transform 0.35s ease',
  }}
/>
```

Tab label font-size: same `transform: scale(0.9367)` treatment (0.74/0.79)
applied to the `& .MuiTab-root` rule's own text, replacing the `font-size`
half of its transition list — `color` stays a genuine `color` transition
(unrelated to this finding, already a fine property to transition):

```jsx
// target — Tabs, only the .MuiTab-root sub-rule shown
'& .MuiTab-root': {
  minHeight: tabHeight,       // UNCHANGED — see below
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.79rem',        // always the larger, un-scaled size
  transform: scrolled ? 'scale(0.9367)' : 'scale(1)', // 0.74/0.79
  transformOrigin: 'left center',
  minWidth: { sm: 80, md: 100 },
  px: { sm: 1.5, md: 2 },
  color: theme.palette.text.secondary,
  transition: 'transform 0.35s ease, color 0.2s',
},
```

**Intentionally KEPT as `min-height` transitions, not converted** (see
Problem — converting these breaks Sidebar sync / defeats the compacting
effect):

```jsx
// KEPT AS-IS — Toolbar
<Toolbar sx={{
  minHeight: toolbarHeight,
  px: { xs: 1.5, sm: 3 },
  gap: 1,
  transition: 'min-height 0.35s ease',
}}>
```

```jsx
// KEPT AS-IS — Tabs container + .MuiTab-root's own minHeight
<Tabs sx={{
  minHeight: tabHeight,
  mr: 2,
  transition: 'min-height 0.35s ease',
  '& .MuiTab-root': {
    minHeight: tabHeight, // kept; only fontSize/transform changed per above
    ...
  },
}}>
```

A fully layout-property-free compact navbar would require coordinating a
change across `AppBar.jsx`, `Sidebar.jsx`, and `MainLayout.jsx` together
(e.g. Sidebar measuring AppBar via `ResizeObserver` instead of duplicating
the `scrolled` boolean) — that is a bigger, cross-component refactor, out of
scope for this plan. Flagged here as a known follow-up.

## Repo conventions to follow

- `transform-origin` values follow the direction content should appear to
  shrink toward — `left center` matches this Toolbar's flex layout (Logo and
  Tabs both sit left-aligned within their flex slots, so scaling from the
  left keeps their left edge visually anchored rather than drifting).
- Responsive `sx` values as breakpoint objects (`{ xs: ..., sm: ... }`) are
  the established pattern in this exact file — see `toolbarHeight`/`logoHeight`
  themselves (lines 116-117) and `avatarSize`'s width/height object usage
  elsewhere in the file.
- Keep the `0.35s ease` timing/curve as-is for every converted property —
  this plan changes *which* CSS property animates, not the pacing. (A
  project-wide easing-token consolidation is plan 019's job, not this one.)

## Steps

1. In `AppBar.jsx`, change the Logo `Box` (lines 170-176): set `height` to
   the static larger value per breakpoint (`{ xs: 34, sm: 40 }`), add
   `transform: { xs: scrolled ? 'scale(0.8235)' : 'scale(1)', sm: scrolled ?
   'scale(0.75)' : 'scale(1)' }` and `transformOrigin: 'left center'`,
   replace `transition: 'height 0.35s ease'` with `transition: 'transform
   0.35s ease'`.
2. In `AppBar.jsx`, change the Tab icon (line 222): set `fontSize` to the
   static larger value `20`, add `transform: scrolled ? 'scale(0.9)' :
   'scale(1)'`, replace `transition: 'font-size 0.35s ease'` with
   `transition: 'transform 0.35s ease'`.
3. In `AppBar.jsx`, inside the `& .MuiTab-root` rule (lines 200-209): set
   `fontSize` to the static larger value `'0.79rem'`, add `transform:
   scrolled ? 'scale(0.9367)' : 'scale(1)'` and `transformOrigin: 'left
   center'`, change `transition: 'min-height 0.35s ease, font-size 0.35s
   ease, color 0.2s'` to `transition: 'transform 0.35s ease, color 0.2s'`
   (drop `min-height` from this list since `minHeight: tabHeight` stays
   as-is — it's still a real value change, just no longer paired with a
   font-size change in the same transition list; MUI/CSS will still
   transition it because the property itself remains listed... actually per
   step 4 below, `minHeight: tabHeight` on `.MuiTab-root` is unchanged and
   MUST keep `min-height` in ITS transition list too — see step 4, this step
   only touches the font-size/transform/color portion).
4. Re-confirm (do not change) that `minHeight: tabHeight` stays on both the
   `Tabs` root `sx` (line 197) and the nested `& .MuiTab-root` rule (line
   201), and that both keep `min-height` in their `transition` value — the
   `Tabs` root's `transition: 'min-height 0.35s ease'` (line 199) is
   untouched, and the `.MuiTab-root` rule's transition becomes `'min-height
   0.35s ease, transform 0.35s ease, color 0.2s'` (min-height re-added
   alongside the new transform, since minHeight itself is not being
   converted).
5. Leave the `Toolbar` sx (lines 145-150) completely untouched — no edit.
6. Do not touch `avatarSize` or the two `transition: 'all 0.35s ease'`
   declarations at lines 281 and 301 — those belong to plan 011.

## Boundaries

- Does NOT touch lines 281 or 301 (`transition: 'all 0.35s ease'` on the
  avatar IconButton border and the Avatar itself) — those are plan 011's
  scope. Applying both plans to this file: apply this plan first or plan 011
  first, order doesn't matter, but do not let one plan's diff silently
  revert the other's — they touch disjoint line ranges (010: ~145-222;
  011: ~281, ~301).
- Do NOT touch `Sidebar.jsx` or `MainLayout.jsx` — the coupling described in
  Problem is documented here as a constraint on THIS file's fix, not as an
  invitation to also edit those files. A cross-component decoupling is a
  separate, bigger piece of work.
- Do NOT convert `toolbarHeight`'s `min-height` transition or `tabHeight`'s
  `min-height` transition to `transform` — this is a deliberate, justified
  exception (see Problem), not an oversight. If a future plan wants to
  tackle it, it must touch `Sidebar.jsx` in the same change.
- Do NOT change the `0.35s ease` duration/curve values — that's plan 019's
  scope (token consolidation), not this one.
- Do NOT change `avatarSize`'s value or the avatar's own sizing logic.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/shared/components/layout/AppBar.jsx`
  — no new errors/warnings.
- **Feel check**: run the app, log in, and scroll the main content area past
  the compact threshold (the `scrolled` boolean's trigger, via
  `useNavbarCompact`) on a page with visible module tabs (desktop width,
  `md`+):
  - The logo visibly shrinks smoothly on scroll — confirm it does NOT jump
    or flicker, and that it shrinks toward its left edge, not its center.
  - Tab icons and tab label text shrink smoothly alongside the logo.
  - **Critically**: confirm the Sidebar's top edge stays flush against the
    AppBar's bottom edge at every point during the scroll transition — no
    gap, no overlap. This is the regression this plan is designed to avoid;
    if you see one, the Toolbar/Tabs `min-height` was incorrectly converted
    — revert and re-check Steps 5-6.
  - In DevTools Animations panel, set playback to 10% and scrub the logo/tab
    transform — confirm it's a smooth scale, not a snap.
  - Text may render very slightly differently via `transform: scale()` vs a
    true `font-size` change (subpixel hinting) — note this as an accepted,
    known tradeoff per AUDIT.md, not a bug to chase.
  - Also note: a 2D `scale()` on the Tabs text shrinks its horizontal
    footprint slightly more/differently than the original font-size-only
    change did (which kept `minWidth` constant) — check that this doesn't
    visibly tighten spacing between tabs and the notification bell/avatar
    to an awkward degree. If it does, `transformOrigin: 'left center'`
    should already contain the effect to the tab's own box; flag for a
    follow-up if still visually off.
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling (that's plan 012); confirm the transitions
    still play (unchanged behavior) so plan 012 has a clean baseline to gate.
- **Done when**: logo, tab icon, and tab label transitions use `transform:
  scale()` with the static larger base size; `toolbarHeight` and `tabHeight`
  remain unconverted `min-height` transitions with no Sidebar-alignment
  regression on scroll.

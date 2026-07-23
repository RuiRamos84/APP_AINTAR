# 002 — Replace `transition-all` on buttons/card with explicit properties

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, 4 component classes

## Problem

`website/src/index.css`, inside the `@layer components` block, defines four
shared classes used across nearly every CTA and card sitewide (buttons in
`HeroSection`, `ContactForm`, `AboutSection`, `AvaliacoesSection`,
`CandidaturaPage`, and the generic `.card` used by `ReviewCard` and others).
All four use the Tailwind `transition-all` utility combined with only a
transform + box-shadow (+ color, on two of them) hover effect:

```css
/* website/src/index.css:121-142 — current */
.btn-primary {
  @apply inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
         bg-aintar-sky text-white hover:bg-aintar-blue transition-all duration-300
         hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0;
}

.btn-outline {
  @apply inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
         border-2 border-white/30 text-white hover:border-aintar-sky hover:text-aintar-sky
         transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0;
}

.btn-outline-blue {
  @apply inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
         border-2 border-aintar-blue text-aintar-blue hover:bg-aintar-blue hover:text-white
         transition-all duration-300 hover:-translate-y-0.5;
}

.card {
  @apply bg-white rounded-2xl shadow-sm border border-gray-100
         hover:shadow-xl hover:-translate-y-1 transition-all duration-300;
}
```

Per AUDIT.md category 5 (Performance): "`transition: all` animates unintended
properties off-GPU — always a finding." Each of these classes only ever
animates a known, fixed set of properties on hover/active
(`transform`, `box-shadow`, and for `.btn-primary`/`.btn-outline`/`.btn-outline-blue`
also `background-color`/`border-color`/`color`) — `transition-all` forces the
browser to watch every animatable CSS property on the element instead of just
those.

Blast radius: `.btn-primary`, `.btn-outline`, `.btn-outline-blue` and `.card`
are the base button/card primitives used on nearly every page and section in
`website/` — this is one of the highest-traffic style rules in the codebase.

## Target

Replace `transition-all` with an explicit Tailwind v4 transition utility
listing only the properties each class actually changes. Visual result must
be pixel-identical to today — this is a performance-only fix, not a value
change.

```css
/* website/src/index.css:121-142 — target */
.btn-primary {
  @apply inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
         bg-aintar-sky text-white hover:bg-aintar-blue
         transition-[transform,box-shadow,background-color] duration-300
         hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0;
}

.btn-outline {
  @apply inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
         border-2 border-white/30 text-white hover:border-aintar-sky hover:text-aintar-sky
         transition-[transform,color,border-color] duration-300
         hover:-translate-y-0.5 active:translate-y-0;
}

.btn-outline-blue {
  @apply inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm
         border-2 border-aintar-blue text-aintar-blue hover:bg-aintar-blue hover:text-white
         transition-[transform,background-color,color] duration-300
         hover:-translate-y-0.5;
}

.card {
  @apply bg-white rounded-2xl shadow-sm border border-gray-100
         hover:shadow-xl hover:-translate-y-1
         transition-[transform,box-shadow] duration-300;
}
```

Property lists per class (derived from what each class's own `hover:`/`active:`
modifiers actually touch):
- `.btn-primary`: `hover:bg-aintar-blue` (background-color), `hover:shadow-lg`
  (box-shadow — but note: Tailwind's `shadow-*` utilities are not natively
  transitionable via `box-shadow` unless the base class also sets a shadow;
  `.btn-primary` has no base `shadow-*` class, so the `hover:shadow-lg`
  transition only takes visible effect if the browser interpolates from "no
  shadow" — this already worked identically under `transition-all`, so
  keeping `box-shadow` in the explicit list preserves current behavior
  exactly), `hover:-translate-y-0.5`/`active:translate-y-0` (transform).
  → `transition-[transform,box-shadow,background-color]`
- `.btn-outline`: `hover:border-aintar-sky` (border-color),
  `hover:text-aintar-sky` (color), `hover:-translate-y-0.5`/`active:translate-y-0`
  (transform). No shadow or background-color hover on this class.
  → `transition-[transform,color,border-color]`
- `.btn-outline-blue`: `hover:bg-aintar-blue` (background-color),
  `hover:text-white` (color), `hover:-translate-y-0.5` (transform). No border
  color change on hover (border stays `border-aintar-blue`), no shadow.
  → `transition-[transform,background-color,color]`
- `.card`: `hover:shadow-xl` (box-shadow), `hover:-translate-y-1` (transform).
  No color/background change.
  → `transition-[transform,box-shadow]`

`duration-300` is unchanged on all four — this plan only narrows which
properties transition, not how long or how they ease.

## Repo conventions to follow

- This codebase already declares component-level utility classes inside
  `@layer components` in `website/src/index.css` using Tailwind's `@apply`
  — follow that exact block/placement, editing in place rather than moving
  the rules.
- Tailwind v4 (confirmed in `website/package.json:27`, `"tailwindcss": "^4.2.4"`)
  supports arbitrary-property transition utilities via
  `transition-[prop1,prop2,...]` — use that syntax rather than chaining
  multiple named utilities like `transition-colors transition-transform`,
  since Tailwind's separate `transition-colors`/`transition-transform`/
  `transition-shadow` utilities each carry their own property list that
  would need to be combined and could silently diverge from Tailwind's
  internal defaults; the arbitrary-property form makes the exact animated
  properties explicit and auditable at the call site, matching AUDIT.md's
  performance guidance to always animate a known, minimal property set.

## Steps

1. In `website/src/index.css`, in `.btn-primary` (around line 121-125),
   replace `transition-all duration-300` with
   `transition-[transform,box-shadow,background-color] duration-300`. Keep
   every other utility on the class unchanged.
2. In `.btn-outline` (around line 127-131), replace `transition-all duration-300`
   with `transition-[transform,color,border-color] duration-300`.
3. In `.btn-outline-blue` (around line 133-137), replace
   `transition-all duration-300` with
   `transition-[transform,background-color,color] duration-300`.
4. In `.card` (around line 139-142), replace `transition-all duration-300`
   with `transition-[transform,box-shadow] duration-300`.

## Boundaries

- Do NOT touch `.section-container`, `.section-padding`, `.section-tag`, or
  `.wave-divider` in the same `@layer components` block — they carry no
  `transition-all` and are out of scope.
- Do NOT change any hover/active visual value (colors, translate distances,
  shadow sizes) — only the `transition`/`transition-all` utility changes.
- Do NOT add new dependencies.
- Do NOT touch call sites — every component using `.btn-primary`,
  `.btn-outline`, `.btn-outline-blue`, or `.card` (e.g.
  `website/src/components/sections/HeroSection.jsx`,
  `website/src/components/ui/ContactForm.jsx`,
  `website/src/pages/clientes/AvaliacoesSection.jsx`) needs no changes; the
  fix is entirely in the shared class definitions.
- If any of the four rules no longer matches the code quoted above (drift
  since commit `a93c46f`), STOP and report instead of improvising a property
  list from unfamiliar code.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors —
  Tailwind v4's arbitrary-value transition syntax is validated at build time
  (an unrecognized property name inside `transition-[...]` still compiles as
  a valid CSS transition, so also visually confirm in the feel check below).
- **Feel check**: run `cd website && npm run dev`, then for each of the four
  classes:
  - Hover a primary CTA button (e.g. "Área de Cliente" in the navbar or hero)
    — it should still lift, glow with a shadow, and shift color exactly as
    before; press it (`:active`) and confirm it settles back down.
  - Hover a `.card` element (e.g. a review card in Opiniões / AvaliacoesSection)
    — it should still lift and gain a larger shadow, nothing else visibly
    different.
  - In DevTools → Elements, select a hovered button and check the Computed
    panel's `transition-property` — it should list only the properties named
    in the Target section above, not `all`.
  - In DevTools → Performance panel, record a hover interaction on `.card` or
    `.btn-primary` — confirm no unrelated properties (e.g. `padding`, `width`)
    appear in the recorded style recalculation, and that the animated frames
    are composited (green "Composite Layers" rather than heavy "Recalculate
    Style").
  - Toggle `prefers-reduced-motion: reduce` in DevTools' Rendering panel —
    these are hover/press micro-interactions with no existing reduced-motion
    gate; confirm they behave exactly as before the toggle (this plan does
    not add one — out of scope, hover transform on `:hover` is gated
    separately if ever addressed).
- **Done when**: all four rules in `website/src/index.css` use
  `transition-[...]` with the exact property lists in Target, `duration-300`
  is preserved on each, and no visual regression is observed on hover/active
  states of buttons and cards across the site.

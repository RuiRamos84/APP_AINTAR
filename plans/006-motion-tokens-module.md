# 006 — Add motion tokens to index.css theme + consolidate JogoPage's duplicate cubic-beziers

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files (1 token addition, 1 duplicate-constant consolidation)

## Problem

No `--ease-*` or `--duration-*` custom properties exist anywhere in
`website/src` today. `website/src/index.css:1-32` already declares this
codebase's only design tokens — colors, fonts, and letter-tracking — inside a
Tailwind v4 `@theme` block, but nothing for motion:

```css
/* website/src/index.css:1-32 — current, no motion tokens */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-aintar-navy: #0A1628;
  --color-aintar-mid: #122040;
  --color-aintar-blue: #1B5E8E;
  --color-aintar-blue-mid: #2074AA;
  --color-aintar-sky: #29B5E8;
  --color-aintar-teal: #2ABB9B;
  --color-aintar-light: #EFF6FC;
  --color-aintar-tag: #1A6B82;

  /* Fonts */
  --font-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --tracking-tightest: -0.04em;
  --tracking-tighter: -0.02em;
  --tracking-tight: -0.01em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  /* Animations */
  --animate-wave-slow: wave 12s linear infinite;
  --animate-wave-medium: wave 8s linear infinite;
  --animate-wave-fast: wave 6s linear infinite;
  --animate-float: float 6s ease-in-out infinite;
  --animate-fade-up: fadeUp 0.6s ease-out forwards;
  --animate-pulse-slow: pulse 4s ease-in-out infinite;
}
```

Evidence of the resulting drift, confirmed by search:

- The curve `[0.22, 1, 0.36, 1]` (Framer Motion array-tuple form) is
  hand-typed **8 separate times** across `website/src`:
  `website/src/components/ui/ScrollReveal.jsx`,
  `website/src/components/ui/PageTransition.jsx` (its `enter` variant —
  already correct, left alone by plan 001),
  `website/src/components/sections/HeroSection.jsx`,
  `website/src/components/sections/StatsSection.jsx`,
  `website/src/components/layout/PageHeader.jsx`,
  `website/src/pages/quem-somos/OrganogramaPage.jsx`,
  `website/src/components/ui/CookieBanner.jsx`, and
  `website/src/components/ui/AccordionItem.jsx`.
- Bare easing strings `'easeOut'`/`'easeIn'` are hand-typed in
  `website/src/components/layout/Navbar.jsx` (three places: the header
  slide-in, the `DropdownMenu` transition, and elsewhere) and previously in
  `website/src/components/ui/PageTransition.jsx`'s `exit` variant (that
  specific instance is already fixed by plan 001 — noted here only as
  evidence that existed before that fix, not to be re-touched).
- Two near-duplicate hand-typed cubic-béziers in
  `website/src/pages/JogoPage.jsx` — confirmed by reading both sites:

```jsx
// website/src/pages/JogoPage.jsx:119-124 — current (dice 3D roll)
<div style={{
  width: SZ, height: SZ,
  position: 'relative', transformStyle: 'preserve-3d',
  transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
  transition: 'transform 1.1s cubic-bezier(.23,.68,.35,1)',
}}>
```

```jsx
// website/src/pages/JogoPage.jsx:4708-4712 — current (board cell tilt-reset on mouse leave)
function onLeave() {
  ref.current.style.transform  = 'perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)'
  ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,0.68,0.35,1)'
  if (shineRef.current) shineRef.current.style.opacity = '0'
}
```

`cubic-bezier(.23,.68,.35,1)` and `cubic-bezier(0.23,0.68,0.35,1)` are the
identical curve, typed twice with different number formatting (leading
`0` omitted vs included) — a literal duplicate, not two intentionally
different curves. (A third, unrelated curve, `cubic-bezier(0.22,0.61,0.36,1)`,
also exists in this file at `website/src/pages/JogoPage.jsx:4608` inside a
`tokenBounce` CSS animation string — that one is a genuinely different curve
value and is explicitly out of scope for this plan; do not consolidate it.)

Both `JogoPage.jsx` duplicates are set via imperative
`ref.current.style.transition = '...'` string assignment, not JSX props or
Tailwind classes — they're plain inline CSS transition strings on raw DOM
refs, consumed as JS string literals, not through Tailwind or a `@theme`
CSS custom property lookup.

## Target

**Two separate, narrowly-scoped additions** — a CSS token pair (for future
Tailwind/CSS consumers) and a JS constant (for `JogoPage.jsx`'s inline-style
string consumers). They intentionally do not share a single source of truth
because they're consumed by different systems (CSS cascade vs. JS string
interpolation), and this plan does not attempt to unify that — see
Boundaries.

### 1. `website/src/index.css` — new tokens in the existing `@theme` block

```css
/* website/src/index.css:3-32 — target, new tokens appended at the end of @theme */
@theme {
  /* Colors */
  --color-aintar-navy: #0A1628;
  --color-aintar-mid: #122040;
  --color-aintar-blue: #1B5E8E;
  --color-aintar-blue-mid: #2074AA;
  --color-aintar-sky: #29B5E8;
  --color-aintar-teal: #2ABB9B;
  --color-aintar-light: #EFF6FC;
  --color-aintar-tag: #1A6B82;

  /* Fonts */
  --font-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;

  --tracking-tightest: -0.04em;
  --tracking-tighter: -0.02em;
  --tracking-tight: -0.01em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.1em;

  /* Animations */
  --animate-wave-slow: wave 12s linear infinite;
  --animate-wave-medium: wave 8s linear infinite;
  --animate-wave-fast: wave 6s linear infinite;
  --animate-float: float 6s ease-in-out infinite;
  --animate-fade-up: fadeUp 0.6s ease-out forwards;
  --animate-pulse-slow: pulse 4s ease-in-out infinite;

  /* Motion easing */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

These are the exact AUDIT.md values (`--ease-out: cubic-bezier(0.23, 1, 0.32,
1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`). **This is a
deliberately different curve from the `[0.22, 1, 0.36, 1]` already used
sitewide in Framer Motion components.** Do not treat these as
interchangeable and do not use these new CSS tokens to replace any existing
`[0.22, 1, 0.36, 1]` Framer usage — that array is a separate, internally
consistent convention already used correctly across 8 files in JS/Framer
context, and retrofitting it is out of scope (see Boundaries). These new
`--ease-*` tokens exist for **future** plain-CSS/Tailwind consumers (e.g. a
future `transition-[...] duration-300 ease-[var(--ease-out)]` utility) — as
of this plan, nothing yet consumes them; adding the tokens is preparatory
infrastructure work, matching AUDIT.md category 7's guidance that curves
"should live as shared tokens."

### 2. `website/src/lib/motion.js` — new JS constant for JogoPage's inline-style consumers

`website/src/lib/` does not exist yet (confirmed — `website/src` currently
has only `components/`, `pages/`, `services/`, plus root `App.jsx`/`main.jsx`/
`index.css`). Create it for this one small, focused file:

```js
// website/src/lib/motion.js — new file, full contents
/**
 * Curva cubic-bezier partilhada pelas transições de rotação 3D do JogoPage
 * (dado a rolar, tilt de carta ao sair do hover) — antes duplicada como duas
 * strings quase-idênticas (.23,.68,.35,1 vs 0.23,0.68,0.35,1).
 */
export const EASE_TILT_3D = 'cubic-bezier(0.23, 0.68, 0.35, 1)'
```

```jsx
// website/src/pages/JogoPage.jsx:119-124 — target
import { EASE_TILT_3D } from '../lib/motion'
// … (added near the file's existing top-level imports)
...
<div style={{
  width: SZ, height: SZ,
  position: 'relative', transformStyle: 'preserve-3d',
  transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
  transition: `transform 1.1s ${EASE_TILT_3D}`,
}}>
```

```jsx
// website/src/pages/JogoPage.jsx:4708-4712 — target
function onLeave() {
  ref.current.style.transform  = 'perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)'
  ref.current.style.transition = `transform 0.5s ${EASE_TILT_3D}`
  if (shineRef.current) shineRef.current.style.opacity = '0'
}
```

Durations (`1.1s`, `0.5s`) stay exactly as they are today at each call site —
only the repeated curve literal is factored out, nothing about timing
changes.

## Repo conventions to follow

- Design tokens in this codebase live in `website/src/index.css`'s `@theme`
  block, grouped under a `/* Comment */` heading per category (Colors, Fonts,
  Animations) — see `website/src/index.css:4-31`. Add the new `/* Motion
  easing */` group at the end of the block, following that exact
  comment-header convention.
- `website/src` has no precedent for a shared non-component JS constants
  file — this plan introduces `website/src/lib/motion.js` as a minimal,
  single-purpose module (one exported constant), not a general "utils"
  dumping ground. Do not add anything to this file beyond `EASE_TILT_3D`.

## Steps

1. In `website/src/index.css`, inside the `@theme` block, after the existing
   `/* Animations */` group (ending at `--animate-pulse-slow: pulse 4s
   ease-in-out infinite;`), add a new `/* Motion easing */` group with the
   two lines shown in Target: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
   and `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`.
2. Create `website/src/lib/motion.js` with the exact contents shown in
   Target (one exported constant, `EASE_TILT_3D`).
3. In `website/src/pages/JogoPage.jsx`, add
   `import { EASE_TILT_3D } from '../lib/motion'` near the file's existing
   top-level imports (check the top of the file for the existing import
   block and add it there, preserving any existing import ordering/grouping
   convention you find).
4. In `website/src/pages/JogoPage.jsx:123` (the dice roll transition),
   replace the string literal
   `'transform 1.1s cubic-bezier(.23,.68,.35,1)'` with the template literal
   `` `transform 1.1s ${EASE_TILT_3D}` ``.
5. In `website/src/pages/JogoPage.jsx:4710` (the board-cell `onLeave`
   handler), replace the string literal
   `'transform 0.5s cubic-bezier(0.23,0.68,0.35,1)'` with the template
   literal `` `transform 0.5s ${EASE_TILT_3D}` ``.

## Boundaries

- Do NOT replace any of the 8 existing `[0.22, 1, 0.36, 1]` Framer Motion
  usages with the new `--ease-out`/`--ease-in-out` CSS tokens — they are a
  different curve, consumed by a different system (JS array vs. CSS custom
  property), and are explicitly out of scope. That is future cleanup, not
  this plan.
- Do NOT touch `website/src/pages/JogoPage.jsx:4608`'s
  `cubic-bezier(0.22,0.61,0.36,1)` inside the `tokenBounce` CSS animation
  string — it is a genuinely different curve value, not a duplicate of
  `EASE_TILT_3D`, and consolidating it would silently change that
  animation's feel.
- Do NOT touch `Navbar.jsx`'s bare `'easeOut'` strings or any other
  easing/duration value anywhere else in the codebase — this plan's scope is
  exactly: (a) add the two CSS tokens, (b) deduplicate the two identical
  `JogoPage.jsx` cubic-béziers into one JS constant. Nothing else.
- Do NOT wire the new `--ease-out`/`--ease-in-out` CSS tokens into any
  Tailwind utility class anywhere in this plan — no component in the current
  codebase consumes them yet; this plan only adds the token declarations
  themselves. Do not go looking for a "first consumer" to wire up.
- Do NOT create any other file under `website/src/lib/` beyond `motion.js`.
- If `JogoPage.jsx`'s two cubic-bezier sites no longer match the code quoted
  above (drift since commit `a93c46f`), STOP and report — do not assume a
  third or fourth occurrence is safe to fold into the same constant without
  confirming it's the same curve.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors —
  this validates both the new `@theme` CSS custom properties parse correctly
  under Tailwind v4 and that the new `website/src/lib/motion.js` module
  resolves correctly from `JogoPage.jsx`'s import.
- **Feel check**: run `cd website && npm run dev`, navigate to
  `/educacao-ambiental/aintar-kids/jogo` (the `JogoPage` route, lazy-loaded —
  confirm it loads without a console error), and:
  - Roll the die at least once — the 3D roll transition should look
    identical to before (same 1.1s duration, same tilt-settle feel).
  - Hover and un-hover a game board cell (or whichever element triggers
    `onLeave`) — the tilt-reset should look identical to before (same 0.5s
    duration, same settle feel).
  - Open DevTools console and confirm no import-resolution errors for
    `website/src/lib/motion.js`.
  - In DevTools → Elements, inspect an element carrying the new
    `--ease-out`/`--ease-in-out` custom properties is not expected yet (no
    consumer wired up in this plan) — instead confirm via DevTools →
    Sources that `website/src/index.css`'s compiled output includes
    `--ease-out` and `--ease-in-out` custom properties on `:root` (or the
    Tailwind v4 theme scope), proving the token declarations compiled
    successfully even with zero current consumers.
  - Reduced-motion toggle: not applicable to this plan — no animation
    behavior changes, only a value's source of truth. Skip this check.
- **Done when**: `website/src/index.css`'s `@theme` block contains the two
  new `--ease-*` custom properties with the exact AUDIT.md values,
  `website/src/lib/motion.js` exists exporting `EASE_TILT_3D` with the exact
  cubic-bezier string, both `JogoPage.jsx` call sites reference
  `EASE_TILT_3D` instead of a hand-typed literal, `npm run build` succeeds,
  and the dice-roll and board-cell-tilt animations look unchanged.

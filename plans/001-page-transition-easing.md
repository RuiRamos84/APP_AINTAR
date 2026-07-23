# 001 — Fix ease-in on PageTransition exit

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 1 line

## Problem

`website/src/components/ui/PageTransition.jsx` wraps every routed page in a Framer
Motion `variants` object with `initial`/`enter`/`exit` states. It is mounted once,
sitewide, in `website/src/App.jsx:66-125`:

```jsx
// website/src/App.jsx:66-125 — current
<AnimatePresence mode="sync" initial={false}>
  <PageTransition key={location.key}>
    <Suspense fallback={<RouteFallback />}>
      <Routes location={location}>
        {/* every route in the app */}
      </Routes>
    </Suspense>
  </PageTransition>
</AnimatePresence>
```

Because `PageTransition` sits directly above `<Routes>` and is keyed on
`location.key`, its `exit` transition plays on literally every route change on
the site — it is the single most frequently seen animation in the codebase.

The `exit` variant currently uses `ease: 'easeIn'`:

```jsx
// website/src/components/ui/PageTransition.jsx:1-15 — current
import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 12 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.20, ease: 'easeIn' },
  },
}
```

Per AUDIT.md category 2: "`ease-in` on UI is always a finding — it starts slow,
delaying the exact moment the user is watching." An exiting element must use
`ease-out` (starts fast, feels responsive), never `ease-in`. The `enter` variant
already gets this right, using the strong ease-out-shaped curve
`[0.22, 1, 0.36, 1]` — that's the repo's own convention to match.

## Target

```jsx
// website/src/components/ui/PageTransition.jsx:10-14 — target
exit: {
  opacity: 0,
  y: -8,
  transition: { duration: 0.20, ease: [0.23, 1, 0.32, 1] },
},
```

Duration stays at `0.20` (200ms) — already within the UI budget (AUDIT.md:
tooltips/small popovers 125–200ms; a page-exit fade is comparable). Only the
easing curve changes, from the string `'easeIn'` to the AUDIT.md strong
ease-out cubic-bezier `cubic-bezier(0.23, 1, 0.32, 1)`, expressed as the
Framer Motion array tuple `[0.23, 1, 0.32, 1]` (this is a JS `transition`
object consumed by Framer Motion, not a CSS rule — do not write a CSS string
or a `var(--ease-out)` reference here).

Do NOT touch the `enter` variant — its `ease: [0.22, 1, 0.36, 1]` is already
correct (ease-out shaped) and is out of scope for this plan.

## Repo conventions to follow

- Framer Motion easing in this codebase is written as a 4-number array tuple
  directly in the `transition` object, not as a CSS custom property — e.g.
  the already-correct `enter` variant one line above:
  `website/src/components/ui/PageTransition.jsx:8` —
  `transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },`
- Match that exact array-literal style for the `exit` variant's new curve.

## Steps

1. In `website/src/components/ui/PageTransition.jsx`, in the `exit` variant's
   `transition` object (line 13), replace `ease: 'easeIn'` with
   `ease: [0.23, 1, 0.32, 1]`. Leave `duration: 0.20` unchanged. Leave every
   other line in the file untouched.

## Boundaries

- Do NOT touch the `enter` variant or the `initial` state.
- Do NOT touch `website/src/App.jsx` — the `AnimatePresence`/routing wiring is
  correct as-is and out of scope.
- Do NOT change the `y` offset values (`12`, `-8`) — motion distance is not
  part of this finding.
- Do NOT add new dependencies or introduce a CSS token — this file is pure
  Framer Motion JS.
- If the file no longer matches the code quoted above (drift since commit
  `a93c46f`), STOP and report instead of improvising.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors
  (Vite/esbuild will catch a malformed `ease` array immediately).
- **Feel check**: run `cd website && npm run dev`, open the site, and click
  between at least two different routes (e.g. Início → Quem Somos → Clientes):
  - The outgoing page should visibly *speed away* at the start of its exit
    (fast-start, not a slow creep) — that's the tell that `ease-in` is gone.
  - The incoming page's enter animation should look unchanged from before.
  - In DevTools → More tools → Animations panel, trigger a route change,
    select the `PageTransition` div's exit animation, and set playback to
    10%. Confirm the opacity/y curve front-loads its motion (fast start,
    slow settle) rather than the old slow-start creep of `easeIn`.
  - Toggle `prefers-reduced-motion: reduce` in DevTools' Rendering panel and
    navigate again — Framer Motion's `enter`/`exit` opacity fade should still
    play (this plan does not add reduced-motion handling to PageTransition;
    that is covered separately by plan 004 if in scope there — do not expand
    this plan to cover it).
- **Done when**: `website/src/components/ui/PageTransition.jsx:13` reads
  `ease: [0.23, 1, 0.32, 1]` and no other line in the file has changed.

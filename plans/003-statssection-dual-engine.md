# 003 — Remove Framer/GSAP double-ownership of StatCard entrance

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance / Cohesion
- **Estimated scope**: 1 file, ~15 lines removed

## Problem

`website/src/components/sections/StatsSection.jsx` animates the same five
`[data-statcard]` DOM nodes with two independent, competing animation
engines.

**Engine 1 — Framer Motion**, on the `StatCard` component itself
(`website/src/components/sections/StatsSection.jsx:48-60`):

```jsx
// website/src/components/sections/StatsSection.jsx:53-60 — current
<motion.div
  initial={{ opacity: 0, y: 28 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.7, delay: stat.delay, ease: [0.22, 1, 0.36, 1] }}
  className="flex flex-col items-center text-center px-4 py-6 group"
  data-statcard="true"
>
```

`inView` is computed once in the parent via a local `useInView` hook fired on
viewport mount (`website/src/components/sections/StatsSection.jsx:123`):

```jsx
// website/src/components/sections/StatsSection.jsx:119-123 — current
export default function StatsSection() {
  const sectionRef = useRef(null)
  const bgRef      = useRef(null)
  const gridRef    = useRef(null)
  const inView     = useInView(sectionRef, { once: true, margin: '-80px' })
```

...and threaded down as a prop at the map call site
(`website/src/components/sections/StatsSection.jsx:190-193`):

```jsx
// website/src/components/sections/StatsSection.jsx:190-193 — current
<div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-white/[0.07]">
  {stats.map((stat) => (
    <StatCard key={stat.label} stat={stat} inView={inView} />
  ))}
</div>
```

**Engine 2 — GSAP ScrollTrigger**, in the same file's `useGSAP` hook, targeting
the exact same nodes via the `[data-statcard]` attribute selector
(`website/src/components/sections/StatsSection.jsx:135-149`):

```jsx
// website/src/components/sections/StatsSection.jsx:135-149 — current
gsap.from('[data-statcard]', {
  scale: 0.7,
  opacity: 0,
  y: 40,
  duration: 0.7,
  stagger: { each: 0.1, from: 'start' },
  ease: 'back.out(1.5)',
  clearProps: 'all',
  scrollTrigger: {
    trigger: gridRef.current,
    start: 'top 82%',
    toggleActions: 'play none none none',
  },
})
```

Both engines animate `opacity` and `y` on the same elements, triggered by two
different conditions (Framer's viewport-mount `useInView` vs GSAP's
`ScrollTrigger` at `'top 82%'`), racing on the same frames. GSAP's own
`clearProps: 'all'` on completion additionally strips whatever inline styles
Framer applied, which can leave the cards in a Framer-authored intermediate
state if GSAP's cleanup runs while Framer's animation is still resolving.

The GSAP version is the more deliberate of the two: it has real stagger
(`each: 0.1`), a physical `back.out(1.5)` overshoot ease, and is properly
scroll-triggered rather than viewport-mount-triggered. Framer's copy is
redundant and should be removed, not the other way around.

## Target

`StatCard` no longer owns any entrance animation — GSAP is the sole engine
driving `[data-statcard]`'s scale/opacity/y entrance, unchanged from what it
does today (`back.out(1.5)`, `duration: 0.7`, `stagger: { each: 0.1, from: 'start' }`,
`scrollTrigger` at `'top 82%'`). Framer Motion is fully removed from the
per-card entrance path; the `inView` prop is no longer threaded from
`StatsSection` to `StatCard`.

```jsx
// website/src/components/sections/StatsSection.jsx:53-60 — target
function StatCard({ stat }) {
  const dashOffset = CIRCUMFERENCE * (1 - stat.fillPercent)
  const R = 45
  const SIZE = 110

  return (
    <div
      className="flex flex-col items-center text-center px-4 py-6 group"
      data-statcard="true"
    >
```

```jsx
// website/src/components/sections/StatsSection.jsx:190-193 — target
<div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-white/[0.07]">
  {stats.map((stat) => (
    <StatCard key={stat.label} stat={stat} />
  ))}
</div>
```

GSAP's `gsap.from('[data-statcard]', {...})` block at
`website/src/components/sections/StatsSection.jsx:135-149` is left byte-for-byte
unchanged — this plan removes Framer's competing ownership, it does not retune
GSAP.

Everything inside `StatCard` that is NOT the outer entrance wrapper stays
exactly as-is:
- The SVG progress ring's `motion.circle` `strokeDashoffset` animation
  (`website/src/components/sections/StatsSection.jsx:79-93`) still reads the
  `inView` prop it receives — **do not remove `inView` from the ring's own
  `animate={inView ? {...} : {...}}` logic**. This means `StatCard` still
  needs `inView` as a prop for the ring and the `AnimatedCounter` gate
  (`website/src/components/sections/StatsSection.jsx:98`,
  `{inView ? <AnimatedCounter target={stat.value} duration={2200} /> : 0}`)
  — only the *outer wrapper's* `initial`/`animate`/`transition` props and the
  `motion.div` → plain element downgrade are in scope. Re-read this file
  carefully: `inView` is used in three places inside `StatCard` (outer
  wrapper entrance, ring `strokeDashoffset`, counter gate) and only the first
  is being removed.
- `AnimatedCounter` usage is untouched.

So the parent `StatsSection`'s `useInView` call and the `inView` variable
itself are **still needed** (the ring and counter both consume it) — only the
prop no longer drives the outer wrapper's own entrance transition. The
`StatCard` function signature keeps `inView` as a prop; what changes is that
the outer element stops being a `motion.div` with `initial`/`animate`/
`transition`, becoming either a plain `<div>` or a bare `motion.div` with no
animation props (prefer plain `<div>` — nothing else about that specific
element needs Framer once its entrance props are gone).

## Repo conventions to follow

- GSAP + `useGSAP` scoped to a `sectionRef` via `{ scope: sectionRef,
  dependencies: [] }` is this file's own established pattern for
  scroll-triggered entrances — see the existing background-parallax `gsap.to`
  two lines above the stat-card block
  (`website/src/components/sections/StatsSection.jsx:129-133`). No new
  pattern is being introduced; this plan just stops a second engine from
  fighting it.
- Elsewhere in this same codebase, plain scroll-entrance components that
  don't need GSAP's stagger/physics use `ScrollReveal`
  (`website/src/components/ui/ScrollReveal.jsx`) — note for future reference
  only; do NOT introduce `ScrollReveal` into `StatCard` as part of this plan,
  GSAP already owns this entrance.

## Steps

1. In `website/src/components/sections/StatsSection.jsx`, in the `StatCard`
   function (around line 48), remove `inView` from the destructured second
   usage only where it drives the wrapper — i.e. keep the function signature
   `function StatCard({ stat, inView })` unchanged, since `inView` is still
   consumed by the ring and counter.
2. In the same function, replace the outer `motion.div` (lines 53-60) with a
   plain `<div>`, removing the `initial`, `animate`, and `transition` props
   entirely. Keep `className="flex flex-col items-center text-center px-4
   py-6 group"` and `data-statcard="true"` on the new `<div>`. Update the
   matching closing tag from `</motion.div>` to `</div>` at the end of the
   component (around line 114).
3. Remove the now-unused `motion` import if `StatCard`'s `motion.circle` (the
   SVG ring) is the only remaining Framer usage in this file — check: the
   ring at line 79 is `<motion.circle>`, which still needs `motion` from
   `framer-motion`. Since `motion` is still used, do NOT remove the import
   line `import { motion, useInView } from 'framer-motion'`
   (`website/src/components/sections/StatsSection.jsx:2`) — only confirm
   `useInView` is still used by the parent (`website/src/components/sections/StatsSection.jsx:123`)
   and therefore also stays. No import changes are needed in this file.
4. Leave the parent `StatsSection` function, its `useInView` call (line 123),
   the `inView` variable, and its pass-through at the `stats.map` call site
   (`<StatCard key={stat.label} stat={stat} inView={inView} />`, line 192)
   unchanged — `inView` is still required by the ring and counter inside
   `StatCard`.
5. Leave the `useGSAP` block (lines 125-150), including the `gsap.from(
   '[data-statcard]', {...})` call, completely untouched.

## Boundaries

- Do NOT change GSAP's `stagger: { each: 0.1, from: 'start' }` — 100ms is
  slightly above AUDIT.md's 30-80ms stagger guidance for grouped entrances,
  but retuning it is a separate, lower-priority cohesion nit and explicitly
  out of scope for this plan, which only removes double-ownership.
- Do NOT touch the SVG ring's `motion.circle` `strokeDashoffset` animation
  (`website/src/components/sections/StatsSection.jsx:79-93`) or
  `AnimatedCounter` (`website/src/components/ui/AnimatedCounter.jsx`, not
  read for this plan — leave untouched) — neither is part of the
  double-ownership conflict.
- Do NOT touch the background parallax `gsap.to(bgRef.current, {...})` block
  (lines 129-133) — that's a separate animation on a separate element
  (`bgRef`, not `[data-statcard]`) and is in scope for plan 004
  (reduced-motion gating), not this plan.
- Do NOT remove the parent's `useInView` hook or the `inView` prop threading
  — despite the plan title mentioning removing `inView` threading "if nothing
  else in the file needs it," re-reading the actual file shows the ring and
  counter both still need it, so the prop stays. If you find on re-reading
  that the ring/counter no longer use `inView` (drift since commit
  `a93c46f`), STOP and report — do not remove `useInView` speculatively.
- Do NOT add new dependencies.
- If `StatCard`'s current code doesn't match the three-props-of-`inView`
  structure described above, STOP and report instead of guessing which uses
  are safe to remove.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors
  (removing `motion.div` → `div` and dropping props is a pure JSX edit, no
  new unused-import lint errors expected since both `motion` and `useInView`
  remain genuinely used).
- **Feel check**: run `cd website && npm run dev`, navigate to the homepage,
  and scroll down to the "A AINTAR em Números" stats section:
  - Each of the 5 stat cards should scale up from ~70% with a visible
    springy overshoot (GSAP's `back.out(1.5)`) while fading and sliding in,
    staggered left-to-right — this is GSAP's animation; confirm there is no
    double-motion artifact (e.g. a card appearing to jump or snap partway
    through, which would indicate two engines still fighting).
  - The circular progress ring inside each card should still animate its
    fill (`strokeDashoffset`) and the numeric counter should still count up
    — both driven by `inView`, unaffected by this change.
  - Scroll the section out of view and back into view again (if `once: true`
    semantics apply, it should NOT replay — confirm GSAP's
    `toggleActions: 'play none none none'` still means it plays only once).
  - In DevTools → Animations panel, trigger the section's entrance and set
    playback to 10%; confirm only one opacity/transform animation track
    exists per card (previously there would have been two overlapping
    tracks — a Framer one and a GSAP one).
  - Toggle `prefers-reduced-motion: reduce` in DevTools' Rendering panel —
    GSAP's ScrollTrigger entrance has no reduced-motion gate yet; confirm
    behavior is unchanged by the toggle (this plan does not add one — that
    is plan 004's scope, not this plan's).
- **Done when**: `StatCard`'s outer element in
  `website/src/components/sections/StatsSection.jsx` is a plain `<div>` with
  no `initial`/`animate`/`transition` props, the `gsap.from('[data-statcard]',
  {...})` block is unchanged, and the stat cards' entrance is visually driven
  by GSAP alone with no double-animation artifacts.

# 014 — Add explicit transition tokens to the Filtros panel reveal

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 files, identical 1-line fix each

## Problem

Two nearly-identical "Filtros" collapsible panels, both wrapping the same
`QuickFilters` component, both missing an explicit `transition`:

```jsx
// frontend-v2/src/features/tasks/pages/TaskBoardPage.jsx:340-344 — current
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
>
  <Box mb={{ xs: 2, sm: 3 }}>
    <QuickFilters filters={filters} onChange={handleFiltersChange} />
```

```jsx
// frontend-v2/src/features/tasks/pages/TasksPage.jsx:753-757 — current
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
>
  <Box mb={{ xs: 2, sm: 3 }}>
    <QuickFilters filters={filters} onChange={handleFiltersChange} isAdmin={isAdmin} />
```

Two independent findings on the same lines: (a) `height` is a layout
property (AUDIT.md category 5), and (b) there is no explicit `transition`
prop at all — both currently inherit Framer Motion's default tween timing,
which is a "missing tokens" finding (category 7).

**Investigated whether the height-animating content is fixed or genuinely
variable, to decide the correct fix.** Read
`frontend-v2/src/features/tasks/components/QuickFilters.jsx` in full — its
rendered height is **not constant**:

- The "Cliente" `FormControl` (lines 185-206) only renders when `isAdmin &&
  metadata.associates?.length > 0`.
- The active-filter-badges `Stack` (lines 218-258) only renders when
  `hasActiveFilters` is true, and wraps (`flexWrap="wrap"`) across an
  unpredictable number of lines depending on how many filters are active
  and the container's width.
- The "Limpar Filtros" button (lines 261-270) is likewise conditional.

Because the content's real height depends on runtime state (admin flag,
active filter count, viewport width causing wrap), a `scaleY()`-based
reveal (`initial={{ opacity: 0, scaleY: 0 }}` with `transformOrigin: 'top'`)
would visibly squish/stretch this variable content during the transition
unless paired with an inner un-scaled wrapper (the standard accordion
double-wrapper pattern) — and even then, a squish artifact is more jarring
on multi-line, wrapping content like the filter-badge row than on a fixed
single form layout. Per AUDIT.md's own framing ("prefer transform/opacity
*where possible*" — not an absolute ban), this is a case where keeping
`height: 'auto'` is the right, deliberate exception: the minimum correct
fix is filling in the missing duration/easing tokens, not fighting the
layout property.

## Target

```jsx
// TaskBoardPage.jsx:340-344 — target
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
>
```

```jsx
// TasksPage.jsx:753-757 — target
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
>
```

`0.2s` (200ms) sits inside AUDIT.md's "dropdowns, selects" duration budget
(150-250ms) — a reveal-on-toggle filter panel is the same category of
element. The curve is AUDIT.md's `--ease-out: cubic-bezier(0.23, 1, 0.32,
1)`, expressed as the Framer array `[0.23, 1, 0.32, 1]` (entering/exiting →
ease-out).

`height` remains in `initial`/`animate`/`exit` as a **documented, accepted
exception** to the transform/opacity-only rule — not an oversight.

## Repo conventions to follow

- Same ease-out array used in plan 013's badge fix and plan 019's future
  `EASE_OUT` token (`[0.23, 1, 0.32, 1]`) — use it verbatim here too, for
  consistency even before the token module exists.
- `QuickFilters.jsx` itself is unchanged — this plan only touches the two
  page-level wrapper `motion.div`s, not the filter form.

## Steps

1. In `frontend-v2/src/features/tasks/pages/TaskBoardPage.jsx`, on the
   `motion.div` at lines 340-343, add `transition={{ duration: 0.2, ease:
   [0.23, 1, 0.32, 1] }}` as a new prop (after `exit`, before the closing
   `>`). Do not change `initial`/`animate`/`exit`.
2. In `frontend-v2/src/features/tasks/pages/TasksPage.jsx`, on the
   `motion.div` at lines 753-756, apply the identical change.

## Boundaries

- Do NOT convert `height: 0` / `height: 'auto'` to a `scaleY()`-based
  approach — investigated and rejected for this specific component (see
  Problem: `QuickFilters`' content is genuinely variable-height with
  wrapping badges, which would visibly squish under `scaleY`).
- Do NOT touch `QuickFilters.jsx` itself.
- Do NOT touch the `showStats` panel in `TaskBoardPage.jsx` (lines 220-226,
  a separate `scale`-based `motion.div` with its own `transition={{
  duration: 0.2 }}` already set) — it already has an explicit transition
  and uses `scale`, not `height`; out of scope, already compliant enough
  that it isn't one of this plan's two findings.
- Do NOT touch the view-switch `motion.div` in `TasksPage.jsx` (around line
  812-818, `AnimatePresence mode="wait"` with its own `y`/`opacity`
  transition) — unrelated animation, not a Filtros panel.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/features/tasks/pages/TaskBoardPage.jsx src/features/tasks/pages/TasksPage.jsx`
  — no new errors/warnings.
- **Feel check**, on both `TaskBoardPage` (kanban view) and `TasksPage`
  (list view):
  - Click the "Filtros"/"Filtros Rápidos" toggle icon: the panel should
    grow open over ~200ms with a fast-start, gentle-settle feel (ease-out),
    not a linear or slow-starting reveal.
  - As an admin user (if reachable in your test environment), toggle a
    client filter selection so the active-filter-badge row appears/disappears
    while the panel is already open — confirm the panel doesn't need to be
    closed/reopened to reflow, and that this internal content change
    doesn't fight with the open/close animation (it shouldn't, since `height:
    'auto'` naturally accommodates content changes once open).
  - Close the panel: it should shrink over the same ~200ms, ease-out.
  - In DevTools Animations panel, set playback to 10% and scrub the
    open/close — confirm a smooth, non-linear (ease-out) height change, not
    a snap.
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling here; confirm the animation still plays
    (unchanged), establishing a clean baseline for any future reduced-motion
    pass.
- **Done when**: both `motion.div`s have an explicit `transition` prop with
  `duration: 0.2` and the `[0.23, 1, 0.32, 1]` easing array, and neither
  `initial`/`animate`/`exit` value changed.

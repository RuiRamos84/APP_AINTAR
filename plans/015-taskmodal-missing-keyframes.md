# 015 — Fix TaskModal's "Nova" chip: undefined `pulse` keyframe

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Cohesion (functional defect)
- **Estimated scope**: 1 file, 1 line

## Problem

```jsx
// frontend-v2/src/features/tasks/components/TaskModal.jsx:249-256 — current
{/* Notificação */}
{hasNotification && (
  <Chip
    label="Nova"
    color="error"
    size="small"
    sx={{ animation: 'pulse 2s infinite' }}
  />
)}
```

`sx={{ animation: 'pulse 2s infinite' }}` references a keyframe named
`pulse`. Confirmed by reading the entire file (397 lines): no local
`'@keyframes pulse'` block exists anywhere in `TaskModal.jsx`, and MUI's
`sx` prop only resolves `@keyframes` references declared inline within the
same (or an ancestor) `sx`/emotion scope — there is no global `pulse`
keyframe registered anywhere that this component could be inheriting from.
The `animation` property silently references an undefined name: the browser
ignores it, so this Chip never pulses. It's a dead, no-op style — visually
indistinguishable from having no `animation` property at all, which means
the "Nova" badge on a task's notification history tab loses the attention-
grabbing pulse its author clearly intended.

## Target

```jsx
// TaskModal.jsx:249-256 — target
{/* Notificação */}
{hasNotification && (
  <Chip
    label="Nova"
    color="error"
    size="small"
    sx={{
      animation: 'pulse 2s infinite',
      '@keyframes pulse': {
        '0%, 100%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.1)' },
      },
    }}
  />
)}
```

Identical keyframe body to the working exemplar in `TaskCard.jsx` — same
values, same structure, no invention of a new pulse curve.

## Repo conventions to follow

- `frontend-v2/src/features/tasks/components/TaskCard.jsx:315-331` has the
  correct, working pattern — a local `'@keyframes pulse'` declared inline
  inside the same `sx` object as the `animation` property that references
  it:
  ```jsx
  sx={{
    ...
    animation: 'pulse 2s infinite',
    '@keyframes pulse': {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.1)' },
    },
  }}
  ```
  MUI/emotion scopes `@keyframes` declared this way locally to the
  generated class, which is why it must be repeated per `sx` object rather
  than declared once and referenced — this is the established, correct
  project pattern (not a shortcut to fix here by extracting a shared
  keyframe).

## Steps

1. In `frontend-v2/src/features/tasks/components/TaskModal.jsx`, on the
   `Chip`'s `sx` prop (line 254), change `sx={{ animation: 'pulse 2s
   infinite' }}` to include the `'@keyframes pulse'` block shown in Target,
   copied verbatim from `TaskCard.jsx:326-330`.

## Boundaries

- Do NOT consolidate this into a shared/global keyframe. At least two other
  files in this codebase already declare their own, slightly different
  `pulse`-named keyframe bodies locally (e.g. `TaskCard.jsx`'s
  `scale(1)`/`scale(1.1)` version is not the only one in the app) —
  unifying them into one shared definition is a separate, broader
  consolidation decision (naming, value reconciliation across call sites)
  explicitly out of scope for this plan. This plan fixes the one broken
  reference; it does not refactor the pattern.
- Do NOT change the `Chip`'s other props (`label`, `color`, `size`) or its
  conditional rendering (`hasNotification &&`).
- Do NOT touch `TaskCard.jsx` — it's already correct, only used as a
  reference to copy from.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/features/tasks/components/TaskModal.jsx`
  — no new errors/warnings.
- **Feel check**: open a task that has an unread notification (`hasNotification`
  true — e.g. a task with a pending update visible via the socket-driven
  unread state) in `TaskModal`:
  - The "Nova" chip next to the priority/status chips should now visibly
    pulse (grow to 110% and back, on a 2-second loop) — before this fix it
    was static.
  - In DevTools Elements panel, inspect the Chip and confirm the computed
    `animation-name` resolves to an actual `@keyframes` rule (not
    `animation-name: pulse` with no matching rule, which was the bug).
  - In DevTools Animations panel, the pulse should show up as a running,
    looping animation track — confirm it's actually present now (it was
    absent before this fix, since an undefined keyframe produces zero
    animation frames).
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling to this infinite-loop pulse; note that as a
    pre-existing gap shared with `TaskCard.jsx`'s identical pattern, not
    something this plan introduces or is expected to fix.
- **Done when**: the "Nova" chip visibly pulses in the running app, and the
  `'@keyframes pulse'` block is present in `TaskModal.jsx`'s `sx` object at
  the same location as `TaskCard.jsx`'s.

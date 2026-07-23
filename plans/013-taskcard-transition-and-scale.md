# 013 — TaskCard: explicit hover transition + fix notification badge scale(0)

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance / Physicality
- **Estimated scope**: 1 file, 2 declarations (merged: same file, one HIGH +
  one MEDIUM finding, per the template's same-file merge allowance)

## Problem

`frontend-v2/src/features/tasks/components/TaskCard.jsx` is the single
most-repeated interactive element in the app — every task on every kanban
board column (`TaskColumn.jsx`) renders one, and boards are the primary
working surface of the Tasks module. Both findings below are on this file's
hot path.

**Finding 1 (performance) — `transition: all` on the outer `Card`:**

```jsx
// frontend-v2/src/features/tasks/components/TaskCard.jsx:273-299 — current
<Card
  ref={drag}
  onClick={handleCardClick}
  sx={{
    position: 'relative',
    borderLeft: `${compact ? 3 : 4}px solid ${borderColor}`,
    borderRadius: compact ? 1.5 : 2,
    overflow: 'visible',
    cursor: canDrag ? 'grab' : 'pointer',
    bgcolor: hasNotification
      ? alpha(theme.palette.error.main, 0.05)
      : 'background.paper',
    transition: 'all 0.2s ease',
    '&:hover': compact
      ? {}
      : {
          boxShadow: theme.shadows[8],
          transform: canDrag ? 'translateY(-4px)' : 'translateY(-2px)',
        },
    '&:active': compact
      ? { transform: 'scale(0.98)' }
      : canDrag
        ? { cursor: 'grabbing' }
        : {},
  }}
>
```

Only `boxShadow` and `transform` actually change, on `&:hover` (non-compact)
and `&:active` (compact only — `scale(0.98)`). `borderLeft`, `borderRadius`,
`cursor`, `bgcolor` never change via CSS state transitions on this element
(they change via React re-render when props change, which `transition: all`
doesn't meaningfully help with anyway).

**Finding 2 (physicality) — notification badge violates `scale(0)` rule,
and has no explicit transition at all:**

```jsx
// TaskCard.jsx:301-337 — current
<AnimatePresence>
  {hasNotification && (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      style={{ position: 'absolute', top: -8, right: -8, zIndex: 1 }}
    >
      <Box sx={{
        bgcolor: 'error.main',
        color: 'error.contrastText',
        borderRadius: '50%',
        width: 24, height: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: theme.shadows[4],
        animation: 'pulse 2s infinite',
        '@keyframes pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      }}>
        <NotificationIcon sx={{ fontSize: 14 }} />
      </Box>
    </motion.div>
  )}
</AnimatePresence>
```

Per AUDIT.md category 3: "Never `scale(0)` — nothing in the real world
appears from nothing. Target: `scale(0.9–0.97)` + `opacity: 0`." This badge
scales fully from 0.

No `transition` prop is present on the `motion.div`, so Framer Motion
applies its default spring for the `scale` value (Framer's implicit default
for non-keyframed numeric values like `scale` is a spring, not a tween).
This is a physicality/character issue independent of the `scale(0)` bug:
the fix below changes it to an explicit tween — this is an intentional
change, not just a value tweak, and is called out below so it isn't
mistaken for scope creep.

## Target

```jsx
// TaskCard.jsx:285 — target (Card sx, only the transition line changes)
transition: 'box-shadow 0.2s ease, transform 0.2s ease',
```
Both the `&:hover` boxShadow/transform pair and the `&:active` compact-mode
`scale(0.98)` are covered by `transform` being in this list — no separate
active-state transition needed, they share the same property.

```jsx
// TaskCard.jsx:301-337 — target
<AnimatePresence>
  {hasNotification && (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: 'absolute', top: -8, right: -8, zIndex: 1 }}
    >
      {/* Box content unchanged */}
    </motion.div>
  )}
</AnimatePresence>
```

`0.16s` (160ms) sits in AUDIT.md's "tooltips, small popovers" duration
budget (125-200ms) — this badge is exactly that scale of element. The curve
is AUDIT.md's `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, expressed as the
Framer-compatible array `[0.23, 1, 0.32, 1]`, matching the "entering/exiting
→ ease-out" rule. Note: this replaces the current **implicit spring** with
an **explicit tween** — a deliberate character change (a badge popping into
a fixed corner position doesn't need spring overshoot/bounce; a crisp
ease-out tween is the correct feel for a small, fixed-position UI
indicator, not a physically-thrown object), not merely filling in a missing
duration.

## Repo conventions to follow

- `TaskCard.jsx:326-330` already has a correctly-scoped local
  `'@keyframes pulse'` inline inside the same `sx` object — this plan
  doesn't touch it, but it's the working exemplar plan 015 (TaskModal) will
  copy.
- AUDIT.md's ease-out array `[0.23, 1, 0.32, 1]` is used verbatim (no
  approximation) — same values plan 019 will centralize into a token module;
  this plan hand-writes the array since the token module doesn't exist yet.

## Steps

1. In `TaskCard.jsx`, on the `Card` sx (line 285), replace `transition:
   'all 0.2s ease'` with `transition: 'box-shadow 0.2s ease, transform 0.2s
   ease'`. Leave the `&:hover` and `&:active` blocks (lines 286-298)
   untouched.
2. On the notification badge `motion.div` (lines 304-307), change
   `initial={{ scale: 0 }}` to `initial={{ scale: 0.9, opacity: 0 }}`,
   `animate={{ scale: 1 }}` to `animate={{ scale: 1, opacity: 1 }}`,
   `exit={{ scale: 0 }}` to `exit={{ scale: 0.9, opacity: 0 }}`, and add
   `transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}` as a new prop
   on the same element. Leave the inner `Box` (including its own
   `@keyframes pulse` animation) completely untouched.

## Boundaries

- Does NOT touch the outer wrapping `Box` (`TaskCard.jsx:266-271`, the
  `opacity: isDragging ? 0.5 : 1` drag-feedback wrapper) or `TaskColumn.jsx`
  — those belong to plan 020 (kanban drag feedback), which is already
  editing this same file's drag-lift behavior; keeping the two plans'
  line ranges disjoint (013: lines 285, 301-337 / 020: lines 171-186,
  265-271, plus TaskColumn.jsx) avoids a merge conflict. Apply either plan
  first.
- Do NOT touch the working `@keyframes pulse` at lines 326-330 — it's
  correct as-is and is the exemplar plan 015 copies elsewhere.
- Do NOT change the badge's position (`top: -8, right: -8`) or size
  (`width: 24, height: 24`).
- Do NOT add a spring config to the badge — the Target explicitly chooses a
  tween; do not "improve" this into a bouncier spring without a separate,
  deliberate decision (see Problem's physicality note for why tween is
  correct here).

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/features/tasks/components/TaskCard.jsx`
  — no new errors/warnings.
- **Feel check**: open a Tasks kanban board (`/intern/tasks` or wherever
  `TaskBoardPage` is routed) with the dev server running:
  - Hover a non-compact task card: it lifts (`translateY`) and gains shadow
    smoothly — confirm nothing else visibly "jumps" (border-radius,
    cursor, background should never appear to transition, they were never
    meant to).
  - On a compact card (mobile/dense view), press-and-hold: the card should
    scale down slightly (`scale(0.98)`) via the same `transform` transition.
  - Trigger a task notification (or find a task with `hasNotification`
    true, e.g. via the socket-driven unread state) and watch the red badge
    appear in the top-right corner: it should grow from a slightly-shrunk,
    faded state (not from nothing) with a crisp, fast pop — no bounce/
    overshoot.
  - Mark the notification read (or navigate away and back) and watch the
    badge disappear: same crisp shrink-and-fade, not a fade-through-nothing.
  - In DevTools Animations panel, set playback to 10% on the badge
    appear/disappear and confirm the badge is never fully invisible-by-scale
    at any frame (it should bottom out around 90% size + 0 opacity, not
    literally vanish then reappear).
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling to TaskCard (not in its scope); confirm
    behavior is unchanged with the toggle on, so a future plan has a clean
    baseline to gate.
- **Done when**: `Card`'s `sx.transition` no longer contains the string
  `all`, and the badge's `initial`/`exit` no longer contain `scale: 0`
  (bare zero) anywhere.

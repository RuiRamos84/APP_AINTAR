# 020 — Add lift feedback to dragged TaskCard; fix drop-zone transition:all

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Physicality
- **Estimated scope**: 2 files, small additions

## Problem

`frontend-v2/src/features/tasks/components/TaskCard.jsx` is the app's
highest-frequency gesture-driven interaction — every task drag on every
kanban board goes through this component. `useDrag` (react-dnd) wiring:

```jsx
// TaskCard.jsx:171-186 — current
const [{ isDragging }, drag] = useDrag(
  () => ({
    type: ItemTypes.TASK,
    item: { id: task.pk || task.id, task: task, columnId: columnId, canDrag: canDrag },
    canDrag: canDrag,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }),
  [task, columnId, canDrag]
);
```

The only visual feedback while dragging:

```jsx
// TaskCard.jsx:265-271 — current
<Box
  sx={{
    opacity: isDragging ? 0.5 : 1,
    transition: 'opacity 0.2s',
    position: 'relative',
  }}
>
```

No lift (elevation/shadow), no scale — a card being dragged just dims. It
doesn't read as "picked up," and there's no settle-on-drop feedback either.

**`react-dnd`'s constraint, investigated via `TaskColumn.jsx`'s `useDrop`
side too:** `isDragging`/`isOver`/`canDrop` are all booleans from
`monitor.collect()` — react-dnd does not expose velocity or continuous
gesture position the way a pointer-events-based custom drag implementation
would. There is no real physics data available to drive a spring or a
velocity-aware settle animation; faking one without real motion data would
mean guessing numbers that don't correspond to the actual gesture, which
AUDIT.md's own principle (don't fake feel you can't measure) argues
against. The realistic scope here is a lift-while-held effect (driven by
the existing boolean `isDragging`) plus fixing an adjacent, already-broken
transition in the drop zone this plan is already touching — not a
simulated spring-physics drop.

**Second finding, in the same drag/drop story, same immediate area —
`TaskColumn.jsx`'s drop-zone `transition: 'all 0.3s ease'`:**

```js
// frontend-v2/src/features/tasks/components/TaskColumn.jsx:134-142 — current
const dropZoneStyle = {
  bgcolor: isOver && canDrop ? alpha(config.color, 0.1) : 'transparent',
  borderColor: isOver && canDrop ? config.color : 'transparent',
  borderWidth: 2,
  borderStyle: 'dashed',
  borderRadius: 2,
  transition: 'all 0.3s ease',
};
```
Applied via `...dropZoneStyle` spread onto the scrollable task-list `Box`
(`TaskColumn.jsx:227-250`, spread at line 235). Only `bgcolor` and
`borderColor` actually change (on `isOver && canDrop`) — `borderWidth`,
`borderStyle`, `borderRadius` never change. This is a `transition: all`
finding (AUDIT.md category 5) that plan 011 explicitly does NOT cover
(plan 011 is scoped to nav-chrome layout files; `TaskColumn.jsx` is a
feature-layer file). It's fixed here, in the same plan as the rest of the
drag/drop lift/drop story, rather than left unaddressed in either plan.

## Target

**TaskCard — lift while dragging, in addition to the existing dim:**

```jsx
// TaskCard.jsx:265-271 — target
<Box
  sx={{
    opacity: isDragging ? 0.5 : 1,
    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isDragging ? (theme) => theme.shadows[6] : 'none',
    transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
    position: 'relative',
  }}
>
```

A subtle 1.02 scale-up plus a shadow reads as "lifted off the board,"
distinct from the inner `Card`'s own hover lift (`translateY(-4px)`, plan
013) — this is the whole card, including its notification badge, visibly
picked up during the drag gesture, not just dimmed.

**TaskColumn — explicit properties instead of `all`:**

```js
// TaskColumn.jsx:134-142 — target
const dropZoneStyle = {
  bgcolor: isOver && canDrop ? alpha(config.color, 0.1) : 'transparent',
  borderColor: isOver && canDrop ? config.color : 'transparent',
  borderWidth: 2,
  borderStyle: 'dashed',
  borderRadius: 2,
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
};
```

**Known limitation, not fixed, documented rather than faked:** there is no
"settle" animation on successful drop. `react-dnd`'s `useDrop`/`useDrag`
collectors provide no velocity or release-position data to base one on. A
real settle animation (e.g. a brief spring overshoot as the card lands in
its new column) would require migrating to a pointer-events-based drag
implementation with actual gesture tracking (e.g. a library that exposes
release velocity) — that is a bigger, separate piece of work, explicitly
out of scope here. See Boundaries.

## Repo conventions to follow

- `TaskCard.jsx:285` (the inner `Card`'s own hover transition, fixed by
  plan 013 in this same round) is the pattern to match for multi-property
  transitions on this exact component family: comma-separated explicit
  properties, same duration where they share a cause.
- `theme.shadows[N]` usage for elevation follows the same pattern already
  used on the inner `Card`'s hover state (`TaskCard.jsx:289`,
  `theme.shadows[8]`) — this plan uses a lighter `theme.shadows[6]` for the
  *outer* drag-lift (distinct from, and slightly less than, the inner
  card's own hover elevation) so the two don't visually compete if a card
  is somehow both hovered and dragging (edge case, but keeping the outer
  lift's shadow one step lower avoids it ever looking heavier than the
  inner hover state).

## Steps

1. In `TaskCard.jsx`, on the outer `Box` (lines 266-271), add `transform:
   isDragging ? 'scale(1.02)' : 'scale(1)'` and `boxShadow: isDragging ?
   (theme) => theme.shadows[6] : 'none'` as new sx properties, and change
   `transition: 'opacity 0.2s'` to `transition: 'opacity 0.2s, transform
   0.2s, box-shadow 0.2s'`.
2. In `TaskColumn.jsx`, on `dropZoneStyle` (lines 134-142), change
   `transition: 'all 0.3s ease'` to `transition: 'background-color 0.3s
   ease, border-color 0.3s ease'`. No other property in this object
   changes.

## Boundaries

- Does NOT touch `TaskCard.jsx:285` (the inner `Card`'s own `transition:
  all` / hover lift) or `TaskCard.jsx:301-337` (the notification badge) —
  those are plan 013's scope, already fixed in this same round. This
  plan's edits are confined to the outer wrapping `Box` (lines 266-271)
  only, keeping the two plans' line ranges in this file disjoint.
- Do NOT attempt to fake a velocity-based settle animation on drop — no
  real gesture data exists to base one on via `react-dnd`'s boolean
  collectors. If a genuine settle animation is wanted later, it requires
  migrating to a pointer-events-based drag library with real release
  velocity — flagged as explicit future/bigger-scope work, not attempted
  here.
- Do NOT change `react-dnd`'s `useDrag`/`useDrop` configuration
  (`canDrag`, `collect`, `accept`, `drop` handlers) in either file — only
  the CSS/sx driven by their existing boolean outputs.
- Do NOT touch the existing task-entrance stagger in `TaskColumn.jsx`
  (lines 289-310, the `motion.div` with `layout`, `initial`/`animate`/`exit`,
  `delay: compact ? 0 : index * 0.05`) — it's a separate, already-reasonable
  pattern (30-80ms stagger budget, already compliant), not part of this
  finding.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/features/tasks/components/TaskCard.jsx src/features/tasks/components/TaskColumn.jsx`
  — no new errors/warnings.
- **Feel check**: open a kanban board with at least two columns and a
  draggable task (a task where `canDrag` is true per the component's own
  business rules — see `TaskCard.jsx:150-168`):
  - Start dragging a card: it should visibly lift (subtle scale-up +
    shadow) in addition to the existing dim — it should read as "picked
    up," not just faded.
  - Drag it over a valid drop column: the column's drop zone should still
    show its dashed highlight border/background exactly as before (only
    the transition mechanism changed, not the visual states themselves).
  - Drop the card: it should settle into its new position (no fancy
    animation expected — per Problem, a real settle animation isn't
    feasible here; confirm it just lands cleanly with no visual glitch,
    which is the honest baseline this plan targets).
  - Drag a card over its own current column (`canDrop` false there per
    `TaskColumn.jsx`'s `canDrop` logic): confirm no drop-zone highlight
    appears (unchanged business logic, not touched by this plan).
  - In DevTools Animations panel, set playback to 10% while dragging and
    confirm `opacity`, `transform`, and `box-shadow` all animate together
    smoothly on pickup — no property snapping ahead of the others.
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling to the drag-lift effect; confirm the scale/
    shadow still apply with the toggle on (unchanged from this plan's
    baseline — a future reduced-motion pass could drop the `scale` while
    keeping `opacity`/`boxShadow`, per AUDIT.md's "keep opacity/color
    feedback, drop movement," but that's not this plan's job).
- **Done when**: dragging a `TaskCard` shows a visible scale+shadow lift in
  addition to the existing opacity dim, and `TaskColumn.jsx`'s
  `dropZoneStyle.transition` no longer contains the string `all`.

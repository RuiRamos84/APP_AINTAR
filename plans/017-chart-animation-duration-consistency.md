# 017 — Consistent, budget-compliant chart entrance animation across chart types

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 4 files, small prop additions each

## Problem

`frontend-v2/src/features/dashboards/components/charts/ChartCard.jsx`
renders one of four interchangeable Recharts-based components
(`AppBarChart`, `AppAreaChart`, `AppLineChart`, `AppPieChart`) from the
**same underlying `data`**, switched live via a `ToggleButtonGroup`
(`ChartCard.jsx:91-110`, `CHART_TYPES` at lines 23-30, `renderChart()`
switch at lines 72-80) — a user can flip between bar/area/line/pie on one
dashboard card without the data changing.

Only `AppPieChart.jsx` sets explicit animation props:

```jsx
// frontend-v2/src/features/dashboards/components/charts/AppPieChart.jsx:52-64 — current
<Pie
  data={data}
  cx="50%"
  cy="50%"
  innerRadius={innerRadius}
  outerRadius="72%"
  dataKey={valueKey}
  nameKey={nameKey}
  labelLine={false}
  label={renderCustomLabel}
  animationBegin={0}
  animationDuration={700}
>
```

`AppBarChart.jsx`, `AppAreaChart.jsx`, and `AppLineChart.jsx` (all read in
full) set **no** `animationDuration`/`animationEasing` on their `<Bar>`/
`<Area>`/`<Line>` elements at all — they silently inherit Recharts'
internal defaults (`animationDuration={1500}`, default easing `"ease"`).

Confirmed installed version: `frontend-v2/package.json:52` —
`"recharts": "^3.8.0"`.

Two problems: (1) **inconsistency** — toggling from bar (1500ms default) to
pie (700ms explicit) to line (1500ms default) on the same card gives the
entrance a different pace every time, which reads as unpolished on a
control that's explicitly designed for quick, repeated switching; (2)
**budget** — AUDIT.md category 2 caps UI animations at 300ms, and these
charts re-render their entrance on every filter/date-range change on an
**operational dashboard**, not a one-time marketing reveal — 700-1500ms is
far over budget for something that can retrigger on every interaction with
the surrounding filter controls.

## Target

All four chart components get the same explicit, budget-compliant
animation props:

```jsx
// AppPieChart.jsx:62-63 — target (value change, not just filling a gap)
animationBegin={0}
animationDuration={300}
animationEasing="ease-out"
```

```jsx
// AppBarChart.jsx — target, added to <Bar> (both the multi-series map at
// line ~86 and the single-series case at line ~97)
<Bar
  ...
  animationBegin={0}
  animationDuration={300}
  animationEasing="ease-out"
>
```

```jsx
// AppAreaChart.jsx — target, added to <Area> (line ~65)
<Area
  ...
  animationBegin={0}
  animationDuration={300}
  animationEasing="ease-out"
/>
```

```jsx
// AppLineChart.jsx — target, added to <Line> (line ~61)
<Line
  ...
  animationBegin={0}
  animationDuration={300}
  animationEasing="ease-out"
/>
```

`300ms` is the top of AUDIT.md's UI budget (under 300ms) and matches
"entering/exiting → ease-out" from the easing decision order.
`animationEasing="ease-out"` is one of Recharts' own documented preset
string values for this prop (`'ease' | 'ease-in' | 'ease-out' |
'ease-in-out' | 'linear'`) — not an invented value; no custom
cubic-bezier string is used because Recharts' `animationEasing` prop is
typed to this fixed set of presets, not arbitrary CSS easing syntax.

**Additional, clean, small improvement — suppress re-animation on data
updates, only animate first mount:** since these charts re-render on every
filter/date-range change (not a one-time reveal) and Recharts supports
`isAnimationActive` per-series, gate it on a mount ref so switching chart
type (a genuinely new visual) still animates, but a data refresh on the
*same* chart type does not replay the full entrance:

```jsx
// target — same pattern applied to AppBarChart.jsx, AppAreaChart.jsx, AppLineChart.jsx
import { useEffect, useRef } from 'react';
// ...inside the component:
const hasMountedRef = useRef(false);
useEffect(() => { hasMountedRef.current = true; }, []);
// ...on the Bar/Area/Line element:
isAnimationActive={!hasMountedRef.current}
```

This works correctly with `ChartCard`'s toggle: switching `chartType`
unmounts the old chart component and mounts a fresh instance of the new
one (see `ChartCard.jsx`'s `renderChart()` switch — only one branch is ever
rendered), so `hasMountedRef` resets to `false` on every type switch
(correctly re-enabling the entrance animation for the newly-chosen type),
while a `data` prop change within the *same* mounted chart type (e.g. the
user picks a different date range) correctly suppresses replay since
`hasMountedRef.current` is already `true` by then. `AppPieChart.jsx` gets
the same treatment on its `<Pie>` for consistency, even though it's a
single instance (not multiple series), so the whole family behaves
uniformly.

## Repo conventions to follow

- `fluidChartHeight()` in `frontend-v2/src/features/dashboards/components/charts/chartUtils.js`
  is this exact chart family's existing pattern for a single shared
  behavior applied consistently across all four chart components — this
  plan follows the same "one small addition, repeated identically across
  the four files" shape.
- Keep prop ordering consistent with how `animationBegin`/`animationDuration`
  already appear together on `AppPieChart.jsx`'s `<Pie>` — add
  `animationEasing` immediately after `animationDuration` in all four
  files for a uniform diff shape.

## Steps

1. `AppPieChart.jsx:62-63` — change `animationDuration={700}` to
   `animationDuration={300}`, add `animationEasing="ease-out"` on the next
   line.
2. `AppPieChart.jsx` — add `import { useRef, useEffect } from 'react';` (or
   extend the existing React import if one exists — this file currently has
   no React import since it's JSX-only via the new transform; check first),
   add `const hasMountedRef = useRef(false); useEffect(() => {
   hasMountedRef.current = true; }, []);` inside the component body (after
   the early `if (!data.length) return null;` guard — place it before that
   guard instead, since hooks must run unconditionally on every render; put
   it at the top of the component, before the `if (!data.length)` check),
   add `isAnimationActive={!hasMountedRef.current}` to the `<Pie>` element.
3. `AppBarChart.jsx` — add the same `useRef`/`useEffect` mount-tracking
   (before the `if (!data.length) return null;` guard), add
   `animationBegin={0} animationDuration={300} animationEasing="ease-out"
   isAnimationActive={!hasMountedRef.current}` to both `<Bar>` occurrences
   (the multi-series map and the single-series branch).
4. `AppAreaChart.jsx` — same mount-tracking addition, add the four
   animation props to the `<Area>` element inside its `.map()`.
5. `AppLineChart.jsx` — same mount-tracking addition, add the four
   animation props to the `<Line>` element inside its `.map()`.

## Boundaries

- Do NOT touch `ChartCard.jsx`'s `ToggleButtonGroup`/type-switch logic —
  the mount-reset behavior described above relies on its existing
  unmount/remount-on-switch behavior as-is; no change needed or wanted
  there.
- Do NOT invent an `animationEasing` value outside Recharts' documented
  preset strings (`'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' |
  'linear'`) — do not pass a raw `cubic-bezier(...)` string to this prop.
- Do NOT change `height`, `colors`, axis, tooltip, or any non-animation
  prop on any of the four chart components.
- Do NOT add the mount-tracking pattern to any other chart or component
  outside this exact set of four files.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/features/dashboards/components/charts/AppPieChart.jsx src/features/dashboards/components/charts/AppBarChart.jsx src/features/dashboards/components/charts/AppAreaChart.jsx src/features/dashboards/components/charts/AppLineChart.jsx`
  — no new errors/warnings (in particular no "React Hook useEffect called
  conditionally" — confirm the hook calls are before the `if (!data.length)`
  early return in every file).
- **Feel check**: open any dashboard page with a `ChartCard` (e.g. under
  `/dashboards`) with the dev server running:
  - Switch chart type via the toggle (bar → area → line → pie → table →
    bar): each chart type's entrance should now feel the same pace
    (~300ms, quick) — no more noticeably-slower bar/area/line vs.
    noticeably-faster pie.
  - With a chart type selected, change whatever filter/date control feeds
    this dashboard's data (if reachable in your test data): the chart
    should update its data WITHOUT replaying the growth-from-zero entrance
    animation — bars/lines/areas should just redraw at their new values
    directly.
  - Switch chart type again after a data-only update: the entrance
    animation should play again (proving the mount-ref correctly resets on
    type switch, not just permanently disabling itself after first ever
    render).
  - In DevTools Animations panel, set playback to 10% on a chart-type
    switch and confirm the entrance takes ~300ms with a fast-start,
    settle-at-end feel (ease-out), not linear.
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion gating to Recharts' own animation system (Recharts
    doesn't read the media query itself); note this as a known gap, not
    something silently fixed here.
- **Done when**: all four chart components pass `animationDuration={300}`
  and `animationEasing="ease-out"`, and all four suppress animation replay
  on data-only updates via the mount-ref pattern while still animating on
  chart-type switch.

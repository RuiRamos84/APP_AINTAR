# 012 — Reduced-motion support for page transitions, DataTable, and AppBar

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 3-4 files

## Dependencies (read this before starting)

This plan's sections 2 and 3 are conditional on plans 009 and 010 landing
first. Check what's actually in the target files before writing code:

- **Section 2 (DataTable)**: plan 009 removes the blanket per-row
  `AnimatePresence`/`motion.tr` entirely. If plan 009 has already landed,
  there is nothing left in `DataTable.jsx`'s row-render path to gate on
  `prefers-reduced-motion` — **section 2 becomes a no-op**; state that
  explicitly in your change (a one-line note in the PR/commit, not a code
  change) rather than silently skipping it. If plan 009 has NOT landed yet,
  gate the existing `initial`/`animate`/`exit` opacity fade behind
  `useReducedMotion()` instead (see section 2 target below for the
  not-yet-landed case).
- **Section 3 (AppBar)**: plan 010 converts the logo/tab-icon/tab-fontSize
  scroll-compact sizing from `min-height`/`font-size` to `transform:
  scale()` (see plan 010's Target), while deliberately leaving
  `toolbarHeight`'s and `tabHeight`'s `min-height` transitions unconverted
  (documented reason: Sidebar.jsx coupling). **If plan 010 has landed**,
  gate the `transform: scale()` declarations (and, separately, the two
  `min-height` transitions plan 010 kept) behind reduced motion. **If plan
  010 has NOT landed**, gate the current `min-height`/`height`/`font-size`
  transitions directly instead — same outcome (near-instant snap under
  reduced motion), different property names. Read `AppBar.jsx` fresh before
  writing this section to see which state it's actually in.

## Problem

No component in `frontend-v2` currently branches on
`prefers-reduced-motion`. Three concrete gaps, all independently confirmed
by reading the files:

**1. Page transitions (MainLayout + PageTransition) — always animate.**

```jsx
// frontend-v2/src/shared/components/layout/MainLayout.jsx:97-101 — current
<AnimatePresence mode="popLayout">
  <PageTransition key={location.pathname}>
    <Outlet />
  </PageTransition>
</AnimatePresence>
```

```jsx
// frontend-v2/src/shared/components/layout/PageTransition.jsx:1-25 — current, full file
import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

// Cubic bezier: snappy ease-out — rápido sem parecer abrupto
const easing = [0.25, 0.46, 0.45, 0.94];

export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.22, ease: easing }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};
```

This runs on **every route change** in the entire backoffice app (it's
wired into `MainLayout`, which wraps every private route). The `y: 8` / `y:
-4` vertical movement is exactly what `prefers-reduced-motion: reduce`
users want suppressed while keeping the opacity cross-fade.

This is a route-change animation, not a one-off entrance/exit variant list
— `mode="popLayout"` on the `AnimatePresence` is a deliberate fix for a
React Router `Outlet` race condition (per project convention/CLAUDE.md) and
must NOT be changed by this plan.

**2. DataTable row entrance — see Dependencies above.** As of this plan
being written, `DataTable.jsx:463-468` still has the per-row
`initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
transition={{duration:0.2}}` that plan 009 is expected to remove entirely.

**3. AppBar scroll-compact transform — see Dependencies above.** As of this
plan being written, `AppBar.jsx` still has the pre-plan-010
`min-height`/`height`/`font-size` transitions described in plan 010's
Problem section.

**4. MUI's own built-in component transitions have no global reduced-motion
baseline.** `frontend-v2/src/styles/theme/index.js` (read in full) never
references `prefers-reduced-motion` anywhere, and `getTheme(mode)` (line 21)
takes only a `mode` argument — no reduced-motion parameter exists. MUI's
`createTheme` accepts a `transitions.duration` override
(`frontend-v2/node_modules/@mui/material` — standard documented MUI API,
not project-specific): components that call `theme.transitions.create(...)`
internally (`Fade`, `Grow`, `Slide`, `Collapse`, `Drawer`'s width
transition — see `Sidebar.jsx:395-400`'s own explicit use of
`theme.transitions.create('width', ...)`) all read their duration from this
shared config. Today there is no reduced-motion-aware value fed into it.

The theme is created reactively already — `frontend-v2/src/core/providers/AppProviders.jsx:54-56`:

```jsx
// AppProviders.jsx:54-56 — current
function AppThemeProvider({ children }) {
  const theme = useUIStore((state) => state.theme);
  const muiTheme = getTheme(theme);
  ...
```

`getTheme(theme)` is called on every render of `AppThemeProvider`, driven by
Zustand's `theme` (light/dark), so wiring in a second, reactive input
(`prefers-reduced-motion` via `useMediaQuery`) is a small, idiomatic
addition to this exact spot — no restructuring needed.

**No existing reduced-motion hook.** Checked both `frontend-v2/src/shared/hooks/`
(`index.js`, `useCurrentModule.js`, `useDebounce.js`, `useDebouncedValue.js`,
`useNavbarCompact.js`, `useResponsive.js`, `useSearch.js`, `useSortable.js`,
`useToggle.js`) and `frontend-v2/src/core/hooks/` (`index.js`,
`usePostalCode.js`, `useMetaData.js`) — neither has anything named
`useReducedMotion`/`usePrefersReducedMotion`. Framer Motion ships its own
`useReducedMotion()` export (reads the media query reactively, returns
`boolean | null`), which is sufficient for every JS-side (Framer) case
below — no new project hook needed for those. The MUI-theme case (point 4)
needs a plain `useMediaQuery('(prefers-reduced-motion: reduce)')` from
`@mui/material`, already a project dependency and pattern (`AppBar.jsx:54-55`
uses `useMediaQuery` the same way for breakpoints).

## Target

**1. PageTransition** — branch on Framer's built-in hook, no new file:

```jsx
// frontend-v2/src/shared/components/layout/PageTransition.jsx — target
import { motion, useReducedMotion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Cubic bezier: snappy ease-out — rápido sem parecer abrupto
const easing = [0.25, 0.46, 0.45, 0.94];

export const PageTransition = ({ children }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={prefersReducedMotion ? reducedVariants : variants}
      transition={{ duration: prefersReducedMotion ? 0.15 : 0.22, ease: easing }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};
```

Movement (`y`) drops under reduced motion; the opacity cross-fade stays
(shorter, per AUDIT.md's "reduced motion means fewer/gentler, not zero").
`mode="popLayout"` on the caller's `AnimatePresence` (`MainLayout.jsx:97`)
is untouched.

**2. DataTable** — conditional on plan 009's outcome (see Dependencies).
If plan 009 already removed the row animation: no code change here, just
confirm and note it. If not yet landed, gate the existing fade:

```jsx
// DataTable.jsx — target, ONLY if plan 009 has not yet landed
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
// ...inside the component body:
const prefersReducedMotion = useReducedMotion();
// ...on the TableRow:
<TableRow
  component={motion.tr}
  initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
  ...
```

**3. AppBar** — conditional on plan 010's outcome (see Dependencies). If
plan 010 has landed (transform-based), snap instead of animating under
reduced motion:

```jsx
// AppBar.jsx — target, if plan 010 has landed
import { useReducedMotion } from 'framer-motion';
// ...inside the component:
const prefersReducedMotion = useReducedMotion();
// ...applied to every transform-based transition plan 010 introduced, e.g. the logo:
sx={{
  height: { xs: 34, sm: 40 },
  width: 'auto',
  transform: { /* unchanged from plan 010 */ },
  transformOrigin: 'left center',
  transition: prefersReducedMotion ? 'none' : 'transform 0.35s ease',
}}
```
Apply the same `prefersReducedMotion ? 'none' : '<original transition>'`
pattern to every declaration plan 010 touched (logo, tab icon, tab
font-size/transform) AND to the two `min-height` transitions plan 010
deliberately kept (`Toolbar`'s and `Tabs`'/`.MuiTab-root`'s) — under
reduced motion the compact/expanded states should snap instantly rather
than tween, regardless of which CSS property drives them.

If plan 010 has NOT landed, apply the identical `prefersReducedMotion ?
'none' : '<original transition>'` pattern directly to the current
`min-height`/`height`/`font-size` transition strings instead.

**4. MUI theme baseline** — reactive `prefersReducedMotion` fed into
`createTheme`'s documented `transitions.duration` override:

```js
// frontend-v2/src/styles/theme/index.js — target signature change
export const getTheme = (mode = 'light', prefersReducedMotion = false) => {
  const isLight = mode === 'light';

  return createTheme({
    // ...existing palette/breakpoints/spacing/typography/shape/shadows unchanged...
    transitions: prefersReducedMotion
      ? {
          duration: {
            shortest: 1, shorter: 1, short: 1,
            standard: 1, complex: 1,
            enteringScreen: 1, leavingScreen: 1,
          },
        }
      : undefined,
    components: {
      // ...unchanged...
    },
  });
};
```

```jsx
// frontend-v2/src/core/providers/AppProviders.jsx — target
import { useMediaQuery } from '@mui/material';
// ...
function AppThemeProvider({ children }) {
  const theme = useUIStore((state) => state.theme);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const muiTheme = getTheme(theme, prefersReducedMotion);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ThemedToaster />
      {children}
    </ThemeProvider>
  );
}
```

This is a *baseline safety net* for MUI-internal transitions (`Fade`,
`Grow`, `Collapse`, `Drawer`'s width animation, etc.) that this audit did
not individually instrument — it does not replace the component-level
Framer fixes in points 1-3, which remain necessary because Framer Motion
animations do not read `theme.transitions` at all.

## Repo conventions to follow

- `useMediaQuery` for a raw media-query boolean is already the project's
  pattern — see `AppBar.jsx:54-55`
  (`useMediaQuery(theme.breakpoints.down('sm'))`); this plan uses the same
  hook with a literal media-query string instead of a theme breakpoint,
  which is valid `useMediaQuery` usage (it accepts any CSS media query
  string, not just breakpoint helpers).
- Framer Motion's own `useReducedMotion()` is the correct tool for every
  Framer-driven animation in this plan — do not build a redundant custom
  hook wrapping the same media query; `shared/hooks/` and `core/hooks/`
  were checked and confirmed to have nothing like this already.
- Keep the `getTheme(mode, prefersReducedMotion)` signature change
  backward-compatible (`prefersReducedMotion = false` default) so any other
  caller of `getTheme` that isn't updated in this plan doesn't break —
  check for other callers before finalizing (only `AppProviders.jsx:56` and
  the two static exports `theme`/`darkTheme` at `theme/index.js:407-410`
  call it currently; the static exports intentionally stay
  reduced-motion-unaware since they're not reactive to begin with — leave
  them as `getTheme('light')`/`getTheme('dark')`, unchanged).

## Steps

1. Edit `frontend-v2/src/shared/components/layout/PageTransition.jsx` per
   the Target above: import `useReducedMotion` from `framer-motion`, add
   `reducedVariants`, call the hook, branch `variants` and `transition.duration`.
2. Read `frontend-v2/src/shared/components/data/DataTable/DataTable.jsx`
   fresh. If the `AnimatePresence`/`motion.tr` block from plan 009's Problem
   section is gone, do nothing here — note in your change description that
   section 2 was a no-op because plan 009 had already landed. If it's still
   present, apply the Target's conditional-opacity pattern.
3. Read `frontend-v2/src/shared/components/layout/AppBar.jsx` fresh.
   Determine whether plan 010 has landed (check whether the logo/tab-icon
   sizing uses `transform: scale(...)` or still uses `height`/`fontSize`
   directly). Apply the matching branch of the Target above — add
   `useReducedMotion` from `framer-motion`, call it once in the component
   body, and wrap every transition string this plan is targeting in
   `prefersReducedMotion ? 'none' : '<original>'`.
4. Edit `frontend-v2/src/styles/theme/index.js`: change `getTheme`'s
   signature to accept `prefersReducedMotion = false`, add the conditional
   `transitions` key to the object passed to `createTheme` per the Target.
   Leave every other key in the returned object unchanged.
5. Edit `frontend-v2/src/core/providers/AppProviders.jsx`: import
   `useMediaQuery` from `@mui/material` (add to the existing import or a
   new one — check what's already imported from `@mui/material` in this
   file first, currently none), call `useMediaQuery('(prefers-reduced-motion:
   reduce)')` inside `AppThemeProvider`, pass it as the second argument to
   `getTheme`.

## Boundaries

- Do NOT change `mode="popLayout"` on the `AnimatePresence` in
  `MainLayout.jsx:97` — that's a deliberate fix for a React Router `Outlet`
  race condition per project convention, unrelated to this finding.
- Do NOT touch `frontend-v2/src/shared/components/animation/PageTransition.jsx`
  (the dead-code duplicate) — it's covered by plan 016 (deletion) or plan
  019 (consolidation), not this one. If plan 016 already deleted it by the
  time this plan runs, there's nothing to do; if not, still don't touch it
  here.
- Do NOT add reduced-motion handling to files this plan doesn't name —
  this is a targeted fix for the three components + one theme-level
  baseline identified above, not a project-wide sweep. Other files with
  hand-typed Framer animations (Sidebar, NotificationCenter, TaskCard,
  etc.) are out of scope; a broader reduced-motion rollout is future work
  once this establishes the pattern.
- Do NOT change the static `theme`/`darkTheme` exports at
  `theme/index.js:407-410` — they stay reduced-motion-unaware by design
  (nothing reactive consumes them for that purpose currently).
- If plan 009 or plan 010 haven't landed and their target files look
  different from what their own plan documents describe (further drift
  beyond what's anticipated in Dependencies above), STOP and report rather
  than improvising a fix for unknown code.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/shared/components/layout/PageTransition.jsx src/shared/components/layout/AppBar.jsx src/shared/components/data/DataTable/DataTable.jsx src/styles/theme/index.js src/core/providers/AppProviders.jsx`
  — no new errors/warnings.
- **Feel check**:
  - Open DevTools → Rendering panel → set "Emulate CSS media feature
    prefers-reduced-motion" to "reduce".
  - Navigate between routes (e.g. click a sidebar link): the page content
    should cross-fade only — no vertical slide.
  - If DataTable's row animation was still present pre-fix: paginate/sort/
    filter a table — rows should appear/disappear instantly (opacity jumps
    straight to 1/0, no visible fade).
  - Scroll past the AppBar's compact threshold: logo/tabs/toolbar should
    snap to the compact size instantly, no tween.
  - Open any MUI `Menu`, `Dialog`, or the Sidebar's collapse toggle — these
    should transition near-instantly (the ~1ms baseline), not with their
    normal duration.
  - Set Rendering panel back to "No emulation" and repeat all the above —
    confirm normal animated behavior returns (this proves the branch is
    reactive, not a one-way switch).
  - In DevTools Animations panel with reduced motion OFF, set playback to
    10% on the page transition and confirm the `y` movement is still there
    — proves the reduced-motion branch didn't leak into the default path.
- **Done when**: every one of the four target points renders with
  movement suppressed and opacity/color feedback retained under
  `prefers-reduced-motion: reduce`, and identically to pre-fix behavior
  with it off.

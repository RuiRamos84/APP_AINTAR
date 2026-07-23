# 019 — Create a motion tokens module; consolidate the two live page-transition curves

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 new file, 2 files edited

## Problem

`frontend-v2/src/styles/tokens/` has an established pattern of small,
focused token modules — `breakpoints.js`, `colors.js`, `elevation.js`,
`spacing.js`, `typography.js` — each exporting named constants (and
occasionally a small helper function, e.g. `typography.js`'s `fluidClamp()`,
which solved an analogous "many hand-typed values, no shared source of
truth" problem for font sizing). **No motion/transition token module
exists.** `frontend-v2/src/styles/theme/index.js` (read in full) never
customizes MUI's `transitions` key at all — it relies entirely on MUI's
defaults there.

At least four different hand-typed durations and several different easing
strings/curves are scattered across the nav-chrome files (read individually
during plans 010/011's investigation):

- `Sidebar.jsx`: `0.2s`, `0.2s ease-in-out`, `0.3s ease`
- `AppBar.jsx`: `0.35s ease` (repeated 7+ times), `0.2s`
- `NotificationCenter.jsx`: `0.2s` (repeated 3+ times)
- `PortalNavbar.jsx`: `0.2s`, `0.3s ease`, `0.5s` (with bare `ease: 'easeOut'`)

Confirmed by reading `frontend-v2/src/shared/components/layout/PageTransition.jsx:10`,
this exact custom curve exists and is the **only page-level transition
actually wired into the live app**:

```js
// frontend-v2/src/shared/components/layout/PageTransition.jsx:9-10 — current
// Cubic bezier: snappy ease-out — rápido sem parecer abrupto
const easing = [0.25, 0.46, 0.45, 0.94];
```
used with `duration: 0.22` (same file, line 19).

**Three independent page/section-entrance implementations were found, all
disagreeing on every value** — read all three in full:

1. `shared/components/layout/PageTransition.jsx` — **live**, wired into
   `MainLayout.jsx:97-100` on every route change in the backoffice.
   `duration: 0.22`, custom array easing `[0.25, 0.46, 0.45, 0.94]`.
2. `shared/components/animation/PageTransition.jsx` — **dead code** (zero
   imports, confirmed by plan 016's grep sweep; if plan 016 has already run,
   this file no longer exists — treat this bullet as historical context,
   not a live target). Default `duration: 0.3`, bare string easing
   `'easeInOut'`, six named variants (`fade`/`slideUp`/`slideDown`/
   `slideLeft`/`slideRight`/`scale`) none of which match implementation #1.
3. `shared/components/layout/PortalPageHeader.jsx` — **live**, used on
   portal pages (`clientes.aintar.pt`):
   ```jsx
   // PortalPageHeader.jsx:6-10 — current
   <Box
     component={motion.div}
     initial={{ opacity: 0, y: -8 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.3 }}
     ...
   ```
   `duration: 0.3`, **no easing specified at all** (Framer Motion's
   implicit default applies).

**A fourth, related, additive gap found while investigating this — noted
here as evidence for the "no shared source of truth" story, explicitly NOT
fixed by this plan (see Boundaries):** `frontend-v2/src/shared/components/layout/PortalLayout.jsx`
(read in full) has **no route-level `AnimatePresence`/`PageTransition`
wrapper at all** — its `<Outlet />` (line 50) renders directly inside a
plain `Box`, unlike `MainLayout.jsx`'s `AnimatePresence mode="popLayout"` +
`PageTransition` wrapping every backoffice route change. The portal's page
body teleports in on navigation; only `PortalPageHeader` (the page title
bar, a separate, smaller element) fades. This is a real, separate,
additive finding — the portal is missing a page transition entirely, not
just using a different curve — but adding one is a scope decision bigger
than "create a tokens module," so it is flagged here and explicitly left
as a follow-up, not fixed in this plan.

## Target

New file, following `elevation.js`'s exact export style (a single focused
object of named values, plus `*DarkTokens`-style sibling only where a
light/dark split would apply — not needed here):

```js
// frontend-v2/src/styles/tokens/motion.js — target, new file
/**
 * Design Tokens - Movimento (easings e durações)
 * Curvas fortes para UI deliberada — os easings nativos do browser
 * (`ease`, `ease-in-out`) são demasiado fracos para transições intencionais.
 */

export const easingTokens = {
  // Entrar/sair — arranca rápido, sente-se responsivo
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  // Mover/transformar em ecrã
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  // Gavetas/drawers estilo iOS
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

// Mesmas curvas, como arrays compatíveis com a prop `ease` do Framer Motion
export const easingTokensFramer = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
};

export const durationTokens = {
  // Feedback de botão/press
  fast: 150,
  // Tooltips, popovers pequenos, badges
  quick: 180,
  // Dropdowns, selects, painéis de filtro
  base: 220,
  // Modais, drawers, transições de página
  slow: 320,
};
```

Values are AUDIT.md's exactly, not approximated (`out`/`inOut` match the
playbook's `--ease-out`/`--ease-in-out` verbatim; `drawer` matches
`--ease-drawer` verbatim). `durationTokens` are named by purpose, placed
inside AUDIT.md's documented ranges (button feedback 100-160ms → `fast:
150`; tooltips/small popovers 125-200ms → `quick: 180`; dropdowns/selects
150-250ms → `base: 220`; modals/drawers/page-transitions 200-500ms →
`slow: 320`).

**Applied to the one clearest, highest-leverage target — the live
`PageTransition.jsx`:**

```jsx
// shared/components/layout/PageTransition.jsx — target
import { motion } from 'framer-motion';
import { easingTokensFramer, durationTokens } from '@/styles/tokens/motion';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: durationTokens.base / 1000, ease: easingTokensFramer.out }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};
```

**This is a genuine curve VALUE CHANGE, not just a token extraction —
called out explicitly, not buried:** the current custom array
`[0.25, 0.46, 0.45, 0.94]` (a hand-tuned "snappy ease-out" per its own
comment) is replaced with AUDIT.md's approved `[0.23, 1, 0.32, 1]`. These
are visually similar (both fast-start ease-out curves) but numerically
different — the justification is that `[0.25, 0.46, 0.45, 0.94]` is not in
AUDIT.md's approved set and this plan's whole purpose is to stop the
proliferation of ad-hoc near-matching curves; keeping the bespoke value
would defeat that purpose. The duration also changes slightly, `0.22s` →
`0.22s` (`durationTokens.base / 1000 = 0.22`) — **chosen deliberately to
equal the current value**, so the only perceptible change from this edit is
the curve, isolating that as the one thing to feel-check.

**Applied to the second live implementation, `PortalPageHeader.jsx`, for
shared curve consistency:**

```jsx
// PortalPageHeader.jsx:6-10 — target
<Box
  component={motion.div}
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: durationTokens.base / 1000, ease: easingTokensFramer.out }}
  ...
```

`y: -8` stays different from `PageTransition`'s `y: 8`/`y: -4` (a header
bar sliding down from above vs. a page body settling from below are
different, legitimate spatial metaphors for different UI regions — not
unified). The **duration** is intentionally unified (`0.3s` → `0.22s`, i.e.
`durationTokens.base`) since there's no legitimate reason for the portal
header to move measurably slower than the backoffice's equivalent
page-level entrance — both are "page changes," just in different app
contexts sharing one design system. The **easing** goes from "none
specified" (Framer's implicit default) to the same explicit `easingTokensFramer.out`
— a strict improvement (fills a real gap), not a debatable value change.

## Repo conventions to follow

- File placement and export shape: `frontend-v2/src/styles/tokens/elevation.js`
  is the closest exemplar — a single `export const xTokens = {...}` object
  of named, purpose-labeled values, no default export, no class, no
  computation beyond simple literals.
- Import path style: `@/styles/tokens/motion` (alias), matching how
  `theme/index.js:8-16` imports the other token modules (`from
  '../tokens'`, which resolves through `styles/tokens/index.js`'s barrel —
  check whether to also add `motion.js`'s exports to that barrel; if
  `styles/tokens/index.js` re-exports every other token module, add
  `motion.js` to it the same way for consistency, so future consumers can
  `import { easingTokensFramer } from '@/styles/tokens'` instead of the
  deep path).

## Steps

1. Create `frontend-v2/src/styles/tokens/motion.js` with `easingTokens`,
   `easingTokensFramer`, and `durationTokens` exactly as shown in Target.
2. Read `frontend-v2/src/styles/tokens/index.js` — if it's a barrel that
   re-exports every sibling token file, add `export * from './motion';` (or
   match whatever export style the barrel already uses) so `motion.js`
   follows the same discoverability path as `elevation.js`/`spacing.js`/etc.
3. Edit `frontend-v2/src/shared/components/layout/PageTransition.jsx`: add
   the import from step 1/2, replace the local `const easing = [0.25, 0.46,
   0.45, 0.94];` and the inline `transition={{ duration: 0.22, ease: easing
   }}` with `transition={{ duration: durationTokens.base / 1000, ease:
   easingTokensFramer.out }}`. Remove the now-unused local `easing` const
   and its comment.
4. Edit `frontend-v2/src/shared/components/layout/PortalPageHeader.jsx`:
   add the same import, change `transition={{ duration: 0.3 }}` to
   `transition={{ duration: durationTokens.base / 1000, ease:
   easingTokensFramer.out }}`. Leave `initial`/`animate`'s `y: -8`/`y: 0`
   values unchanged.

## Boundaries

- Do NOT touch `Sidebar.jsx`, `AppBar.jsx`, `NotificationCenter.jsx`, or
  `PortalNavbar.jsx`'s hand-typed durations/easings in this plan — those
  four files are actively being edited by plans 010 and 011 in this same
  round; touching their transition strings here would create direct merge
  conflicts. Migrating them onto these new tokens is real, valuable future
  cleanup, explicitly deferred until after 010/011 land, tracked as a
  follow-up, not silently dropped.
- Do NOT delete or modify `shared/components/animation/PageTransition.jsx`
  (the dead-code duplicate) — that file's fate is plan 016's (deletion) to
  decide, not this plan's. If plan 016 already ran and it's gone, there's
  nothing to do here regardless.
- Do NOT add a route-level `AnimatePresence`/page-transition wrapper to
  `PortalLayout.jsx` — the missing-portal-page-transition gap described in
  Problem is real and worth fixing eventually, but it is a bigger, additive
  UX decision (what variant, what duration, whether it should even exist
  given the portal's different personality) than "create a tokens module
  and point the two existing implementations at it." Flagged as an
  explicit, named follow-up: **"Portal is missing a route-level page
  transition (`PortalLayout.jsx`'s `<Outlet />` has none, unlike
  `MainLayout.jsx`)"** — not silently skipped, not fixed here.
- Do NOT touch MUI's `theme.transitions` configuration in
  `styles/theme/index.js` — that's plan 012's scope (reduced-motion
  baseline), a different concern from token consolidation.
- Do NOT change `PageTransition.jsx`'s `y: 8`/`y: -4` values or
  `PortalPageHeader.jsx`'s `y: -8` value — only duration and easing are
  unified; the differing vertical-movement metaphors between a full page
  body and a header bar are a deliberate, legitimate difference, not
  inconsistency to fix.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/styles/tokens/motion.js src/shared/components/layout/PageTransition.jsx src/shared/components/layout/PortalPageHeader.jsx`
  — no new errors/warnings, no unused-import warnings (confirm the old
  local `easing` const is fully removed from `PageTransition.jsx`).
- **Feel check**:
  - Navigate between backoffice routes (any sidebar link click): the page
    cross-fade + vertical settle should feel essentially the same pace as
    before this change (duration is unchanged, `0.22s`) — the curve change
    is subtle; in DevTools Animations panel, set playback to 10% and
    compare the deceleration profile of `transform: translateY(...)`
    against a note/screenshot from before the change if possible, or just
    confirm it still reads as "fast start, no overshoot, smooth settle."
  - Navigate between portal pages (if reachable —
    `VITE_APP_CONTEXT=portal npm run dev`): the `PortalPageHeader` title
    bar's fade-and-drop-in should now be noticeably snappier than before
    (0.3s → 0.22s) and should use the same easing character as the
    backoffice's page transition — the two should now feel like they
    belong to the same design system, even though they're visually
    different animations (header slide vs. full-page settle).
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling; if plan 012 has already landed on
    `PageTransition.jsx`, confirm this plan's token-based transition still
    correctly feeds into plan 012's reduced-motion branch (i.e. the
    `reducedVariants`/conditional-duration logic from plan 012 still wraps
    around this plan's token values without conflict — read the file after
    both plans to confirm no leftover duplicate `transition` prop).
- **Done when**: `frontend-v2/src/styles/tokens/motion.js` exists and
  exports `easingTokens`, `easingTokensFramer`, `durationTokens`; both
  `PageTransition.jsx` and `PortalPageHeader.jsx` import from it and no
  longer contain any hand-typed cubic-bezier array or bare duration number
  for their own transition.

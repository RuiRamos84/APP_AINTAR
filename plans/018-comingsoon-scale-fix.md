# 018 — Fix scale(0) in ComingSoonPage's loading-dots keyframe

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: LOW
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, 1 keyframe block. Low priority — this is a
  rare/occasional placeholder page shown only for under-construction
  features, not a frequently-hit surface.

## Problem

```js
// frontend-v2/src/shared/components/layout/ComingSoonPage.jsx:32-35 — current
const blink = keyframes`
  0%, 80%, 100% { transform: scale(0); opacity: 0; }
  40%            { transform: scale(1); opacity: 1; }
`;
```

Declared via MUI's `keyframes` tagged template from `@mui/system` (not a raw
CSS `@keyframes` block, not an inline `sx` `'@keyframes'` object — this
file's own established style, confirmed by the five sibling keyframes in
the same file: `float`, `fadeUp`, `pulse`, `spin`, all declared the same
way at lines 12-41).

Used by the three-dot "loading" indicator at the bottom of the page:

```jsx
// ComingSoonPage.jsx:45-54 — current
const LoadingDots = ({ color }) => (
  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'center' }}>
    {[0, 1, 2].map((i) => (
      <Box key={i} sx={{
        width: 8, height: 8, borderRadius: '50%', bgcolor: color,
        animation: `${blink} 1.4s ease-in-out ${i * 0.16}s infinite`,
      }} />
    ))}
  </Box>
);
```

Each of the three dots scales fully to and from `0` on every loop
iteration (infinite). Per AUDIT.md category 3: "Never `scale(0)` — nothing
in the real world appears from nothing. Target: `scale(0.9–0.97)` +
`opacity: 0`."

## Target

```js
// ComingSoonPage.jsx:32-35 — target
const blink = keyframes`
  0%, 80%, 100% { transform: scale(0.9); opacity: 0; }
  40%            { transform: scale(1); opacity: 1; }
`;
```

Only the two `scale(0)` occurrences change to `scale(0.9)` — the `opacity:
0` pairing, the `40%` peak keyframe, and the outer `1.4s ease-in-out
${i * 0.16}s infinite` usage are all unchanged.

## Repo conventions to follow

- MUI `keyframes` tagged-template style, declared as a top-level `const` in
  this file and referenced via `${blink}` interpolation inside an `sx`
  `animation` string — this is this file's own existing pattern (see
  `float`, `fadeUp`, `pulse`, `spin` at lines 12-41), not something to
  change to a different declaration style.

## Steps

1. In `frontend-v2/src/shared/components/layout/ComingSoonPage.jsx`, on the
   `blink` keyframes block (lines 32-35), change both occurrences of
   `scale(0)` to `scale(0.9)`. Leave `opacity: 0`, the `40%` rule, and
   everything else in the block untouched.

## Boundaries

- Do NOT touch the other four keyframes in this file (`float`, `fadeUp`,
  `pulse`, `spin`) — none of them use `scale(0)`; they're out of scope for
  this specific finding.
- Do NOT change the `LoadingDots` component's usage of `blink` (duration,
  stagger delay, easing) — only the keyframe's own `scale` values change.
- Do NOT change `Sparkle`'s use of the (different) `pulse` keyframe at line
  71, or the background-circle `pulse` usage at line 169 — neither uses
  `scale(0)` (both go `scale(1)` → `scale(1.12)`), not part of this finding.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/shared/components/layout/ComingSoonPage.jsx`
  — no new errors/warnings.
- **Feel check**: navigate to any route that renders `ComingSoonPage` (any
  "em desenvolvimento" placeholder page in the app) with the dev server
  running:
  - Watch the three loading dots at the bottom: each should still blink in
    sequence, but should never fully disappear to a literal point — at
    their smallest they should read as a small, dim dot, not nothing.
  - In DevTools Animations panel, set playback to 10% and scrub through one
    dot's cycle — confirm the trough keyframes (`0%`/`80%`/`100%`) show
    `scale(0.9)` in the Computed panel, not `scale(0)`.
  - Toggle `prefers-reduced-motion` (Rendering panel) — this file has no
    reduced-motion handling for any of its five keyframes (out of scope for
    this LOW-severity, single-value fix); confirm the dots still blink with
    the toggle on, unchanged behavior, not a regression introduced by this
    fix.
- **Done when**: `ComingSoonPage.jsx`'s `blink` keyframe contains no
  `scale(0)` (bare zero) anywhere.

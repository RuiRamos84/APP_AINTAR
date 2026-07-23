# 021 — Add entrance transition to FaceEnrollModal's success state

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Missed opportunities
- **Estimated scope**: 1 file, 1 block wrapped

## Problem

`frontend-v2/src/features/rh/components/FaceEnrollModal.jsx` drives a
`phase` state machine (`checking-consent → consent → loading → detecting →
captured → saving → done → error`, per the component's own naming — no
docblock enumerates it explicitly, but the `useState('checking-consent')`
at line 62 and every `setPhase(...)` call trace exactly this sequence).
This modal completes RGPD biometric face enrollment (art. 9.º special
category personal data) — a rare, one-time, high-stakes action for the
user completing it.

The `phase === 'done'` success state renders via plain conditional JSX,
with zero entrance transition:

```jsx
// frontend-v2/src/features/rh/components/FaceEnrollModal.jsx:386-396 — current
{phase === 'done' && (
  <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
    <OkIcon sx={{ fontSize: 64, color: 'success.main' }} />
    <Typography variant="h6" fontWeight={700} color="success.main">
      Rosto registado com sucesso!
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      A partir de agora, o reconhecimento facial será solicitado em todos os registos de ponto.
    </Typography>
  </Stack>
)}
```

**Checked whether any other phase transition in this file is animated, for
consistency** — read the full 431-line file: every other phase block
(`checking-consent`, lines 263-268; `consent`, lines 270-308; `loading`
overlay, lines 342-347; `captured` overlay, lines 348-353; `saving`, lines
379-384; `error`, lines 398-402) renders via the same plain conditional
JSX pattern, with zero animation anywhere in the file. The `done` phase
would be the **first** animated phase transition in this component, not an
outlier breaking an existing pattern — it should set a tasteful precedent,
not introduce a jarring one-off.

**Checked the sibling component for a matching pattern** —
`frontend-v2/src/features/rh/components/FaceCaptureModal.jsx` (a related,
simpler face-verification modal used elsewhere) has an equivalent
`phase === 'captured'` success moment (overlay at lines 184-189, message
Alert at lines 232-236) — also plain conditional JSX, no animation. There
is no existing precedent to match; this plan is establishing the first one
for this whole face-recognition component family.

## Target

```jsx
// FaceEnrollModal.jsx:386-396 — target
{phase === 'done' && (
  <Stack
    component={motion.div}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    alignItems="center"
    spacing={2}
    sx={{ py: 2 }}
  >
    <OkIcon sx={{ fontSize: 64, color: 'success.main' }} />
    <Typography variant="h6" fontWeight={700} color="success.main">
      Rosto registado com sucesso!
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      A partir de agora, o reconhecimento facial será solicitado em todos os registos de ponto.
    </Typography>
  </Stack>
)}
```

Modest, not showy — a single opacity+scale entrance (`scale: 0.95 → 1`, not
a bounce/celebration), matching AUDIT.md's "rare/first-time moments can add
delight" guidance without overreaching into a big celebratory effect this
is not (per the audit: "can add delight," not "should add a big
celebration"). `300ms` and the `[0.23, 1, 0.32, 1]` ease-out curve match
AUDIT.md's modal/drawer-adjacent duration budget (200-500ms) and the
entering-content easing rule.

## Repo conventions to follow

- `component={motion.div}` (or `motion.<MuiComponent>` where MUI supports
  a `component` prop) on a MUI layout primitive is the established pattern
  for combining Framer Motion with MUI elsewhere in this codebase — see
  `frontend-v2/src/shared/components/layout/PortalNavbar.jsx:55-56`
  (`<Box component={motion.header} initial={...} animate={...}>`), which
  does exactly this on a `Box`. `Stack` supports the same `component` prop
  (it's a MUI layout primitive built the same way as `Box`).
- The ease-out array `[0.23, 1, 0.32, 1]` matches AUDIT.md verbatim, same
  value used in plans 013 and 014 — hand-written here since plan 019's
  token module (`easingTokensFramer.out`) is a separate file this plan does
  not depend on or import from (keeping this plan self-contained per this
  round's per-plan file scoping; a later pass could migrate this literal to
  the token import once 019 has landed).

## Steps

1. In `frontend-v2/src/features/rh/components/FaceEnrollModal.jsx`, add
   `motion` to the imports — this file currently has no `framer-motion`
   import; add `import { motion } from 'framer-motion';` near the top with
   the other imports.
2. On the `phase === 'done'` block (lines 386-396), change the `<Stack
   alignItems="center" spacing={2} sx={{ py: 2 }}>` opening tag to add
   `component={motion.div}`, `initial={{ opacity: 0, scale: 0.95 }}`,
   `animate={{ opacity: 1, scale: 1 }}`, and `transition={{ duration: 0.3,
   ease: [0.23, 1, 0.32, 1] }}`. Leave the three children (`OkIcon`,
   the two `Typography` elements) completely untouched.

## Boundaries

- Do NOT add animation to any other `phase` block in this file
  (`checking-consent`, `consent`, `loading`, `detecting`/`captured`
  overlays, `saving`, `error`) — this plan establishes the precedent for
  the success moment specifically; animating every phase transition in a
  multi-step capture flow is a bigger design decision (would need
  `AnimatePresence` around the whole phase-switch, careful interruption
  handling for the fast-looping `detecting`/`captured` cycle, etc.) not
  undertaken here.
- Do NOT touch `FaceCaptureModal.jsx` — it was read only to confirm there
  is no existing pattern to match; adding animation there is a separate,
  not-yet-decided piece of work.
- Do NOT add a bounce/spring or any celebratory embellishment (confetti,
  multi-step reveal, etc.) — the Target is deliberately modest per AUDIT.md's
  "can add delight," not "should maximize delight" framing for rare
  moments.
- Do NOT change the RGPD consent logic, the `phase` state machine itself,
  or any non-animation behavior in this file.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/features/rh/components/FaceEnrollModal.jsx`
  — no new errors/warnings.
- **Feel check**: complete a full face enrollment flow in a test/dev
  environment with camera access (RH module, face enrollment entry point —
  requires accepting the RGPD consent step, then completing all
  `TOTAL_CAPTURES` capture steps):
  - When the flow reaches the success screen (`phase === 'done'`), the
    checkmark + success text should fade and scale in smoothly (starting
    very slightly smaller and transparent, settling to full size/opacity)
    — not appear instantly.
  - The transition should feel calm and confirmatory, not celebratory or
    attention-grabbing beyond what's appropriate for completing a
    biometric consent flow.
  - In DevTools Animations panel, set playback to 10% and confirm a smooth
    `opacity`+`transform: scale(...)` entrance over ~300ms with a
    fast-start, gentle-settle profile (ease-out), no bounce/overshoot.
  - Toggle `prefers-reduced-motion` (Rendering panel) — this plan does not
    add reduced-motion handling; confirm the scale/fade still plays with
    the toggle on (unchanged baseline — a future reduced-motion pass could
    drop the `scale` while keeping the `opacity` fade, per AUDIT.md, but
    that's not this plan's job).
- **Done when**: the `phase === 'done'` success block animates in via
  `motion.div` with `scale: 0.95 → 1` and `opacity: 0 → 1` over `300ms`
  with the `[0.23, 1, 0.32, 1]` easing, and no other phase block in the
  file was modified.

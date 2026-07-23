# 007 — Animate form success-state swaps (3 forms)

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM (missed opportunity, additive)
- **Category**: Missed opportunities
- **Estimated scope**: 3 files, same fix pattern in each

## Problem

Three forms in `website/` swap their content on successful submission via a
plain conditional render or early `return` — a hard cut, no transition. Per
AUDIT.md category 1, this is exactly the kind of rare, high-emotion moment
("onboarding, feedback, celebrations → can add delight") that currently gets
none of its allotted delight budget, and category 8 flags "state changes that
teleport... where a brief transition would prevent a jarring change."

**1. `website/src/components/ui/ContactForm.jsx:36-48`** — on submit, the
entire `<form>` is replaced by a `CheckCircle2` success panel via a bare
early `return`:

```jsx
// website/src/components/ui/ContactForm.jsx:36-48 — current
if (submitted) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-aintar-light h-full min-h-[400px]">
      <div className="w-16 h-16 rounded-full bg-aintar-teal/15 flex items-center justify-center mb-4">
        <CheckCircle2 size={32} className="text-aintar-teal" />
      </div>
      <h3 className="font-heading font-bold text-aintar-navy text-xl mb-2">Mensagem enviada!</h3>
      <p className="text-gray-500 text-sm max-w-xs">
        Obrigado pelo contacto. Responderemos em breve.
      </p>
    </div>
  )
}
```

**2. `website/src/pages/clientes/AvaliacoesSection.jsx:387-395`** — an inline
feedback banner (success or error) appears/disappears via a plain `{feedback
&& (...)}` conditional, directly above the submit button in the review form:

```jsx
// website/src/pages/clientes/AvaliacoesSection.jsx:387-395 — current
{feedback && (
  <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
    feedback.type === 'success'
      ? 'bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20'
      : 'bg-red-50 text-red-500 border border-red-100'
  }`}>
    {feedback.msg}
  </div>
)}
```

**3. `website/src/pages/clientes/CandidaturaPage.jsx:314-342`** — after
submitting a multi-step (4-step) job-application form, the entire page's
main content swaps to a "Candidatura Submetida" success panel via a bare
early `return`:

```jsx
// website/src/pages/clientes/CandidaturaPage.jsx:314-342 — current
if (submitted) {
  return (
    <PageLayout
      title="Candidatura Submetida"
      breadcrumbs={[
        { label: 'Recursos Humanos', href: '/recursos-humanos' },
        { label: 'Candidatura' },
      ]}
      seoDescription="Submeta a sua candidatura a um processo de recrutamento da AINTAR."
    >
      <section className="section-padding bg-white">
        <div className="section-container max-w-2xl text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle size={64} className="text-green-500" />
          </div>
          <h2 className="font-heading font-bold text-aintar-navy text-2xl mb-3">
            Candidatura submetida com sucesso!
          </h2>
          <p className="text-gray-600 mb-8">
            A sua candidatura foi registada. A AINTAR entrará em contacto através do email indicado.
          </p>
          <button onClick={() => navigate('/recursos-humanos')} className="btn-primary">
            Voltar a Recursos Humanos
          </button>
        </div>
      </section>
    </PageLayout>
  )
}
```

Note: `CandidaturaPage.jsx` sits inside a route rendered through
`website/src/App.jsx`'s `PageTransition`/`AnimatePresence` system (plan 001's
subject) — but that routing-level transition only fires on navigation
(mounting/unmounting the whole route), not on this internal `submitted` state
flip within the same mounted route. The success panel swap here needs its own
local animation; it cannot piggyback on the route-level system.

None of the three currently import `motion`/`AnimatePresence` from
`framer-motion` for this purpose — confirmed by reading each file in full:
`ContactForm.jsx` has no framer-motion import at all; `AvaliacoesSection.jsx`
already imports `{ motion }` from `'framer-motion'` (used elsewhere, for the
rating-bar width animation) but not `AnimatePresence`; `CandidaturaPage.jsx`
has no framer-motion import at all.

## Target

Wrap each conditional/early-return success render in `AnimatePresence` +
`motion.div` with a consistent, tasteful entrance:

```jsx
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 8 }}
transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
```

300ms with the AUDIT.md strong ease-out curve — appropriate for a rare,
occasional feedback moment (AUDIT.md category 1: occasional/rare →
"standard animation" to "can add delight"; category 2 duration budget:
modals/drawers 200–500ms, this sits comfortably inside that range for a
content-swap of similar visual weight).

### 1. `website/src/components/ui/ContactForm.jsx`

```jsx
// website/src/components/ui/ContactForm.jsx:1-3 — target, add AnimatePresence/motion import
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
```

```jsx
// website/src/components/ui/ContactForm.jsx:36-48 — target
if (submitted) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-aintar-light h-full min-h-[400px]"
      >
        <div className="w-16 h-16 rounded-full bg-aintar-teal/15 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-aintar-teal" />
        </div>
        <h3 className="font-heading font-bold text-aintar-navy text-xl mb-2">Mensagem enviada!</h3>
        <p className="text-gray-500 text-sm max-w-xs">
          Obrigado pelo contacto. Responderemos em breve.
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
```

### 2. `website/src/pages/clientes/AvaliacoesSection.jsx`

```jsx
// website/src/pages/clientes/AvaliacoesSection.jsx:3 — target, add AnimatePresence to existing import
import { motion, AnimatePresence } from 'framer-motion'
```

```jsx
// website/src/pages/clientes/AvaliacoesSection.jsx:386-395 — target
{/* Feedback */}
<AnimatePresence>
  {feedback && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={`flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-medium ${
        feedback.type === 'success'
          ? 'bg-aintar-teal/10 text-aintar-teal border border-aintar-teal/20'
          : 'bg-red-50 text-red-500 border border-red-100'
      }`}
    >
      {feedback.msg}
    </motion.div>
  )}
</AnimatePresence>
```

This is the one case of the three that is a genuinely conditional,
re-appearing element (the user can submit multiple times, e.g. fix a
validation error and resubmit) rather than a one-way state flip — the
`AnimatePresence` here does real work on both mount and unmount of the
banner, unlike the other two which only ever animate in once.

### 3. `website/src/pages/clientes/CandidaturaPage.jsx`

```jsx
// website/src/pages/clientes/CandidaturaPage.jsx:1-6 — target, add AnimatePresence/motion import
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertCircle, Paperclip, X, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import PageLayout from '../../components/layout/PageLayout'
import ScrollReveal from '../../components/ui/ScrollReveal'
import { getConcursalReferencias, getConcursalProcedimento, submitConcursalCandidatura } from '../../services/cmsApi'
```

```jsx
// website/src/pages/clientes/CandidaturaPage.jsx:314-342 — target
if (submitted) {
  return (
    <PageLayout
      title="Candidatura Submetida"
      breadcrumbs={[
        { label: 'Recursos Humanos', href: '/recursos-humanos' },
        { label: 'Candidatura' },
      ]}
      seoDescription="Submeta a sua candidatura a um processo de recrutamento da AINTAR."
    >
      <section className="section-padding bg-white">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="section-container max-w-2xl text-center"
          >
            <div className="flex justify-center mb-6">
              <CheckCircle size={64} className="text-green-500" />
            </div>
            <h2 className="font-heading font-bold text-aintar-navy text-2xl mb-3">
              Candidatura submetida com sucesso!
            </h2>
            <p className="text-gray-600 mb-8">
              A sua candidatura foi registada. A AINTAR entrará em contacto através do email indicado.
            </p>
            <button onClick={() => navigate('/recursos-humanos')} className="btn-primary">
              Voltar a Recursos Humanos
            </button>
          </motion.div>
        </AnimatePresence>
      </section>
    </PageLayout>
  )
}
```

## Repo conventions to follow

- `AnimatePresence` + `motion.div` with `initial`/`animate`/`exit` +
  `transition` is this codebase's established pattern for conditionally
  rendered elements — see
  `website/src/components/ui/FloatingScrollIndicator.jsx:40-46` (button
  fade in/out) or `website/src/components/layout/Navbar.jsx:337-428` (mobile
  menu). Follow that exact prop shape (`initial`/`animate`/`exit` objects on
  the `motion.div`, not `variants`).
- This plan's `ease: [0.23, 1, 0.32, 1]` is the AUDIT.md strong ease-out
  value written as a Framer array tuple, matching how plan 001 fixes
  `PageTransition.jsx`'s exit curve — use the same numeric array form, not a
  CSS string.

## Steps

1. In `website/src/components/ui/ContactForm.jsx`, add
   `import { AnimatePresence, motion } from 'framer-motion'` to the top
   import block, then wrap the `if (submitted) { return (...) }` block's
   returned JSX exactly as shown in Target — the outer `<div
   className="flex flex-col items-center...">` becomes a `motion.div` with
   the specified `initial`/`animate`/`exit`/`transition`, itself wrapped in
   `<AnimatePresence>`.
2. In `website/src/pages/clientes/AvaliacoesSection.jsx`, change the existing
   `import { motion } from 'framer-motion'` (line 3) to
   `import { motion, AnimatePresence } from 'framer-motion'`, then wrap the
   `{feedback && (...)}` block exactly as shown in Target — the conditional
   moves inside `<AnimatePresence>`, and the `<div className="flex
   items-start...">` becomes a `motion.div` with the specified
   `initial`/`animate`/`exit`/`transition`.
3. In `website/src/pages/clientes/CandidaturaPage.jsx`, add
   `import { AnimatePresence, motion } from 'framer-motion'` to the top
   import block, then inside the `if (submitted) { return (...) }` block,
   wrap the `<div className="section-container max-w-2xl text-center">`
   (currently the direct child of `<section className="section-padding
   bg-white">`) in `<AnimatePresence>`, converting that `div` to a
   `motion.div` with the specified `initial`/`animate`/`exit`/`transition`,
   exactly as shown in Target. `<PageLayout>` and the outer `<section>`
   wrapper stay unchanged.

## Boundaries

- Do NOT touch the multi-step form navigation inside `CandidaturaPage.jsx`
  (the `step === 0/1/2/3` conditional renders, already wrapped in
  `ScrollReveal` at lines 380, 504, 549, 665) — only the final `submitted`
  success panel is in scope.
- Do NOT wrap `CandidaturaPage.jsx`'s success panel in `PageTransition` or
  otherwise hook it into the route-level `AnimatePresence` in `App.jsx` — the
  fix here is local to the component's own conditional render, exactly
  because the routing-level system does not fire on this internal state
  change (same route stays mounted). Do not attempt to unify the two
  systems.
- Do NOT add exit animations for elements that aren't being removed from the
  tree in these three cases — `ContactForm.jsx` and `CandidaturaPage.jsx`'s
  success panels are one-way (the form is gone for good once submitted, no
  UI path un-sets `submitted`), so the `exit` prop mostly documents intent
  for potential future remounts (e.g. component unmount on route change) —
  it is harmless and consistent with the pattern, not required to ever
  visibly fire, and should still be included exactly as shown for
  consistency with `AvaliacoesSection.jsx`'s genuinely two-way case.
- Do NOT change any loading/error-state UI in these three files (e.g.
  `ContactForm.jsx`'s `error` banner at line 113-118, or the loading spinner
  button) — only the success-state swap is in scope.
- Do NOT add new dependencies — `framer-motion` is already installed
  (`website/package.json`).
- If any of the three files' `submitted`/`feedback` conditional blocks no
  longer match the code quoted above (drift since commit `a93c46f`), STOP
  and report instead of guessing where to insert the wrapper.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors —
  validates the new imports and JSX structure in all three files.
- **Feel check — ContactForm**: run `cd website && npm run dev`, go to
  `/contactos`, fill and submit the contact form (or trigger the `submitted`
  state via the form's success path) — confirm the success panel fades and
  slides up into place over ~300ms rather than appearing instantly.
- **Feel check — AvaliacoesSection**: go to `/clientes/opinioes`, submit the
  review form both with a validation error (empty name) and successfully —
  confirm the feedback banner animates in both times, and check that
  submitting again (e.g. fix the error and resubmit) causes the previous
  banner to animate out before/as the new one animates in, not an abrupt
  swap.
- **Feel check — CandidaturaPage**: navigate to a candidatura form (via
  `/recursos-humanos/candidatura/:pk` — needs a valid `pk`; check
  `/recursos-humanos` for an active `ProcedimentoPage` link, or trigger via
  dev tools by directly visiting a known/test `pk`) and step through all 4
  steps to submission — confirm the "Candidatura submetida com sucesso!"
  panel fades and slides up rather than appearing instantly.
- **All three**: in DevTools → Animations panel, trigger each transition and
  set playback to 10% — confirm the fade+slide is front-loaded (fast start,
  consistent with the `[0.23, 1, 0.32, 1]` ease-out curve), not a linear or
  slow-start motion.
- Toggle `prefers-reduced-motion: reduce` in DevTools' Rendering panel and
  repeat each submission — confirm the panels still appear (opacity feedback
  preserved) though this plan does not add explicit reduced-motion branching
  to these three files; if the movement (`y: 8`) still plays under the
  toggle, that is an acceptable, known gap for this plan (not covered — these
  three files are not part of plan 004's file list) and should be noted, not
  silently fixed here.
- **Done when**: all three files match their Target snippets, `npm run
  build` succeeds, and each of the three success-state transitions visibly
  animates in via fade+slide instead of appearing as a hard cut.

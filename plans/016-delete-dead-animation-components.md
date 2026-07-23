# 016 — Delete unused animation/ui wrapper components

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Cohesion (dead code removal)
- **Estimated scope**: 9 files deleted, 1 file edited (inlined replacement)

## Problem

Directory listing, confirmed via `Glob`:

```
frontend-v2/src/shared/components/animation/PageTransition.jsx
frontend-v2/src/shared/components/animation/FadeIn.jsx
frontend-v2/src/shared/components/animation/StaggerChildren.jsx
frontend-v2/src/shared/components/animation/AnimatedButton.jsx
frontend-v2/src/shared/components/animation/ScrollReveal.jsx
frontend-v2/src/shared/components/animation/index.js

frontend-v2/src/shared/components/ui/Button/Button.jsx
frontend-v2/src/shared/components/ui/Button/index.js
frontend-v2/src/shared/components/ui/Card/Card.jsx
frontend-v2/src/shared/components/ui/Card/index.js
frontend-v2/src/shared/components/ui/Input/Input.jsx
frontend-v2/src/shared/components/ui/Input/index.js
frontend-v2/src/shared/components/ui/index.js
frontend-v2/src/shared/components/ui/LordiconIcon/LordiconIcon.jsx
frontend-v2/src/shared/components/ui/LordiconIcon/index.js
```

Import search across `frontend-v2/src` (excluding the files' own
directories), confirmed with these exact greps:

```
Grep pattern: components/animation|from '\.\./animation'|from '\./animation'
→ ONE match: frontend-v2/src/features/admin/pages/UserCreatePage.jsx:40:
  import { FadeIn } from '@/shared/components/animation';

Grep pattern: components/ui/Button|components/ui/Card|components/ui/Input|components/ui/LordiconIcon|components/ui'|components/ui"
→ No matches.

Grep pattern (relative-import sweep, broader):
  from ['"].*components/animation|from ['"].*/animation['"]|components/animation/PageTransition|components/animation/FadeIn|components/animation/StaggerChildren|components/animation/AnimatedButton|components/animation/ScrollReveal
→ Same single match as above (UserCreatePage.jsx:40).

Grep pattern: ui/Button/Button|ui/Card/Card|ui/Input/Input|ui/LordiconIcon/LordiconIcon|from ['"].*/ui['"]
→ No matches.
```

**Result: every file in `ui/` (Button, Card, Input, LordiconIcon, and the
barrel `index.js`) has zero imports anywhere in the codebase. Every file in
`animation/` also has zero imports EXCEPT `FadeIn`, imported once by**
`frontend-v2/src/features/admin/pages/UserCreatePage.jsx:40`, used four
times in that same file:

```jsx
// UserCreatePage.jsx — current usages
132: <FadeIn direction="down">          {/* breadcrumbs */}
150: <FadeIn delay={0.1}>               {/* header */}
189: <FadeIn delay={0.15}>              {/* info alert */}
196: <FadeIn delay={0.2}>               {/* form */}
```

`FadeIn`'s implementation (`animation/FadeIn.jsx`, full file, 56 lines):

```jsx
// frontend-v2/src/shared/components/animation/FadeIn.jsx — current, full file
import { motion } from 'framer-motion';

export const FadeIn = ({
  children,
  direction = null,
  delay = 0,
  duration = 0.3,
  distance = 20,
  className,
}) => {
  const getInitial = () => {
    const initial = { opacity: 0 };
    switch (direction) {
      case 'up': return { ...initial, y: distance };
      case 'down': return { ...initial, y: -distance };
      case 'left': return { ...initial, x: distance };
      case 'right': return { ...initial, x: -distance };
      default: return initial;
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;
```

It's a small, generic wrapper — but it's used four times, with three
different prop combinations (`direction="down"`, then three uses of
`delay` only), inside a single consumer file. Manually expanding all four
call sites into raw `motion.div`s would duplicate the `getInitial()`
direction-switch logic and the `transition` object four times in
`UserCreatePage.jsx` — more code, not less. The cleaner inline replacement
is a small **local** copy of the same component defined directly inside
`UserCreatePage.jsx`, preserving all four call sites unchanged, rather than
expanding each one by hand.

## Target

- `animation/PageTransition.jsx`, `StaggerChildren.jsx`, `AnimatedButton.jsx`,
  `ScrollReveal.jsx`, `animation/index.js` — **deleted**.
- `animation/FadeIn.jsx` — **deleted**, its implementation copied verbatim
  into a local, unexported `FadeIn` function defined near the top of
  `UserCreatePage.jsx` (after imports, before the component), and the
  import changed accordingly.
- The entire `animation/` directory is empty after this and can be removed.
- `ui/Button/`, `ui/Card/`, `ui/Input/`, `ui/LordiconIcon/`, `ui/index.js`
  — **deleted** entirely (zero consumers, no inline-replacement needed).

```jsx
// UserCreatePage.jsx — target, added near the top of the file (after imports)
import { motion } from 'framer-motion';
// ...existing imports...

/**
 * Fade in local a esta página — cópia de shared/components/animation/FadeIn,
 * eliminado por não ter outros consumidores (ver plans/016).
 */
const FadeIn = ({ children, direction = null, delay = 0, duration = 0.3, distance = 20 }) => {
  const getInitial = () => {
    const initial = { opacity: 0 };
    switch (direction) {
      case 'up': return { ...initial, y: distance };
      case 'down': return { ...initial, y: -distance };
      case 'left': return { ...initial, x: distance };
      case 'right': return { ...initial, x: -distance };
      default: return initial;
    }
  };
  return (
    <motion.div
      initial={getInitial()}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

const UserCreatePage = () => {
  // ...existing component body, all four <FadeIn ...> usages unchanged...
```

(`className` prop dropped from the local copy — grep the four call sites
in `UserCreatePage.jsx` first to confirm none of them pass `className`; if
one does, keep the prop in the local copy instead of dropping it.)

## Repo conventions to follow

- Feature-local helper components defined inline above the page component
  (not exported, not in a separate file) is an established pattern for
  single-consumer helpers in this codebase's `features/*/pages/` — keep the
  local `FadeIn` unexported, defined in the same file as its only usage.
- Deletion, not deprecation — this codebase doesn't keep "soft-deleted"
  files around; if something is confirmed unused, it comes out.

## Steps

1. Re-run the import searches above yourself before deleting anything —
   this Problem section already states the exact commands and their
   results; re-verify none of them have changed since this plan was
   written (see Verification's mechanical section for the exact commands
   to run).
2. Open `UserCreatePage.jsx`, confirm the four `<FadeIn ...>` call sites
   (lines ~132, ~150, ~189, ~196) and confirm none pass a `className` prop
   (adjust the local copy to keep `className` if one does).
3. Add the local `FadeIn` function to `UserCreatePage.jsx` per the Target
   above (place it after the existing imports, before the `UserCreatePage`
   component declaration). Add `import { motion } from 'framer-motion';` if
   not already imported in this file (check first — if `framer-motion` is
   already imported for something else, add `motion` to the existing
   import instead of a new line).
4. In `UserCreatePage.jsx`, delete the line `import { FadeIn } from
   '@/shared/components/animation';` (line 40). Do not change any of the
   four `<FadeIn ...>` JSX usages — the local component has the same name
   and prop signature, so they keep working unmodified.
5. Delete `frontend-v2/src/shared/components/animation/FadeIn.jsx`.
6. Delete `frontend-v2/src/shared/components/animation/PageTransition.jsx`,
   `StaggerChildren.jsx`, `AnimatedButton.jsx`, `ScrollReveal.jsx`,
   `index.js`.
7. Confirm the `frontend-v2/src/shared/components/animation/` directory is
   now empty and remove the empty directory.
8. Delete `frontend-v2/src/shared/components/ui/Button/Button.jsx`,
   `ui/Button/index.js`, `ui/Card/Card.jsx`, `ui/Card/index.js`,
   `ui/Input/Input.jsx`, `ui/Input/index.js`, `ui/LordiconIcon/LordiconIcon.jsx`,
   `ui/LordiconIcon/index.js`, `ui/index.js`.
9. Confirm the `frontend-v2/src/shared/components/ui/` directory (and its
   now-empty `Button/`, `Card/`, `Input/`, `LordiconIcon/` subdirectories)
   are empty and remove them.

## Boundaries

- Do NOT delete anything with any import found, even a single one — before
  each deletion in steps 5-9, re-run the corresponding grep from
  Verification and confirm zero matches for that specific file. If a match
  appears that wasn't there when this plan was written (code changed
  between plan-writing and execution), STOP that specific file's deletion
  and report it — do not delete a file with a live consumer.
- Do NOT delete `layout/PageTransition.jsx` (the live, different file used
  by `MainLayout.jsx`) — confirm you are deleting
  `shared/components/animation/PageTransition.jsx`, not
  `shared/components/layout/PageTransition.jsx`. These are two different
  files with the same basename; double-check the full path before every
  delete.
- Do NOT change `UserCreatePage.jsx`'s JSX structure beyond the import
  swap — the four `<FadeIn>` usages, their props, and their children stay
  exactly as they are.
- Do NOT attempt to preserve `ui/Button`/`Card`/`Input`/`LordiconIcon` "in
  case something needs them later" — they are confirmed zero-import; if a
  future feature needs a generic Button/Card/Input wrapper, MUI's own
  `Button`/`Card`/`TextField` components are already the project's actual
  pattern everywhere else in the codebase (per CLAUDE.md's component
  conventions) — these unused wrappers were never that pattern to begin
  with.

## Verification

- **Mechanical — re-run before AND after making changes, exact commands**:
  ```
  # Before deleting: confirm current state matches Problem section
  grep -rn "components/animation" frontend-v2/src --include=*.jsx --include=*.js
  # Expect: exactly one line, UserCreatePage.jsx importing FadeIn

  grep -rn "components/ui/Button\|components/ui/Card\|components/ui/Input\|components/ui/LordiconIcon" frontend-v2/src --include=*.jsx --include=*.js
  # Expect: no output

  # After steps 4-9: confirm zero remaining references and files are gone
  grep -rn "components/animation" frontend-v2/src --include=*.jsx --include=*.js
  # Expect: no output at all (FadeIn import removed, nothing else ever referenced it)

  ls frontend-v2/src/shared/components/animation 2>&1
  # Expect: "No such file or directory" (or equivalent — directory deleted)

  ls frontend-v2/src/shared/components/ui 2>&1
  # Expect: "No such file or directory"
  ```
- `cd frontend-v2 && npx eslint src/features/admin/pages/UserCreatePage.jsx`
  — no new errors/warnings, specifically no "FadeIn is not defined".
- `cd frontend-v2 && npm run build` — the build must succeed with no
  "module not found" errors referencing any deleted path (this is the
  strongest confirmation that nothing else was silently depending on these
  files via a path this plan's greps might have missed, e.g. a dynamic
  `import()`).
- **Feel check**: open `/admin/users/create` (or wherever `UserCreatePage`
  is routed) in the running app:
  - Breadcrumbs, header, info alert, and form should each fade/slide in on
    page load exactly as before this change (staggered by their `delay`
    values) — the local `FadeIn` copy should be visually indistinguishable
    from the deleted shared one.
- **Done when**: `grep -rn "components/animation" frontend-v2/src` and
  `grep -rn "components/ui/Button\|components/ui/Card\|components/ui/Input\|components/ui/LordiconIcon" frontend-v2/src`
  both return nothing, `frontend-v2/src/shared/components/animation/` and
  `frontend-v2/src/shared/components/ui/` no longer exist, and
  `UserCreatePage.jsx` renders identically to before.

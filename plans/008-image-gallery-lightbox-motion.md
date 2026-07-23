# 008 — Animate ImageGallery lightbox open/close and fix broken image crossfade

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM (missed opportunity)
- **Category**: Missed opportunities / Performance
- **Estimated scope**: 1 file, 2 related fixes

## Problem

`website/src/components/ui/ImageGallery.jsx` has no `framer-motion` import at
all — confirmed by reading the full file; its only imports are
`{ useCallback, useEffect, useState }` from `'react'` and icons from
`'lucide-react'`. Two separate motion gaps exist in the same component:

**1. Zero entrance/exit motion on the full-screen lightbox.** The overlay is
a plain conditional render — a hard cut in and out, no `AnimatePresence`, no
CSS transition:

```jsx
// website/src/components/ui/ImageGallery.jsx:96-150 — current
{lightbox && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    onClick={close}
  >
    <div
      className="relative max-w-5xl w-full mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={img.url}
        alt={img.legenda || `Foto ${current + 1}`}
        className="w-full max-h-[85vh] object-contain rounded-xl"
      />

      {img.legenda && (
        <p className="text-white/80 text-sm text-center mt-3">{img.legenda}</p>
      )}

      {/* Contador */}
      <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
        {current + 1} / {images.length}
      </div>

      {/* Fechar */}
      <button onClick={close} /* … */>
        <X size={18} />
      </button>

      {/* Setas lightbox */}
      {images.length > 1 && (
        <>
          <button onClick={prev} /* … */><ChevronLeft size={24} /></button>
          <button onClick={next} /* … */><ChevronRight size={24} /></button>
        </>
      )}
    </div>
  </div>
)}
```

**2. A `transition-opacity` class that never fires — same bug affects both
render sites.** The main carousel `<img>` carries a Tailwind opacity
transition class, but nothing in the component ever toggles an opacity state
when `current` changes — swapping `src` on an `<img>` does not crossfade the
old and new bitmap, it just hard-replaces the pixels the instant the new
image finishes decoding:

```jsx
// website/src/components/ui/ImageGallery.jsx:36-40 — current
<img
  src={img.url}
  alt={img.legenda || `Foto ${current + 1}`}
  className="w-full h-full object-cover transition-opacity duration-300"
/>
```

The `<img>` inside the lightbox (`website/src/components/ui/ImageGallery.jsx:105-109`,
quoted above) has the identical underlying problem — it re-renders on the
same `current` state with no transition class at all — but paging through
photos while the lightbox is open (via the on-screen arrows or the
`ArrowLeft`/`ArrowRight` keyboard handler,
`website/src/components/ui/ImageGallery.jsx:13-22`) is at least as common a
path as paging in the inline carousel, so both `<img>` render sites share the
same "instant swap, no crossfade" defect and are both in scope.

`current`/`next`/`prev` state, confirmed by reading the file
(`website/src/components/ui/ImageGallery.jsx:5-9`):

```jsx
// website/src/components/ui/ImageGallery.jsx:5-9 — current
const [current, setCurrent]     = useState(0)
const [lightbox, setLightbox]   = useState(false)

const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length])
const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length])
```

`current` is a single integer index driving `img = images[current]`
(`website/src/components/ui/ImageGallery.jsx:26`) — both `<img>` elements
read from the same `img` value, so keying each `<img>` by `current` and
wrapping it in `AnimatePresence` is the natural fit for this state shape
(rather than a manual `loaded`/`transitioning` boolean, which would need its
own `onLoad`-driven bookkeeping this component doesn't currently have).

## Target

**Fix 1 — lightbox entrance/exit.** Wrap the conditional lightbox render in
`AnimatePresence`, with a backdrop fade and an inner scale+fade for the
content panel (never `scale(0)` — AUDIT.md target `scale(0.9–0.97)`), inside
the modal/drawer duration budget (200–500ms):

```jsx
// website/src/components/ui/ImageGallery.jsx:96-150 — target (structure; inner content unchanged except the img crossfade in Fix 2)
<AnimatePresence>
  {lightbox && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={close}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="relative max-w-5xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* image crossfade — see Fix 2 */}
        {/* legenda, contador, close button, arrows — all unchanged */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Fix 2 — real crossfade on paging, both render sites.** Key each `<img>` by
`current` and wrap it in its own `AnimatePresence mode="wait"`, replacing the
inert `transition-opacity duration-300` Tailwind class with an actual Framer
Motion opacity transition:

```jsx
// website/src/components/ui/ImageGallery.jsx:35-40 — target (main carousel image)
<AnimatePresence mode="wait">
  <motion.img
    key={current}
    src={img.url}
    alt={img.legenda || `Foto ${current + 1}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    className="w-full h-full object-cover"
  />
</AnimatePresence>
```

```jsx
// website/src/components/ui/ImageGallery.jsx:105-109 — target (lightbox image)
<AnimatePresence mode="wait">
  <motion.img
    key={current}
    src={img.url}
    alt={img.legenda || `Foto ${current + 1}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    className="w-full max-h-[85vh] object-contain rounded-xl"
  />
</AnimatePresence>
```

200ms per swap (within AUDIT.md's general UI budget, snappy enough for a
repeated paging action), `[0.23, 1, 0.32, 1]` strong ease-out on both the
fade-out (exiting) and fade-in (entering) phases — consistent with plan 001
and plan 007's use of the same AUDIT.md curve elsewhere in this codebase.
`mode="wait"` means the outgoing image fully fades out before the incoming
one fades in (sequential, not overlapping) — acceptable here since both
`<img>` containers already sit on an opaque background (`bg-gray-100` for the
carousel, `bg-black/90` for the lightbox), so there is no flash of unstyled
content during the brief gap between the two phases.

Since the carousel `<img>` no longer relies on the (previously broken)
`transition-opacity duration-300` Tailwind class, that class is removed
entirely, replaced by the Framer Motion `transition` prop shown above.

## Repo conventions to follow

- `AnimatePresence` + `motion.div` with `initial`/`animate`/`exit` +
  `transition` objects (not `variants`) is this codebase's established
  pattern for conditionally rendered overlays — see
  `website/src/components/ui/FloatingScrollIndicator.jsx:40-46` (a
  `motion.button` gated by `{show && (...)}`) and
  `website/src/components/layout/Navbar.jsx:337-428` (the mobile menu). Match
  that exact prop shape.
- `key={...}` + `AnimatePresence mode="wait"` on a swapped element is not yet
  used anywhere else in this codebase (confirmed — this is a new but
  idiomatic Framer Motion pattern for exactly this "replace element N with
  element N+1" case); introduce it here as shown, do not invent a different
  API shape.
- `scale(0.9–0.97)` entrance, never `scale(0)`, per AUDIT.md category 3 — the
  `0.95 → 1` used here matches the range other plans in this batch also cite.

## Steps

1. In `website/src/components/ui/ImageGallery.jsx`, add
   `import { AnimatePresence, motion } from 'framer-motion'` to the top
   import block (alongside the existing `react` and `lucide-react` imports).
2. Replace the main carousel `<img>` block
   (`website/src/components/ui/ImageGallery.jsx:36-40`) with the
   `AnimatePresence mode="wait"` + `motion.img` structure shown in Fix 2's
   first snippet — remove `transition-opacity duration-300` from the
   className (keep `w-full h-full object-cover`), add `key={current}`, and
   add the `initial`/`animate`/`exit`/`transition` props exactly as shown.
3. Wrap the lightbox's outer conditional
   (`website/src/components/ui/ImageGallery.jsx:96-150`, `{lightbox && (<div
   className="fixed inset-0 z-50 ...">`) in `<AnimatePresence>`, converting
   both the outer backdrop `<div>` and the inner content `<div>` to
   `motion.div` with the `initial`/`animate`/`exit`/`transition` props shown
   in Fix 1. Keep every existing prop (`onClick={close}`,
   `onClick={(e) => e.stopPropagation()}`, all className strings) unchanged
   on both elements — only the tag name changes (`div` → `motion.div`) and
   the three animation props are added.
4. Inside that same block, replace the lightbox's `<img>`
   (`website/src/components/ui/ImageGallery.jsx:105-109`) with the
   `AnimatePresence mode="wait"` + `motion.img` structure shown in Fix 2's
   second snippet — add `key={current}` and the
   `initial`/`animate`/`exit`/`transition` props; this `<img>` had no prior
   transition class to remove, only className stays (`w-full max-h-[85vh]
   object-contain rounded-xl`).
5. Leave every other element inside the lightbox (legenda `<p>`, contador
   `<div>`, close `<button>`, arrow `<button>`s) and the dots row
   (`website/src/components/ui/ImageGallery.jsx:80-93`) completely untouched.

## Boundaries

- Do NOT add motion to the arrow buttons, dots, or close button — only the
  lightbox container's entrance/exit and the two `<img>` crossfades are in
  scope.
- Do NOT change the `prev`/`next`/`open`/`close` handler logic
  (`website/src/components/ui/ImageGallery.jsx:8-11`) or the keyboard
  listener effect (`website/src/components/ui/ImageGallery.jsx:13-22`) —
  this is a pure rendering/motion fix, no state-shape changes.
- Do NOT introduce a `loaded`/`transitioning` boolean state — the state shape
  in this file (`current` as a single index) fits the `key`+`AnimatePresence`
  approach cleanly; do not add complexity the existing code doesn't need.
- Do NOT change `mode="wait"` to the default (simultaneous) `AnimatePresence`
  mode — sequential fade avoids any risk of the outgoing and incoming image
  visually overlapping mid-transition at different aspect ratios, which
  would look like a glitch rather than a clean crossfade.
- Do NOT touch any other component in `website/src` — this plan is scoped to
  `website/src/components/ui/ImageGallery.jsx` alone.
- If the file's `lightbox`/`current` state shape, the carousel `<img>`'s
  className, or the lightbox JSX structure no longer match what's quoted
  above (drift since commit `a93c46f`), STOP and report instead of adapting
  the fix to unfamiliar code.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors —
  validates the new `framer-motion` import and JSX structure.
- **Feel check**: run `cd website && npm run dev`, find a page that renders
  `ImageGallery` with 2+ images (check consumers via
  `grep -r "ImageGallery" website/src` if none is obvious from routing — it
  is likely used on a news/notícia detail page or similar content page with
  a photo gallery field), and:
  - Click a thumbnail/arrow in the inline carousel to page between at least
    3 images — confirm each swap now visibly crossfades (old image fades to
    transparent, new image fades in) instead of popping instantly.
  - Click the carousel to open the lightbox — confirm the backdrop fades in
    and the image panel scales up from 95% while fading in, rather than
    appearing instantly.
  - Inside the open lightbox, use the on-screen arrow buttons and the
    keyboard `ArrowLeft`/`ArrowRight` keys to page through images — confirm
    the lightbox image also crossfades on each page, matching the carousel's
    behavior.
  - Press `Escape` or click the backdrop to close — confirm the panel scales
    down and fades out, and the backdrop fades out, rather than disappearing
    instantly.
  - In DevTools → Animations panel, trigger the lightbox open and set
    playback to 10% — confirm the scale animates from 0.95, never from 0,
    and the curve front-loads (fast start).
  - Toggle `prefers-reduced-motion: reduce` in DevTools' Rendering panel and
    repeat the open/close/page interactions — this plan does not add
    reduced-motion branching to `ImageGallery.jsx` (it is not in plan 004's
    file list); confirm behavior is unchanged by the toggle and note this as
    a known, accepted gap rather than a regression.
- **Done when**: `website/src/components/ui/ImageGallery.jsx` imports
  `AnimatePresence`/`motion` from `framer-motion`, both `<img>` elements are
  `motion.img` keyed by `current` inside their own `AnimatePresence
  mode="wait"`, the lightbox container is wrapped in `AnimatePresence` with
  backdrop fade + panel scale/fade, `npm run build` succeeds, and both the
  carousel and lightbox visibly crossfade when paging between images.

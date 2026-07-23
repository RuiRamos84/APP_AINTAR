# 004 — Reduced-motion architecture: one shared gate, applied consistently

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 8 files (1 new hook + 7 edits)

## Problem

`prefers-reduced-motion: reduce` is honored in exactly one place in the whole
`website/` codebase today: `website/src/components/ui/DarkBgDecorations.jsx`,
which correctly uses Framer Motion's `useReducedMotion()` to skip its
ambient rising-particle animation
(`website/src/components/ui/DarkBgDecorations.jsx:1,34,75`):

```jsx
// website/src/components/ui/DarkBgDecorations.jsx:1,33-35,75 — current, correct pattern
import { useReducedMotion } from 'framer-motion'
...
export default function DarkBgDecorations({ particles = true, intensity = 'medium' }) {
  const prefersReduced = useReducedMotion()
  ...
  {particles && !prefersReduced && (
    <div className="absolute inset-0 pointer-events-none">
      {/* rising particles */}
```

Confirmed by search: `useReducedMotion` appears in exactly this one file in
`website/src`. Every other looping, gesture-adjacent, or scroll-linked
animation in the site ignores the media query entirely. This plan closes that
gap in seven places, using one consistent mechanism per animation engine:
Framer Motion's own `useReducedMotion()` where Framer already owns the
animation, a small shared hook for the two cases that use plain
`useEffect`/GSAP instead of Framer, and GSAP's own `matchMedia()` context for
GSAP's ScrollTrigger-driven scrub tweens.

**1. `website/src/components/layout/LenisProvider.jsx`** — instantiates Lenis
smooth-scroll unconditionally on mount, with no reduced-motion check at all:

```jsx
// website/src/components/layout/LenisProvider.jsx:11-46 — current
export default function LenisProvider({ children }) {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    function onTick(time) {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    function onFullscreenChange() { /* … */ }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      gsap.ticker.remove(onTick)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      lenis.destroy()
    }
  }, [])

  return (
    <LenisCtx.Provider value={lenisRef}>
      {children}
    </LenisCtx.Provider>
  )
}
```

This wraps the entire app (`website/src/App.jsx:133-137`) — Lenis intercepts
every scroll gesture on the site to apply its own eased momentum, which is
exactly the kind of vestibular-trigger motion `prefers-reduced-motion` exists
to suppress.

**2. `website/src/components/ui/ScrollReveal.jsx`** — the shared
scroll-entrance primitive, imported by **33 files** across `website/src`
(pages and sections; confirmed by search — the audit's original count of 34
appears to be off by one, treat 33 as the accurate current figure):

```jsx
// website/src/components/ui/ScrollReveal.jsx:1-37 — current
import { motion } from 'framer-motion'

const variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  className = '',
  once = true,
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

Every entrance is a 30px vertical slide + fade with no reduced-motion branch.

**3 & 4. Looping wave dividers — DRIFT FOUND, read carefully.** The task
description assumes `PageHeader.jsx` and `Footer.jsx` render their bottom/top
wave decoration via the `WaveDivider`/`AnimatedWaveDivider` components. That
is **not** the case — confirmed by import search
(`grep -r "WaveDivider|AnimatedWaveDivider" website/src`): only
`StatsSection.jsx`, `HeroSection.jsx` (both via `WaveDivider`), and
`PortalSection.jsx`, `MunicipalitiesSection.jsx` (via `AnimatedWaveDivider`)
actually import those two components. `PageHeader.jsx` and `Footer.jsx` each
carry their own **independent, hand-duplicated copy** of the same
`animationName: 'waveSlide'` / `animationIterationCount: 'infinite'` CSS
pattern, inline, with no shared component at all. This plan therefore treats
these as **four separate targets**, not two — fixing `WaveDivider.jsx` has
zero effect on `PageHeader.jsx` or `Footer.jsx`'s wave loops.

`website/src/components/ui/WaveDivider.jsx:33-52` (two `animationIterationCount:
'infinite'` layers, `waveSlide`, 12s and 8s):

```jsx
// website/src/components/ui/WaveDivider.jsx:36-52 — current (layer 1 shown; layer 2 at :54-70 is identical shape, 8s duration)
<div
  className={`absolute left-0 h-full ${pos}`}
  style={{
    width: '200%',
    animationName: 'waveSlide',
    animationDuration: '12s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDirection: isDown ? 'normal' : 'reverse',
  }}
>
```

`website/src/components/ui/AnimatedWaveDivider.jsx` has **two** infinite loops
per layer (4 layers total): a Framer Motion `y` bob
(`website/src/components/ui/AnimatedWaveDivider.jsx:100-113`, `repeat: Infinity`)
and a plain CSS `animation: wave ${xDuration} linear infinite`
(`website/src/components/ui/AnimatedWaveDivider.jsx:116-125`):

```jsx
// website/src/components/ui/AnimatedWaveDivider.jsx:100-125 — current
<motion.div
  key={i}
  className="absolute bottom-0 left-0 w-full"
  style={{ height: `${svgH}px` }}
  animate={{ y: [-layer.bobAmp, 0, layer.bobAmp, 0, -layer.bobAmp] }}
  transition={{
    duration: layer.bobDur,
    repeat: Infinity,
    ease: 'easeInOut',
    delay: layer.bobDelay,
    times: [0, 0.25, 0.5, 0.75, 1],
  }}
>
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '200%',
      height: `${svgH}px`,
      animation: `wave ${layer.xDuration} linear infinite`,
      animationDirection: layer.xDir,
    }}
  >
```

`website/src/components/layout/PageHeader.jsx:76-119` — its own inline
duplicate of the same wave-loop pattern (no shared component), rendered under
every internal page's header banner:

```jsx
// website/src/components/layout/PageHeader.jsx:77-96 — current (layer 1 shown; layer 2 at :99-119 identical pattern, 8s, reverse)
<div
  className="absolute bottom-0 left-0 h-full"
  style={{
    width: '200%',
    animationName: 'waveSlide',
    animationDuration: '12s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  }}
>
```

`website/src/components/layout/Footer.jsx:41-83` — same duplicate pattern
again, rendered on every page (site footer):

```jsx
// website/src/components/layout/Footer.jsx:41-50 — current (layer 1 shown; layer 2 at :64-72 identical pattern, 8s, no reverse)
<div
  className="absolute top-0 left-0 h-full"
  style={{
    width: '200%',
    animationName: 'waveSlide',
    animationDuration: '12s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDirection: 'reverse',
  }}
>
```

**5. Floating ambient badges** — two nearly-identical infinite Framer loops:

`website/src/components/sections/HeroSection.jsx:201-204`:

```jsx
// website/src/components/sections/HeroSection.jsx:201-204 — current
<motion.div
  animate={{ y: [0, -5, 0] }}
  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
  className="absolute -top-4 -right-4 bg-aintar-navy rounded-2xl border border-aintar-sky/30 px-4 py-2.5 shadow-xl"
>
```

`website/src/components/sections/AboutSection.jsx:59-62`:

```jsx
// website/src/components/sections/AboutSection.jsx:59-62 — current
<motion.div
  animate={{ y: [0, -8, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
  className="absolute -right-6 top-10 hidden lg:block"
>
```

**6. `website/src/components/ui/FloatingScrollIndicator.jsx:52-54`** —
continuous 2.4s infinite bob on the fixed scroll-hint button shown on every
page after 1.8s:

```jsx
// website/src/components/ui/FloatingScrollIndicator.jsx:52-54 — current
<motion.div
  animate={{ y: atBottom ? [0, -5, 0] : [0, 5, 0] }}
  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
```

**7. GSAP scroll-linked parallax (`scrub`)** — three tweens in
`website/src/components/sections/HeroSection.jsx:36-62` and one in
`website/src/components/sections/StatsSection.jsx:125-133` (the `bgRef`
background-parallax tween only — the stat-card entrance `gsap.from(
'[data-statcard]', {...})` at `StatsSection.jsx:135-149` is handled by plan
003 for double-ownership and is explicitly **not** touched here):

```jsx
// website/src/components/sections/HeroSection.jsx:36-62 — current
useGSAP(() => {
  const trigger = sectionRef.current

  gsap.to(bgRef.current, {
    y: '-28%', ease: 'none',
    scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: 1 },
  })

  gsap.to(contentRef.current, {
    y: '12%', opacity: 0.15, ease: 'none',
    scrollTrigger: { trigger, start: '25% top', end: 'bottom top', scrub: 1.6 },
  })

  if (panelRef.current) {
    gsap.to(panelRef.current, {
      y: '-18%', ease: 'none',
      scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: 0.8 },
    })
  }
}, { scope: sectionRef, dependencies: [] })
```

```jsx
// website/src/components/sections/StatsSection.jsx:125-134 — current
useGSAP(() => {
  const trigger = sectionRef.current

  gsap.to(bgRef.current, {
    y: '-20%',
    ease: 'none',
    scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
  })

  gsap.from('[data-statcard]', { /* … unchanged, out of scope … */ })
}, { scope: sectionRef, dependencies: [] })
```

`website/package.json` confirms `"gsap": "^3.15.0"` and `"@gsap/react": "^2.1.2"`
— GSAP 3.11+ supports `gsap.matchMedia()` reduced-motion contexts natively,
which is the idiomatic fit for `ScrollTrigger`/`scrub` tweens (it integrates
with `useGSAP`'s automatic context revert, and re-runs its callback live if
the media query changes).

## Target

**One shared mechanism per animation engine**, applied consistently:

- **Plain `useEffect` code that isn't Framer or GSAP** (only `LenisProvider`
  qualifies): a new shared hook,
  `website/src/hooks/usePrefersReducedMotion.js`.
- **Framer Motion-owned animations** (`ScrollReveal`, `WaveDivider`,
  `AnimatedWaveDivider`'s `y`-bob, `PageHeader`, `Footer`, `HeroSection` and
  `AboutSection` badges, `FloatingScrollIndicator`): Framer's own
  `useReducedMotion()`, exactly as `DarkBgDecorations.jsx` already does.
- **GSAP `ScrollTrigger`/`scrub` tweens** (`HeroSection`'s 3 parallax tweens,
  `StatsSection`'s `bgRef` parallax tween): `gsap.matchMedia()`.

### New file: `website/src/hooks/usePrefersReducedMotion.js`

```js
// website/src/hooks/usePrefersReducedMotion.js — new file, full contents
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Fonte única de verdade para prefers-reduced-motion fora do Framer Motion —
 * usar em efeitos puros (ex.: LenisProvider) que não podem consumir o hook
 * useReducedMotion() do framer-motion diretamente.
 */
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handler = (e) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}
```

### `website/src/components/layout/LenisProvider.jsx`

```jsx
// website/src/components/layout/LenisProvider.jsx — target
import { createContext, useContext, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const LenisCtx = createContext(null)
export const useLenis = () => useContext(LenisCtx)

export default function LenisProvider({ children }) {
  const lenisRef = useRef(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return // scroll nativo do browser assume, sem Lenis

    const lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    function onTick(time) {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    function onFullscreenChange() {
      if (document.fullscreenElement) {
        lenis.stop()
      } else {
        lenis.start()
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      gsap.ticker.remove(onTick)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [prefersReducedMotion])

  return (
    <LenisCtx.Provider value={lenisRef}>
      {children}
    </LenisCtx.Provider>
  )
}
```

`lenisRef.current` stays `null` whenever reduced motion is requested — any
consumer of `useLenis()` elsewhere in the app must already treat a `null`
ref/`.current` as "no Lenis instance" (confirm no existing `useLenis()`
consumer assumes a non-null instance; if one does, it needs its own optional
chaining, but that is a pre-existing contract of `useLenis()` returning a ref
whose `.current` can be `null` before mount — not a new requirement
introduced by this plan).

### `website/src/components/ui/ScrollReveal.jsx`

```jsx
// website/src/components/ui/ScrollReveal.jsx — target
import { motion, useReducedMotion } from 'framer-motion'

const variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const reducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  className = '',
  once = true,
}) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      transition={{
        duration: prefersReduced ? 0.2 : duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      variants={prefersReduced ? reducedVariants : variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

Reduced motion drops the `y: 30` slide entirely and caps duration at 0.2s
(200ms, per AUDIT.md budget) — opacity feedback is kept, per AUDIT.md
category 6 ("keep transitions that aid comprehension, remove position
changes"). `delay` is intentionally left untouched — stagger timing between
sibling `ScrollReveal`s is not a movement effect and doesn't need gating.

### `website/src/components/ui/WaveDivider.jsx`

```jsx
// website/src/components/ui/WaveDivider.jsx — target (top of function + both layers)
import { useReducedMotion } from 'framer-motion'

export default function WaveDivider({ direction = 'down', color = '#ffffff' }) {
  const isDown = direction === 'down'
  const prefersReduced = useReducedMotion()
  // … hexToRgba, layer1Path, layer2Path, pos unchanged …

  return (
    <div className={`absolute left-0 right-0 h-16 overflow-hidden pointer-events-none ${pos}`}>
      <div
        className={`absolute left-0 h-full ${pos}`}
        style={{
          width: '200%',
          ...(prefersReduced ? {} : {
            animationName: 'waveSlide',
            animationDuration: '12s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: isDown ? 'normal' : 'reverse',
          }),
        }}
      >
        {/* svg layer 1 unchanged */}
      </div>

      <div
        className={`absolute left-0 h-full ${pos}`}
        style={{
          width: '200%',
          ...(prefersReduced ? {} : {
            animationName: 'waveSlide',
            animationDuration: '8s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: isDown ? 'reverse' : 'normal',
          }),
        }}
      >
        {/* svg layer 2 unchanged */}
      </div>
    </div>
  )
}
```

When reduced, both layers render statically at the SVG's authored (t=0)
shape — the wave silhouette stays visible, only the endless horizontal slide
is dropped.

### `website/src/components/ui/AnimatedWaveDivider.jsx`

```jsx
// website/src/components/ui/AnimatedWaveDivider.jsx — target (import + per-layer render)
import { motion, useReducedMotion } from 'framer-motion'

export default function AnimatedWaveDivider({ /* … unchanged props … */ }) {
  const prefersReduced = useReducedMotion()
  // … h, svgH, pathBg/pathMid/pathFront/pathRipple, layers array all unchanged …

  return (
    <div /* … unchanged wrapper … */>
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 left-0 w-full"
          style={{ height: `${svgH}px` }}
          animate={prefersReduced ? { y: 0 } : { y: [-layer.bobAmp, 0, layer.bobAmp, 0, -layer.bobAmp] }}
          transition={prefersReduced ? { duration: 0 } : {
            duration: layer.bobDur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: layer.bobDelay,
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '200%',
              height: `${svgH}px`,
              ...(prefersReduced ? {} : {
                animation: `wave ${layer.xDuration} linear infinite`,
                animationDirection: layer.xDir,
              }),
            }}
          >
            {/* svg unchanged */}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
```

### `website/src/components/layout/PageHeader.jsx`

```jsx
// website/src/components/layout/PageHeader.jsx — target (import + wave block)
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

export default function PageHeader({ title, subtitle, breadcrumbs = [] }) {
  const { scrollY } = useScroll()
  const y1      = useTransform(scrollY, [0, 300], [0, 60])
  const opacity = useTransform(scrollY, [0, 200], [1, 0.6])
  const prefersReduced = useReducedMotion()
  // … breadcrumb/title/subtitle motion.* unchanged …

  return (
    <div className="bg-hero-gradient pt-28 pb-20 relative overflow-hidden min-h-[220px]">
      {/* … unchanged … */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none">
        <div
          className="absolute bottom-0 left-0 h-full"
          style={{
            width: '200%',
            ...(prefersReduced ? {} : {
              animationName: 'waveSlide',
              animationDuration: '12s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }),
          }}
        >
          {/* svg layer 1 unchanged */}
        </div>
        <div
          className="absolute bottom-0 left-0 h-full"
          style={{
            width: '200%',
            ...(prefersReduced ? {} : {
              animationName: 'waveSlide',
              animationDuration: '8s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDirection: 'reverse',
            }),
          }}
        >
          {/* svg layer 2 unchanged */}
        </div>
      </div>
    </div>
  )
}
```

### `website/src/components/layout/Footer.jsx`

```jsx
// website/src/components/layout/Footer.jsx — target (new import + wave block)
import { useReducedMotion } from 'framer-motion'
// … existing Link/icons/DarkBgDecorations imports unchanged …

export default function Footer() {
  const prefersReduced = useReducedMotion()

  return (
    <footer className="bg-hero-gradient text-white relative overflow-hidden">
      <DarkBgDecorations intensity="low" />
      <div className="absolute top-0 left-0 right-0 h-16 overflow-hidden pointer-events-none z-10">
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: '200%',
            ...(prefersReduced ? {} : {
              animationName: 'waveSlide',
              animationDuration: '12s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDirection: 'reverse',
            }),
          }}
        >
          {/* svg layer 1 unchanged */}
        </div>
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: '200%',
            ...(prefersReduced ? {} : {
              animationName: 'waveSlide',
              animationDuration: '8s',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }),
          }}
        >
          {/* svg layer 2 unchanged */}
        </div>
      </div>
      {/* … rest of footer unchanged … */}
    </footer>
  )
}
```

### `website/src/components/sections/HeroSection.jsx` (floating badge)

```jsx
// website/src/components/sections/HeroSection.jsx — target (import + badge only)
import { motion, useReducedMotion } from 'framer-motion'
// … other imports unchanged …

export default function HeroSection() {
  const prefersReduced = useReducedMotion()
  // … sectionRef, bgRef, contentRef, panelRef, useGSAP block unchanged here (see GSAP section below) …

  return (
    // … unchanged JSX up to the floating badge …
    <motion.div
      animate={prefersReduced ? { y: 0 } : { y: [0, -5, 0] }}
      transition={prefersReduced ? { duration: 0 } : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute -top-4 -right-4 bg-aintar-navy rounded-2xl border border-aintar-sky/30 px-4 py-2.5 shadow-xl"
    >
      {/* unchanged children */}
    </motion.div>
    // … rest unchanged …
  )
}
```

### `website/src/components/sections/AboutSection.jsx` (floating badge)

```jsx
// website/src/components/sections/AboutSection.jsx — target (import + badge only)
import { motion, useReducedMotion } from 'framer-motion'
// … other imports unchanged …

export default function AboutSection() {
  const [imgError, setImgError] = useState(false)
  const prefersReduced = useReducedMotion()

  return (
    // … unchanged JSX up to the floating badge …
    <motion.div
      animate={prefersReduced ? { y: 0 } : { y: [0, -8, 0] }}
      transition={prefersReduced ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute -right-6 top-10 hidden lg:block"
    >
      {/* unchanged children */}
    </motion.div>
    // … rest unchanged …
  )
}
```

### `website/src/components/ui/FloatingScrollIndicator.jsx`

```jsx
// website/src/components/ui/FloatingScrollIndicator.jsx — target (import + inner bob motion.div only)
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

export default function FloatingScrollIndicator() {
  const [show, setShow]       = useState(false)
  const [atBottom, setAtBottom] = useState(false)
  const prefersReduced = useReducedMotion()
  // … unchanged effects/handleClick …

  return (
    <AnimatePresence>
      {show && (
        <motion.button /* … outer opacity fade unchanged … */>
          <motion.div
            animate={prefersReduced ? { y: 0 } : { y: atBottom ? [0, -5, 0] : [0, 5, 0] }}
            transition={prefersReduced ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-8 h-8 rounded-full border border-aintar-sky/40 flex items-center justify-center group-hover:border-aintar-sky/80 transition-colors duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          >
            {/* chevron rotate — unchanged, not a looping animation, out of scope */}
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
```

### GSAP scrub tweens — `HeroSection.jsx` and `StatsSection.jsx`

```jsx
// website/src/components/sections/HeroSection.jsx:36-62 — target
useGSAP(() => {
  const trigger = sectionRef.current
  const mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(bgRef.current, {
      y: '-28%', ease: 'none',
      scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: 1 },
    })

    gsap.to(contentRef.current, {
      y: '12%', opacity: 0.15, ease: 'none',
      scrollTrigger: { trigger, start: '25% top', end: 'bottom top', scrub: 1.6 },
    })

    if (panelRef.current) {
      gsap.to(panelRef.current, {
        y: '-18%', ease: 'none',
        scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: 0.8 },
      })
    }
  })
}, { scope: sectionRef, dependencies: [] })
```

```jsx
// website/src/components/sections/StatsSection.jsx:125-150 — target (bgRef tween gated; data-statcard block untouched)
useGSAP(() => {
  const trigger = sectionRef.current
  const mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(bgRef.current, {
      y: '-20%',
      ease: 'none',
      scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
    })
  })

  // Stat cards cinematic entrance — unchanged, out of scope for this plan (see plan 003)
  gsap.from('[data-statcard]', {
    scale: 0.7,
    opacity: 0,
    y: 40,
    duration: 0.7,
    stagger: { each: 0.1, from: 'start' },
    ease: 'back.out(1.5)',
    clearProps: 'all',
    scrollTrigger: {
      trigger: gridRef.current,
      start: 'top 82%',
      toggleActions: 'play none none none',
    },
  })
}, { scope: sectionRef, dependencies: [] })
```

`gsap.matchMedia()` called inside a `useGSAP` context is automatically
registered with that context and reverted on unmount/dependency change along
with everything else `useGSAP` owns — no separate cleanup call is needed.

## Repo conventions to follow

- `DarkBgDecorations.jsx` (`website/src/components/ui/DarkBgDecorations.jsx:1,34,75`)
  is this repo's own correct reference implementation of Framer's
  `useReducedMotion()` — import it from `'framer-motion'`, call it once at
  the top of the component, and branch JSX/animation props on the boolean.
  Every Framer-based fix in this plan imitates that file exactly.
- New shared hooks in this codebase have no prior home (`website/src` has no
  `hooks/` or `lib/` directory yet — confirmed by directory search). This
  plan creates `website/src/hooks/` as the new, conventional location; place
  only `usePrefersReducedMotion.js` there for now.
- `useGSAP(..., { scope: sectionRef, dependencies: [] })` is this codebase's
  established GSAP-in-React pattern (`HeroSection.jsx`, `StatsSection.jsx`)
  — the `gsap.matchMedia()` call is nested inside the existing callback, not
  a new top-level pattern.

## Steps

1. Create `website/src/hooks/usePrefersReducedMotion.js` with the exact
   contents shown in Target above.
2. Edit `website/src/components/layout/LenisProvider.jsx`: add the import
   `import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion'`,
   call `const prefersReducedMotion = usePrefersReducedMotion()` inside the
   component body, add `if (prefersReducedMotion) return` as the first line
   inside the `useEffect` callback (before `const lenis = new Lenis(...)`),
   add `lenisRef.current = null` to the cleanup function, and change the
   effect's dependency array from `[]` to `[prefersReducedMotion]`.
3. Edit `website/src/components/ui/ScrollReveal.jsx`: change the import to
   `import { motion, useReducedMotion } from 'framer-motion'`, add a
   `reducedVariants` object (`{ hidden: { opacity: 0 }, visible: { opacity: 1 } }`),
   call `const prefersReduced = useReducedMotion()` inside the component, and
   update the `motion.div`'s `transition` (`duration: prefersReduced ? 0.2 :
   duration`) and `variants` (`prefersReduced ? reducedVariants : variants`)
   props exactly as shown in Target.
4. Edit `website/src/components/ui/WaveDivider.jsx`: add
   `import { useReducedMotion } from 'framer-motion'` at the top, call
   `const prefersReduced = useReducedMotion()` as the first line inside the
   function, and replace the five `animation*` inline-style properties on
   each of the two layer `<div>`s with a conditional spread
   (`...(prefersReduced ? {} : { animationName: ..., ... })`) as shown in
   Target — keep `width: '200%'` unconditional on both.
5. Edit `website/src/components/ui/AnimatedWaveDivider.jsx`: add
   `useReducedMotion` to the existing `framer-motion` import, call
   `const prefersReduced = useReducedMotion()` as the first line inside the
   function, and update both the outer `motion.div`'s `animate`/`transition`
   props and the inner CSS-animated `<div>`'s `style` object exactly as shown
   in Target, for all four layers (the `layers.map` loop covers all of them
   with the same conditional).
6. Edit `website/src/components/layout/PageHeader.jsx`: add
   `useReducedMotion` to the existing `framer-motion` import, call
   `const prefersReduced = useReducedMotion()` inside the component, and
   replace the four `animation*` inline-style properties on each of the two
   wave layer `<div>`s (bottom of the file, inside the
   `absolute bottom-0 left-0 right-0 h-16` wrapper) with the conditional
   spread pattern shown in Target.
7. Edit `website/src/components/layout/Footer.jsx`: add a new import
   `import { useReducedMotion } from 'framer-motion'` (this file currently
   has no framer-motion import at all), call
   `const prefersReduced = useReducedMotion()` inside the component, and
   apply the same conditional-spread pattern to both wave layer `<div>`s.
8. Edit `website/src/components/sections/HeroSection.jsx` in two places: (a)
   add `useReducedMotion` to the existing `framer-motion` import and call
   `const prefersReduced = useReducedMotion()` inside the component, then
   update the floating-badge `motion.div`'s `animate`/`transition` props
   exactly as shown in Target; (b) inside the existing `useGSAP` callback,
   wrap the three `gsap.to(...)` calls in a `const mm = gsap.matchMedia();
   mm.add('(prefers-reduced-motion: no-preference)', () => { ... })` block as
   shown in Target, with no other change to the tween configs.
9. Edit `website/src/components/sections/AboutSection.jsx`: add
   `useReducedMotion` to the existing `framer-motion` import, call
   `const prefersReduced = useReducedMotion()` inside the component, and
   update the floating-badge `motion.div`'s `animate`/`transition` props
   exactly as shown in Target.
10. Edit `website/src/components/ui/FloatingScrollIndicator.jsx`: add
    `useReducedMotion` to the existing `framer-motion` import, call
    `const prefersReduced = useReducedMotion()` inside the component, and
    update the inner bob `motion.div`'s `animate`/`transition` props exactly
    as shown in Target. Leave the outer `motion.button`'s opacity
    `initial`/`animate`/`exit` and the chevron rotate `motion.div` untouched.
11. Edit `website/src/components/sections/StatsSection.jsx`: inside the
    existing `useGSAP` callback, wrap only the `gsap.to(bgRef.current,
    {...})` parallax tween in a `const mm = gsap.matchMedia(); mm.add(
    '(prefers-reduced-motion: no-preference)', () => { ... })` block as shown
    in Target. Leave the `gsap.from('[data-statcard]', {...})` block
    completely outside the `matchMedia` gate and otherwise untouched (that
    animation's ownership is plan 003's concern, and it is intentionally left
    ungated by reduced motion in both plans — not an oversight).

## Boundaries

- Do NOT gate `gsap.from('[data-statcard]', {...})` in `StatsSection.jsx`
  under reduced motion — explicitly out of scope per the task description,
  and it overlaps with plan 003's double-ownership fix; touching it here
  risks conflicting edits if the two plans are executed out of order.
- Do NOT touch `FloatingScrollIndicator.jsx`'s outer opacity
  `initial`/`animate`/`exit` fade or its chevron `rotate` animation — neither
  is a continuous/infinite loop, both are state-triggered, out of scope.
- Do NOT touch `PageTransition.jsx` (plan 001) or the `.btn-primary`/`.card`
  hover transitions (plan 002) — unrelated findings.
- Do NOT add a reduced-motion gate to `DarkBgDecorations.jsx` — it already
  has one; it is the reference pattern, not a target.
- Do NOT change any non-reduced-motion animation value (durations, easings,
  distances) in any of the eight files — this plan only adds a conditional
  branch, it does not retune existing motion.
- Do NOT create any file under `website/src/lib/` — this plan places the new
  hook under `website/src/hooks/`, per the Repo Conventions decision above.
- If `useLenis()` has any consumer elsewhere in the codebase that dereferences
  `.current` without a null check, STOP and report rather than silently
  patching that consumer — it's outside this plan's file list and needs its
  own review.
- If any of the eight files' current code doesn't match what's quoted in
  Problem (drift since commit `a93c46f`), STOP and report exactly what
  differs instead of improvising the fix for that file.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors —
  this exercises every new import (`usePrefersReducedMotion`,
  `useReducedMotion` added to five files) and the new `hooks/` directory
  path resolution.
- **Feel check — reduced motion OFF (default)**: run `cd website && npm run
  dev`, browse several pages, and confirm every animation touched in this
  plan looks and feels **identical** to before: Lenis smooth-scroll still
  active (scrolling has eased momentum, not a hard 1:1 native scroll), page
  entrances still slide+fade via `ScrollReveal`, wave dividers under
  `PageHeader`/`Footer`/`WaveDivider`/`AnimatedWaveDivider` still animate
  their horizontal slide and vertical bob, the Hero/About floating badges
  still bob, `FloatingScrollIndicator` still bobs after 1.8s, and the Hero
  background/content/panel still parallax on scroll.
- **Feel check — reduced motion ON**: toggle `prefers-reduced-motion: reduce`
  in DevTools → Rendering panel (or OS-level accessibility setting), reload,
  and confirm for each:
  - Scrolling feels like native browser scroll (no Lenis momentum/easing).
  - `ScrollReveal`-wrapped content still fades in (opacity only, no upward
    slide) — check at least 3 different pages that use it.
  - All four wave-divider locations (`WaveDivider` in Hero/Stats,
    `AnimatedWaveDivider` in Portal/Municipalities sections, `PageHeader` on
    any internal page, `Footer` on any page) render their wave shape
    statically — no horizontal slide, no vertical bob.
  - The Hero "2022 Fundação" badge and the About "2022 Fundação" badge sit
    still, no bobbing.
  - `FloatingScrollIndicator`'s chevron circle sits still (no bob); it should
    still fade in/out via `AnimatePresence` and still rotate 180° at page
    bottom (unrelated to this plan).
  - Scrolling through the Hero section produces no parallax drift on the
    background layer, content block, or right-hand stats panel; scrolling
    through the Stats section produces no background parallax drift.
  - In DevTools → Animations panel, confirm no infinite/looping animation
    tracks are present anywhere on the page while the toggle is on (only
    one-shot, short fades where applicable).
  - Toggle `prefers-reduced-motion` back to no-preference and confirm every
    animation resumes exactly as in the "reduced motion OFF" check — this
    proves the live-listening paths (Framer's `useReducedMotion()`, the new
    `usePrefersReducedMotion` hook, GSAP's `matchMedia`) all react correctly
    to a runtime change, not just the initial page load.
  - Navigate away from the homepage (unmounting `HeroSection`/`StatsSection`)
    and back — in DevTools → Animations panel or via `ScrollTrigger.getAll()`
    in the console, confirm no duplicate/leaked `ScrollTrigger` instances
    accumulate from the `gsap.matchMedia()` contexts across remounts.
- **Done when**: all eight files match their Target snippets, `npm run build`
  succeeds, and both feel-check passes (motion on / motion off / toggle back)
  show no regressions and no residual looping motion while reduced motion is
  active.

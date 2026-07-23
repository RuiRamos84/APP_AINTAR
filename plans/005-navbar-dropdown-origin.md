# 005 — Set transform-origin on Navbar dropdown menu

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, 1 className addition

## Problem

`website/src/components/layout/Navbar.jsx` defines a single `DropdownMenu`
component, reused for every top-level nav item that has `children` (Quem
Somos, Clientes, Saneamento, Comunicação, Educação Ambiental —
`website/src/components/layout/Navbar.jsx:9-59`). It renders scale+fade with
no `transform-origin` set anywhere (no `origin-*` Tailwind class, no inline
`style.transformOrigin`), so it defaults to the CSS initial value of `50% 50%`
(center):

```jsx
// website/src/components/layout/Navbar.jsx:61-98 — current
function DropdownMenu({ items }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 z-50"
      role="menu"
    >
      <div className="bg-white rounded-2xl shadow-xl shadow-aintar-navy/15 border border-gray-100 overflow-hidden py-2">
        {/* items */}
      </div>
    </motion.div>
  )
}
```

`DropdownMenu` is only ever instantiated one way — inside the `navMenu.map()`
loop at `website/src/components/layout/Navbar.jsx:226-255`, as a sibling of
its own trigger `<button>`, positioned via
`absolute top-full left-1/2 -translate-x-1/2` relative to a `className="relative"`
wrapper `<div>` that is itself one flex item among several in the horizontal
nav bar (`website/src/components/layout/Navbar.jsx:225`,
`<nav className="hidden lg:flex items-center gap-0.5">`). Confirmed by
reading the full file: there is exactly one render call site
(`<DropdownMenu items={item.children} />`,
`website/src/components/layout/Navbar.jsx:252`), used identically for every
nav item regardless of the trigger's horizontal position in the bar (first
item "Quem Somos" near the left edge, "Comunicação"/"Educação Ambiental"
further right) — each dropdown is always centered under its own trigger via
`left-1/2 -translate-x-1/2` on the dropdown itself, not positioned relative to
the viewport or the nav bar as a whole. So `top center` is the geometrically
correct, universal origin here — there is no left/right-anchored variant to
account for.

Per AUDIT.md category 3: "Popovers/dropdowns/tooltips scale from their
trigger, not center." Currently this dropdown scales from its own center,
which is visually disconnected from the nav item that opened it.

There is a second dropdown-like menu in the mobile nav
(`website/src/components/layout/Navbar.jsx:364-400`, the mobile submenu
`height`/`opacity` expand) — that one animates `height: 0 → 'auto'`, not
`scale`, so `transform-origin` doesn't apply to it and it is correctly out of
scope for this plan (no scale-from-center problem exists there).

## Target

Add `origin-top` (Tailwind's `transform-origin: top` utility) to
`DropdownMenu`'s `className`, alongside the existing centering classes:

```jsx
// website/src/components/layout/Navbar.jsx:68 — target
className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 z-50 origin-top"
```

No other line in `DropdownMenu` or its call site changes. `origin-top` sets
`transform-origin: top center`, which is exactly right since the element is
already horizontally centered on its trigger via `left-1/2 -translate-x-1/2`
— the scale-down/up now visually anchors to the point where the dropdown
meets its trigger button (`top-full`, i.e. directly below the nav item),
rather than growing from the dropdown's own geometric center.

## Repo conventions to follow

- This codebase uses Tailwind utility classes directly in `className` for
  all positioning/transform concerns — no separate CSS file or
  `style={{ transformOrigin: ... }}` inline style is used elsewhere for this
  kind of thing. Adding `origin-top` alongside `top-full left-1/2
  -translate-x-1/2` keeps the fix in the same idiom as the rest of the class
  list on this exact element
  (`website/src/components/layout/Navbar.jsx:68`).
- AUDIT.md's own CSS example for this finding
  (`.popover { transform-origin: var(--transform-origin); }`) is a raw-CSS
  illustration for codebases using CSS custom properties; this repo has no
  such token and none is being introduced here — Tailwind's built-in
  `origin-*` utility is the direct, idiomatic equivalent for a Tailwind v4
  project and requires no new token.

## Steps

1. In `website/src/components/layout/Navbar.jsx`, in the `DropdownMenu`
   component's `motion.div` (line 68), append `origin-top` to the existing
   `className` string, changing
   `"absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 z-50"` to
   `"absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 z-50 origin-top"`.
   No other prop or line in the file changes.

## Boundaries

- Do NOT touch the mobile submenu's `height`/`opacity` expand animation
  (`website/src/components/layout/Navbar.jsx:364-400`) — it doesn't scale, so
  `transform-origin` is not applicable there.
- Do NOT touch `SearchModal` (`website/src/components/ui/SearchModal.jsx`,
  not read for this plan) — it's a distinct, centered overlay, not a
  trigger-anchored dropdown, and out of scope.
- Do NOT change `DropdownMenu`'s `initial`/`animate`/`exit`/`transition`
  values (scale amount, duration, easing) — only the transform-origin is a
  finding here; easing/duration nits for this element are not part of this
  plan.
- Do NOT change how/where `DropdownMenu` is invoked
  (`website/src/components/layout/Navbar.jsx:250-254`).
- If `DropdownMenu` no longer matches the code quoted above, or if a second
  call site with different positioning is found (drift since commit
  `a93c46f`), STOP and report — do not assume `origin-top` is still correct
  for a positioning pattern you haven't verified.

## Verification

- **Mechanical**: `cd website && npm run build` completes with no errors (a
  single Tailwind class addition, nothing to break).
- **Feel check**: run `cd website && npm run dev`, and on desktop viewport
  (≥1024px, so the desktop nav renders) hover over each dropdown-bearing nav
  item in turn — "Quem Somos" (near the left edge of the bar), "Clientes",
  "Saneamento", "Comunicação", and "Educação Ambiental" (further right):
  - The dropdown should visibly scale up **from its top edge, centered under
    the nav item's button** — not from the dropdown panel's own center. The
    difference is most visible on the vertical axis: with `origin-top`, the
    top edge of the dropdown stays anchored near the trigger while the
    bottom edge grows downward; previously (center origin) both top and
    bottom edges moved apart symmetrically.
  - Confirm this looks correct for both a left-positioned trigger ("Quem
    Somos") and a right-positioned trigger ("Educação Ambiental") — since
    the dropdown is self-centered under each trigger via
    `left-1/2 -translate-x-1/2`, `origin-top` should look correct in both
    positions with no horizontal drift.
  - In DevTools → Animations panel, trigger the dropdown's open animation and
    set playback to 10% — confirm the scale keyframe grows from the top
    edge, not symmetrically from the panel's vertical center.
  - Toggle `prefers-reduced-motion: reduce` in DevTools' Rendering panel —
    this dropdown has no existing reduced-motion gate (out of scope for this
    plan); confirm its behavior is unchanged by the toggle, same as before
    this fix.
- **Done when**: `website/src/components/layout/Navbar.jsx`'s `DropdownMenu`
  className includes `origin-top`, and every dropdown-bearing nav item's
  panel visibly scales from its top edge under the trigger rather than from
  its own center.

# 011 — Replace `transition: all` with explicit properties across nav chrome

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 4 files, 10 declarations

## Problem

Per AUDIT.md category 5, `transition: all` animates unintended properties
off-GPU and is always a finding. Ten occurrences found across four
navigation-chrome files, each read individually to determine what actually
changes at that specific declaration (they are not identical):

```jsx
// frontend-v2/src/shared/components/layout/NotificationCenter.jsx:160-172 — current
<IconButton
  onClick={handleOpen}
  sx={{
    mr: 2,
    color: theme.palette.text.secondary,
    transition: 'all 0.2s',
    '&:hover': {
      color: theme.palette.primary.main,
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      transform: 'scale(1.05)',
    },
  }}
>
```
Changes on hover: `color`, `background-color`, `transform`.

```jsx
// NotificationCenter.jsx:231-249 — current (Tabs inside the notification Menu)
sx={{
  minHeight: 36,
  '& .MuiTab-root': {
    minHeight: 36,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    borderRadius: 2,
    transition: 'all 0.2s',
  },
  '& .MuiTabs-indicator': { height: 0, borderRadius: 1 },
  '& .Mui-selected': {
    bgcolor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
  },
}}
```
Changes on selection (via the sibling `.Mui-selected` rule): `background-color`,
`color`. `border-radius`/`font-size`/`min-height` never change here.

```jsx
// NotificationCenter.jsx:284-300 — current (notification list item)
<ListItemButton
  ...
  sx={{
    px: 2, py: 1.5,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
    transition: 'all 0.2s',
    bgcolor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
    gap: 2,
    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
  }}
>
```
Changes on hover and on read/unread state: `background-color` only.

```js
// frontend-v2/src/shared/components/layout/Sidebar.jsx:139-160 — current (nav ListItemButton)
sx={{
  minHeight: 44,
  justifyContent: collapsed ? 'center' : 'initial',
  px: 2.5, mx: 1, borderRadius: 2, mb: 0.5,
  transition: 'all 0.2s ease-in-out',
  '&.Mui-selected': {
    background: `linear-gradient(135deg, ${moduleColor}, ${alpha(moduleColor, 0.75)})`,
    color: 'white',
    boxShadow: `0 4px 12px ${alpha(moduleColor, 0.35)}`,
    '&:hover': { background: `linear-gradient(135deg, ${alpha(moduleColor, 0.85)}, ${moduleColor})` },
    '& .MuiListItemIcon-root': { color: 'white' },
  },
  '&:not(.Mui-selected):hover': {
    backgroundColor: alpha(moduleColor, 0.08),
    transform: 'translateX(3px)',
  },
}}
```
Changes on selection/hover: `background` (it's a gradient, so the property
name must be `background`, not `background-color`), `color`, `box-shadow`,
`transform`.

```jsx
// Sidebar.jsx:173-183 — current (ListItemText — the doubly-broken case)
<ListItemText
  primary={route.text}
  primaryTypographyProps={{ fontWeight: active ? 600 : 400, fontSize: '0.88rem', noWrap: true }}
  sx={{
    opacity: collapsed ? 0 : 1,
    width: collapsed ? 0 : 'auto',
    overflow: 'hidden',
    transition: 'all 0.2s',
    m: 0,
  }}
/>
```
This is the case flagged in the task brief: `width: collapsed ? 0 : 'auto'`
under a `transition`. CSS transitions cannot interpolate to/from `auto` — the
width snaps instantly regardless of the `all 0.2s`, so today only `opacity`
is genuinely animating; the `width` toggle is a hard cut hidden behind a
transition declaration that implies it's smooth. It isn't. Doubly broken:
`all` (unintended-property risk) stacked on an un-animatable target.

```jsx
// Sidebar.jsx:261-276 — current (module header Box)
sx={{
  px: 2, py: 1.5, mx: 1, mb: 1.5, borderRadius: 2.5,
  backgroundColor: alpha(moduleColor, 0.1),
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  display: 'flex', alignItems: 'center',
  justifyContent: collapsed ? 'center' : 'flex-start',
  gap: 1.5,
  transition: 'all 0.3s ease',
}}
```
`justifyContent` is a keyword property — browsers do not smoothly interpolate
it via CSS transitions (it flips at the halfway point, not a real animation).
`backgroundColor` genuinely changes when `moduleColor` changes (switching
modules). `border-radius`/`gap`/`display` never change. So the only
meaningfully-animatable property here is `background-color`.

```jsx
// Sidebar.jsx:333-348 — current (collapse-toggle IconButton, footer)
sx={{
  width: 32, height: 32, borderRadius: '50%',
  border: `2px solid ${isConnected ? '#4caf50' : '#f44336'}`,
  bgcolor: alpha(isConnected ? '#4caf50' : '#f44336', 0.08),
  color: isConnected ? 'success.main' : 'error.main',
  transition: 'all 0.2s',
  '&:hover': {
    bgcolor: alpha(isConnected ? '#4caf50' : '#f44336', 0.18),
    transform: 'scale(1.1)',
  },
}}
```
Changes on hover: `background-color`, `transform`.

```jsx
// frontend-v2/src/shared/components/layout/AppBar.jsx:274-284 — current (avatar IconButton wrapper)
<IconButton
  onClick={handleOpenMenu}
  sx={{
    p: 0.5,
    border: `2px solid ${user?.vacation ? alpha(theme.palette.warning.main, 0.5) : accentColor ? alpha(accentColor, 0.4) : alpha(theme.palette.primary.main, 0.2)}`,
    borderRadius: '50%',
    transition: 'all 0.35s ease',
    '&:hover': { borderColor: user?.vacation ? theme.palette.warning.main : accentColor || theme.palette.primary.main },
  }}
>
```
Changes on hover: `border-color` only.

```jsx
// AppBar.jsx:294-303 — current (Avatar itself)
<Avatar
  sx={{
    width: avatarSize,
    height: avatarSize,
    bgcolor: user?.vacation ? 'warning.main' : accentColor || theme.palette.primary.main,
    fontSize: scrolled ? '0.75rem' : '0.85rem',
    fontWeight: 'bold',
    transition: 'all 0.35s ease',
  }}
>
```
This one is different in character from the others: `width`/`height`
(`avatarSize`) and `fontSize` change with the same `scrolled` boolean plan
010 deals with for the rest of the AppBar — but `avatarSize` (36-40px) is
always smaller than the Toolbar's own `min-height` floor even when compact
(48px), so — unlike `toolbarHeight`/`tabHeight` in plan 010 — nothing
downstream depends on the Avatar's real box size, and a `transform: scale()`
conversion would be safe here in principle. This plan's scope, however, is
narrowly "replace `all` with the precise properties that change" (per the
task brief, to avoid duplicating/conflicting with plan 010's edits to this
same file); it does **not** redesign this into a transform. See Boundaries.

```jsx
// frontend-v2/src/shared/components/layout/PortalNavbar.jsx:138-146 — current (Avatar)
<Avatar
  sx={{
    width: 34, height: 34, bgcolor: 'primary.main',
    fontSize: '0.85rem', fontWeight: 'bold',
    border: '2px solid rgba(27,94,142,0.2)',
    transition: 'all 0.2s',
    '&:hover': { borderColor: '#1B5E8E', transform: 'scale(1.05)' },
  }}
>
```
Changes on hover: `border-color`, `transform`.

## Target

Each declaration gets its own precise property list, easing/duration
unchanged:

```jsx
// NotificationCenter.jsx:165 — target
transition: 'color 0.2s, background-color 0.2s, transform 0.2s',
```
```jsx
// NotificationCenter.jsx:239 — target
transition: 'background-color 0.2s, color 0.2s',
```
```jsx
// NotificationCenter.jsx:292 — target
transition: 'background-color 0.2s',
```
```jsx
// Sidebar.jsx:146 — target
transition: 'background 0.2s ease-in-out, color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
```
```jsx
// Sidebar.jsx:176-182 — target (ListItemText — drop the un-animatable width driver)
sx={{
  opacity: collapsed ? 0 : 1,
  overflow: 'hidden',
  transition: 'opacity 0.2s ease',
  m: 0,
}}
```
(No `width` property at all — the text keeps its natural/auto width; the
existing `overflowX: 'hidden'` on the Sidebar's outer content container,
`Sidebar.jsx:257`, already clips it from view when collapsed, so removing
the width toggle doesn't introduce visible overflow. It fades instead of
"snapping" via a property that was never really animating.)
```jsx
// Sidebar.jsx:275 — target
transition: 'background-color 0.3s ease',
```
```jsx
// Sidebar.jsx:343 — target
transition: 'background-color 0.2s, transform 0.2s',
```
```jsx
// AppBar.jsx:281 — target
transition: 'border-color 0.35s ease',
```
```jsx
// AppBar.jsx:301 — target
transition: 'width 0.35s ease, height 0.35s ease, font-size 0.35s ease, background-color 0.2s ease',
```
(Kept as named layout properties rather than converted to `transform` — see
Boundaries for why that redesign is explicitly out of scope here.)
```jsx
// PortalNavbar.jsx:143 — target
transition: 'border-color 0.2s, transform 0.2s',
```

## Repo conventions to follow

- Multi-property explicit transitions, comma-separated, each with its own
  duration/easing where they differ — see the already-correct pattern at
  `frontend-v2/src/styles/theme/index.js:347`:
  `transition: 'background-color 0.15s ease, transform 0.15s ease'`
  (MUI `MuiListItemButton` global override). Match this style exactly.
- Do not introduce new easing curves — every declaration above keeps
  whatever duration/curve it already had; only the property list changes.

## Steps

1. `NotificationCenter.jsx:165` — replace `transition: 'all 0.2s'` with
   `transition: 'color 0.2s, background-color 0.2s, transform 0.2s'`.
2. `NotificationCenter.jsx:239` — replace `transition: 'all 0.2s'` with
   `transition: 'background-color 0.2s, color 0.2s'`.
3. `NotificationCenter.jsx:292` — replace `transition: 'all 0.2s'` with
   `transition: 'background-color 0.2s'`.
4. `Sidebar.jsx:146` — replace `transition: 'all 0.2s ease-in-out'` with
   `transition: 'background 0.2s ease-in-out, color 0.2s ease-in-out,
   box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out'`.
5. `Sidebar.jsx:176-182` (the `ListItemText` sx) — remove the `width:
   collapsed ? 0 : 'auto'` line entirely, replace `transition: 'all 0.2s'`
   with `transition: 'opacity 0.2s ease'`. Keep `opacity`, `overflow: 'hidden'`,
   `m: 0` as-is.
6. `Sidebar.jsx:275` — replace `transition: 'all 0.3s ease'` with
   `transition: 'background-color 0.3s ease'`.
7. `Sidebar.jsx:343` — replace `transition: 'all 0.2s'` with `transition:
   'background-color 0.2s, transform 0.2s'`.
8. `AppBar.jsx:281` — replace `transition: 'all 0.35s ease'` with
   `transition: 'border-color 0.35s ease'`.
9. `AppBar.jsx:301` — replace `transition: 'all 0.35s ease'` with
   `transition: 'width 0.35s ease, height 0.35s ease, font-size 0.35s ease,
   background-color 0.2s ease'`.
10. `PortalNavbar.jsx:143` — replace `transition: 'all 0.2s'` with
    `transition: 'border-color 0.2s, transform 0.2s'`.

## Boundaries

- Does NOT touch `AppBar.jsx:145-222` (Toolbar/logo/Tabs/tab-icon
  `min-height`/`height`/`font-size` transitions) — that's plan 010's scope.
  Apply this plan and plan 010 in either order; they touch disjoint line
  ranges in the same file.
- `AppBar.jsx:301` (step 9) is deliberately left animating `width`/`height`
  as named properties rather than redesigned into `transform: scale()`,
  even though such a conversion is architecturally safe here (unlike
  `toolbarHeight`/`tabHeight` in plan 010 — the Avatar's own box size has no
  downstream dependents). This plan's job is narrowly "stop animating
  properties nobody asked for"; redesigning the Avatar's compacting
  mechanism is a reasonable future micro-improvement but is out of scope
  here to avoid a second, unrequested behavior change stacked on this fix.
- Does NOT cover feature-layer files. `TaskColumn.jsx:141`'s `transition:
  'all 0.3s ease'` (the kanban drop-zone) is intentionally out of scope for
  this plan — it is handled together with the drag/drop feedback work in
  plan 020, since that plan is already editing the same drop-zone styling
  and touching it here too would create a merge conflict.
- Do NOT touch any `MuiButton`/`MuiCard` global theme overrides
  (`theme/index.js:183`, `:212`) that also use `transition: 'all ...'` —
  out of scope, not part of the nav-chrome file set this plan covers.
- Do NOT change any duration or easing curve values — only property lists.
- Do NOT change markup or component structure.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/shared/components/layout/NotificationCenter.jsx src/shared/components/layout/Sidebar.jsx src/shared/components/layout/AppBar.jsx src/shared/components/layout/PortalNavbar.jsx`
  — no new errors/warnings.
- **Feel check**, one pass per file:
  - **NotificationCenter**: open the bell menu — hover the bell icon
    (color/bg/scale still animate smoothly), switch tabs inside the menu
    (background/color transition on the selected tab, no flash), hover a
    notification row (background fades in/out, no flash of unrelated
    properties).
  - **Sidebar**: hover and select nav items (gradient background, color,
    shadow, and the 3px hover nudge all still animate); collapse/expand the
    sidebar and confirm nav-item labels now **fade** (opacity) rather than
    visually snapping — since `width: auto` was never truly animating
    before, this should look at least as smooth, never worse; hover the
    module header (background-color eases); hover/click the collapse toggle
    (background + scale nudge).
  - **AppBar**: hover the avatar border (color eases); confirm avatar
    width/height/font-size still visually shrink together with the rest of
    the compact-navbar transition from plan 010 (no regression — this plan
    only renamed the property list, the avatar still resizes).
  - **PortalNavbar** (portal context, `clientes.aintar.pt` or
    `VITE_APP_CONTEXT=portal npm run dev`): hover the user avatar — border
    color and scale both animate.
  - In DevTools Animations panel, set playback to 10% on any of the above
    and confirm only the listed properties show as animating tracks — no
    unrelated property (e.g. `padding`, `border-radius`) appears mid-scrub.
  - Toggle `prefers-reduced-motion` (Rendering panel) — no reduced-motion
    handling exists yet in these files (that's plan 012); confirm behavior
    is unchanged from before this plan, so plan 012 has a clean baseline.
- **Done when**: none of the ten declarations above contain the string
  `transition: 'all` (or `"all`) anymore, and every listed hover/selection
  interaction still animates exactly the properties it did before.

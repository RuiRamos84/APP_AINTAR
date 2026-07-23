# 009 — Remove decorative per-row AnimatePresence from DataTable

- **Status**: TODO
- **Commit**: a93c46f
- **Severity**: HIGH
- **Category**: Performance / Purpose & frequency
- **Estimated scope**: 1 file, ~15 line change

## Problem

`frontend-v2/src/shared/components/data/DataTable/DataTable.jsx` wraps every
row of the main (desktop) table body in a Framer Motion fade:

```jsx
// frontend-v2/src/shared/components/data/DataTable/DataTable.jsx:453-556 — current
<TableBody>
  <AnimatePresence>
    {paginatedData.map((row, index) => {
      const rowKey = row.id || row.pk || index;
      const isSelected = selected.includes(rowKey);
      const isExpanded = expandedRows.has(rowKey);

      return (
        <React.Fragment key={rowKey}>
          <TableRow
            component={motion.tr}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            hover={hover}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={-1}
            selected={isSelected}
            sx={{ /* ... */ }}
          >
            {/* ...cells... */}
          </TableRow>
          {/* expanded row, unrelated */}
        </React.Fragment>
      );
    })}
  </AnimatePresence>
</TableBody>
```

`rowsPerPageOptions` defaults to `[5, 10, 25, 50, 100]` (line 84), confirming
this table is paginated and used at meaningful volume.

**Investigated whether `exit` serves a genuine optimistic-delete use case —
it does not.** `DataTable` is a generic, dumb table: `bulkActions[].onClick(selected)`
(line 345) and the row-actions `MoreIcon` button (lines 524-529, which is not
even wired to open a menu — a separate, unrelated defect, not touched here)
are the only row-mutating affordances, and both simply forward to a
consumer-supplied callback. Any resulting row removal comes from the
consumer's own mutation + React Query cache invalidation, which replaces the
whole `data` prop — the exact same `paginatedData` recompute path as
pagination, sorting, and filtering. There is no code path in this component
that treats "row deleted" differently from "page changed" or "user typed in
the search box". The animation is purely decorative.

Because `paginatedData` (useMemo, lines 186-192) produces a **new array of
different row objects on every page change** (page 0's 10 row IDs are
entirely different from page 1's 10 row IDs), `AnimatePresence` sees a full
key-set swap on every pagination click: it exits all 10 old rows and enters
all 10 new rows with the fade. Client-mode filtering (`data` prop changes
from a parent search/filter, which also resets to page 0 via the `useEffect`
at lines 155-159) does the same. This is exactly the case AUDIT.md's
frequency table calls out: **list navigation, hit tens of times a day, should
be removed or drastically reduced** — not a per-row fade replaying on every
click.

**Additional related issue found in the same file, same root cause, not
originally in scope but included here per the template's same-file/same-pattern
merge allowance:** the mobile card view (rendered when `isMobile &&
mobileCardRenderer`, lines 285-315) has an equivalent problem:

```jsx
// frontend-v2/src/shared/components/data/DataTable/DataTable.jsx:288-298 — current
{paginatedData.map((row, index) => (
  <motion.div
    key={row.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    {mobileCardRenderer(row, index)}
  </motion.div>
))}
```

Same trigger (`paginatedData` changing on every page/sort/filter), same
"list navigation animates on every click" problem, no `AnimatePresence` here
so no `exit`, but the entrance replay is identical in spirit. It is included
in this plan's fix (Step 2) rather than spun into a separate plan, because it
is the same file, same component, same root cause, and the template
explicitly allows merging same-file/same-pattern findings.

## Target

Desktop rows render as plain `TableRow`, no animation:

```jsx
// target
<TableBody>
  {paginatedData.map((row, index) => {
    const rowKey = row.id || row.pk || index;
    const isSelected = selected.includes(rowKey);
    const isExpanded = expandedRows.has(rowKey);

    return (
      <React.Fragment key={rowKey}>
        <TableRow
          hover={hover}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          role="checkbox"
          aria-checked={isSelected}
          tabIndex={-1}
          selected={isSelected}
          sx={{ /* unchanged */ }}
        >
          {/* ...cells, unchanged... */}
        </TableRow>
        {/* expanded row, unrelated, unchanged */}
      </React.Fragment>
    );
  })}
</TableBody>
```

Mobile cards render as plain `Box`/fragment, no animation:

```jsx
// target
{paginatedData.map((row, index) => (
  <Box key={row.id}>
    {mobileCardRenderer(row, index)}
  </Box>
))}
```

`AnimatePresence` and `motion` become unused in this file and their import
is removed.

## Repo conventions to follow

- This is a deletion, not a restyle — no new tokens needed.
- Match the plain-element style already used for the expanded-row
  `<TableRow>` two lines below the one being changed (`DataTable.jsx:535`),
  which has never had animation.

## Steps

1. In `frontend-v2/src/shared/components/data/DataTable/DataTable.jsx`,
   remove the `<AnimatePresence>` open/close tags at lines 454 and 556
   (unindent the `paginatedData.map(...)` block one level to compensate).
2. On the `<TableRow>` that starts at line 463, delete the five props
   `component={motion.tr}`, `initial={{ opacity: 0 }}`,
   `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`,
   `transition={{ duration: 0.2 }}`. Leave every other prop (`hover`,
   `onClick`, `role`, `aria-checked`, `tabIndex`, `selected`, `sx`) untouched.
3. In the mobile card view (lines 289-297), replace `<motion.div key={row.id}
   initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
   transition={{ delay: index * 0.05 }}>` with a plain `<Box key={row.id}>`
   (or a `<React.Fragment key={row.id}>` if no wrapper element is desired —
   `Box` is simpler and matches existing import usage in this file).
4. Update the import at line 61 from
   `import { motion, AnimatePresence } from 'framer-motion';` to remove it
   entirely — after steps 1-3 neither `motion` nor `AnimatePresence` is
   referenced anywhere else in this file. (Confirm with a search of the file
   before deleting the import — if some other unrelated usage was added
   since this plan was written, keep only what's still needed.)

## Boundaries

- Do NOT touch the `Collapse`-based expanded-row animation (lines 534-552,
  `renderExpandedRow`) — that's MUI's own `Collapse` with `timeout="auto"`,
  a different, legitimate, purpose-driven animation (revealing detail on
  explicit user click), not in scope.
- Do NOT add a new animation for delete/optimistic-removal. The investigation
  above found no code path that needs it; if a consumer later wants a
  genuine "row just got deleted" animation, that is a new, deliberate
  feature request, not a restoration of this decorative default.
- Do NOT touch `rowActions`' unwired `MoreIcon` button (lines 524-529) — it's
  a pre-existing, unrelated functional gap, not an animation issue.
- Do NOT touch any consumer of `DataTable` (e.g. pages passing
  `mobileCardRenderer`) — the prop contract (`row.id` as key) is unchanged.

## Verification

- **Mechanical**: `cd frontend-v2 && npx eslint src/shared/components/data/DataTable/DataTable.jsx`
  — must report no unused-import warning for `motion`/`AnimatePresence` and
  no new errors.
- **Feel check**: open any page using `DataTable` in server or client
  pagination mode (e.g. a list page under `/admin` or `/gestao`) with the dev
  server running:
  - Change page (next/previous): rows appear instantly, no fade-in.
  - Change sort column: rows reorder instantly, no flash/fade.
  - Type in a connected search/filter box: filtered rows appear/disappear
    instantly.
  - Resize to mobile width (if the page passes `mobileCardRenderer`): cards
    render instantly on pagination, no staggered fade-up.
  - Row hover/selection/click behavior (checkbox, `onRowClick`) is
    unchanged — this was never part of the animation.
  - In DevTools Performance panel, record a pagination click: there should
    be no `Animation` track entries for table rows (there were none of
    consequence before either, since opacity-only fades are cheap — the
    real win here is removing pointless work on a "tens of times/day"
    interaction, not fixing a jank problem).
- **Done when**: no `framer-motion` import remains in `DataTable.jsx`, both
  the desktop and mobile row-render paths use plain elements, and pagination
  /sort/filter interactions show zero animation on the table body.

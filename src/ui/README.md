# src/ui — the design-system library

The "field journal" component kit: paper surfaces, ink text, rainforest-green primary, terracotta
accent. Screens in `src/features/**` and the shell in `src/app/**` **compose only these**. ESLint
(`react/forbid-elements`) rejects raw `button`, `a`, `input`, `select`, `textarea`, `dialog` and
`datalist` there.

```tsx
import { Button, Card, PageHeader } from '../../ui';
```

The dev-only kitchen sink at **`/ui`** (`KitchenSink.tsx`) shows every component.

## Rules

- **Dumb components.** Props in, callbacks out. A component holds UI state only (open, focus,
  hover). It never fetches, never reads the router or the URL, never formats domain data and never
  imports `src/i18n`.
- **Callers pass all copy.** Accessibility labels have plain English defaults (`closeLabel="Close"`,
  `moreLabel="More"`, …), and screens pass translated strings.
- **Tokens only.** Colours come from `src/styles/tokens.css` through the Tailwind names (`bg-surface`,
  `text-ink-muted`, `border-line`, `bg-primary`, …) or `var(--token)`. There are no raw hex values
  and no `dark:` variants, because the variables swap under `prefers-color-scheme`.
- **Colour tokens as props.** Accent colours are passed by token name (`color="cat-lawn"`), never
  as raw values.
- **No router import.** Navigation components take a link component: `LinkButton`/`TextLink` via
  `as={Link} to="…"`, and `AppShell`/`NavBar`/`TabBar` via `linkComponent`.
- **Accessible.** Real roles, keyboard support, visible `:focus-visible` rings, ≥ 40px touch targets
  on primary controls. Motion uses the `--animate-*` tokens and collapses under
  `prefers-reduced-motion` (global rule in `src/styles/index.css`).
- **Tested.** Every component has a colocated `*.test.tsx` covering roles, keyboard and callbacks.
- **Nothing fits?** Add or extend a component here, with a test and an entry in this file, rather
  than styling inside a screen.

### Wiring a router link (once, in `src/app`)

```tsx
import { Link } from 'react-router';
import type { LinkComponentProps } from '../ui';

export function RouterLink({ href, ...rest }: LinkComponentProps) {
  return <Link to={href} {...rest} />;
}
```

---

## Layout & navigation

### AppShell

The responsive frame. It has a skip link, a sticky top bar (`headerActions` on the right, the brand
on phones), a left sidebar from 768px (brand, `NavBar`, `sidebarFooter`), and a bottom `TabBar`
below 768px. Page content goes in `<main id="main">`.

| prop                                                   | type            | notes                                                                                      |
| ------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------ |
| `brand`                                                | ReactNode       | e.g. `<BrandMark name icon tagline />`                                                     |
| `navItems`                                             | `NavItem[]`     | `{ key, href, label, icon, active?, primary? }`. The caller sets `active` from its router. |
| `linkComponent`                                        | `LinkComponent` | Router adapter. Defaults to `<a>`.                                                         |
| `headerActions`, `sidebarFooter`, `moreContent`        | ReactNode       | Language toggle, account, sign-in, …                                                       |
| `navLabel`, `moreLabel`, `closeLabel`, `skipLinkLabel` | string          | Translated labels                                                                          |
| `moreCloseKey`                                         | string / number | Changing it closes the phone More sheet (pass location + session)                          |

```tsx
<AppShell
  brand={<BrandMark name={t('app.name')} icon={Leaf} />}
  navItems={items}
  linkComponent={RouterLink}
  headerActions={<LanguageToggle value={lang} onChange={setLang} />}
>
  <Outlet />
</AppShell>
```

### NavBar / TabBar

The two halves of the shell, also usable on their own. `NavBar` is a vertical list with
`aria-current="page"` on the active item. `TabBar` is fixed to the bottom on phones: items with
`primary !== false` become tabs, and the rest go into a **More** `Sheet` that also holds
`moreContent`. The More tab is highlighted when a secondary item is active. The sheet closes
itself when one of its nav links is used; for links or actions inside `moreContent`, pass
`moreCloseKey` (also on `AppShell`) — any change to it closes the sheet, so the app passes a value
derived from its router location and session.

### BrandMark

A tilted leaf badge plus the name in Fraunces. Props: `name`, `tagline?` (shown from `md` up), `icon?`.

### PageHeader

The page's `<h1>`. Props: `title`, `eyebrow?` (e.g. today's date, in accent small caps),
`description?`, `actions?`, `back?` (slot for a `TextLink`), `meta?` (badges/chips). A double
"journal" rule sits underneath.

### SectionHeader

An `<h2>` (or `as="h3"`) with an optional `count` tally, plus `description` and `actions`.

### Card / CardHeader / CardFooter

The paper surface. `as` (`div|section|article|aside|li`), `padding` (`none|sm|md|lg`), `variant`
(`raised|sunken`). `CardHeader` gives a title row: `title`, `subtitle`, `actions`, `as`.
`CardFooter` is a quiet foot under a dashed rule for legends and hints (children stack with a
small gap).

---

## Actions

### Button

A native `<button>`, `type="button"` by default. `variant`
(`primary|accent|secondary|ghost|danger`), `size` (`sm|md|lg`), `leadingIcon`, `trailingIcon`,
`loading` (spinner, disabled, `aria-busy`), `fullWidth`, `ref`. The styling recipe is exported as
`buttonClasses()`.

### LinkButton

Navigation styled as a button. It is **polymorphic**: `<LinkButton href="/x">` renders an `<a>`,
and `<LinkButton as={Link} to="/week">` renders any link component with its props forwarded. It
takes the same `variant`/`size`/icon props as Button.

### IconButton

A square, icon-only button. **`label` is required**: it becomes `aria-label` and the tooltip.
`variant` (`ghost|secondary|primary|danger`), `size` (`sm|md|lg`).

### TextLink

An inline underlined link, polymorphic like LinkButton. `tone` (`primary|muted`), plus
`leadingIcon`/`trailingIcon`.

### PeriodNav

A previous / next stepper for a time period (month, week) with an optional jump back to the
current one. The label is a heading (`as`: `h2|h3|p`) announced politely when it changes. Props:
`label`, `onPrevious`, `onNext`, `previousLabel`, `nextLabel`, `onToday?` (shows the button),
`todayLabel`, `isCurrent` (disables it), `previousDisabled`, `nextDisabled`. The caller owns the
period and its formatting.

### SegmentedControl

One choice from a few options, as a `role="radiogroup"`. Arrow keys, Home and End move and select,
and only the selected option is a tab stop. Disabled options are skipped. Props: `options`
(`{ value, label, icon?, ariaLabel?, lang?, disabled? }`), `value`, `onChange(value)`, `label`
(group name), `size`, `fullWidth`. It is generic over the value type.

### LanguageToggle

A SegmentedControl preset for languages. Each option carries `lang` and its full name as the
accessible name. Props: `value`, `onChange`, `languages?` (defaults to `EN`/English and
`ES`/Español), `label?`, `size?`.

### ToggleChip

A pressable filter chip (`aria-pressed`). Props: `label`, `pressed`, `onPressedChange(next)`,
`color?` (token, shown as a dot), `count?`.

---

## Display

### Badge

A small static label. `tone` (`neutral|primary|accent|success|warning|danger|info`), `variant`
(`soft|outline|stamp`). `stamp` is the dashed, uppercase, slightly rotated marker used for things
like "Draft". It also takes `icon` and `size`.

### CategoryChip / CategoryDot

`CategoryChip` is a tinted pill with a dot and a label: `label`, `color` (token such as
`cat-lawn`), `size`. `CategoryDot` is just the dot, with `hollow` for projected or not-yet-done
items, and `label` to make it an announced `img`. `swatchStyle(token)` exposes `--swatch` and
`--swatch-soft` for custom compositions inside src/ui.

### StatusPill

State shown as tone + icon + label, never colour alone. It uses a generic `status` vocabulary, and
callers map their domain states onto it:

| status     | use for (example)        |
| ---------- | ------------------------ |
| `critical` | overdue                  |
| `warning`  | due soon                 |
| `good`     | on track / done          |
| `info`     | planned                  |
| `pending`  | never done / not started |
| `inactive` | paused / skipped         |

Props: `status`, `label`, `icon?` (overrides the default icon), `size`.

### StatTile

A KPI tile: `label` (sentence case), `value` (pre-formatted), `hint?`, `tone`, `icon?`. A tone rule
runs along the top and the value is in Fraunces.

### Avatar

Initials in a circle tinted with a chart slot colour. Props: `name`, `size`, `colorSlot?` (defaults
to a stable hash, `slotForName`), `labelled` (announces the name; otherwise decorative). The
`initialsOf` helper is also exported.

### EmptyState

`title`, `description?`, `icon?` (defaults to a sprout in a dashed ring), `action?`, `size`
(`md|compact`).

### Skeleton / SkeletonText

Decorative shimmer placeholders (`aria-hidden`). Mark the loading region with `aria-busy`.
`Skeleton`: `shape` (`line|block|circle`), `width`, `height`. `SkeletonText`: `lines`.

### VisuallyHidden

Text for screen readers only.

---

## Lists

### Checklist / ChecklistRow

The job-site checklist. `Checklist` is the ruled card (`<ul>`, `label?`). Each `ChecklistRow`
(`<li>`) takes:

| prop                          | notes                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `title`, `meta?`, `children?` | Content. `title` accepts a node, e.g. a `TextLink` to the detail page.                      |
| `status?`                     | Usually a `StatusPill`.                                                                     |
| `color?`                      | Category token for the left edge.                                                           |
| `done?`                       | Fills the tick box and lands the ink **stamp** (`stampLabel`, default "Done").              |
| `onSignOff?`, `signOffLabel?` | The default action button (hidden once `done`).                                             |
| `signOffAriaLabel?`           | The button's accessible name when it should name the job ("Sign off: Mow the lawn").        |
| `action?`                     | Replaces the default button, e.g. `<SignInCta />` or an Undo. It stays visible when `done`. |

The box-fill, check-draw and stamp animation plays only when `done` flips to true while the row is
mounted, so rows that load already done don't animate. It is instant under reduced motion.

### Timeline / TimelineGroup / LogRow

The clipboard log. `Timeline` is an `<ol>` (`label?`, `layout?`: `grouped` (default) holds
TimelineGroups spaced apart; `rows` holds LogRows directly on one continuous rule, e.g. a task's
history). `TimelineGroup` is a dated section with a
sticky `<h3>` (`label`, `aside?`). `LogRow` takes `title`, `meta?`, `note?` (shown as a
journal-style quote), `color?` (token for the node on the rule), `badges?`, `actions?` and
`muted?`.

### CalendarMonth

A 6×7 month grid, Monday first, as `<table role="grid">`. Arrow keys move by day or week, Home and
End go to the ends of the week, and Enter or Space selects. There is one tab stop: the focused,
selected, today or 1st-of-month cell. Props: `month` (`YYYY-MM`), `label` (grid name), `today?`,
`selected?`, `onSelect(date)`, `renderDay(info)` for dots and markers (decorative to assistive
tech, so put the summary in `dayLabel`), `dayLabel(date)`, `weekdayLabels`. The caller owns month
switching and data.

### DayMark / DayMarks

Small calendar marks whose **shape** carries the meaning, so they never rely on colour alone:
`done` is a filled dot, `due` a hollow ring (projected, not yet done) and `planned` a tinted
square. `DayMark` takes `kind`, `color?` (token, neutral by default) and `label?` (makes it an
announced `img`, e.g. in a legend). `DayMarks` is the decorative cluster for a `CalendarMonth`
cell: `marks` (`{ key, kind, color? }[]`) and `max` (default 4; the rest collapse into "+n").
Put the day's summary in the cell's `dayLabel`.

---

### DayMarkLegend

The key for `DayMarks`: `items: { kind, label }[]` (each kind drawn neutral, so shape carries the
meaning) and `label` (the list's accessible name). Sits well in a `CardFooter` under a
`CalendarMonth`.

### SummaryList

Compact one-line items for at-a-glance columns ("Overdue", "Signed off lately"): `items: { key,
color?, content, aside? }[]` — a category dot, the content (may hold a link) and small trailing
text. `label?` names the list; `max?` shows only the first n (the caller adds any "+n more" link).

### EntryHeader

The byline of an authored entry (handoff note, comment) as a `<header>`: `author` (name + avatar),
`badges?` after the name, `meta?` (small line under it, e.g. a `<time>`), `actions?` (trailing
controls). Put it first inside the entry's `<article>` (e.g. `Card as="article"`).

## Forms

### Field

Label + control + hint/error. It wraps exactly one control, and Input, Textarea, Select, DateInput
and ComboInput pick up its `id`, `aria-describedby` (error first, then hint), `aria-invalid` and
`required` automatically. Props: `label`, `hint?`, `error?`, `required?`, `optionalLabel?`
(e.g. "optional"), `id?`.

### Input

A text input with native props passed through, plus `onValueChange(string)`, `leadingIcon?`,
`invalid?` and `ref`.

### Textarea

Multi-line text, resizable vertically. `onValueChange`, `invalid`, `rows` (default 3).

### Select

A native single select. `options` (`{ value, label, disabled? }[]`), `placeholder?` (adds an empty
first option), `onValueChange`, `size` (`sm|md`).

### DateInput

A native date picker with ISO `YYYY-MM-DD` values and a calendar icon. `value`, `onValueChange`,
`max?` (e.g. today, to forbid future dates), `min?`. The `withTime` variant picks a date and a time
of day (`datetime-local`, values like `2026-10-07T14:30` in the viewer's local time).

### ComboInput

Free text with suggestions (input + `<datalist>`). It has `role="combobox"`. Props:
`suggestions: string[]` (de-duplicated, blanks dropped) plus all Input props. Use it for "Done by".

### FileInput

A button that opens the native file picker (a hidden `<input type="file">` plus a `Button`).
Props: `label` (button text and the input's accessible name), `onFiles(File[])`, `accept?`,
`multiple?`, `disabled?`, `variant?`, `leadingIcon?`. The input resets after each pick, so the same
file can be chosen again.

### Disclosure

A collapsible section: a toggle button with `aria-expanded` and a panel that is not mounted while
collapsed. Props: `summary`, `defaultOpen?`, `children`.

### Checkbox

A native checkbox with a custom box. `checked`, `onCheckedChange(bool)`, `label`, `description?`,
`strikeWhenChecked?` (packing-list style), `disabled`.

---

## Attachments

### AttachmentList

A list of attached files. `items: { id, name, sizeLabel, href?, previewSrc?, status? }[]` where
`status` is `uploading|failed|done`. Images with a `previewSrc` show a thumbnail, other files a file
icon, and `href` makes the name a link. `onRemove(id)` adds a remove button on every item and
`onRetry(id)` a retry button on failed ones. Strings are props (`label`, `uploadingLabel`,
`failedLabel`, `removeLabel`, `retryLabel`).

## Overlays & feedback

### Dialog / Sheet

Two front doors over one modal engine. Both have `role="dialog"`, `aria-modal`, the title as the
accessible name and the description as the accessible description. Focus is trapped (Tab and
Shift+Tab wrap) and starts on the first field or on `initialFocusRef`. Esc, the backdrop and the
close button all call `onClose`. Focus returns to the opener on close, and body scroll is locked
while open.

- `Dialog` is a bottom panel on phones and a centred card from 640px.
- `Sheet` is a bottom sheet with a grab handle on phones and a centred card from 768px. Use it for
  task flows such as sign-off.

Props: `open`, `onClose`, `title`, `description?`, `children`, `footer?` (action row; stacked
primary-first on phones), `size` (`sm|md|lg`), `closeLabel?`, `initialFocusRef?`,
`closeOnBackdrop?`.

### ConfirmDialog

A yes/no prompt built on Dialog, with focus starting on **Cancel**. Props: `open`, `onClose`,
`onConfirm`, `title`, `description?`, `confirmLabel`, `cancelLabel?`, `closeLabel?` (the ×
button's name — pass the translated "Close"), `tone` (`danger|primary`), `busy?`.

### ToastProvider / useToast

Mount `<ToastProvider>` once near the root; it holds toast state and renders the stack in a portal,
above the phone tab bar or bottom-right on desktop. `const { toast, dismiss } = useToast()`, then
`toast({ title, description?, tone?, action?, duration?, id? })` returns the toast's id.

- `tone` is `neutral|success|danger`. Announcements go through two live regions that are always
  mounted (polite `status`, and an assertive `alert` for danger) — screen readers often skip a live
  region that appears already filled in. The visible toasts themselves are not live regions.
- `action: { label, onAction }` is for **Undo**. Pressing it runs `onAction` and dismisses the
  toast. The announcement ends with `actionHint`, and the `hotkey` (default F8) moves focus to the
  newest toast's action; Escape, or using the toast, returns focus to where it was.
- Default duration is 5s, or 10s with an action. The timer pauses on hover or focus.
- Provider props: `dismissLabel`, `regionLabel`, `max` (default 3), `hotkey`, `actionHint`.

---

## Charts

The charts follow the dataviz method:

- Thin marks with 4px rounded data ends and square bases.
- Hairline, recessive grid and axes.
- Text in ink tokens, never series colours.
- A legend whenever there are two or more series.
- A per-mark readout on hover **and** keyboard focus.
- A **table view**, so no value is hover-only.

Palettes:

- **Categorical:** `--chart-1…8`, a fixed order validated with the dataviz validator against
  `--surface` in both themes. Worst adjacent CVD ΔE is 13.1 light / 11.6 dark, and worst
  normal-vision ΔE is 20.3 / 15.6. Slot 5 (ochre) is under 3:1 on light paper, which is why charts
  always ship a legend and a table. Assign slots in order, never cycle them, and keep series order
  stable so colour follows the entity.
- **Sequential:** `--seq-0…5`, one green hue. `seq-0` means no activity. Dark mode flips the anchor.

### ChartFigure / ChartLegend

The `<figure>` wrapper the charts use: caption (`title`, `description`), `legend?`, plot, and a
"Show table" disclosure (`table: { columns, rows }`, `showTableLabel`, `hideTableLabel`).
`ChartLegend` draws rect swatches for `{ key, label, color }` items.

### Heatmap

A calendar heatmap: weeks are columns and rows run Monday to Sunday. Props: `title`,
`description?`, `start`, `end` (ISO, inclusive), `values: Record<date, count>`,
`formatCell(date, count)` (tooltip and accessible name), `formatDate`, `weekdayLabels`,
`monthLabels`, `lessLabel`/`moreLabel`, and the table labels.

- Semantics: `role="grid"`, with weekday rows of `gridcell`s.
- Keyboard: a single tab stop on `end`. ↑/↓ move by day and ←/→ by week.
- Phones: the grid scrolls horizontally, starting scrolled to today. The weekday labels stay
  pinned.
- `heatLevel(count, max)` maps a count to level 0–5.

### StackedBarChart

Stacked columns, e.g. sign-offs per person per week. Props: `series` (`{ key, label, slot? }`),
`rows` (`{ key, label, fullLabel?, values }`), `height`, `formatValue`, `totalLabel`,
`categoryColumnLabel`, plus the table labels.

- One y-axis from zero with whole-number "nice" ticks.
- Bars are ≤ 24px with a 2px surface gap between segments.
- Each column is focusable (`role="img"`) with a full summary label, and its tooltip lists every
  series, value first.
- Width tracks the container (ResizeObserver), and x labels thin out on narrow screens.

### HBarList

Horizontal bars for one series in one hue, e.g. on-time rate by category. Every value is printed at
the bar tip, so it needs no tooltip or table. Props: `title`, `description?`, `items`
(`{ key, label, value | null, leading?, detail? }`), `max?` (pass `1` for rates), `formatValue`,
`emptyLabel`.

---

## Layout primitives, content & print

Added with the Board / Week / Tasks screens so screens never hand-roll layout or prose recipes.

### Stack / Grid

`Stack` is the flex layout primitive: `direction` (`col` default, `row`, or `responsive` =
column on phones, row from 640px), `gap` (`none|xs|sm|md|lg|xl`), `align`, `justify`, `wrap`,
`as` (`div|section|form|header|footer|aside|ul|ol`; a list loses its bullets and indent, and its
children are the `<li>`s). Native props (`onSubmit`, `aria-*`) pass through. Screens use
`gap="lg"` between page sections.
`Grid` is an equal-column grid: `cols` (phones, default 1), `smCols`, `mdCols`, `lgCols` (1–4),
`gap`, `align` (`stretch|start`), `ratio` (`even` default, or `wide-first`: wherever the grid has
2 columns the first gets 3/5 of the width — a list beside a side panel), `as` (`div|section|ul`;
a `ul` loses its bullets).

### AsideLayout

A main column beside a 22rem side panel from 1024px: `main`, `aside`, `mainEnd?`, `stickyAside?`,
`gap` (default `lg`). On phones the order is `main` → `aside` → `mainEnd`, e.g. pinned notes, then
the composer, then recent notes; on desktop `aside` spans both main rows.

### Text

Body copy: `as` (`p|span|div`), `size` (`xs|sm|md|lg`), `tone`
(`default|muted|subtle|accent|primary|danger`), `weight`, `preLine` (keep line breaks, e.g. a
message preview), `tabular`, `display` (Fraunces), `truncate`, `caps` (tracked-out uppercase
label), `italic` (quoted notes), `preWrap` (keep typed line breaks _and_ spacing, e.g. a person's
note), `breakWords` (wrap long URLs), `icon` (decorative icon before the text, sized to it).

### StepList

Numbered how-to steps (`<ol>`) with inked numerals on a dashed rule. `steps` — plain content, or
`{ title, description? }` for a titled step; the component numbers them, so the text carries no
numbers. `label?` names the list, `headingLevel?` (`h3|h4`) renders titled steps' titles as
headings, and `columns={2}` lays the steps out in two columns from 768px (no rule there).

### Callout

A tinted `role="note"` box: `tone` (`info|warning|danger|success|neutral`), `title?`, `icon?`
(defaults per tone), `action?` (trailing control), children. Use for safety notes and read-only
notices.

### DetailList

Label/value facts as a `<dl>`: `items: { key, label, value }[]`, `columns` (`1|2`, two from
640px).

### ListRow

A navigable record row: an `<li>` holding one whole-row link with a chevron. Polymorphic like
`TextLink` (`<ListRow as={Link} to="/tasks/x" … />` or `href`). Props: `title`, `meta?`,
`trailing?` (pills/badges, read as part of the link), `color?` (token for the left edge). Put
rows inside `Checklist` (the ruled `<ul>` card).

### WeekStrip

Seven day cells for a week header: `days: { key, weekday, day, label, isToday?, highlighted?,
marker? }[]`, `label` (list name), `highlightLabel?` (caption on highlighted days, e.g. "Yard
day"). Today is filled (`aria-current="date"`); highlighted days get a dashed accent ring. Each
cell's accessible name is its `label`.

### MediaOnly

`media="print"` hides children on screen and shows them on paper; `media="screen"` does the
reverse. The AppShell chrome (sidebar, top bar, tab bar) and the toast region are already hidden
in print, and `body` prints on plain white (`--print-paper` / `--print-ink` tokens).

### ClipboardSheet

A printable job-site sign-off sheet, ink on white: `brand?`, `title`, `subtitle?`, `columns`
(`{ task, assignee, doneBy, date, initials }` header labels), `rows` (`{ key, title, detail?,
assignee?, done?: { by, date } }`), `blankRows` (default 3, for unplanned work), `signatures`
(labels for the signature lines at the foot), `lists` (`{ title, items }[]` tick-box lists under
the table, e.g. supplies) and children (any extra section; style it for paper yourself). Text
inside is always print ink on white, whatever the screen theme. Pair with `<MediaOnly media="print">`.

---

## Componentization backlog

Hand-built UI noticed but not yet extracted. Screens (`src/features/**`, `src/app/**`) may not put
`className` on raw elements (ESLint ratchet); what remains below is library-side or a layout
difference to settle.

- **Page rhythm.** Board, Week and Tasks separate page sections with `Stack gap="xl"`; Task detail,
  Calendar, Log, Insights and Handoff use `gap="lg"`. Pick one (or add a `Page` wrapper that owns it)
  once there are comps.
- **`className="w-full"` passthrough** on `Checklist` (Board) and `Timeline` (Task detail) inside a
  `Stack align="start"`: a `fullWidth` prop, or a Stack child slot, would remove it.
- **Calendar category filter** wraps on phones like the Tasks filter (it used to scroll sideways). A
  `ChipGroup` with an `overflow="scroll"` option would bring the single scrolling row back to both.
- **Log filters** stack one per row on phones (`Grid cols={1} smCols={2}`); pairing Person/Category
  needs a column-span option on `Grid` children.
- **KitchenSink section recipe** (`KitchenSink.tsx`, dev-only) still hand-styles its footer rule;
  `CardFooter` could replace it.

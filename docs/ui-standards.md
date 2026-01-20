# UI Standards (ThinkTanker)

## 1) Design Foundation
- Theme: Dark UI with ThinkTanker yellow accent
- Typeface: Inter (system fallback)
- Base text color: `--color-secondary-50`
- Secondary text: `--color-secondary-200`
- Muted text: `--color-secondary-400`

### Typography Scale
- H1: 2.25rem, bold, tracking-tight
- H2: 1.75rem, semi-bold
- H3: 1.25rem, semi-bold
- Body: 0.95rem
- Small: 0.8rem

### Spacing Scale
- 4 / 8 / 12 / 16 / 24 / 32 px

### Radius + Shadow
- Radius: 10 / 14 / 18 px
- Shadows: soft, layered (small/medium/large)

## 2) Core Components
### Buttons
- Primary: `btn btn-primary`
- Secondary: `btn btn-secondary`
- Outline: `btn btn-outline`
- Ghost: `btn btn-ghost`
- Destructive: `btn btn-danger`
- Focus: visible ring for keyboard navigation

### Inputs
- Class: `input`
- Focus: brand ring + border
- Placeholder: secondary-400 for readability

### Forms
- Label: `form-label`
- Helper: `form-helper`
- Error: `form-error`
- Required indicator: use `*` in label text

### Cards
- Standard: `surface-card`
- Muted: `surface-card-muted`
- Glass: `glass-card`

### Tables
- Table: `data-table`
- Head: `data-table-head`
- Row: `data-table-row`
- Cell: `data-table-cell`

### Modals
- Overlay: `modal-overlay`
- Panel: `modal-panel`
- Header/Body/Footer: `modal-header`, `modal-body`, `modal-footer`

### Toasts
- Container: `toast-container`
- Types: `toast-success`, `toast-error`, `toast-info`

## 3) Layout
- Page container: `page-layout` max width 1440
- Header: `page-header` with title + subtitle + actions
- Filter bar: `filter-bar`
- Active filters: `filter-chip`

## 3.1) Page Patterns
- Page structure: `PageLayout` + `PageHeader` for consistent spacing and actions
- Actions: allow wrapping on small screens, avoid overflow
- Empty states: include title + description + CTA

## 3.2) Filtering Pattern
- Provide active filter chips above data tables/lists
- Include "Clear filters" action when any filter is active
- Keep filter inputs in a consistent `FilterBar`

## 3.3) List Actions
- Do not rely on hover-only actions for mobile
- Show row action icons by default on small screens
- Keep action buttons aligned to the right edge of rows

## 4) Accessibility
- Minimum contrast for text and placeholders on dark backgrounds
- Focus-visible rings for buttons and icon buttons
- Avoid low-contrast gray-on-gray text

## 5) Responsiveness
- Use grid stacks for filters and cards
- Keep content within page container width
- Preserve scroll within main content area

## 6) UI Consistency Checklist
- Titles and subtitles use `page-title` and `page-subtitle`
- Primary actions use `btn btn-primary`
- Inline actions use `btn btn-outline` or `icon-button`
- Tables use the shared `Table` components
- Empty states use `EmptyState`

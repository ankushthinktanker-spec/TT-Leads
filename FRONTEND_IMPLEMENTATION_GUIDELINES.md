# Frontend Implementation Guidelines

## Purpose
This document translates the product design direction into implementation rules for the frontend codebase.

Use this as the standard for React, shared components, styling, layout, and module execution.

## Stack Assumption
- React
- TypeScript
- Vite
- Tailwind utility classes plus shared CSS tokens
- Redux slices for module state

## Implementation Order

1. Tokens and design-system foundation
2. Shared shell and layout primitives
3. Shared controls and data display components
4. Dashboard
5. Primary CRM modules
6. Detail pages and forms
7. Reports, analytics, admin, settings
8. Final accessibility and consistency pass

## Folder Strategy

Use a system-first structure:

- `frontend/src/theme`
  - tokens
  - semantic UI tokens
  - theme contracts
- `frontend/src/styles`
  - system CSS
- `frontend/src/components/ui`
  - primitives
- `frontend/src/components/layout`
  - shell
- `frontend/src/components/crm`
  - shared CRM/list components
- `frontend/src/components/dashboard`
  - dashboard-specific modules
- `frontend/src/pages`
  - route screens only

## Code Architecture Rules

### 1. Pages should compose, not invent
Pages should mainly:
- wire data
- configure shared components
- compose sections

Pages should not define one-off visual systems.

### 2. Shared components own repeated UI patterns
Examples:
- command bar
- list shell
- sheet / panel
- detail rail
- metric card
- section header
- empty state
- loading skeleton

### 3. Keep visual tokens centralized
Do not hardcode random:
- colors
- radii
- spacing values
- shadows
- font sizing decisions

## Styling Rules

### Token usage
Every new component should use shared design tokens for:
- color
- spacing
- radius
- border
- shadow
- focus ring

### Tailwind usage
Tailwind is allowed, but it must follow token discipline.

Good:
- consistent spacing scale
- repeated utility groups abstracted into components/classes

Bad:
- per-page arbitrary color and spacing combinations
- repeated one-off utility strings for the same pattern

## Component Implementation Standards

### Buttons
Build one API:
- `variant`
- `size`
- `icon`
- `loading`
- `disabled`

Variants:
- primary
- secondary
- ghost
- danger

### Inputs
Shared input contract:
- label
- help text
- error text
- prefix/suffix slot if needed

### Tables
Shared table requirements:
- column definition support
- empty state
- loading state
- row actions
- optional pagination
- compact and comfortable row density

### Panels / Sheets
Differentiate by intent:
- workspace sheet
- summary strip
- insight card
- rail panel

Do not use one generic card for everything.

### Modals
Shared modal structure:
- header
- content
- footer
- consistent action placement

## Dashboard Implementation Strategy

### Build dashboard from these primitives:
- `DashboardHeader`
- `DashboardKpiBand`
- `DashboardCommandBar`
- `PipelineWorkspace`
- `ActionRail`
- `TaskCenter`
- `SourcePerformance`
- `RecentActivity`
- `RenewalWatchlist`

### Dashboard rule
The dashboard should be built from clear zones, not a flat list of widgets.

## CRM List Page Strategy

Standard list page structure:
- `PageHeader`
- `CommandBar`
- `SummaryStrip` optional
- `WorkspaceSheet`
- `DataTable`

Optional:
- `FilterDrawer`
- `BulkActionsBar`
- `DetailPreviewRail`

## Detail Page Strategy

Standard detail page structure:
- summary header
- main record content
- secondary side rail
- related entities section
- activity/timeline section

Avoid:
- giant isolated hero blocks
- unstructured long forms
- random card grids

## Form Strategy

### Form layout rules
- group related fields
- use section headings
- use two-column grids on desktop where useful
- use clear primary/secondary actions

### Validation
- inline field validation
- persistent error visibility
- clear focus indication

## Accessibility Implementation Rules

Target: WCAG 2.1 AA

Required:
- keyboard navigation
- semantic headings
- proper label/input associations
- visible focus states
- minimum contrast compliance
- status not conveyed by color alone

## State and Feedback Rules

### Loading
- skeletons should reflect final layout

### Empty
- every empty state must be intentional

### Error
- inline alert or structured error state
- retry action where possible

### Success
- toasts or inline confirmation should be concise and consistent

## Refactor Rules for Existing Codebase

1. Do not redesign page-by-page with unrelated styles
2. Upgrade shared tokens first
3. Upgrade layout primitives second
4. Upgrade dashboard third
5. Upgrade visible modules in sidebar order
6. Remove unused hidden module UI patterns from influencing new design

## Quality Gate

Before considering any UI batch complete:
- shared tokens are used
- no obvious one-off styling drift
- page matches system hierarchy
- list/form/detail behaviors are consistent
- responsive layout still works
- `npx tsc --noEmit` passes
- `npx vite build` passes


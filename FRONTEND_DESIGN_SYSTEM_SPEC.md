# Frontend Design System Specification

## Purpose
This specification defines the target UI system for the internal Revenue CRM. It is intended to guide every frontend decision across dashboard, CRM modules, admin screens, settings, reports, analytics, and notification flows.

The design system must produce a product that feels:
- premium
- operational
- enterprise-capable
- calm but powerful
- visually coherent
- scalable across future modules

## Product-Level Design Principles

### 1. Hierarchy over decoration
- Primary information must dominate
- Secondary information must support
- Tertiary information must stay subtle
- Do not give equal weight to every panel, metric, and section

### 2. Workspace over card stack
- Prefer continuous work surfaces over repeated disconnected cards
- Tables, filters, actions, and side context should feel part of one workspace
- Avoid “dashboard made of tiles” and “list page made of separate boxes”

### 3. Dense but breathable
- Design for power users
- Keep information density high enough for daily business operations
- Preserve clarity through spacing discipline, not excess whitespace

### 4. One product language
- Buttons, inputs, filters, tables, badges, modals, drawers, tabs, toasts, and detail surfaces must feel like one system
- Avoid one-off visual inventions per page

### 5. Operational clarity
- Users should quickly understand:
  - what matters now
  - what is blocked
  - what is overdue
  - what action comes next

## Design Personality

Target visual personality:
- modern enterprise SaaS
- sharp and controlled
- trustworthy
- clean, not flashy
- serious business software with refined aesthetics

Reference qualities:
- Stripe: surface discipline
- Linear: density and clarity
- HubSpot: CRM task flow
- Ramp: action-oriented operations UI
- Notion: calm restraint

## Color System

### Core neutrals
- App background: `#F3F6FA`
- Workspace background: `#EEF3F8`
- Primary surface: `#FFFFFF`
- Elevated surface: `#FBFCFE`
- Soft section surface: `#F8FAFC`
- Border subtle: `#E2E8F0`
- Border strong: `#CBD5E1`

### Text
- Text primary: `#0F172A`
- Text secondary: `#334155`
- Text muted: `#64748B`
- Text faint: `#94A3B8`

### Brand
- Brand primary: `#335CFF`
- Brand hover: `#2649D8`
- Brand tint: `#E9EEFF`
- Brand deep: `#1E3A8A`

### Semantic colors
- Success: `#15803D`
- Success background: `#DCFCE7`
- Warning: `#B45309`
- Warning background: `#FEF3C7`
- Danger: `#B91C1C`
- Danger background: `#FEE2E2`
- Info: `#1D4ED8`
- Info background: `#DBEAFE`

### Color usage rules
- Use brand blue for primary actions and active emphasis only
- Use semantic colors only for meaning
- Do not use purple as a blanket accent everywhere
- Keep backgrounds neutral and surfaces quiet
- Charts must use a controlled palette, not repeated brand blue for every series

## Typography System

### Recommended font stack
- Primary UI font: `Inter`
- Optional premium alternative: `Plus Jakarta Sans`

### Type scale
- Display title: `40 / 44 / 800`
- Page title: `32 / 38 / 800`
- Section title: `20 / 28 / 700`
- Subsection title: `16 / 24 / 700`
- Body default: `14 / 22 / 500`
- Dense body: `13 / 20 / 500`
- Meta text: `12 / 18 / 500`
- Eyebrow labels: `11 / 14 / 700 uppercase`

### Typography rules
- Titles should be darker and bolder than current UI
- Secondary text must support, not overpower
- Table headers must stay legible in dense contexts
- Avoid overly light gray text on white surfaces

## Spacing System

Use an 8px foundation with 4px micro-adjustments.

### Tokens
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

### Rules
- Default panel padding: `20`
- Dense panel padding: `16`
- Section gap: `24`
- Control height: `40`
- Primary action height: `40` or `44`
- Table row height should be compact and consistent

## Radius and Shadow

### Radius
- Small controls: `10px`
- Inputs / buttons: `12px`
- Panels / sheets: `18px`
- Large hero or command surfaces: `20px`
- Pills / badges: `999px`

### Shadows
- Surface default: `0 8px 24px rgba(15,23,42,0.04)`
- Surface elevated: `0 14px 32px rgba(15,23,42,0.06)`
- Hover: minimal lift only

### Surface rules
- Use borders first, shadow second
- Avoid deep floating-card shadows
- Prefer flat enterprise sheets with light depth

## Layout System

### App shell
- Fixed sidebar
- Stable topbar
- Centered content width
- Desktop-first work surface

### Content width
- Recommended max width: `1440px`
- Use a consistent content frame across modules

### Page anatomy
1. Header
2. Command bar
3. Main workspace surface
4. Optional side rail or secondary panels

## Component Standards

### Buttons
Variants:
- Primary
- Secondary
- Ghost
- Danger
- Icon button

Rules:
- consistent height
- strong active/focus states
- compact icon spacing

### Inputs and selects
- consistent height and radius
- strong focus ring
- neutral border treatment
- no oversized padding

### Badges
Types:
- neutral
- info
- success
- warning
- danger

Rules:
- semantic only
- same sizing across modules

### Tables
- denser row rhythm
- controlled column widths
- sticky headers where needed
- subtle hover row state
- compact action column

### Panels
Types:
- workspace sheet
- metric card
- summary strip
- detail rail panel
- alert panel

Rules:
- not all panels should look identical
- importance should affect size and visual weight

### Empty states
Must include:
- icon
- message
- supporting explanation
- next action where useful

### Modals and drawers
- shared header/footer structure
- predictable action placement
- sectioned content

## Dashboard-Specific Standards

The dashboard is the benchmark screen.

### Dashboard should include:
- command header
- KPI band
- dominant pipeline/performance workspace
- action rail
- operational intelligence zone

### Dashboard should avoid:
- repeated equal-weight widgets
- giant empty cards
- decorative gradients dominating function
- tall passive side widgets

## Accessibility Standards

Target: WCAG 2.1 AA

Requirements:
- body text contrast at least 4.5:1
- keyboard-accessible controls
- visible focus states
- semantic heading order
- status not communicated by color alone
- adequate touch and click targets

## Frontend Governance Rules

1. No new page-specific styling if a shared component can solve it
2. No hidden module should define product direction
3. No decorative redesign that reduces operational clarity
4. Dashboard sets the benchmark for all modules
5. CRM lists, details, settings, reports, and analytics must all inherit from the same design language


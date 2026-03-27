# UI Functionality Documentation

## Scope
This document covers only the frontend UI functionality of the product. It does not describe backend business logic, database design, or infrastructure.

The UI is a role-aware internal Revenue CRM interface built around a shared application shell, reusable UI components, and module-based screens.

## Product UI Areas

### Public Authentication Screens
- `Login`
  - Email/password sign-in
  - Login error handling
  - Remember-device behavior
  - Redirect into the protected app shell after authentication
- `Forgot Password`
  - Password reset request flow UI
- `Contact Admin`
  - Contact/support request page for access-related help

### Protected App Shell
- Persistent left sidebar navigation
- Top navigation bar with:
  - global search input
  - primary action entry point
  - notification/user area
- Shared page container and route rendering
- Unauthorized route handling

## Visible Sidebar Modules

The current visible UI modules are:
- Dashboard
- Leads
- Companies
- Contacts
- Proposals
- Subscriptions
- Tasks
- Reports
- Analytics
- Users
- Settings

## Module-by-Module UI Functionality

### 1. Dashboard
Primary purpose:
- Operational overview of lead flow, pipeline status, activity, tasks, and renewals

Visible UI behavior:
- Hero summary section
- KPI metric cards
- Filter/command bar
- Pipeline overview panel
- Task center panel
- Source performance panel
- Stalled leads side panel
- Recent activity side panel
- Upcoming renewals side panel
- Loading, empty, and retry states for dashboard data

### 2. Leads
Primary purpose:
- Lead listing, filtering, review, creation, editing, and detail tracking

UI functionality:
- Lead list page
  - search
  - filtering
  - density-controlled listing/table view
  - row actions
- Add lead page
- Edit lead page
- Lead details page
- Lead activity timeline
- Lead status/health badges
- Lost reason modal
- Form-driven lead create/update workflow

### 3. Companies
Primary purpose:
- Company registry and company record management

UI functionality:
- Company list page
  - search
  - filters
  - registry table/list
  - row actions
- Company create/edit form
- Company details page

### 4. Contacts
Primary purpose:
- Contact directory and company-linked contact management

UI functionality:
- Contacts list page
  - searchable registry
  - table/list presentation
  - row actions
- Contact form modal
- Quick add contact modal

### 5. Proposals
Primary purpose:
- Proposal listing, creation, editing, previewing, and detail review

UI functionality:
- Proposal list page
- Proposal create form
- Proposal edit form
- Proposal details page
- Proposal preview page

### 6. Subscriptions
Primary purpose:
- Subscription and renewal visibility

UI functionality:
- Subscription list page
  - search/filter controls
  - subscription table/list
  - renewal-related display and status handling

### 7. Tasks
Primary purpose:
- Follow-up and task execution workflow

UI functionality:
- Task list/work queue page
- Task form modal
- Task status display
- Due-state and operational list hierarchy

### 8. Reports
Primary purpose:
- Business and operational report browsing

UI functionality:
- Reports page
- Filtered reporting views
- Report-oriented data presentation

### 9. Analytics
Primary purpose:
- Higher-level insight and analytics review

UI functionality:
- Analytics page
- Trend/summary oriented layout
- Analytics data display states

### 10. Users
Primary purpose:
- Admin-only user management

UI functionality:
- Users list page
- User form modal
- Role-aware route protection in UI

### 11. Settings
Primary purpose:
- Profile, company, role, and permissions configuration

UI functionality:
- Settings landing page
- Profile settings
- Company settings
- Roles settings
- Permissions settings
- Sectioned settings layout

## Shared UI System

### Layout Components
- `MainLayout`
- `Sidebar`
- `Navbar`
- `PageLayout`
- `PageHeader`
- `WorkspaceSection`

### CRM/List Components
- `ListPageShell`
- `PageHeaderToolbar`
- `DataTable`
- `RowActions`
- `ManageColumns`
- `FilterDrawer`
- `ExportDropdown`
- `DateRangePicker`

### Core UI Components
- `Button`
- `IconButton`
- `Badge`
- `Breadcrumb`
- `Card`
- `SurfaceCard`
- `Modal`
- `Drawer`
- `ConfirmDialog`
- `Tabs`
- `Pagination`
- `Skeleton`
- `EmptyState`
- `InlineAlert`
- `InlineError`
- `ToastContainer`
- `ToastDedupe`

### Form/Input Components
- `Form`
- `FilterBar`
- `StatusSelect`
- `Switch`
- `RichTextEditor`

### Dashboard-Specific Components
- `DashboardActivityFeed`
- `DashboardStuckLeads`
- `DashboardUpcoming`
- `DashboardFilters`
- `DashboardPipeline`
- `DashboardKPIs`
- `DashboardSnapshot`
- `DashboardFollowups`
- `DashboardSourcePerf`

## Shared UI Behaviors

### Navigation
- Sidebar-based module access
- Route-based active navigation highlighting
- Role-gated visibility for admin-only routes

### Loading States
- Skeleton loaders
- route-level lazy loading fallback
- inline loading states inside dashboard and module surfaces

### Empty States
- Empty-state components are used for:
  - empty lists
  - no activity
  - no renewals
  - no source analytics
  - no task pressure

### Error Handling
- Inline alerts with retry actions
- auth unauthorized event handling
- route guard handling for unauthenticated or unauthorized access

### Forms and Modal Flows
- Modal-based creation/editing for some modules
- Full-page create/edit flow for larger entities
- Shared input styling and validation-ready form structure

### Table/List Behavior
- Shared data table system
- row actions
- list-density oriented CRM layouts
- reusable listing shell for module pages

## Design System / Styling Foundation

The UI styling is currently driven by:
- `frontend/src/index.css`
- `frontend/src/styles/design-system.css`
- `frontend/src/theme/tokens.ts`
- `frontend/src/theme/lightTokens.ts`
- `frontend/src/theme/uiTokens.ts`
- `frontend/src/theme/designSystem.ts`

These provide the visual system for:
- colors
- typography
- spacing
- borders
- shadows
- surface styling
- component consistency

## State and Data Flow at UI Layer

### Global State
Redux slices exist for:
- auth
- analytics
- leads
- companies
- contacts
- proposals
- subscriptions
- tasks
- reports
- settings
- users

### API Layer
- Shared Axios client
- auth-aware request handling
- centralized error helpers
- browser-side auth storage utilities

### Context
- Global search context for cross-app search behavior

## Route Map

### Public Routes
- `/login`
- `/forgot-password`
- `/contact-admin`

### Protected Routes
- `/dashboard`
- `/leads`
- `/leads/new`
- `/leads/:id`
- `/leads/:id/edit`
- `/companies`
- `/companies/new`
- `/companies/:id`
- `/companies/:id/edit`
- `/contacts`
- `/proposals`
- `/proposals/new`
- `/proposals/:id`
- `/proposals/:id/edit`
- `/proposals/:id/preview`
- `/subscriptions`
- `/tasks`
- `/reports`
- `/analytics`
- `/users`
- `/settings`
- `/unauthorized`

## Current UI Constraints

Known product-level UI constraints based on the current app structure:
- The UI is module-based but still mixes full-page and modal workflows
- Some screens are denser and more systematized than others
- The dashboard and several modules have gone through redesign iterations, but not every screen is equally mature
- The frontend already has a reusable UI foundation, so future UI work should extend shared components instead of adding one-off patterns

## Recommended Rule for Future UI Work

All future frontend changes should follow these constraints:
- keep visible module set aligned with sidebar navigation
- prefer shared components over page-specific styling
- preserve existing workflows unless a UI improvement is clearly beneficial
- document only user-visible behavior in UI docs
- avoid mixing backend or architecture details into UI documentation


# Frontend Wireframe Architecture

## Objective
This document defines the structural layout strategy for the entire frontend, starting with the dashboard and extending through all visible modules.

The goal is to ensure the product is designed as one coherent workspace system rather than a collection of unrelated pages.

## Global Application Shell

### Left Sidebar
Contains:
- grouped navigation
- role-aware items
- brand mark
- current user identity block

Sidebar groups:
- Core
- Insights
- Admin

### Topbar
Contains:
- global search
- contextual quick actions
- notifications
- user menu / current session

### Main Content Frame
- centered content band
- desktop-first layout
- consistent padding
- controlled max width

## Shared Page Layout Model

Every page should follow this high-level structure:

1. Page header
- title
- optional subtitle
- primary and secondary actions

2. Command bar
- search
- filters
- date / status / owner controls
- clear/reset actions

3. Main content surface
- table, detail content, chart surface, or workflow canvas

4. Secondary supporting surface
- right rail, side metadata, activity, or related entities

## Dashboard Wireframe

### Zone 1: Executive command header
Contains:
- page title
- current business context
- quick actions
- compact operational summary

### Zone 2: KPI band
Contains:
- one or two dominant KPI blocks
- supporting KPI mini-cards

Suggested KPI categories:
- active leads
- proposals in progress
- expiring subscriptions
- overdue follow-ups
- tasks due today
- response time

### Zone 3: Main performance workspace
Left dominant zone:
- pipeline health
- stage pressure
- source performance
- conversion signal

Right action rail:
- stalled leads
- overdue tasks
- upcoming renewals
- recent critical changes

### Zone 4: Action center
- daily execution
- reminders
- action queue
- proposal / lead / subscription priority items

### Zone 5: Activity and intelligence
- recent activity
- status changes
- operational timeline
- recent important updates

## Leads Module Wireframe

### Leads List
1. Header
- title
- add lead
- import/export if needed

2. Command bar
- search
- source filter
- status filter
- owner filter
- date/follow-up filter

3. Main list surface
- lead name
- company
- stage/status
- source
- assignee
- next follow-up
- health/priority
- row actions

4. Optional detail preview or secondary rail

### Lead Detail
1. Summary header
- lead identity
- stage
- source
- owner
- quick actions

2. Main content
- notes
- activity
- timeline
- proposal links

3. Secondary rail
- contact info
- company link
- follow-up summary
- health / urgency

## Companies Module Wireframe

### Companies List
- header
- search/filter bar
- account registry table
- summary strip above list

### Company Detail
1. Account summary header
- company identity
- industry
- health
- quick actions

2. Main sections
- overview
- linked contacts
- linked leads
- linked proposals
- subscriptions

3. Side metadata
- phone
- website
- address
- owner / manager

## Contacts Module Wireframe

### Contacts List
- header
- search/filter row
- compact relationship-aware table

### Contact Detail / Modal
- identity
- linked company
- lead/proposal relationship context
- communication info

## Proposals Module Wireframe

### Proposals List
- header
- command bar
- proposal table
- summary strip for draft / sent / approved / expired

### Proposal Detail
1. Proposal summary
- title
- status
- linked lead/company
- created date
- last updated

2. Main content
- proposal sections
- history
- preview / CTA

3. Side rail
- linked entities
- approval state
- reminders / actions

### Proposal Preview
- premium document-oriented reading surface
- restrained chrome
- clear actions

## Subscriptions Module Wireframe

### Subscriptions List
- header
- command bar
- status-sensitive registry

Columns:
- subscription
- vendor
- billing period
- renew date
- status
- owner / reminder state

### Subscription Detail
- summary header
- timeline
- status / urgency
- reminders
- linked company / contact / proposal if relevant

## Tasks Module Wireframe

### Tasks List
- header
- command bar
- grouped task list or table

Task emphasis:
- due today
- overdue
- linked context
- assignee
- priority
- quick completion / action buttons

### Task Detail / Modal
- task info
- due info
- linked lead/company/proposal/subscription
- notes / status

## Reports Module Wireframe

### Reports Page
- title
- report filter controls
- structured report sections
- export action

Reports should feel formal and tabular, not like dashboard widgets.

## Analytics Module Wireframe

### Analytics Page
- title
- segmented filters
- trend visualizations
- summary comparison blocks
- analytical chart sections

Analytics should feel deeper than dashboard and less action-heavy.

## Users Module Wireframe

### Users List
- title
- add user action
- user table
- role/status filters

### User Modal
- identity info
- role
- status
- team/admin fields

## Settings Module Wireframe

### Settings Root
- left settings navigation or strong section list

Sections:
- profile
- company
- roles
- permissions
- system behavior if added later

### Settings Page Rule
Never use one long unstructured settings page.

## Notifications and Reminders

### Toasts
- compact
- semantic
- short-lived

### Inline alerts
- contextual
- retry support

### Reminder surfaces
- embedded in tasks, subscriptions, proposals, and dashboard

## Structural Consistency Rules

1. Header always first
2. Command bar always second for list/report pages
3. Main workspace always visually dominant
4. Side rails only used when they add operational value
5. Avoid stacked isolated card sections when one structured sheet is better


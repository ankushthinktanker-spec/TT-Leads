# Functional Specification

## 1) Modules and Features
- Dashboard: KPIs, filters, pipeline, follow-ups, stuck leads, alerts, recent activity
- Leads: create/edit/list, follow-up scheduling, health badge, stage changes, activities
- Companies: CRUD, address and metadata
- Contacts: CRUD, primary contact, company linkage
- Proposals: rich-text sections, TOC/index, logo upload, footer, PDF export/download
- Tasks: create/update/complete
- Reports: lead, follow-up, pipeline, team, finance
- Analytics: dashboard, funnel, velocity, forecast, loss, quality
- Users/Settings: Admin-only management

## 2) Lead Rules
### Required on Create
- firstName, lastName, email, phone, company, source
- nextFollowUpDate or nextFollowUpAt (required for new leads)

### Optional
- status, lifecycleStage, priority, assignedTo, ownerId, teamId

### Lead Health (Derived)
Based on nextFollowUpDate:
- UNHEALTHY: missing
- OVERDUE: date < today start
- DUE_TODAY: date between today start/end
- SCHEDULED: date > today end

### Follow-up Filters
- due=unhealthy, overdue, today, upcoming (next 7 days)
- ownerId filters owner/assigned owner

### Status Changes
- Stage change updates lastStageChangedAt
- Lost status requires lostReason
- Won status updates conversion metrics

### Activity Logs
- Stage changes create LeadActivity entries
- Follow-up reschedule/complete create LeadActivity entries
- Notes create LeadActivity entries

### Stuck Leads
Definition:
- lastStageChangedAt older than N days (default 14)
- stage not in Won/Lost/Closed

## 3) Proposal Rules
- Section content stored as HTML in ProposalSection.content
- Section metadata: title, order, visibility, includeInIndex
- Heading IDs are added to headings to support TOC and PDF anchors

### TOC (Index)
- Derived from section titles and heading tags
- Depth controlled by tocDepth (1-3)
- Updates on add, rename, reorder, delete

### Logo and Footer
- Logo upload accepts PNG/JPG/WEBP
- Footer supports address and website link

## 4) PDF Rules
- A4 size with fixed margins
- Page numbers in footer
- Header includes logo and optional header text
- Cover page includes client and prepared-by details
- TOC shows page numbers and anchors
- Tables use header rows and repeat across pages
- No colored page background

## 5) Error Handling
Common response format:
- success: false
- message: error text

Status behavior:
- 400: validation or bad request
- 401: authentication required or token expired
- 403: role/permission denied
- 404: not found
- 500: unexpected error

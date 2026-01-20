# User Guide

## 1) Overview
ThinkTanker CRM Suite is a lead management and proposal system. It helps teams capture leads, schedule follow-ups, track pipeline stages, and generate proposal PDFs.

Primary modules:
- Dashboard
- Leads
- Companies
- Contacts
- Proposals
- Tasks
- Reports
- Analytics
- Users (Admin only)
- Settings (Admin only)

User roles in the UI:
- Admin: full access
- User: standard access (some admin areas hidden)

## 2) Login and Session Behavior
- Enter email and password on the Login screen.
- If you choose “Remember me,” tokens are stored in local storage; otherwise, session storage is used.
- If a token expires, the app attempts refresh automatically. If refresh fails, you are logged out.

## 3) Dashboard
The dashboard shows daily work focus and health indicators.

Key areas:
- KPI cards: Total Leads, New Leads, Won Deals, Won Rate, Avg Response, Overdue Follow-ups
- Filters: Date range, owner scope, source, stage/status, priority
- Pipeline Overview: Stage distribution with quick navigation to filtered leads
- Follow-up Control Center: Overdue, Due Today, and Upcoming follow-ups with quick actions
- Stuck Leads: Leads in the same stage for too long (default 14+ days)
- Alerts & Exceptions: Highlights like duplicates or high-value leads without next action
- Recent Activity Feed

## 4) Leads
### Create a Lead
Required fields:
- First Name, Last Name
- Email
- Phone
- Company
- Source
- Next Follow-up Date/Time

Optional fields:
- Status, Priority, Assigned user, Owner
- Industry, Company size, location, budget, expected close date

### Lead Health Badge
Lead health is calculated from next follow-up date:
- UNHEALTHY: no follow-up date
- OVERDUE: follow-up date in the past
- DUE_TODAY: follow-up date is today
- SCHEDULED: follow-up date in the future

### Lead Filters
You can filter the list by status, source, priority, due status (today, overdue, upcoming), and owner.

### Lead Timeline
Lead activities are recorded automatically:
- Stage changes
- Follow-up reschedule/completion
- Notes

### Stuck Leads
A lead is flagged as stuck if it stays in the same stage for more than N days (default 14) and is not Won/Lost/Closed.

## 5) Companies
- Create and edit companies with address and contact fields.
- Use companies to link leads, contacts, and proposals.

## 6) Contacts
- Create contacts and associate them with companies.
- Mark a contact as primary if needed.

## 7) Proposals
### Create a Proposal
- Add proposal title, client details, and validity date.
- Add sections for proposal content.
- Each section can include rich text, bullets, dash lists, and tables.

### Table of Contents (Index)
- The index is generated automatically from section titles and heading tags.
- Choose the depth (H1 only / H1+H2 / H1+H2+H3).

### Branding & Footer
- Upload a logo (PNG/JPG/WEBP). It appears in the PDF header and cover page.
- Footer fields support address and website links.

### Export and Download
- Generate PDF from the proposal details.
- Download uses the row action on the proposals list.
- Preview uses the inline PDF stream.

## 8) Tasks
- Create tasks and follow-ups.
- Mark tasks as complete.
- Filter tasks by status and priority.

## 9) Reports
- Reports contain lead, follow-up, activity, pipeline, and finance reports.
- Revenue metrics are available in Reports only (not on the dashboard).

## 10) Settings & Users (Admin)
- Manage users and roles.
- Update system settings and company profile.

## 11) Common Workflow Example
1. Create a lead and schedule the next follow-up.
2. Use dashboard follow-up actions to reschedule or mark done.
3. Create a proposal and export a PDF.
4. Track lead status through the pipeline.
5. Review performance in reports.

## 12) Troubleshooting
- Login errors: verify credentials and role access.
- 401 errors: token expired; logout and login again.
- Proposal PDF missing logo: ensure the logo was uploaded (PNG/JPG/WEBP) and saved.
- PDF download fails: regenerate PDF and try again.
- Empty dashboard widgets: check filters and date range.

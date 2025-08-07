TRD v2 — “Which Days”
Vision & Scope
Pick a day fast. Owner proposes dates; friends mark can’t-do; app shows viable-for-all continuously and the final set when everyone’s “done.”
Personas
Owner: logs in (Google/Apple), manages plan.
Participant: no login; enters a display name.
Key Rules
Global elimination: A date is eliminated as soon as any participant marks can’t.
Undo window: Only the actor can undo their own mark for 30s. If >1 person marked can’t, date stays eliminated unless all undo within their windows.
Owner override: Owner may Force Reopen a date at any time:
Sets status back to “viable (reopened vN)”.
Keeps prior individual marks for audit but clears the global elimination flag.
Triggers Needs Review banner on next visit for anyone who was “done”.
Edits allowed after “done” (owner & participants).
Cap: Max 3 active plans per owner (free). Deleting a plan frees quota. (Future paid tier lifts cap.)
Time zones ignored. No notifications in v1.
Core Flows
Create plan: title + dates → get share link (public) + manage link (owner).
Join & respond: name → toggle can’t-do → “I’m done” (reversible).
Live results: always show:
Viable for all (intersection of availability for joined participants).
Eliminated/Locked (crossed-out).
Works for most (sorted by availability count).
Manage: add/remove dates, Force Reopen, lock plan, delete plan.
Product Surface
Owner: Create • Dashboard (results matrix, Force Reopen, add/remove, lock, delete) • Quota indicator (0–3).
Participant: Join/Name • Availability list/calendar • Done + edit.
Data (conceptual, not schema)
Plan, PlanDate, Participant, Availability.
Event log of availability actions with timestamps for the 30s window + audit.
Derived summaries per plan (viable, eliminated/locked, counts).
Security & Access
Share link grants per-plan participant actions only.
Owner auth required for plan/date management and Force Reopen.
RLS-style policies: participants can only read/write within the invited plan; owners only their plans.
Abuse controls: rate limits per IP/participant; optional CAPTCHA on suspicious activity.
API (behavioral)
Create/Read/Update/Delete endpoints for plans, dates, participants, availability.
Availability update returns an undo_deadline (now+30s).
Undo endpoint validates actor + deadline.
Force Reopen (owner) flips date status to reopened (versioned) and sets needs_review=true for completed participants.
Summary endpoint returns per-date status (viable|eliminated|locked|reopened), counts, and plan completion state.
Non-functionals
P95 < 200 ms reads; cheap to run; daily backups; ≥99.9% API availability goal.
Privacy: store display names only for participants; owner email from IdP.
Observability: metrics (plans_created, responses_saved, viable_count, force_reopens, undo_attempts/denied), structured logs, simple dashboard.
Risks & Mitigations
Flip-flopping: 30s window + lock state + owner Force Reopen with “Needs Review.”
Griefing via share link: rate limit + optional CAPTCHA.
Owner misuse of reopen: soft-limit (e.g., 10/day/plan) + audit trail.
ADRs (summaries)
ADR-0001: Stack — Next.js PWA on Vercel; Supabase (Auth/Postgres/RLS). Chosen for speed, low ops, link-sharing fit.
ADR-0002: Elimination/Undo/Override — Global eliminate on first can’t-do; 30s self-undo; owner Force Reopen creates a “reopened” state and flags Needs Review.
ADR-0003: Plan Cap & Monetization Gate — Free tier = 3 active plans; deletion frees quota; future paid tier lifts cap.
Milestones (tickets ready)
M0 – Skeleton (1–2d): Project setup, owner OAuth, create plan, quota check, share/manage links.
M1 – Participant Flow (2–3d): Join, availability toggles, 30s undo, done/undone, live summaries.
M2 – Owner Manage (2d): Add/remove dates, Force Reopen (+Needs Review), lock/delete.
M3 – Polish (2d): Works-for-most ranking, empty states, mobile polish, accessibility basics.
M4 – Ops (1d): Metrics, logs, backups, rate limits, brief runbook.
Acceptance Criteria (high-level)
Free users can keep ≤3 active plans; blocking/error when exceeded.
Any can’t-do instantly eliminates the date for all; actor can undo only within 30s.
Force Reopen restores viability, versions the date, and flags past “done” participants as Needs Review.
Results always show Viable for all, Eliminated/Locked/Reopened, and Works for most.

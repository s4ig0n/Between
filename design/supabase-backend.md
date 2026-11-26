# Supabase backend

Status: design note. Nothing here is built. Today Between has no server and
keeps everything on the phone.

## Why a backend

The clinic dashboard and the "needs a check-in" list need completion data
from patients' phones. That is the first time data would leave the phone, so
the privacy notes and HIPAA position must be settled before any real patient
uses it.

## Why Supabase

- Postgres with row-level security (RLS), so access rules live next to the data.
- Auth for both patients and clinic staff.
- A REST API generated from the tables (PostgREST), plus scheduled jobs and
  Edge Functions for the daily check-in run.
- Works from both the Expo app and a web dashboard with one client library.

**Before real patient data:** a HIPAA Business Associate Agreement with
Supabase is required. Check Supabase's current plans and HIPAA terms; this
note does not assume which plan includes it.

## Tables (first cut)

| Table | Key columns | Notes |
|---|---|---|
| `clinics` | id, name, time_zone, check_in_rules (jsonb) | Thresholds per clinic |
| `clinic_staff` | user_id, clinic_id, role | Links Supabase Auth users to a clinic |
| `patients` | id, clinic_id, display_name, auth_user_id | Display name only, e.g. "Linda M." |
| `care_plans` | id, patient_id, start_date, end_date, status | `active`, `paused`, `ended` |
| `exercises` | id, care_plan_id, name, steps, duration_minutes, times, days_of_week | Same shape as the app's `Exercise` |
| `completion_events` | occurrence_id, patient_id, exercise_id, scheduled_for, completed_at, source, local_date | Primary key `(patient_id, occurrence_id)` |
| `check_in_flags` | id, patient_id, kind, message, status, snoozed_until, updated_at | One open flag per patient |
| `audit_log` | actor, action, target, at | Who viewed or changed what |

Appointments stay in Epic and are not copied here.

## Access rules (RLS)

- A patient can insert and read only their own `completion_events` and read
  their own plan.
- Clinic staff can read patients, plans, events and flags only for their own
  clinic, and update flag status.
- Nobody can read across clinics. The check-in job runs with a service role
  on the server, never in the app.

## Syncing from the app

The app already has the right shape for this:

- Each completion has a stable `occurrence_id` (`knee@2026-10-06T08:00`)
  and marking done is idempotent.
- Add an outbox to the local store: new completions are queued and upserted
  on `(patient_id, occurrence_id)`. Retrying is safe and never duplicates.
- Un-checking a session deletes the matching event.
- Works offline; syncs when the app opens or a notification action runs.

## What is not sent

- No Epic tokens. They stay in the phone's secure storage.
- No calendar data, no device identifiers, no analytics.
- No full names or dates of birth unless the clinic requires them; a
  display name and the clinic's own patient reference are enough.

## Patient sign-up

The clinic creates the patient and plan, then gives the patient a one-time
invite code or link. The app signs in with it (Supabase Auth, magic link or
code). No password to remember, which matters for older patients.

## Migration from the local-only app

Existing local check-offs are uploaded once after the patient links to a
clinic. Until then the app keeps working fully offline, as it does now.

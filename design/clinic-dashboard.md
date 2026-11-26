# Clinic dashboard

Status: design note. Nothing here is built.

## Who it is for

Physical therapists and front-desk staff at a clinic, on a computer between
visits. The pitch names clinician overload as a risk, so the dashboard is one
focused list, not another inbox.

## What it does

Matches the "Needs a check-in" card in the mockup.

1. **Needs a check-in** (home screen). Each row shows the patient's display
   name, the reason in plain words ("No exercises logged in 3 days"), and two
   actions: **Call** and **Message**. Sorted by severity.
2. **Patient detail.** The care plan, a 14-day grid of sessions done and
   missed, upcoming visits, and the history of check-in flags.
3. **Plan editor.** Add or change exercises, times and days, then the
   patient's phone picks it up on next sync.
4. **Settings.** Check-in thresholds and the clinic's time zone.

Out of scope for the first version: messaging inside the app, billing, and
analytics across patients.

## Actions

- **Call** opens the phone number (a `tel:` link) and marks the flag
  `contacted`.
- **Message** starts with a text message through the clinic's existing
  system. Building messaging into Between is a separate decision with its own
  privacy review.
- **Snooze until…** for patients who are away or between surgeries.

## Technology

- A web app (Next.js with React and TypeScript) so it shares the app's types
  and the pure rule code in `src/logic/`.
- Hosted on Vercel or similar, talking to Supabase (see
  `supabase-backend.md`) with the staff member's own login, so row-level
  security limits each person to their clinic.
- Every patient view and flag change is written to the audit log.

## Accessibility and design

Same visual language as the app: deep blue, white cards, yellow accent,
large type. Keyboard accessible and screen-reader labeled. Works on a tablet
at the front desk.

## Remote therapeutic monitoring

The pitch notes that Medicare added remote therapeutic monitoring codes for
2026, including for shorter monitoring periods. If the clinic wants to bill
for this, the dashboard would need a per-patient count of days with data in
each period and an export. The exact billing requirements need to be
confirmed with the clinic's billing staff before building anything for it.

## Open questions

- Which staff roles need access, and should therapists see only their own
  patients?
- Does the clinic want flags in its EHR instead of a separate dashboard?

# "Needs a check-in" logic

Status: design note. The rules themselves are built and tested
(`src/logic/adherence.ts`, `__tests__/adherence.test.ts`); where they run and
how flags are handled is not built yet.

## Goal

Give the clinic one short list of patients worth a call, matching the
mockup:

- *Linda M.: No exercises logged in 3 days*
- *Ray T.: Missed 2 of the last 4 days*

The pitch names clinician overload as a risk, so the list has to stay short
and every entry has to say why it is there.

## Rules (built)

Evaluated per patient, per active care plan, once a day:

| Rule | Default | Message |
|---|---|---|
| No log | nothing logged for 3 or more days | "No exercises logged in N days" |
| Missed days | 2 or more of the last 4 full days with zero sessions done | "Missed N of the last 4 days" |

- "No log" wins when both fire, because it is the stronger signal.
- Today is never counted as missed, since the day isn't over.
- A day with some but not all sessions done is not missed. Partial effort
  should not trigger a call.
- Days before the plan started don't count.
- Thresholds are a `CheckInRules` object, so a clinic can change them.

## Where it runs

On the backend (see `supabase-backend.md`), not the phone: the clinic needs
the flag even when the patient never opens the app, which is exactly the
case it is meant to catch.

- A scheduled job runs early each morning in the clinic's time zone and
  evaluates every active enrollment.
- It also re-checks a patient when new completion events arrive, so a flag
  clears as soon as the patient logs a session.
- The same TypeScript rule code is reused (the functions are pure, with no
  React Native imports) so the app and the server can't disagree.

## Flag lifecycle

A flag is a row, not just a computed value, so staff actions stick:

`open` → `contacted` (staff called or messaged) → `resolved`

- Resolves automatically when the rule no longer fires.
- Staff can **snooze** a patient (for example, on vacation, or just had
  surgery) until a date. Snoozed patients are not flagged.
- At most one open flag per patient. A new reason updates the message
  instead of adding a second row.

## Keeping the list short

- Sort by severity: days since last log, then missed days.
- Show the reason in plain words, never a score.
- Only patients with an active plan and an enrolled device are evaluated, so
  "no data" because someone never installed the app is a separate onboarding
  list, not a check-in.

## Edge cases to test before building

- Time zones: a patient's "day" is their local day, stored with each event.
- Phone clock changes and late syncs: use the session's scheduled time, not
  the upload time.
- Plans paused or ended mid-window.
- Exercises scheduled only on some weekdays (already handled: days with no
  scheduled sessions are skipped).

## Open questions for the clinic

- Are 3 days / 2 of 4 the right defaults for post-surgical PT?
- Should a flag notify anyone, or only appear in the dashboard?

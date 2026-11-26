# Design notes (phase 5)

Plans only. None of this is built yet.

| Note | What it covers |
|---|---|
| [needs-check-in.md](needs-check-in.md) | The rules for flagging patients (already built and tested), where they run, and how flags are handled |
| [supabase-backend.md](supabase-backend.md) | Tables, access rules, syncing check-offs from the app, and what is never sent |
| [clinic-dashboard.md](clinic-dashboard.md) | The staff web app: the "Needs a check-in" list, patient detail, plan editor |
| [siri-app-intents.md](siri-app-intents.md) | "What do I do today?" with Siri, and the EAS dev build it needs |

Suggested order: backend, then check-in job, then dashboard. Siri and the
background notification handler share one EAS dev build and can go in any
order.

Before any of it handles real patient data: a HIPAA review, a Business
Associate Agreement with the backend host, and an update to `PRIVACY.md`.

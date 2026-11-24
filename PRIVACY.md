# Privacy (draft)

This is a plain-language description of what the Between app stores and where.
It is a working draft for a prototype. **It is not legal advice** and has not
been reviewed by a lawyer.

## Current version (phases 1–3)

- **No real patient data.** The care plan, patient name and appointments are
  synthetic sample data built into the app.
- **What is stored:** a completion log (which exercise sessions were marked
  done and when, and whether that came from the app or a notification) and any
  "remind me in 1 hour" snoozes.
- **Where:** only on the phone, in the app's local storage (AsyncStorage). It
  is deleted when the app is uninstalled.
- **Reminders:** if you allow notifications, reminders are scheduled locally
  by the phone's operating system. They are not push notifications and do not
  go through any server. The text names the exercise (for example "Time for
  your knee exercises") and **can be read on the lock screen** by anyone holding
  the phone. You can hide previews in the phone's notification settings.
- **Calendar:** only if you tap "Add to my calendar" and allow access. The
  app writes exercise sessions and visits (title, time, exercise steps, visit
  location) into a separate calendar named "Between". It reads only that
  calendar's events, to avoid duplicates. It does not read or change your
  other calendars.
  - **iPhone:** the Between calendar is created in the same account as your
    default calendar. If that is iCloud, Apple syncs it to your other Apple
    devices and iCloud, outside the app's control.
  - **Android:** the Between calendar is a local calendar on the phone and is
    not attached to a Google account.
  - "Remove" deletes the Between calendar and its events from the phone.
- **What leaves the phone:** nothing is sent by the app. There is no server,
  no account, no analytics SDK and no third-party tracker. (The calendar note
  above is the one case where the phone's own sync may copy data.)

## Planned changes (not built yet)

- **Epic sandbox (phase 4):** sign-in uses SMART on FHIR with PKCE and no
  client secret. Access tokens are stored only in the phone's secure storage
  (Keychain on iOS, Keystore-backed storage on Android) and are never logged.
  Development uses Epic's published test patients only.
- **Clinic dashboard and backend (phase 5):** design only for now. Any version
  that shares data with a clinic needs a fresh privacy review first, covering
  HIPAA business associate terms and the FTC Health Breach Notification Rule
  for consumer health apps.

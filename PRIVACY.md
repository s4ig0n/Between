# Privacy (draft)

This is a plain-language description of what the Between app stores and where.
It is a working draft for a prototype. **It is not legal advice** and has not
been reviewed by a lawyer.

## Current version (phase 1)

- **No real patient data.** The care plan, patient name and appointments are
  synthetic sample data built into the app.
- **What is stored:** a completion log (which exercise sessions were marked
  done and when, and whether that came from the app or a notification) and any
  "remind me in 1 hour" snoozes.
- **Where:** only on the phone, in the app's local storage (AsyncStorage). It
  is deleted when the app is uninstalled.
- **What leaves the phone:** nothing. There is no server, no account, no
  analytics SDK and no third-party tracker.

## Planned changes (not built yet)

- **Reminders (phase 2):** scheduled on the phone by the operating system.
  Notification text names the exercise (for example "Time for your knee
  exercises") and can appear on the lock screen.
- **Calendar (phase 3):** with permission, the app writes exercise sessions and
  visits into a separate "Between" calendar on the phone. Depending on your
  phone's settings, that calendar may sync to your iCloud or Google account,
  which is outside the app's control.
- **Epic sandbox (phase 4):** sign-in uses SMART on FHIR with PKCE and no
  client secret. Access tokens are stored only in the phone's secure storage
  (Keychain on iOS, Keystore-backed storage on Android) and are never logged.
  Development uses Epic's published test patients only.
- **Clinic dashboard and backend (phase 5):** design only for now. Any version
  that shares data with a clinic needs a fresh privacy review first, covering
  HIPAA business associate terms and the FTC Health Breach Notification Rule
  for consumer health apps.

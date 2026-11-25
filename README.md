# Between

Between keeps physical therapy patients on track between visits. It puts the
home exercise plan and appointments into the calendar, reminders and lock
screen the patient already uses, so they can check things off without opening
another app.

> **Phase 1 uses synthetic data only.** The patient, clinic and schedule in the
> app are made up. No real patient data, no analytics SDKs, no trackers.

## Status

| Phase | What | State |
| --- | --- | --- |
| 1 | Scaffold, data model, Today screen on sample data with check-off | Done |
| 2 | Local reminders with "Mark done" and "In 1 hour" actions | Done |
| 3 | Sync exercises and visits into a dedicated "Between" calendar | Done |
| 4 | Epic on FHIR sandbox login and appointment import | Built, needs redirect URI registered in Epic |
| 5 | Design notes: clinic dashboard, backend, needs check-in, Siri | Planned |

## Run it on your phone with Expo Go

You need Node.js 20 or newer and the **Expo Go** app from the App Store or
Google Play. Your phone and computer must be on the same Wi-Fi network.

```powershell
npm install
```

```powershell
npx expo start
```

A QR code appears in the terminal.

- **Android:** open Expo Go and tap *Scan QR code*.
- **iPhone:** open the Camera app, point it at the QR code and tap the banner.

If your phone can't reach your computer (common on school, office or public
Wi-Fi), use a tunnel instead:

```powershell
npx expo start --tunnel
```

To preview in a desktop browser, press `w` in the Expo terminal, or run
`npx expo start --web`.

## Try the reminders

1. Open the app in Expo Go and tap **Turn on reminders**, then allow
   notifications.
2. Tap **Dev: test reminder in 10 seconds** (only shown in development), then
   lock the phone.
3. When the reminder arrives, long-press it (iPhone) or expand it (Android) to
   see **Mark done** and **In 1 hour**.
4. Open the app: the session is checked off, or the reminder comes back an hour
   later.

Real reminders are scheduled for each exercise session over the next 3 days
and are re-synced every time the app opens, so they never duplicate.

**For now, the actions open the app.** Expo Go cannot run the app's code in
the background once the app has been swiped away, so a silent tap could be
lost and the session would stay unchecked. Opening the app for a moment makes
sure every tap is recorded. A later phase with an EAS development build adds a
background handler, and then `ACTIONS_OPEN_APP` in
`src/notifications/native.ts` can go back to `false` so the patient never
leaves the lock screen.

## Try the calendar

1. On the Today screen, tap **Add to my calendar** and allow calendar access.
2. Open your phone's Calendar app. A calendar named **Between** now holds the
   next 14 days of exercise sessions and visits.
3. Reopen Between or tap **Update now** as often as you like: events that are
   already there are matched and left alone, so nothing is duplicated.
4. **Remove** deletes the Between calendar again. Your other calendars are
   never changed.

How it avoids duplicates and stays safe:

- Events are matched by title and start time inside the app's own calendar,
  so a re-sync (or a reinstall) finds them again without a stored id list.
- Every event the app writes ends with "Added by the Between app." The app
  only ever updates or deletes events carrying that line, so anything you add
  to the Between calendar by hand is left alone.
- Past days are kept as a record. Calendar events have no alarms, because the
  reminders already alert you.
- Expo Go only supports the older `expo-calendar/legacy` API, so that is what
  `src/calendar/native.ts` uses for now.

## Epic on FHIR sandbox

Between can import appointments for one of Epic's published **sandbox test
patients**. It never talks to a production Epic system: `src/fhir/config.ts`
refuses any base URL outside `https://fhir.epic.com/interconnect-fhir-oauth/`.

How it signs in: SMART on FHIR standalone launch, authorization code with
PKCE (S256), as a public client with no client secret. Endpoints are read from
the sandbox's `.well-known/smart-configuration`. The access token is kept only
in SecureStore and is never logged.

### 1. Register the redirect URI in Epic

Epic only sends the patient back to a redirect URI registered on the app at
fhir.epic.com, and it must match exactly. Add both of these:

- **Expo Go:** `exp://<your computer's Wi-Fi IP>:8081/--/auth/epic`, for
  example `exp://192.168.1.11:8081/--/auth/epic`. The Between card shows
  the exact value in development under "Redirect URI to register in Epic".
  It changes if your computer's IP changes.
- **Dev builds later:** `between://auth/epic`

Changes to an Epic sandbox app can take a while to take effect.

If Expo picks the wrong network adapter (common on Windows with WSL or
VirtualBox installed), force your Wi-Fi IP before starting:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.11"; npx expo start
```

### 2. Connect

1. Put your non-production client ID in `.env` (see `.env.example`).
2. On the Today screen, tap **Connect to Epic sandbox**.
3. Sign in with one of the MyChart test patients listed in Epic's sandbox
   documentation on fhir.epic.com.
4. The test patient's appointments replace the sample visits on Today and in
   the Between calendar. Exercises stay on the sample plan, because the Epic
   APIs used here (Patient, Appointment, Practitioner, Location) carry no
   home exercise program.

The token lasts about an hour. Imported appointments stay on the phone after
that, and the card offers **Sign in again** to check for changes.
**Disconnect** deletes the token and the imported appointments.

With no client ID set, the Epic card is hidden and the app runs on sample data.

## Tests and type-check

```powershell
npm test
```

```powershell
npm run typecheck
```

The tests cover the pure logic: expanding a care plan into a daily agenda, the
completion log, snoozes, reminder scheduling and action handling, calendar
event planning and de-duplication, the adherence / "needs a check-in" rules,
and the Epic config guard, SMART discovery checks, token session handling and
FHIR-to-Appointment mapping.

## Configuration

Copy `.env.example` to `.env`. With `EXPO_PUBLIC_EPIC_CLIENT_ID` empty the app
runs on sample data. `.env` is git-ignored. Only use an Epic **non-production**
client ID and the Epic sandbox base URL.

## Project layout

```
app/                 Screens (expo-router)
src/model/           Types and the synthetic sample plan
src/logic/           Pure, tested logic: dates, schedule, completion, adherence
src/notifications/   Reminder planning (pure) and the expo-notifications glue
src/calendar/        Calendar event planning (pure) and the expo-calendar glue
src/fhir/            Epic sandbox: config, SMART sign-in, FHIR client, mapping
src/store/           Persisted app state (zustand + AsyncStorage)
src/ui/              Theme and components
__tests__/           Jest tests
```

## Accessibility

Older patients are a core audience. Tap targets are at least 56 points, text
and background colors meet WCAG AA contrast, text scales with the system font
size, and every check-off is announced to screen readers as a checkbox with its
state.

## Privacy

See [PRIVACY.md](PRIVACY.md).

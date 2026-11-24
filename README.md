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
| 3 | Sync exercises and visits into a dedicated "Between" calendar | Planned |
| 4 | Epic on FHIR sandbox login and appointment import | Planned |
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

**Known limit in Expo Go:** the actions run without opening the app. That works
while the app is in the background, but if you have swiped it away completely,
iOS and Android do not run the app's code and the tap is not recorded. A later
phase with an EAS development build adds a background handler to fix this. To
make the actions always work now, at the cost of opening the app for a moment,
set `ACTIONS_OPEN_APP = true` in `src/notifications/native.ts`.

## Tests and type-check

```powershell
npm test
```

```powershell
npm run typecheck
```

The tests cover the pure logic: expanding a care plan into a daily agenda, the
completion log, snoozes, reminder scheduling and action handling, and the
adherence / "needs a check-in" rules.

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

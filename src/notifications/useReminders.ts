import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { CarePlan } from '../model/types';
import { useBetweenStore } from '../store/useBetweenStore';
import {
  configureNotifications,
  getReminderPermission,
  notificationsSupported,
  requestReminderPermission,
  syncReminders,
  type ReminderPermission,
} from './native';
import { planReminders } from './reminderPlan';
import { applyNotificationResponse } from './responses';

/**
 * Keeps the phone's pending reminders in step with the plan and completion
 * log, and applies "Mark done" / "In 1 hour" taps from notifications.
 */
export function useReminders(plan: CarePlan) {
  const log = useBetweenStore((s) => s.log);
  const snoozes = useBetweenStore((s) => s.snoozes);
  const hydrated = useBetweenStore((s) => s.hydrated);
  const [permission, setPermission] = useState<ReminderPermission>(
    notificationsSupported ? 'undetermined' : 'unsupported',
  );
  const [foregroundTick, setForegroundTick] = useState(0);

  // Configure once, and re-check permission whenever the app comes back to the
  // front (the patient may have changed it in Settings).
  useEffect(() => {
    if (!notificationsSupported) return;
    const refresh = () => {
      configureNotifications()
        .then(getReminderPermission)
        .then(setPermission)
        .catch(() => undefined);
      setForegroundTick((n) => n + 1);
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);

  // Apply actions: one that launched the app, and any that arrive while it runs.
  useEffect(() => {
    if (!notificationsSupported || !hydrated) return;
    const last = Notifications.getLastNotificationResponse();
    if (last) void applyNotificationResponse(last);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      void applyNotificationResponse(r);
    });
    return () => sub.remove();
  }, [hydrated]);

  // Re-sync whenever anything that affects reminders changes.
  useEffect(() => {
    if (!hydrated || permission !== 'granted') return;
    const desired = planReminders({ plan, log, snoozes, now: new Date() });
    syncReminders(desired).catch((e: unknown) => {
      console.warn('Could not schedule reminders', e instanceof Error ? e.message : e);
    });
  }, [plan, log, snoozes, hydrated, permission, foregroundTick]);

  const request = useCallback(async () => {
    setPermission(await requestReminderPermission());
  }, []);

  return { permission, requestPermission: request };
}

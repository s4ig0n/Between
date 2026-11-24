import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ACTION_MARK_DONE,
  ACTION_SNOOZE,
  diffReminders,
  REMINDER_CATEGORY,
  type DesiredReminder,
} from './reminderPlan';

/** Local notifications are not available in the web preview. */
export const notificationsSupported = Platform.OS !== 'web';

export const CHANNEL_ID = 'reminders';

/**
 * Whether tapping "Mark done" / "In 1 hour" brings the app to the front.
 *
 * false: the patient never leaves the lock screen. The action is applied while
 * the app is in the background, but if the app was fully closed (swiped away)
 * the OS does not run it and the tap is lost.
 * true: always applied, but the app opens briefly.
 *
 * A dev build with a background notification task can make `false` reliable.
 */
export const ACTIONS_OPEN_APP = false;

let configured: Promise<void> | undefined;

/** Set up the foreground handler, Android channel and the reminder category. Safe to call repeatedly. */
export function configureNotifications(): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  configured ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Exercise reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
      { identifier: ACTION_MARK_DONE, buttonTitle: 'Mark done', options: { opensAppToForeground: ACTIONS_OPEN_APP } },
      { identifier: ACTION_SNOOZE, buttonTitle: 'In 1 hour', options: { opensAppToForeground: ACTIONS_OPEN_APP } },
    ]);
  })();
  return configured;
}

export type ReminderPermission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

function toPermission(p: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  if (p.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!notificationsSupported) return 'unsupported';
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!notificationsSupported) return 'unsupported';
  await configureNotifications();
  return toPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Make the OS's pending reminders match `desired`. Calls are queued so two
 * syncs never interleave and schedule the same reminder twice.
 */
export function syncReminders(desired: DesiredReminder[]): Promise<void> {
  const run = queue.then(() => doSync(desired));
  queue = run.catch(() => undefined);
  return run;
}

async function doSync(desired: DesiredReminder[]) {
  if (!notificationsSupported) return;
  if ((await getReminderPermission()) !== 'granted') return;
  await configureNotifications();

  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const { toCancel, toSchedule } = diffReminders(
    pending.map((n) => n.identifier),
    desired,
  );

  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  for (const r of toSchedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.identifier,
      content: {
        title: r.title,
        body: r.body,
        data: r.data,
        categoryIdentifier: REMINDER_CATEGORY,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }
}

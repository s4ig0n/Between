import * as Notifications from 'expo-notifications';

import { useBetweenStore } from '../store/useBetweenStore';
import { commandForResponse } from './reminderPlan';

/** Responses already applied in this app session, so a replayed one is not applied twice. */
const handled = new Set<string>();

/**
 * Apply a notification action to the same completion log the Today screen
 * uses. The store must be hydrated first, or the change would be overwritten
 * when saved state loads.
 */
export async function applyNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
  const request = response.notification.request;
  const key = `${request.identifier}|${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);

  const command = commandForResponse(response.actionIdentifier, request.content.data);
  const store = useBetweenStore.getState();

  switch (command.type) {
    case 'done':
      store.markDone(
        { id: command.occurrenceId, exerciseId: command.exerciseId, start: command.start },
        'notification',
      );
      break;
    case 'snooze':
      store.snooze(command.occurrenceId, 60);
      break;
    default:
      return;
  }

  // Android leaves the notification in the shade after an action button tap.
  await Notifications.dismissNotificationAsync(request.identifier).catch(() => undefined);
  Notifications.clearLastNotificationResponse();
}

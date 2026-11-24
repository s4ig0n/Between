// Expo Go only ships the legacy calendar API; the newer object API throws there.
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import type { CarePlan } from '../model/types';
import {
  CALENDAR_COLOR,
  CALENDAR_TITLE,
  desiredEvents,
  diffEvents,
  syncWindow,
  type DesiredEvent,
} from './calendarPlan';

export const calendarSupported = Platform.OS !== 'web';

export type CalendarPermission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

function toPermission(p: Calendar.PermissionResponse): CalendarPermission {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getCalendarPermission(): Promise<CalendarPermission> {
  if (!calendarSupported) return 'unsupported';
  return toPermission(await Calendar.getCalendarPermissionsAsync());
}

export async function requestCalendarPermission(): Promise<CalendarPermission> {
  if (!calendarSupported) return 'unsupported';
  return toPermission(await Calendar.requestCalendarPermissionsAsync());
}

/** Find the app's own calendar, by stored id first, then by title. */
async function findBetweenCalendar(knownId?: string): Promise<Calendar.Calendar | undefined> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return (
    calendars.find((c) => c.id === knownId) ??
    calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications)
  );
}

async function createBetweenCalendar(): Promise<string> {
  if (Platform.OS === 'ios') {
    // Use the source of the default calendar (often iCloud) so the calendar is
    // visible in the Calendar app. "On My iPhone" is hidden when iCloud
    // calendars are on.
    const source = (await Calendar.getDefaultCalendarAsync()).source;
    return Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      color: CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
      source,
    });
  }
  // Android: a local calendar that never syncs to a Google account.
  return Calendar.createCalendarAsync({
    title: CALENDAR_TITLE,
    name: 'between',
    color: CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: CALENDAR_TITLE, type: 'LOCAL' },
    ownerAccount: 'between',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function eventDetails(e: DesiredEvent) {
  return {
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    notes: e.notes,
    location: e.location ?? '',
    timeZone: deviceTimeZone(),
    // Reminders come from Between's own notifications, so the calendar copy
    // stays silent to avoid a double alert.
    alarms: [],
  };
}

export interface CalendarSyncResult {
  calendarId: string;
  created: number;
  updated: number;
  deleted: number;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Write the plan into the "Between" calendar, creating it if needed. Safe to
 * run repeatedly: events already there are matched and left alone. Calls are
 * queued so two syncs never run at once.
 */
export function syncCalendar(plan: CarePlan, knownCalendarId?: string, now = new Date()): Promise<CalendarSyncResult> {
  const run = queue.then(() => doSync(plan, knownCalendarId, now));
  queue = run.catch(() => undefined);
  return run;
}

async function doSync(plan: CarePlan, knownCalendarId: string | undefined, now: Date): Promise<CalendarSyncResult> {
  if ((await getCalendarPermission()) !== 'granted') throw new Error('Calendar permission not granted');

  const calendarId = (await findBetweenCalendar(knownCalendarId))?.id ?? (await createBetweenCalendar());
  const window = syncWindow(now);
  const existing = await Calendar.getEventsAsync([calendarId], window.from, window.to);
  const { toCreate, toUpdate, toDelete } = diffEvents(
    existing.filter((e) => e.calendarId === calendarId),
    desiredEvents(plan, now),
    window,
  );

  for (const id of toDelete) await Calendar.deleteEventAsync(id);
  for (const { id, event } of toUpdate) await Calendar.updateEventAsync(id, eventDetails(event));
  for (const event of toCreate) await Calendar.createEventAsync(calendarId, eventDetails(event));

  return { calendarId, created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length };
}

/** Delete the Between calendar and everything in it. Other calendars are untouched. */
export async function removeBetweenCalendar(knownCalendarId?: string): Promise<void> {
  if (!calendarSupported || (await getCalendarPermission()) !== 'granted') return;
  const cal = await findBetweenCalendar(knownCalendarId);
  if (cal) await Calendar.deleteCalendarAsync(cal.id);
}

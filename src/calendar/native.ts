// Expo Go only ships the legacy calendar API; the newer object API throws there.
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import type { CarePlan } from '../model/types';
import {
  CALENDAR_COLOR,
  CALENDAR_TITLE,
  desiredEvents,
  diffEvents,
  isOurEvent,
  syncWindow,
  type DesiredEvent,
} from './calendarPlan';
import { addDays } from '../logic/dates';

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

/**
 * Take the plan out of the phone's calendar. If the Between calendar holds
 * only this app's events it is deleted outright; if the patient added events
 * of their own to it, only the app's events are removed.
 */
export async function removeBetweenCalendar(calendarId: string | undefined): Promise<void> {
  if (!calendarId || !calendarSupported || (await getCalendarPermission()) !== 'granted') return;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (!calendars.some((c) => c.id === calendarId)) return;

  const now = new Date();
  const events = (
    await Calendar.getEventsAsync([calendarId], addDays(now, -366), addDays(now, 366))
  ).filter((e) => e.calendarId === calendarId);
  const foreign = events.filter((e) => !isOurEvent(e));

  if (foreign.length === 0) {
    await Calendar.deleteCalendarAsync(calendarId);
    return;
  }
  for (const e of events) {
    if (isOurEvent(e)) await Calendar.deleteEventAsync(e.id);
  }
}

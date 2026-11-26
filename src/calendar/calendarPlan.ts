import type { CarePlan } from '../model/types';
import { addDays, addMinutes, startOfDay } from '../logic/dates';
import { appointmentsBetween, exerciseOccurrencesBetween } from '../logic/schedule';

export const CALENDAR_TITLE = 'Between';
export const CALENDAR_COLOR = '#1F3B95';
export const EVENT_FOOTER = 'Added by the Between app.';
export const DEMO_NOTE = 'Epic sandbox test visit. Date moved for a demo; not a real appointment.';

/** How far ahead to keep the calendar filled. Re-synced each time the app opens. */
export const CALENDAR_HORIZON_DAYS = 14;

export interface DesiredEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  notes: string;
  location?: string;
}

/** Shape of an event read back from the phone's calendar. */
export interface ExistingEvent {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  notes?: string | null;
  location?: string | null;
}

export function syncWindow(now: Date, days = CALENDAR_HORIZON_DAYS) {
  const from = startOfDay(now);
  return { from, to: addDays(from, days) };
}

/** Exercise sessions and visits that should be in the Between calendar. */
export function desiredEvents(plan: CarePlan, now: Date, days = CALENDAR_HORIZON_DAYS): DesiredEvent[] {
  const { from, to } = syncWindow(now, days);

  const exercises: DesiredEvent[] = exerciseOccurrencesBetween(plan, from, to).map((o) => ({
    title: o.title,
    startDate: o.start,
    endDate: addMinutes(o.start, o.durationMinutes),
    notes: `${o.detail}\n\n${EVENT_FOOTER}`,
  }));

  const visits: DesiredEvent[] = appointmentsBetween(plan, from, to).map((a) => ({
    title: a.title,
    startDate: a.start,
    endDate: addMinutes(a.start, a.durationMinutes),
    notes: [
      a.appointment.practitioner && `With ${a.appointment.practitioner}`,
      a.appointment.demo && DEMO_NOTE,
      EVENT_FOOTER,
    ]
      .filter(Boolean)
      .join('\n\n'),
    location: a.appointment.location,
  }));

  return [...exercises, ...visits].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Events are matched on title + start time. The calendar belongs to this app
 * alone, so that is enough to recognise our own events, and it needs no
 * stored id map: re-syncing after a reinstall still finds them.
 */
export function eventKey(e: { title: string; startDate: string | Date }): string {
  return `${e.title}|${new Date(e.startDate).getTime()}`;
}

const same = (a?: string | null, b?: string | null) => (a ?? '') === (b ?? '');

/** Events this app wrote carry the footer line in their notes. */
export function isOurEvent(e: Pick<ExistingEvent, 'notes'>): boolean {
  return (e.notes ?? '').includes(EVENT_FOOTER);
}

/**
 * What to change in the Between calendar so it matches `desired`. Only events
 * this app wrote that start inside the sync window are considered: anything
 * the patient added by hand, and past days, are never touched.
 */
export function diffEvents(existing: ExistingEvent[], desired: DesiredEvent[], window: { from: Date; to: Date }) {
  const inWindow = existing.filter((e) => {
    const t = new Date(e.startDate).getTime();
    return isOurEvent(e) && t >= window.from.getTime() && t < window.to.getTime();
  });

  const byKey = new Map<string, ExistingEvent>();
  const toDelete: string[] = [];
  for (const e of inWindow) {
    const k = eventKey(e);
    if (byKey.has(k)) toDelete.push(e.id); // duplicate
    else byKey.set(k, e);
  }

  const toCreate: DesiredEvent[] = [];
  const toUpdate: { id: string; event: DesiredEvent }[] = [];
  const matched = new Set<string>();

  for (const d of desired) {
    const e = byKey.get(eventKey(d));
    if (!e || matched.has(e.id)) {
      toCreate.push(d);
      continue;
    }
    matched.add(e.id);
    const changed =
      new Date(e.endDate).getTime() !== d.endDate.getTime() || !same(e.notes, d.notes) || !same(e.location, d.location);
    if (changed) toUpdate.push({ id: e.id, event: d });
  }

  for (const e of byKey.values()) {
    if (!matched.has(e.id)) toDelete.push(e.id);
  }

  return { toCreate, toUpdate, toDelete };
}

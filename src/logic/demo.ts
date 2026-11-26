import type { Appointment } from '../model/types';
import { addDays, startOfDay } from './dates';

/** Days between demo visits after the first one. */
export const DEMO_SPACING_DAYS = 2;

const SKIP = new Set(['cancelled', 'noshow']);

/**
 * SANDBOX DEMO ONLY. Epic's test patients mostly have past appointments, so
 * the Today screen would show no visits. This moves each imported visit
 * forward into the coming days, keeping its order and its time of day:
 * the first lands today if its time hasn't passed yet (otherwise tomorrow),
 * then one every DEMO_SPACING_DAYS days. Each moved visit keeps the real date
 * in `demo.originalStart` so the UI can label it.
 *
 * Visits already in the future, and cancelled ones, are left as they are.
 */
export function shiftForDemo(appointments: Appointment[], now: Date): Appointment[] {
  const past = appointments
    .filter((a) => !SKIP.has(a.status) && Date.parse(a.start) < now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  const moved = new Map<string, Appointment>();
  let day = startOfDay(now);
  past.forEach((a, i) => {
    const original = new Date(a.start);
    let target = new Date(day.getFullYear(), day.getMonth(), day.getDate(), original.getHours(), original.getMinutes());
    if (i === 0 && target <= now) {
      day = addDays(day, 1);
      target = addDays(target, 1);
    }
    moved.set(a.id, {
      ...a,
      start: target.toISOString(),
      status: 'booked',
      demo: { originalStart: a.start },
    });
    day = addDays(day, DEMO_SPACING_DAYS);
  });

  return appointments
    .map((a) => moved.get(a.id) ?? a)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

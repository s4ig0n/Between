import type {
  AgendaItem,
  Appointment,
  AppointmentItem,
  CarePlan,
  CompletionLog,
  DateKey,
  Exercise,
  ExerciseOccurrence,
  TimeOfDay,
} from '../model/types';
import { addDays, atTime, formatDuration, startOfDay, toDateKey } from './dates';

/** Stable id for one exercise session on one day, e.g. "knee@2026-10-06T08:00". */
export function occurrenceId(exerciseId: string, date: DateKey, time: TimeOfDay): string {
  return `${exerciseId}@${date}T${time}`;
}

export function isPlanActiveOn(plan: CarePlan, day: Date): boolean {
  const key = toDateKey(day);
  if (key < plan.startDate) return false;
  if (plan.endDate && key > plan.endDate) return false;
  return true;
}

function exerciseRunsOn(ex: Exercise, day: Date): boolean {
  const days = ex.schedule.daysOfWeek;
  return !days || days.length === 0 || days.includes(day.getDay() as never);
}

export function exerciseDetail(ex: Exercise): string {
  const steps = ex.steps.join(', ');
  const about = `About ${formatDuration(ex.durationMinutes)}.`;
  return steps ? `${steps}. ${about}` : about;
}

export function exerciseOccurrencesOn(plan: CarePlan, day: Date): ExerciseOccurrence[] {
  if (!isPlanActiveOn(plan, day)) return [];
  const key = toDateKey(day);
  const out: ExerciseOccurrence[] = [];
  for (const ex of plan.exercises) {
    if (!exerciseRunsOn(ex, day)) continue;
    for (const time of ex.schedule.times) {
      out.push({
        kind: 'exercise',
        id: occurrenceId(ex.id, key, time),
        exerciseId: ex.id,
        title: ex.name,
        detail: exerciseDetail(ex),
        start: atTime(day, time),
        durationMinutes: ex.durationMinutes,
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Every exercise occurrence whose start falls in [from, to). */
export function exerciseOccurrencesBetween(plan: CarePlan, from: Date, to: Date): ExerciseOccurrence[] {
  const out: ExerciseOccurrence[] = [];
  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
    for (const occ of exerciseOccurrencesOn(plan, day)) {
      if (occ.start >= from && occ.start < to) out.push(occ);
    }
  }
  return out;
}

const HIDDEN_STATUSES = new Set(['cancelled', 'noshow']);

function toAppointmentItem(a: Appointment): AppointmentItem {
  return {
    kind: 'appointment',
    id: a.id,
    title: a.title,
    detail: formatDuration(a.durationMinutes),
    start: new Date(a.start),
    durationMinutes: a.durationMinutes,
    appointment: a,
  };
}

/** Visible appointments whose start falls in [from, to), soonest first. */
export function appointmentsBetween(plan: CarePlan, from: Date, to: Date): AppointmentItem[] {
  return plan.appointments
    .filter((a) => !HIDDEN_STATUSES.has(a.status))
    .map(toAppointmentItem)
    .filter((a) => a.start >= from && a.start < to)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function isOccurrenceDone(log: CompletionLog, id: string): boolean {
  return Boolean(log.entries[id]);
}

/** Everything on the given day, in time order, with completion state. */
export function agendaFor(plan: CarePlan, day: Date, log: CompletionLog): AgendaItem[] {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  const items: AgendaItem[] = [
    ...exerciseOccurrencesOn(plan, day).map((o) => ({ ...o, done: isOccurrenceDone(log, o.id) })),
    ...appointmentsBetween(plan, from, to).map((a) => ({ ...a, done: false })),
  ];
  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Appointments after today, within the next `days` days. */
export function upcomingAppointments(plan: CarePlan, today: Date, days = 7): AppointmentItem[] {
  const from = addDays(startOfDay(today), 1);
  return appointmentsBetween(plan, from, addDays(from, days));
}

/**
 * The exercise session to nudge the patient about now: the earliest one today
 * that is not done, not snoozed past `now`, and due within `leadMinutes`.
 * Overdue sessions from earlier today still count.
 */
export function nextUp(
  agenda: AgendaItem[],
  now: Date,
  snoozedUntil: Record<string, string> = {},
  leadMinutes = 60,
): (ExerciseOccurrence & { done: boolean }) | undefined {
  const horizon = now.getTime() + leadMinutes * 60_000;
  for (const item of agenda) {
    if (item.kind !== 'exercise' || item.done) continue;
    const snooze = snoozedUntil[item.id];
    if (snooze && new Date(snooze) > now) continue;
    if (item.start.getTime() <= horizon) return item;
  }
  return undefined;
}

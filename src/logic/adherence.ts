import type { CarePlan, CompletionLog } from '../model/types';
import { addDays, fromDateKey, startOfDay, toDateKey } from './dates';
import { exerciseOccurrencesOn } from './schedule';

export interface DayAdherence {
  date: string;
  scheduled: number;
  done: number;
}

/** Scheduled vs. completed exercise sessions on one day. */
export function dayAdherence(plan: CarePlan, log: CompletionLog, day: Date): DayAdherence {
  const occ = exerciseOccurrencesOn(plan, day);
  return {
    date: toDateKey(day),
    scheduled: occ.length,
    done: occ.filter((o) => log.entries[o.id]).length,
  };
}

/**
 * Whole days since the patient last logged any exercise, counted from the
 * start of today. Logging today gives 0, yesterday 1. With no log at all it
 * counts from the plan start.
 */
export function daysSinceLastLog(plan: CarePlan, log: CompletionLog, today: Date): number {
  const todayStart = startOfDay(today).getTime();
  let latest: number | undefined;
  for (const e of Object.values(log.entries)) {
    const t = startOfDay(new Date(e.completedAt)).getTime();
    if (t <= todayStart && (latest === undefined || t > latest)) latest = t;
  }
  const from = latest ?? fromDateKey(plan.startDate).getTime();
  return Math.max(0, Math.round((todayStart - from) / 86_400_000));
}

/**
 * Of the last `window` full days before today on which the plan had exercises,
 * how many had none done at all. Today is excluded because it is not over yet.
 */
export function missedDays(plan: CarePlan, log: CompletionLog, today: Date, window = 4) {
  let considered = 0;
  let missed = 0;
  for (let i = 1; i <= window; i++) {
    const day = addDays(startOfDay(today), -i);
    const a = dayAdherence(plan, log, day);
    if (a.scheduled === 0) continue;
    considered++;
    if (a.done === 0) missed++;
  }
  return { missed, considered };
}

export interface CheckInRules {
  /** Flag when nothing has been logged for at least this many days. */
  noLogDays: number;
  /** Look-back window for missed days. */
  missedWindow: number;
  /** Flag when at least this many days in the window were missed. */
  missedThreshold: number;
}

export const DEFAULT_CHECK_IN_RULES: CheckInRules = {
  noLogDays: 3,
  missedWindow: 4,
  missedThreshold: 2,
};

export type CheckInReason =
  | { kind: 'no-log'; days: number; message: string }
  | { kind: 'missed'; missed: number; window: number; message: string };

/**
 * Whether the clinic should reach out, and why. The no-log rule wins because
 * it is the stronger signal. Returns undefined when no rule fires.
 */
export function needsCheckIn(
  plan: CarePlan,
  log: CompletionLog,
  today: Date,
  rules: CheckInRules = DEFAULT_CHECK_IN_RULES,
): CheckInReason | undefined {
  const since = daysSinceLastLog(plan, log, today);
  if (since >= rules.noLogDays) {
    return { kind: 'no-log', days: since, message: `No exercises logged in ${since} days` };
  }
  const { missed } = missedDays(plan, log, today, rules.missedWindow);
  if (missed >= rules.missedThreshold) {
    return {
      kind: 'missed',
      missed,
      window: rules.missedWindow,
      message: `Missed ${missed} of the last ${rules.missedWindow} days`,
    };
  }
  return undefined;
}

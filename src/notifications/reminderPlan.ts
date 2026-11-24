import type { CarePlan, CompletionLog } from '../model/types';
import type { Snoozes } from '../logic/completion';
import { addDays, startOfDay } from '../logic/dates';
import { exerciseOccurrencesBetween } from '../logic/schedule';

/** Every reminder this app schedules has an identifier starting with this. */
export const REMINDER_PREFIX = 'between:';

export const REMINDER_CATEGORY = 'exercise-reminder';
export const ACTION_MARK_DONE = 'mark-done';
export const ACTION_SNOOZE = 'snooze-1h';

/** Data attached to each reminder so an action can be applied without the plan. */
export interface ReminderData {
  occurrenceId: string;
  exerciseId: string;
  /** ISO start time of the session. */
  scheduledFor: string;
  [key: string]: unknown;
}

export interface DesiredReminder {
  identifier: string;
  fireAt: Date;
  title: string;
  body: string;
  data: ReminderData;
}

export interface PlanRemindersInput {
  plan: CarePlan;
  log: CompletionLog;
  snoozes: Snoozes;
  now: Date;
  /** How many days ahead to keep scheduled. Re-synced on every app open. */
  horizonDays?: number;
  /** iOS keeps at most 64 pending local notifications per app. */
  max?: number;
}

/**
 * The identifier encodes the fire time, so moving a reminder (a snooze)
 * produces a new identifier and the diff cancels the old one.
 */
export function reminderIdentifier(occurrenceId: string, fireAt: Date): string {
  return `${REMINDER_PREFIX}${occurrenceId}:${fireAt.getTime()}`;
}

export function reminderTitle(exerciseName: string): string {
  return `Time for your ${exerciseName.toLowerCase()}`;
}

/**
 * Which reminders should be pending right now. A session gets one reminder at
 * its start time, or at its snooze time if snoozed. Sessions already done, or
 * whose reminder time has passed, get none.
 */
export function planReminders({
  plan,
  log,
  snoozes,
  now,
  horizonDays = 3,
  max = 48,
}: PlanRemindersInput): DesiredReminder[] {
  const from = startOfDay(now);
  const to = addDays(from, horizonDays);
  const out: DesiredReminder[] = [];

  for (const occ of exerciseOccurrencesBetween(plan, from, to)) {
    if (log.entries[occ.id]) continue;
    const snooze = snoozes[occ.id];
    const fireAt = snooze ? new Date(snooze) : occ.start;
    if (fireAt <= now) continue;
    out.push({
      identifier: reminderIdentifier(occ.id, fireAt),
      fireAt,
      title: reminderTitle(occ.title),
      body: occ.detail,
      data: { occurrenceId: occ.id, exerciseId: occ.exerciseId, scheduledFor: occ.start.toISOString() },
    });
  }

  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, max);
}

/**
 * What to change so the pending set matches `desired`. Notifications that do
 * not belong to this app (no prefix) are never touched.
 */
export function diffReminders(existingIds: string[], desired: DesiredReminder[]) {
  const ours = existingIds.filter((id) => id.startsWith(REMINDER_PREFIX));
  const want = new Set(desired.map((d) => d.identifier));
  const have = new Set(ours);
  return {
    toCancel: ours.filter((id) => !want.has(id)),
    toSchedule: desired.filter((d) => !have.has(d.identifier)),
  };
}

export type ReminderCommand =
  | { type: 'done'; occurrenceId: string; exerciseId: string; start: Date }
  | { type: 'snooze'; occurrenceId: string }
  | { type: 'open' }
  | { type: 'ignore' };

function isReminderData(data: unknown): data is ReminderData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.occurrenceId === 'string' &&
    typeof d.exerciseId === 'string' &&
    typeof d.scheduledFor === 'string' &&
    !Number.isNaN(Date.parse(d.scheduledFor))
  );
}

/** Turn a notification response into what the app should do. */
export function commandForResponse(actionIdentifier: string, data: unknown): ReminderCommand {
  if (!isReminderData(data)) return { type: 'ignore' };
  switch (actionIdentifier) {
    case ACTION_MARK_DONE:
      return {
        type: 'done',
        occurrenceId: data.occurrenceId,
        exerciseId: data.exerciseId,
        start: new Date(data.scheduledFor),
      };
    case ACTION_SNOOZE:
      return { type: 'snooze', occurrenceId: data.occurrenceId };
    default:
      return { type: 'open' };
  }
}

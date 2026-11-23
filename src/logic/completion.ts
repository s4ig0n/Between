import type { CompletionLog, CompletionSource, ExerciseOccurrence } from '../model/types';
import { addMinutes } from './dates';

export const emptyLog = (): CompletionLog => ({ entries: {} });

type OccurrenceRef = Pick<ExerciseOccurrence, 'id' | 'exerciseId' | 'start'>;

/**
 * Record an occurrence as done. Idempotent: if it is already logged, the
 * original entry is kept so a late duplicate (e.g. the app and a notification
 * action both firing) does not move the completion time.
 */
export function markDone(
  log: CompletionLog,
  occ: OccurrenceRef,
  completedAt: Date,
  source: CompletionSource,
): CompletionLog {
  if (log.entries[occ.id]) return log;
  return {
    entries: {
      ...log.entries,
      [occ.id]: {
        occurrenceId: occ.id,
        exerciseId: occ.exerciseId,
        scheduledFor: occ.start.toISOString(),
        completedAt: completedAt.toISOString(),
        source,
      },
    },
  };
}

export function unmarkDone(log: CompletionLog, occurrenceId: string): CompletionLog {
  if (!log.entries[occurrenceId]) return log;
  const { [occurrenceId]: _removed, ...rest } = log.entries;
  return { entries: rest };
}

export function toggleDone(
  log: CompletionLog,
  occ: OccurrenceRef,
  at: Date,
  source: CompletionSource,
): CompletionLog {
  return log.entries[occ.id] ? unmarkDone(log, occ.id) : markDone(log, occ, at, source);
}

/** Snoozes map occurrence id to the ISO time the nudge should come back. */
export type Snoozes = Record<string, string>;

export function snooze(snoozes: Snoozes, occurrenceId: string, now: Date, minutes = 60): Snoozes {
  return { ...snoozes, [occurrenceId]: addMinutes(now, minutes).toISOString() };
}

/** Drop snoozes that have already expired. */
export function pruneSnoozes(snoozes: Snoozes, now: Date): Snoozes {
  const out: Snoozes = {};
  for (const [id, until] of Object.entries(snoozes)) {
    if (new Date(until) > now) out[id] = until;
  }
  return out;
}

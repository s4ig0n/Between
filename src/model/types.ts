/** Local calendar date, "YYYY-MM-DD". */
export type DateKey = string;

/** Local wall-clock time, "HH:mm" (24h). */
export type TimeOfDay = string;

/** 0 = Sunday ... 6 = Saturday, matching Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ExerciseSchedule {
  /** Times of day the session should happen. */
  times: TimeOfDay[];
  /** Days of the week it applies to. Empty or missing means every day. */
  daysOfWeek?: Weekday[];
}

/** One home-exercise session the patient repeats, e.g. "Knee exercises". */
export interface Exercise {
  id: string;
  name: string;
  /** Individual movements in the session, e.g. "Heel slides". */
  steps: string[];
  durationMinutes: number;
  schedule: ExerciseSchedule;
}

export type AppointmentStatus =
  | 'proposed'
  | 'pending'
  | 'booked'
  | 'arrived'
  | 'fulfilled'
  | 'cancelled'
  | 'noshow'
  | 'unknown';

export type AppointmentSource = 'mock' | 'epic';

export interface Appointment {
  id: string;
  title: string;
  /** ISO 8601 date-time of the start. */
  start: string;
  durationMinutes: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  location?: string;
  practitioner?: string;
  /**
   * Set when a sandbox test visit was moved forward for a demo. `start` is
   * then the demo date, and this keeps the date Epic actually returned.
   */
  demo?: { originalStart: string };
}

export interface CarePlan {
  id: string;
  patientName: string;
  condition: string;
  /** First day the plan applies, inclusive. */
  startDate: DateKey;
  /** Last day the plan applies, inclusive. Missing means open-ended. */
  endDate?: DateKey;
  exercises: Exercise[];
  appointments: Appointment[];
}

export type CompletionSource = 'app' | 'notification';

export interface CompletionEntry {
  /** See occurrenceId() in logic/schedule. */
  occurrenceId: string;
  exerciseId: string;
  /** ISO date-time the session was scheduled for. */
  scheduledFor: string;
  /** ISO date-time the patient marked it done. */
  completedAt: string;
  source: CompletionSource;
}

/** Completed exercise occurrences, keyed by occurrence id. */
export interface CompletionLog {
  entries: Record<string, CompletionEntry>;
}

/** A single scheduled exercise session on a specific day. */
export interface ExerciseOccurrence {
  kind: 'exercise';
  id: string;
  exerciseId: string;
  title: string;
  detail: string;
  start: Date;
  durationMinutes: number;
}

export interface AppointmentItem {
  kind: 'appointment';
  id: string;
  title: string;
  detail: string;
  start: Date;
  durationMinutes: number;
  appointment: Appointment;
}

export type AgendaItem = (ExerciseOccurrence | AppointmentItem) & { done: boolean };

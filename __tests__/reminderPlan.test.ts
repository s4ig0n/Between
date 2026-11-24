import type { CarePlan, CompletionLog } from '../src/model/types';
import { markDone, snooze } from '../src/logic/completion';
import { exerciseOccurrencesOn } from '../src/logic/schedule';
import {
  ACTION_MARK_DONE,
  ACTION_SNOOZE,
  commandForResponse,
  diffReminders,
  planReminders,
  REMINDER_PREFIX,
  reminderIdentifier,
} from '../src/notifications/reminderPlan';

const plan: CarePlan = {
  id: 'p',
  patientName: 'Test',
  condition: 'Knee',
  startDate: '2026-10-01',
  exercises: [
    {
      id: 'knee',
      name: 'Knee exercises',
      steps: ['Heel slides', 'quad sets', 'straight-leg raises'],
      durationMinutes: 10,
      schedule: { times: ['08:00', '18:30'] },
    },
  ],
  appointments: [],
};

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);
const empty: CompletionLog = { entries: {} };
const [morning, evening] = exerciseOccurrencesOn(plan, at(6, 0));

describe('planReminders', () => {
  it('schedules future sessions over the horizon with mockup wording', () => {
    const r = planReminders({ plan, log: empty, snoozes: {}, now: at(6, 7), horizonDays: 2 });
    expect(r.map((x) => x.fireAt)).toEqual([at(6, 8), at(6, 18, 30), at(7, 8), at(7, 18, 30)]);
    expect(r[0].title).toBe('Time for your knee exercises');
    expect(r[0].body).toBe('Heel slides, quad sets, straight-leg raises. About 10 minutes.');
    expect(r[0].data).toEqual({
      occurrenceId: 'knee@2026-10-06T08:00',
      exerciseId: 'knee',
      scheduledFor: at(6, 8).toISOString(),
    });
  });

  it('skips sessions already done and reminders already in the past', () => {
    const log = markDone(empty, evening, at(6, 17), 'app');
    const r = planReminders({ plan, log, snoozes: {}, now: at(6, 9), horizonDays: 1 });
    expect(r).toEqual([]);
  });

  it('moves a snoozed reminder to the snooze time with a new identifier', () => {
    const s = snooze({}, morning.id, at(6, 8, 5));
    const r = planReminders({ plan, log: empty, snoozes: s, now: at(6, 8, 5), horizonDays: 1 });
    expect(r[0].fireAt).toEqual(at(6, 9, 5));
    expect(r[0].identifier).toBe(reminderIdentifier(morning.id, at(6, 9, 5)));
    expect(r[0].identifier.startsWith(REMINDER_PREFIX)).toBe(true);
    expect(r[0].data.scheduledFor).toBe(at(6, 8).toISOString());
  });

  it('caps the number of pending reminders', () => {
    expect(planReminders({ plan, log: empty, snoozes: {}, now: at(6, 0), horizonDays: 30, max: 5 })).toHaveLength(5);
  });
});

describe('diffReminders', () => {
  const desired = planReminders({ plan, log: empty, snoozes: {}, now: at(6, 7), horizonDays: 1 });

  it('schedules everything when nothing is pending', () => {
    expect(diffReminders([], desired).toSchedule).toHaveLength(2);
  });

  it('is a no-op when already in sync, so re-syncing never duplicates', () => {
    expect(diffReminders(desired.map((d) => d.identifier), desired)).toEqual({ toCancel: [], toSchedule: [] });
  });

  it('cancels stale reminders and leaves foreign notifications alone', () => {
    const stale = reminderIdentifier(morning.id, at(5, 8));
    const d = diffReminders([stale, 'someone-else', desired[0].identifier], desired);
    expect(d.toCancel).toEqual([stale]);
    expect(d.toSchedule.map((x) => x.identifier)).toEqual([desired[1].identifier]);
  });
});

describe('commandForResponse', () => {
  const data = { occurrenceId: morning.id, exerciseId: 'knee', scheduledFor: at(6, 8).toISOString() };

  it('maps Mark done to a completion for the right session', () => {
    expect(commandForResponse(ACTION_MARK_DONE, data)).toEqual({
      type: 'done',
      occurrenceId: morning.id,
      exerciseId: 'knee',
      start: at(6, 8),
    });
  });

  it('maps In 1 hour to a snooze', () => {
    expect(commandForResponse(ACTION_SNOOZE, data)).toEqual({ type: 'snooze', occurrenceId: morning.id });
  });

  it('opens the app for a plain tap and ignores unknown payloads', () => {
    expect(commandForResponse('expo.modules.notifications.actions.DEFAULT', data)).toEqual({ type: 'open' });
    expect(commandForResponse(ACTION_MARK_DONE, { occurrenceId: 1 })).toEqual({ type: 'ignore' });
    expect(commandForResponse(ACTION_MARK_DONE, null)).toEqual({ type: 'ignore' });
  });
});

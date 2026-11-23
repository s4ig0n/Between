import type { CarePlan, CompletionLog } from '../src/model/types';
import { dayAdherence, daysSinceLastLog, missedDays, needsCheckIn } from '../src/logic/adherence';
import { markDone } from '../src/logic/completion';
import { exerciseOccurrencesOn } from '../src/logic/schedule';

const plan: CarePlan = {
  id: 'p',
  patientName: 'Test',
  condition: 'Knee',
  startDate: '2026-10-01',
  exercises: [
    { id: 'knee', name: 'Knee', steps: [], durationMinutes: 10, schedule: { times: ['08:00', '18:30'] } },
  ],
  appointments: [],
};

const day = (d: number, h = 0) => new Date(2026, 9, d, h);
const TODAY = day(10, 12); // Oct 10, midday

/** Log the given session indexes (0 = morning, 1 = evening) on each day of the month. */
function logFor(days: Record<number, number[]>): CompletionLog {
  let log: CompletionLog = { entries: {} };
  for (const [d, idxs] of Object.entries(days)) {
    const occ = exerciseOccurrencesOn(plan, day(Number(d)));
    for (const i of idxs) log = markDone(log, occ[i], occ[i].start, 'app');
  }
  return log;
}

describe('dayAdherence', () => {
  it('counts scheduled and done sessions', () => {
    expect(dayAdherence(plan, logFor({ 9: [1] }), day(9))).toEqual({ date: '2026-10-09', scheduled: 2, done: 1 });
  });
});

describe('daysSinceLastLog', () => {
  it('is 0 when logged today and counts whole days otherwise', () => {
    expect(daysSinceLastLog(plan, logFor({ 10: [0] }), TODAY)).toBe(0);
    expect(daysSinceLastLog(plan, logFor({ 9: [1] }), TODAY)).toBe(1);
    expect(daysSinceLastLog(plan, logFor({ 7: [0], 5: [0] }), TODAY)).toBe(3);
  });

  it('falls back to the plan start when nothing is logged', () => {
    expect(daysSinceLastLog(plan, { entries: {} }, TODAY)).toBe(9);
  });
});

describe('missedDays', () => {
  it('counts days with nothing done in the window before today', () => {
    // window = Oct 6..9; did 9 and 7, missed 8 and 6
    expect(missedDays(plan, logFor({ 9: [0], 7: [1], 10: [] }), TODAY)).toEqual({ missed: 2, considered: 4 });
  });

  it('ignores days before the plan started', () => {
    expect(missedDays(plan, logFor({ 2: [0] }), day(3, 12))).toEqual({ missed: 1, considered: 2 });
  });
});

describe('needsCheckIn', () => {
  it('flags three days with no logs (Linda M. in the mockup)', () => {
    expect(needsCheckIn(plan, logFor({ 6: [0, 1] }), TODAY)).toMatchObject({
      kind: 'no-log',
      message: 'No exercises logged in 4 days',
    });
  });

  it('flags missing 2 of the last 4 days (Ray T. in the mockup)', () => {
    expect(needsCheckIn(plan, logFor({ 9: [0], 7: [0] }), TODAY)).toMatchObject({
      kind: 'missed',
      message: 'Missed 2 of the last 4 days',
    });
  });

  it('does not flag a patient who is keeping up', () => {
    expect(needsCheckIn(plan, logFor({ 6: [0], 7: [0], 8: [1], 9: [0, 1] }), TODAY)).toBeUndefined();
  });

  it('does not count partial days as missed', () => {
    expect(needsCheckIn(plan, logFor({ 6: [0], 7: [1], 8: [0], 9: [1] }), TODAY)).toBeUndefined();
  });
});

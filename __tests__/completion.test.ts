import { emptyLog, markDone, pruneSnoozes, snooze, toggleDone, unmarkDone } from '../src/logic/completion';

const occ = { id: 'knee@2026-10-06T08:00', exerciseId: 'knee', start: new Date(2026, 9, 6, 8) };
const t1 = new Date(2026, 9, 6, 8, 20);
const t2 = new Date(2026, 9, 6, 9, 0);

describe('completion log', () => {
  it('records an entry with its source and times', () => {
    const log = markDone(emptyLog(), occ, t1, 'notification');
    expect(log.entries[occ.id]).toEqual({
      occurrenceId: occ.id,
      exerciseId: 'knee',
      scheduledFor: occ.start.toISOString(),
      completedAt: t1.toISOString(),
      source: 'notification',
    });
  });

  it('is idempotent and keeps the first completion', () => {
    const once = markDone(emptyLog(), occ, t1, 'notification');
    const twice = markDone(once, occ, t2, 'app');
    expect(twice).toBe(once);
    expect(twice.entries[occ.id].completedAt).toBe(t1.toISOString());
  });

  it('does not mutate the previous log', () => {
    const before = emptyLog();
    markDone(before, occ, t1, 'app');
    expect(before.entries).toEqual({});
  });

  it('unmarks and toggles', () => {
    const done = toggleDone(emptyLog(), occ, t1, 'app');
    expect(done.entries[occ.id]).toBeDefined();
    const undone = toggleDone(done, occ, t2, 'app');
    expect(undone.entries).toEqual({});
    expect(unmarkDone(undone, 'missing')).toBe(undone);
  });
});

describe('snoozes', () => {
  it('snoozes for an hour by default and prunes expired ones', () => {
    const s = snooze({}, occ.id, t1);
    expect(s[occ.id]).toBe(new Date(2026, 9, 6, 9, 20).toISOString());
    expect(pruneSnoozes(s, t2)).toEqual(s);
    expect(pruneSnoozes(s, new Date(2026, 9, 6, 9, 20))).toEqual({});
  });
});

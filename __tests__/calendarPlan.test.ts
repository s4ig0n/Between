import type { CarePlan } from '../src/model/types';
import {
  desiredEvents,
  diffEvents,
  EVENT_FOOTER,
  syncWindow,
  type ExistingEvent,
} from '../src/calendar/calendarPlan';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);
const NOW = at(6, 9);

const plan: CarePlan = {
  id: 'p',
  patientName: 'Test',
  condition: 'Knee',
  startDate: '2026-10-01',
  endDate: '2026-10-07',
  exercises: [
    { id: 'knee', name: 'Knee exercises', steps: ['Heel slides'], durationMinutes: 10, schedule: { times: ['08:00', '18:30'] } },
  ],
  appointments: [
    {
      id: 'a1',
      title: 'Physical therapy visit',
      start: at(6, 14).toISOString(),
      durationMinutes: 45,
      status: 'booked',
      source: 'mock',
      location: 'Sample Rehab Clinic',
    },
    { id: 'a2', title: 'Cancelled visit', start: at(6, 16).toISOString(), durationMinutes: 30, status: 'cancelled', source: 'mock' },
  ],
};

const window = syncWindow(NOW, 14);
const desired = desiredEvents(plan, NOW, 14);

/** Pretend the phone already has exactly these events, with string dates like the native module returns. */
const asExisting = (events = desired): ExistingEvent[] =>
  events.map((e, i) => ({
    id: `ev${i}`,
    title: e.title,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
    notes: e.notes,
    location: e.location ?? null,
  }));

describe('desiredEvents', () => {
  it('includes exercise sessions and visits within the plan, skipping cancelled visits', () => {
    expect(desired.map((e) => [e.title, e.startDate])).toEqual([
      ['Knee exercises', at(6, 8)],
      ['Physical therapy visit', at(6, 14)],
      ['Knee exercises', at(6, 18, 30)],
      ['Knee exercises', at(7, 8)],
      ['Knee exercises', at(7, 18, 30)],
    ]);
  });

  it('sets end times, notes and location', () => {
    expect(desired[0].endDate).toEqual(at(6, 8, 10));
    expect(desired[0].notes).toBe(`Heel slides. About 10 minutes.\n\n${EVENT_FOOTER}`);
    expect(desired[1].endDate).toEqual(at(6, 14, 45));
    expect(desired[1].location).toBe('Sample Rehab Clinic');
  });

  it('starts at the beginning of today so earlier sessions today stay in the calendar', () => {
    expect(desired[0].startDate < NOW).toBe(true);
  });
});

describe('diffEvents', () => {
  it('creates everything for an empty calendar', () => {
    expect(diffEvents([], desired, window)).toEqual({ toCreate: desired, toUpdate: [], toDelete: [] });
  });

  it('does nothing on re-sync, so events are never duplicated', () => {
    expect(diffEvents(asExisting(), desired, window)).toEqual({ toCreate: [], toUpdate: [], toDelete: [] });
  });

  it('removes duplicates that are already there', () => {
    const existing = [...asExisting(), { ...asExisting()[0], id: 'dupe' }];
    expect(diffEvents(existing, desired, window).toDelete).toEqual(['dupe']);
  });

  it('moves a rescheduled visit by deleting the old event and creating the new one', () => {
    const moved = desired.map((e) =>
      e.title === 'Physical therapy visit' ? { ...e, startDate: at(6, 15), endDate: at(6, 15, 45) } : e,
    );
    const d = diffEvents(asExisting(), moved, window);
    expect(d.toDelete).toEqual(['ev1']);
    expect(d.toCreate.map((e) => e.startDate)).toEqual([at(6, 15)]);
    expect(d.toUpdate).toEqual([]);
  });

  it('updates in place when only details change', () => {
    const changed = desired.map((e, i) => (i === 1 ? { ...e, location: 'Room 2' } : e));
    const d = diffEvents(asExisting(), changed, window);
    expect(d.toUpdate).toEqual([{ id: 'ev1', event: changed[1] }]);
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete).toEqual([]);
  });

  it('leaves events from past days alone', () => {
    const past: ExistingEvent = {
      id: 'old',
      title: 'Knee exercises',
      startDate: at(5, 8).toISOString(),
      endDate: at(5, 8, 10).toISOString(),
    };
    expect(diffEvents([past, ...asExisting()], desired, window).toDelete).toEqual([]);
  });

  it('never touches events the patient added themselves', () => {
    const mine: ExistingEvent = {
      id: 'mine',
      title: 'Knee exercises',
      startDate: at(6, 8).toISOString(),
      endDate: at(6, 9).toISOString(),
      notes: 'my own note',
    };
    const d = diffEvents([mine, ...asExisting()], desired, window);
    expect(d).toEqual({ toCreate: [], toUpdate: [], toDelete: [] });
    expect(diffEvents([mine], [], window).toDelete).toEqual([]);
  });

  it('removes events no longer in the plan', () => {
    const d = diffEvents(asExisting(), desired.slice(0, 3), window);
    expect(d.toDelete).toEqual(['ev3', 'ev4']);
  });
});

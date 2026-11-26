import type { CarePlan, CompletionLog } from '../src/model/types';
import {
  agendaFor,
  appointmentsBetween,
  exerciseOccurrencesBetween,
  exerciseOccurrencesOn,
  nextUp,
  occurrenceId,
  upcomingAppointments,
} from '../src/logic/schedule';
import { formatDuration, formatLongDate, formatMediumDate, formatTime } from '../src/logic/dates';

// Tuesday, October 6 2026, local time
const TUE = new Date(2026, 9, 6);
const at = (h: number, m = 0, day = TUE) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);

const plan: CarePlan = {
  id: 'p1',
  patientName: 'Test',
  condition: 'Knee',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  exercises: [
    {
      id: 'knee',
      name: 'Knee exercises',
      steps: ['Heel slides', 'quad sets'],
      durationMinutes: 10,
      schedule: { times: ['18:30', '08:00'] },
    },
    {
      id: 'walk',
      name: 'Walk',
      steps: [],
      durationMinutes: 20,
      schedule: { times: ['12:00'], daysOfWeek: [1, 3, 5] },
    },
  ],
  appointments: [
    { id: 'a1', title: 'PT visit', start: at(14).toISOString(), durationMinutes: 45, status: 'booked', source: 'mock' },
    { id: 'a2', title: 'Surgeon', start: at(10, 15, new Date(2026, 9, 7)).toISOString(), durationMinutes: 30, status: 'booked', source: 'mock' },
    { id: 'a3', title: 'Cancelled', start: at(9).toISOString(), durationMinutes: 30, status: 'cancelled', source: 'mock' },
  ],
};

const emptyLog: CompletionLog = { entries: {} };

describe('exerciseOccurrencesOn', () => {
  it('expands each time into a sorted occurrence with a stable id', () => {
    const occ = exerciseOccurrencesOn(plan, TUE);
    expect(occ.map((o) => o.id)).toEqual(['knee@2026-10-06T08:00', 'knee@2026-10-06T18:30']);
    expect(occ[0].start).toEqual(at(8));
    expect(occ[0].detail).toBe('Heel slides, quad sets. About 10 minutes.');
  });

  it('respects days of week', () => {
    const wed = new Date(2026, 9, 7);
    expect(exerciseOccurrencesOn(plan, wed).map((o) => o.exerciseId)).toEqual(['knee', 'walk', 'knee']);
  });

  it('returns nothing outside the plan dates', () => {
    expect(exerciseOccurrencesOn(plan, new Date(2026, 8, 30))).toEqual([]);
    expect(exerciseOccurrencesOn(plan, new Date(2026, 10, 1))).toEqual([]);
    expect(exerciseOccurrencesOn(plan, new Date(2026, 9, 31))).toHaveLength(2);
  });
});

describe('exerciseOccurrencesBetween', () => {
  it('spans days and clips to the window', () => {
    const occ = exerciseOccurrencesBetween(plan, at(12), at(9, 0, new Date(2026, 9, 7)));
    expect(occ.map((o) => o.id)).toEqual(['knee@2026-10-06T18:30', 'knee@2026-10-07T08:00']);
  });
});

describe('appointments', () => {
  it('hides cancelled appointments', () => {
    const items = appointmentsBetween(plan, at(0), at(23, 59));
    expect(items.map((a) => a.id)).toEqual(['a1']);
    expect(items[0].detail).toBe('45 minutes');
  });

  it('lists upcoming appointments after today', () => {
    expect(upcomingAppointments(plan, TUE).map((a) => a.id)).toEqual(['a2']);
  });
});

describe('agendaFor', () => {
  it('merges exercises and appointments in time order with done flags', () => {
    const log: CompletionLog = {
      entries: {
        [occurrenceId('knee', '2026-10-06', '08:00')]: {
          occurrenceId: 'knee@2026-10-06T08:00',
          exerciseId: 'knee',
          scheduledFor: at(8).toISOString(),
          completedAt: at(8, 20).toISOString(),
          source: 'app',
        },
      },
    };
    const agenda = agendaFor(plan, TUE, log);
    expect(agenda.map((i) => [i.title, formatTime(i.start), i.done])).toEqual([
      ['Knee exercises', '8:00 AM', true],
      ['PT visit', '2:00 PM', false],
      ['Knee exercises', '6:30 PM', false],
    ]);
  });
});

describe('nextUp', () => {
  const agenda = agendaFor(plan, TUE, emptyLog);

  it('returns an overdue session first', () => {
    expect(nextUp(agenda, at(9))?.id).toBe('knee@2026-10-06T08:00');
  });

  it('skips done and snoozed sessions', () => {
    const doneFirst = agendaFor(plan, TUE, {
      entries: { 'knee@2026-10-06T08:00': {} as never },
    });
    expect(nextUp(doneFirst, at(18))?.id).toBe('knee@2026-10-06T18:30');
    expect(nextUp(agenda, at(9), { 'knee@2026-10-06T08:00': at(10).toISOString() })).toBeUndefined();
    expect(nextUp(agenda, at(10, 30), { 'knee@2026-10-06T08:00': at(10).toISOString() })?.id).toBe(
      'knee@2026-10-06T08:00',
    );
  });

  it('waits until a session is within the lead time', () => {
    const doneFirst = agendaFor(plan, TUE, { entries: { 'knee@2026-10-06T08:00': {} as never } });
    expect(nextUp(doneFirst, at(15))).toBeUndefined();
    expect(nextUp(doneFirst, at(17, 45))?.id).toBe('knee@2026-10-06T18:30');
  });
});

describe('formatting', () => {
  it('formats like the mockup', () => {
    expect(formatLongDate(TUE)).toBe('Tuesday, October 6');
    expect(formatTime(at(0, 5))).toBe('12:05 AM');
    expect(formatTime(at(12))).toBe('12:00 PM');
    expect(formatDuration(45)).toBe('45 minutes');
    expect(formatDuration(90)).toBe('1 hour 30 minutes');
    expect(formatDuration(60)).toBe('1 hour');
    expect(formatMediumDate(new Date(2023, 5, 1))).toBe('Jun 1, 2023');
  });
});

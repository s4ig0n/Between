import { shiftForDemo } from '../src/logic/demo';
import type { Appointment } from '../src/model/types';

const appt = (id: string, start: Date, status: Appointment['status'] = 'fulfilled'): Appointment => ({
  id,
  title: `Visit ${id}`,
  start: start.toISOString(),
  durationMinutes: 30,
  status,
  source: 'epic',
});

// Thursday Nov 26 2026, 10:00 local
const NOW = new Date(2026, 10, 26, 10, 0);
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min);

describe('shiftForDemo', () => {
  it('moves past visits into the coming days, keeping order and time of day', () => {
    const out = shiftForDemo([appt('b', at(2023, 5, 9, 9, 15)), appt('a', at(2023, 5, 1, 14, 0))], NOW);
    expect(out.map((a) => [a.id, new Date(a.start)])).toEqual([
      ['a', at(2026, 10, 26, 14, 0)], // today, 2 PM is still ahead
      ['b', at(2026, 10, 28, 9, 15)], // two days later
    ]);
  });

  it('starts tomorrow when the first visit time has already passed today', () => {
    const out = shiftForDemo([appt('a', at(2023, 5, 1, 8, 30))], NOW);
    expect(new Date(out[0].start)).toEqual(at(2026, 10, 27, 8, 30));
  });

  it('keeps the real date and marks moved visits as booked', () => {
    const original = at(2023, 5, 1, 14, 0);
    const [moved] = shiftForDemo([appt('a', original)], NOW);
    expect(moved.demo).toEqual({ originalStart: original.toISOString() });
    expect(moved.status).toBe('booked');
  });

  it('leaves future and cancelled visits alone', () => {
    const future = appt('f', at(2026, 11, 3, 9), 'booked');
    const cancelled = appt('c', at(2023, 1, 1, 9), 'cancelled');
    const out = shiftForDemo([future, cancelled], NOW);
    expect(out).toContainEqual(future);
    expect(out).toContainEqual(cancelled);
    expect(out.every((a) => !a.demo)).toBe(true);
  });

  it('handles an empty import', () => {
    expect(shiftForDemo([], NOW)).toEqual([]);
  });
});

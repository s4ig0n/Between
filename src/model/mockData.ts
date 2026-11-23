import type { CarePlan } from './types';
import { addDays, atTime, startOfDay, toDateKey } from '../logic/dates';

/**
 * SYNTHETIC DATA ONLY. This patient, clinic and schedule are made up for
 * development and demos. Dates are placed relative to `today` so the Today
 * screen always has something to show.
 */
export function buildMockPlan(today: Date = new Date()): CarePlan {
  const day = startOfDay(today);
  const iso = (d: Date) => d.toISOString();

  return {
    id: 'mock-plan-knee',
    patientName: 'Linda M. (sample)',
    condition: 'Recovery after knee replacement',
    startDate: toDateKey(addDays(day, -14)),
    endDate: toDateKey(addDays(day, 42)),
    exercises: [
      {
        id: 'knee',
        name: 'Knee exercises',
        steps: ['Heel slides', 'quad sets', 'straight-leg raises'],
        durationMinutes: 10,
        schedule: { times: ['08:00', '18:30'] },
      },
    ],
    appointments: [
      {
        id: `mock-pt-${toDateKey(day)}`,
        title: 'Physical therapy visit',
        start: iso(atTime(day, '14:00')),
        durationMinutes: 45,
        status: 'booked',
        source: 'mock',
        location: 'Sample Rehab Clinic',
      },
      {
        id: `mock-surgeon-${toDateKey(addDays(day, 1))}`,
        title: 'Surgeon follow-up',
        start: iso(atTime(addDays(day, 1), '10:15')),
        durationMinutes: 30,
        status: 'booked',
        source: 'mock',
        location: 'Sample Orthopedics',
      },
    ],
  };
}

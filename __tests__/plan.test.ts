import { withImportedAppointments } from '../src/logic/plan';
import { buildMockPlan } from '../src/model/mockData';
import type { Appointment } from '../src/model/types';

const mock = buildMockPlan(new Date(2026, 9, 6));
const epicAppt: Appointment = {
  id: 'epic-1',
  title: 'Office Visit',
  start: new Date(2026, 9, 6, 11).toISOString(),
  durationMinutes: 30,
  status: 'booked',
  source: 'epic',
};

describe('withImportedAppointments', () => {
  it('keeps the sample plan when Epic is not connected', () => {
    expect(withImportedAppointments(mock, { connected: false, appointments: [epicAppt] })).toBe(mock);
  });

  it('replaces sample appointments with imported ones and keeps exercises', () => {
    const plan = withImportedAppointments(mock, { connected: true, appointments: [epicAppt], patientName: 'Camila Lopez' });
    expect(plan.appointments).toEqual([epicAppt]);
    expect(plan.exercises).toBe(mock.exercises);
    expect(plan.patientName).toBe('Camila Lopez');
  });

  it('moves past sandbox visits forward only when demo dates are on', () => {
    const past = { ...epicAppt, start: new Date(2023, 5, 1, 15).toISOString() };
    const now = new Date(2026, 9, 6, 9);
    const off = withImportedAppointments(mock, { connected: true, appointments: [past] }, now);
    expect(off.appointments).toEqual([past]);
    const on = withImportedAppointments(mock, { connected: true, appointments: [past], demoDates: true }, now);
    expect(new Date(on.appointments[0].start)).toEqual(new Date(2026, 9, 6, 15));
    expect(on.appointments[0].demo?.originalStart).toBe(past.start);
  });

  it('shows no visits rather than sample ones when Epic returns none', () => {
    expect(withImportedAppointments(mock, { connected: true, appointments: [] }).appointments).toEqual([]);
  });
});

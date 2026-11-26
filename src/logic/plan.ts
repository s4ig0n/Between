import type { Appointment, CarePlan } from '../model/types';
import { shiftForDemo } from './demo';

/**
 * Use appointments imported from Epic in place of the sample ones. Exercises
 * stay on the sample plan: the Epic APIs this app reads (Patient, Appointment,
 * Practitioner, Location) carry no home exercise program.
 *
 * With `demoDates` on (Epic sandbox only), past test visits are moved into
 * the coming days so the Today screen has something to show.
 */
export function withImportedAppointments(
  plan: CarePlan,
  imported: { connected: boolean; appointments: Appointment[]; patientName?: string; demoDates?: boolean },
  now: Date = new Date(),
): CarePlan {
  if (!imported.connected) return plan;
  return {
    ...plan,
    patientName: imported.patientName ?? plan.patientName,
    appointments: imported.demoDates ? shiftForDemo(imported.appointments, now) : imported.appointments,
  };
}

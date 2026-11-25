import type { Appointment, CarePlan } from '../model/types';

/**
 * Use appointments imported from Epic in place of the sample ones. Exercises
 * stay on the sample plan: the Epic APIs this app reads (Patient, Appointment,
 * Practitioner, Location) carry no home exercise program.
 */
export function withImportedAppointments(
  plan: CarePlan,
  imported: { connected: boolean; appointments: Appointment[]; patientName?: string },
): CarePlan {
  if (!imported.connected) return plan;
  return {
    ...plan,
    patientName: imported.patientName ?? plan.patientName,
    appointments: imported.appointments,
  };
}

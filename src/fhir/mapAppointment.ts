import type { Appointment, AppointmentStatus } from '../model/types';

/** The parts of a FHIR R4 Appointment this app reads. */
export interface FhirCodeableConcept {
  text?: string;
  coding?: { display?: string; code?: string; system?: string }[];
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id?: string;
  status?: string;
  start?: string;
  end?: string;
  minutesDuration?: number;
  description?: string;
  serviceType?: FhirCodeableConcept[];
  appointmentType?: FhirCodeableConcept;
  specialty?: FhirCodeableConcept[];
  participant?: { actor?: { reference?: string; display?: string } }[];
}

const STATUS: Record<string, AppointmentStatus> = {
  proposed: 'proposed',
  pending: 'pending',
  booked: 'booked',
  arrived: 'arrived',
  'checked-in': 'arrived',
  fulfilled: 'fulfilled',
  cancelled: 'cancelled',
  noshow: 'noshow',
  'entered-in-error': 'cancelled',
  waitlist: 'pending',
};

export const DEFAULT_DURATION_MINUTES = 30;

function conceptText(c?: FhirCodeableConcept): string | undefined {
  if (!c) return undefined;
  const text = c.text?.trim() || c.coding?.find((x) => x.display?.trim())?.display?.trim();
  return text || undefined;
}

function actorDisplay(a: FhirAppointment, type: 'Practitioner' | 'Location'): string | undefined {
  const p = a.participant?.find((x) => x.actor?.reference?.startsWith(`${type}/`) && x.actor.display);
  return p?.actor?.display?.trim() || undefined;
}

function durationMinutes(a: FhirAppointment): number {
  if (a.minutesDuration && a.minutesDuration > 0) return a.minutesDuration;
  if (a.start && a.end) {
    const m = Math.round((Date.parse(a.end) - Date.parse(a.start)) / 60_000);
    if (m > 0) return m;
  }
  return DEFAULT_DURATION_MINUTES;
}

/**
 * Map an Epic FHIR Appointment to the app's Appointment. Returns undefined
 * for appointments without an id or a usable start time (for example
 * waitlist requests), since they can't be placed on the Today screen.
 */
export function mapFhirAppointment(a: FhirAppointment): Appointment | undefined {
  if (!a.id || !a.start || Number.isNaN(Date.parse(a.start))) return undefined;

  const title =
    conceptText(a.serviceType?.[0]) ??
    conceptText(a.appointmentType) ??
    a.description?.trim() ??
    conceptText(a.specialty?.[0]) ??
    'Appointment';

  return {
    id: `epic-${a.id}`,
    title,
    start: new Date(a.start).toISOString(),
    durationMinutes: durationMinutes(a),
    status: STATUS[a.status ?? ''] ?? 'unknown',
    source: 'epic',
    location: actorDisplay(a, 'Location'),
    practitioner: actorDisplay(a, 'Practitioner'),
  };
}

/**
 * Pull Appointments out of a FHIR search Bundle. Epic adds OperationOutcome
 * entries for warnings; those are skipped.
 */
export function appointmentsFromBundle(bundle: unknown): Appointment[] {
  const entries = (bundle as { entry?: { resource?: { resourceType?: string } }[] } | null)?.entry ?? [];
  const out: Appointment[] = [];
  for (const e of entries) {
    if (e.resource?.resourceType !== 'Appointment') continue;
    const mapped = mapFhirAppointment(e.resource as FhirAppointment);
    if (mapped) out.push(mapped);
  }
  return out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** Readable name from a FHIR Patient, e.g. "Camila Lopez". */
export function patientDisplayName(patient: unknown): string | undefined {
  const names = (patient as { name?: { use?: string; text?: string; given?: string[]; family?: string }[] } | null)
    ?.name;
  if (!names?.length) return undefined;
  const n = names.find((x) => x.use === 'official') ?? names[0];
  const built = [...(n.given ?? []), n.family].filter(Boolean).join(' ');
  return n.text?.trim() || built || undefined;
}

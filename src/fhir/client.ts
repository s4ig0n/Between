import type { Appointment } from '../model/types';
import { isSandboxUrl, type EpicConfig } from './config';
import { appointmentsFromBundle, patientDisplayName } from './mapAppointment';
import type { EpicSession } from './session';

/** The token was rejected; the patient needs to sign in again. */
export class EpicAuthError extends Error {}

const MAX_PAGES = 5;

async function fhirGet(url: string, session: EpicSession): Promise<unknown> {
  if (!isSandboxUrl(url)) throw new Error('Refusing to call a non-sandbox URL');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/fhir+json' },
  });
  if (res.status === 401 || res.status === 403) throw new EpicAuthError(`Epic refused the request (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`Epic request failed (HTTP ${res.status})`);
  return res.json();
}

export async function fetchPatientName(config: EpicConfig, session: EpicSession): Promise<string | undefined> {
  const patient = await fhirGet(`${config.fhirBaseUrl}/Patient/${encodeURIComponent(session.patientId)}`, session);
  return patientDisplayName(patient);
}

export interface AppointmentImport {
  appointments: Appointment[];
  /** Raw count of Appointment resources Epic returned, before mapping. */
  returned: number;
}

/**
 * Read the signed-in patient's scheduled appointments. Epic separates
 * appointments from surgeries by service-category. Follows paging links,
 * within the sandbox only.
 */
export async function fetchAppointments(config: EpicConfig, session: EpicSession): Promise<AppointmentImport> {
  const params = new URLSearchParams({ patient: session.patientId, 'service-category': 'appointment' });
  let url: string | undefined = `${config.fhirBaseUrl}/Appointment?${params.toString()}`;
  const appointments: Appointment[] = [];
  let returned = 0;

  for (let page = 0; url && page < MAX_PAGES; page++) {
    const bundle = (await fhirGet(url, session)) as {
      entry?: { resource?: { resourceType?: string } }[];
      link?: { relation?: string; url?: string }[];
    };
    returned += (bundle.entry ?? []).filter((e) => e.resource?.resourceType === 'Appointment').length;
    appointments.push(...appointmentsFromBundle(bundle));
    url = bundle.link?.find((l) => l.relation === 'next')?.url;
  }

  appointments.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return { appointments, returned };
}

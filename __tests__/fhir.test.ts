import { readEpicConfig } from '../src/fhir/config';
import { parseSmartConfiguration } from '../src/fhir/discovery';
import {
  appointmentsFromBundle,
  DEFAULT_DURATION_MINUTES,
  mapFhirAppointment,
  patientDisplayName,
  type FhirAppointment,
} from '../src/fhir/mapAppointment';

const SANDBOX = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

describe('readEpicConfig', () => {
  it('reads a sandbox config and trims the trailing slash', () => {
    expect(
      readEpicConfig({ EXPO_PUBLIC_EPIC_CLIENT_ID: ' abc ', EXPO_PUBLIC_EPIC_FHIR_BASE_URL: `${SANDBOX}/` }),
    ).toEqual({ clientId: 'abc', fhirBaseUrl: SANDBOX });
  });

  it('falls back to mock data when the client id is missing', () => {
    expect(readEpicConfig({ EXPO_PUBLIC_EPIC_FHIR_BASE_URL: SANDBOX })).toBeUndefined();
    expect(readEpicConfig({ EXPO_PUBLIC_EPIC_CLIENT_ID: '', EXPO_PUBLIC_EPIC_FHIR_BASE_URL: SANDBOX })).toBeUndefined();
  });

  it('refuses anything that is not the Epic sandbox', () => {
    expect(
      readEpicConfig({ EXPO_PUBLIC_EPIC_CLIENT_ID: 'abc', EXPO_PUBLIC_EPIC_FHIR_BASE_URL: 'https://ehr.example-hospital.org/FHIR/R4' }),
    ).toBeUndefined();
  });
});

describe('parseSmartConfiguration', () => {
  const good = {
    authorization_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
    token_endpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    code_challenge_methods_supported: ['S256'],
    capabilities: ['launch-standalone', 'client-public', 'context-standalone-patient'],
  };

  it('returns the endpoints from the sandbox document', () => {
    expect(parseSmartConfiguration(good)).toEqual({
      authorizationEndpoint: good.authorization_endpoint,
      tokenEndpoint: good.token_endpoint,
    });
  });

  it('rejects servers without PKCE S256 or public standalone launch', () => {
    expect(() => parseSmartConfiguration({ ...good, code_challenge_methods_supported: ['plain'] })).toThrow(/PKCE/);
    expect(() => parseSmartConfiguration({ ...good, capabilities: ['launch-standalone'] })).toThrow(/client-public/);
  });

  it('rejects endpoints outside the sandbox', () => {
    expect(() => parseSmartConfiguration({ ...good, token_endpoint: 'https://evil.example/token' })).toThrow(/sandbox/);
    expect(() => parseSmartConfiguration(null)).toThrow();
  });
});

describe('mapFhirAppointment', () => {
  const base: FhirAppointment = {
    resourceType: 'Appointment',
    id: 'eAbc123',
    status: 'booked',
    start: '2026-10-06T19:00:00Z',
    end: '2026-10-06T19:45:00Z',
    serviceType: [{ coding: [{ display: 'Physical Therapy Visit' }] }],
    participant: [
      { actor: { reference: 'Patient/eP1', display: 'Lopez, Camila' } },
      { actor: { reference: 'Practitioner/eD1', display: 'Physician Family Medicine, MD' } },
      { actor: { reference: 'Location/eL1', display: 'EMC Family Medicine' } },
    ],
  };

  it('maps to the same Appointment type the Today screen uses', () => {
    expect(mapFhirAppointment(base)).toEqual({
      id: 'epic-eAbc123',
      title: 'Physical Therapy Visit',
      start: '2026-10-06T19:00:00.000Z',
      durationMinutes: 45,
      status: 'booked',
      source: 'epic',
      location: 'EMC Family Medicine',
      practitioner: 'Physician Family Medicine, MD',
    });
  });

  it('prefers minutesDuration and falls back to a default length', () => {
    expect(mapFhirAppointment({ ...base, minutesDuration: 20 })?.durationMinutes).toBe(20);
    expect(mapFhirAppointment({ ...base, end: undefined })?.durationMinutes).toBe(DEFAULT_DURATION_MINUTES);
  });

  it('picks a title from the best available field', () => {
    const noService = { ...base, serviceType: undefined };
    expect(mapFhirAppointment({ ...noService, appointmentType: { text: 'Follow Up' } })?.title).toBe('Follow Up');
    expect(mapFhirAppointment({ ...noService, description: 'Knee recheck' })?.title).toBe('Knee recheck');
    expect(mapFhirAppointment(noService)?.title).toBe('Appointment');
  });

  it('maps FHIR statuses, including ones the app folds together', () => {
    expect(mapFhirAppointment({ ...base, status: 'checked-in' })?.status).toBe('arrived');
    expect(mapFhirAppointment({ ...base, status: 'entered-in-error' })?.status).toBe('cancelled');
    expect(mapFhirAppointment({ ...base, status: 'something-new' })?.status).toBe('unknown');
  });

  it('skips appointments without an id or a start time', () => {
    expect(mapFhirAppointment({ ...base, start: undefined })).toBeUndefined();
    expect(mapFhirAppointment({ ...base, start: 'not a date' })).toBeUndefined();
    expect(mapFhirAppointment({ ...base, id: undefined })).toBeUndefined();
  });
});

describe('appointmentsFromBundle', () => {
  it('keeps Appointments, drops OperationOutcomes, and sorts by start', () => {
    const bundle = {
      resourceType: 'Bundle',
      entry: [
        { resource: { resourceType: 'Appointment', id: 'b', start: '2026-10-07T15:00:00Z' } },
        { resource: { resourceType: 'OperationOutcome', issue: [] } },
        { resource: { resourceType: 'Appointment', id: 'a', start: '2026-10-06T15:00:00Z' } },
        { resource: { resourceType: 'Appointment', id: 'c' } },
      ],
    };
    expect(appointmentsFromBundle(bundle).map((a) => a.id)).toEqual(['epic-a', 'epic-b']);
  });

  it('handles an empty search result', () => {
    expect(appointmentsFromBundle({ resourceType: 'Bundle', total: 0 })).toEqual([]);
    expect(appointmentsFromBundle(null)).toEqual([]);
  });
});

describe('patientDisplayName', () => {
  it('uses the official name', () => {
    expect(
      patientDisplayName({
        name: [
          { use: 'usual', text: 'Cami' },
          { use: 'official', given: ['Camila', 'Maria'], family: 'Lopez' },
        ],
      }),
    ).toBe('Camila Maria Lopez');
    expect(patientDisplayName({})).toBeUndefined();
  });
});

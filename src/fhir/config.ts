/**
 * Epic on FHIR settings, read from .env (see .env.example).
 *
 * Only Epic's public non-production sandbox is allowed. Any other base URL is
 * rejected so a misconfigured build can never talk to a production Epic
 * instance.
 */
export const EPIC_SANDBOX_PREFIX = 'https://fhir.epic.com/interconnect-fhir-oauth/';

export interface EpicConfig {
  clientId: string;
  fhirBaseUrl: string;
}

export function readEpicConfig(env: Record<string, string | undefined>): EpicConfig | undefined {
  const clientId = env.EXPO_PUBLIC_EPIC_CLIENT_ID?.trim();
  const fhirBaseUrl = env.EXPO_PUBLIC_EPIC_FHIR_BASE_URL?.trim().replace(/\/+$/, '');
  if (!clientId || !fhirBaseUrl) return undefined;
  if (!isSandboxUrl(fhirBaseUrl)) return undefined;
  return { clientId, fhirBaseUrl };
}

export function isSandboxUrl(url: string): boolean {
  return url.startsWith(EPIC_SANDBOX_PREFIX);
}

/**
 * Resource scopes for the read-only APIs registered for this app. Epic
 * grants what the app registration allows; these document the intent.
 */
export const EPIC_SCOPES = [
  'openid',
  'fhirUser',
  'launch/patient',
  'patient/Patient.read',
  'patient/Appointment.read',
  'patient/Practitioner.read',
  'patient/Location.read',
];

/**
 * Expo inlines EXPO_PUBLIC_* variables at build time only when they are read
 * as literal property accesses, so they are listed out here.
 */
export const epicConfig: EpicConfig | undefined = readEpicConfig({
  EXPO_PUBLIC_EPIC_CLIENT_ID: process.env.EXPO_PUBLIC_EPIC_CLIENT_ID,
  EXPO_PUBLIC_EPIC_FHIR_BASE_URL: process.env.EXPO_PUBLIC_EPIC_FHIR_BASE_URL,
});

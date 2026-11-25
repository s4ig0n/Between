/** An Epic sign-in. The access token lives only in SecureStore (see sessionStore). */
export interface EpicSession {
  accessToken: string;
  /** ISO time the access token stops working. */
  expiresAt: string;
  /** FHIR id of the signed-in patient, from the token response. */
  patientId: string;
  scope?: string;
}

/** Token fields as returned by expo-auth-session's exchangeCodeAsync. */
export interface TokenFields {
  accessToken: string;
  expiresIn?: number;
  scope?: string;
}

export const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

/**
 * Build a session from the token response. SMART standalone launch returns
 * the patient id next to the token; without it the app can't know whose
 * appointments to read, so that is an error.
 */
export function sessionFromTokenResponse(token: TokenFields, raw: unknown, now: Date): EpicSession {
  const patient = (raw as { patient?: unknown } | null)?.patient;
  if (typeof patient !== 'string' || !patient) {
    throw new Error('Epic did not return a patient for this sign-in');
  }
  if (!token.accessToken) throw new Error('Epic did not return an access token');
  const lifetime = token.expiresIn && token.expiresIn > 0 ? token.expiresIn : DEFAULT_TOKEN_LIFETIME_SECONDS;
  return {
    accessToken: token.accessToken,
    expiresAt: new Date(now.getTime() + lifetime * 1000).toISOString(),
    patientId: patient,
    scope: token.scope,
  };
}

/** True while the token has at least `skewSeconds` left. */
export function isSessionUsable(session: EpicSession | undefined, now: Date, skewSeconds = 60): session is EpicSession {
  if (!session) return false;
  return Date.parse(session.expiresAt) - skewSeconds * 1000 > now.getTime();
}

/**
 * Public surface of the Epic integration. Everything else in the app talks to
 * Epic only through here. With no client id configured (or on web), Epic is
 * unavailable and the app runs on its sample data.
 */
import { Platform } from 'react-native';

import type { Appointment } from '../model/types';
import { signInWithEpic, epicRedirectUri } from './auth';
import { EpicAuthError, fetchAppointments, fetchPatientName } from './client';
import { epicConfig } from './config';
import { isSessionUsable, type EpicSession } from './session';
import { clearSession, loadSession } from './sessionStore';

export { epicRedirectUri };

export const epicAvailable = Platform.OS !== 'web' && epicConfig !== undefined;

export interface EpicImport {
  patientName?: string;
  appointments: Appointment[];
  /** How many Appointment resources Epic returned before mapping. */
  returned: number;
}

export type ImportOutcome = { type: 'imported'; data: EpicImport } | { type: 'signed-out' } | { type: 'expired' };

async function runImport(session: EpicSession): Promise<EpicImport> {
  if (!epicConfig) throw new Error('Epic is not configured');
  const [patientName, result] = await Promise.all([
    fetchPatientName(epicConfig, session).catch(() => undefined),
    fetchAppointments(epicConfig, session),
  ]);
  return { patientName, ...result };
}

/** Sign in with Epic, then import. Returns undefined if the patient cancelled. */
export async function connectEpic(): Promise<EpicImport | undefined> {
  if (!epicConfig) throw new Error('Epic is not configured');
  const result = await signInWithEpic(epicConfig);
  if (result.type === 'cancelled') return undefined;
  return runImport(result.session);
}

/** Re-import with the saved token, if it is still valid. */
export async function refreshFromEpic(): Promise<ImportOutcome> {
  const session = await loadSession();
  if (!session) return { type: 'signed-out' };
  if (!isSessionUsable(session, new Date())) return { type: 'expired' };
  try {
    return { type: 'imported', data: await runImport(session) };
  } catch (e) {
    if (e instanceof EpicAuthError) return { type: 'expired' };
    throw e;
  }
}

/** Forget the token. Imported appointments are cleared by the caller. */
export async function disconnectEpic(): Promise<void> {
  await clearSession();
}

import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useBetweenStore } from '../store/useBetweenStore';
import { connectEpic, disconnectEpic, epicAvailable, refreshFromEpic, type EpicImport } from './index';

export type EpicStatus = 'idle' | 'working' | 'expired' | 'error';

/** Connect to the Epic sandbox and keep imported appointments fresh while the token lasts. */
export function useEpic() {
  const epic = useBetweenStore((s) => s.epic);
  const hydrated = useBetweenStore((s) => s.hydrated);
  const setEpic = useBetweenStore((s) => s.setEpic);
  const clearEpic = useBetweenStore((s) => s.clearEpic);
  const [status, setStatus] = useState<EpicStatus>('idle');
  const [error, setError] = useState<string>();

  const save = useCallback(
    (data: EpicImport) =>
      setEpic({
        connected: true,
        patientName: data.patientName,
        appointments: data.appointments,
        returned: data.returned,
        lastImportedAt: new Date().toISOString(),
      }),
    [setEpic],
  );

  const fail = (e: unknown) => {
    // Messages are built in the fhir module and never include the token.
    const message = e instanceof Error ? e.message : 'Something went wrong';
    console.warn('Epic:', message);
    setError(message);
    setStatus('error');
  };

  const refresh = useCallback(async () => {
    setStatus('working');
    setError(undefined);
    try {
      const outcome = await refreshFromEpic();
      if (outcome.type === 'imported') {
        save(outcome.data);
        setStatus('idle');
      } else {
        setStatus('expired');
      }
    } catch (e) {
      fail(e);
    }
  }, [save]);

  // Refresh on open and on return to the foreground, while connected.
  useEffect(() => {
    if (!epicAvailable || !hydrated || !epic.connected) return;
    void refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, epic.connected]);

  const connect = useCallback(async () => {
    setStatus('working');
    setError(undefined);
    try {
      const data = await connectEpic();
      if (data) save(data);
      setStatus('idle');
    } catch (e) {
      fail(e);
    }
  }, [save]);

  const disconnect = useCallback(async () => {
    await disconnectEpic().catch(() => undefined);
    clearEpic();
    setStatus('idle');
    setError(undefined);
  }, [clearEpic]);

  return { available: epicAvailable, epic, status, error, connect, refresh, disconnect };
}

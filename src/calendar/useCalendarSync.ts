import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { CarePlan } from '../model/types';
import { useBetweenStore } from '../store/useBetweenStore';
import {
  calendarSupported,
  getCalendarPermission,
  removeBetweenCalendar,
  requestCalendarPermission,
  syncCalendar,
  type CalendarPermission,
} from './native';

export type CalendarStatus = 'idle' | 'syncing' | 'error';

/**
 * Keeps the "Between" calendar in step with the plan while sync is on:
 * on first turn-on, whenever the plan changes, and each time the app returns
 * to the foreground.
 */
export function useCalendarSync(plan: CarePlan) {
  const calendar = useBetweenStore((s) => s.calendar);
  const hydrated = useBetweenStore((s) => s.hydrated);
  const setCalendar = useBetweenStore((s) => s.setCalendar);

  const [permission, setPermission] = useState<CalendarPermission>(
    calendarSupported ? 'undetermined' : 'unsupported',
  );
  const [status, setStatus] = useState<CalendarStatus>('idle');
  const [foregroundTick, setForegroundTick] = useState(0);

  useEffect(() => {
    if (!calendarSupported) return;
    const refresh = () => {
      getCalendarPermission().then(setPermission).catch(() => undefined);
      setForegroundTick((n) => n + 1);
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);

  const runSync = useCallback(async () => {
    setStatus('syncing');
    try {
      const knownId = useBetweenStore.getState().calendar.calendarId;
      const result = await syncCalendar(plan, knownId);
      setCalendar({ calendarId: result.calendarId, lastSyncedAt: new Date().toISOString() });
      setStatus('idle');
    } catch (e) {
      console.warn('Calendar sync failed', e instanceof Error ? e.message : e);
      setStatus('error');
    }
  }, [plan, setCalendar]);

  useEffect(() => {
    if (!hydrated || !calendar.enabled || permission !== 'granted') return;
    void runSync();
  }, [hydrated, calendar.enabled, permission, runSync, foregroundTick]);

  const enable = useCallback(async () => {
    const p = permission === 'granted' ? permission : await requestCalendarPermission();
    setPermission(p);
    if (p === 'granted') setCalendar({ enabled: true });
  }, [permission, setCalendar]);

  const disable = useCallback(async () => {
    setStatus('syncing');
    try {
      await removeBetweenCalendar(useBetweenStore.getState().calendar.calendarId);
      setCalendar({ enabled: false, calendarId: undefined, lastSyncedAt: undefined });
      setStatus('idle');
    } catch (e) {
      console.warn('Could not remove calendar', e instanceof Error ? e.message : e);
      setStatus('error');
    }
  }, [setCalendar]);

  return { permission, status, enabled: calendar.enabled, lastSyncedAt: calendar.lastSyncedAt, enable, disable, syncNow: runSync };
}

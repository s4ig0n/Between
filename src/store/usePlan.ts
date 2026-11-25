import { useMemo } from 'react';

import { buildMockPlan } from '../model/mockData';
import { toDateKey } from '../logic/dates';
import { withImportedAppointments } from '../logic/plan';
import { useBetweenStore } from './useBetweenStore';

/**
 * The patient's current care plan: the synthetic sample plan (rebuilt each
 * day so its dates stay relative to today), with appointments from the Epic
 * sandbox in place of the sample visits once connected.
 */
export function usePlan(now: Date) {
  const dayKey = toDateKey(now);
  const epic = useBetweenStore((s) => s.epic);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => buildMockPlan(now), [dayKey]);
  return useMemo(() => withImportedAppointments(base, epic), [base, epic]);
}

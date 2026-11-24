import { useMemo } from 'react';

import { buildMockPlan } from '../model/mockData';
import { toDateKey } from '../logic/dates';

/**
 * The patient's current care plan. Phase 1–3: the synthetic sample plan,
 * rebuilt each day so its dates stay relative to today.
 */
export function usePlan(now: Date) {
  const dayKey = toDateKey(now);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildMockPlan(now), [dayKey]);
}

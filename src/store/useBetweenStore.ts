import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CompletionLog, CompletionSource, ExerciseOccurrence } from '../model/types';
import { emptyLog, markDone, pruneSnoozes, snooze, toggleDone, type Snoozes } from '../logic/completion';

type OccurrenceRef = Pick<ExerciseOccurrence, 'id' | 'exerciseId' | 'start'>;

interface BetweenState {
  log: CompletionLog;
  snoozes: Snoozes;
  hydrated: boolean;
  toggle: (occ: OccurrenceRef, source?: CompletionSource) => void;
  markDone: (occ: OccurrenceRef, source: CompletionSource) => void;
  snooze: (occurrenceId: string, minutes?: number) => void;
  resetAll: () => void;
}

/**
 * App state that must survive restarts: the completion log and snoozes.
 * Stored on-device in AsyncStorage. It holds no names, tokens or health
 * record data; tokens go to SecureStore in the fhir module.
 */
export const useBetweenStore = create<BetweenState>()(
  persist(
    (set) => ({
      log: emptyLog(),
      snoozes: {},
      hydrated: false,
      toggle: (occ, source = 'app') => set((s) => ({ log: toggleDone(s.log, occ, new Date(), source) })),
      markDone: (occ, source) => set((s) => ({ log: markDone(s.log, occ, new Date(), source) })),
      snooze: (occurrenceId, minutes = 60) =>
        set((s) => {
          const now = new Date();
          return { snoozes: snooze(pruneSnoozes(s.snoozes, now), occurrenceId, now, minutes) };
        }),
      resetAll: () => set({ log: emptyLog(), snoozes: {} }),
    }),
    {
      name: 'between-state',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ log: s.log, snoozes: s.snoozes }),
      onRehydrateStorage: () => () => {
        useBetweenStore.setState({ hydrated: true });
      },
    },
  ),
);

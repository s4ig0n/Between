import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Appointment, CompletionLog, CompletionSource, ExerciseOccurrence } from '../model/types';
import { emptyLog, markDone, pruneSnoozes, snooze, toggleDone, type Snoozes } from '../logic/completion';

type OccurrenceRef = Pick<ExerciseOccurrence, 'id' | 'exerciseId' | 'start'>;

export interface CalendarSyncState {
  /** The patient turned calendar sync on. */
  enabled: boolean;
  /** Id of the "Between" calendar on this phone. */
  calendarId?: string;
  lastSyncedAt?: string;
}

/**
 * Appointments imported from the Epic SANDBOX (test patients only). Kept so
 * the Today screen and calendar still show them after the 1-hour token
 * expires. The token itself is never stored here.
 */
export interface EpicImportState {
  connected: boolean;
  patientName?: string;
  appointments: Appointment[];
  lastImportedAt?: string;
  /** Appointment resources Epic returned on the last import, before mapping. */
  returned?: number;
}

const emptyEpic = (): EpicImportState => ({ connected: false, appointments: [] });

interface BetweenState {
  log: CompletionLog;
  snoozes: Snoozes;
  calendar: CalendarSyncState;
  epic: EpicImportState;
  hydrated: boolean;
  setCalendar: (patch: Partial<CalendarSyncState>) => void;
  setEpic: (patch: Partial<EpicImportState>) => void;
  clearEpic: () => void;
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
      calendar: { enabled: false },
      hydrated: false,
      setCalendar: (patch) => set((s) => ({ calendar: { ...s.calendar, ...patch } })),
      epic: emptyEpic(),
      setEpic: (patch) => set((s) => ({ epic: { ...s.epic, ...patch } })),
      clearEpic: () => set({ epic: emptyEpic() }),
      toggle: (occ, source = 'app') => set((s) => ({ log: toggleDone(s.log, occ, new Date(), source) })),
      markDone: (occ, source) => set((s) => ({ log: markDone(s.log, occ, new Date(), source) })),
      snooze: (occurrenceId, minutes = 60) =>
        set((s) => {
          const now = new Date();
          return { snoozes: snooze(pruneSnoozes(s.snoozes, now), occurrenceId, now, minutes) };
        }),
      resetAll: () => set({ log: emptyLog(), snoozes: {}, calendar: { enabled: false }, epic: emptyEpic() }),
    }),
    {
      name: 'between-state',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ log: s.log, snoozes: s.snoozes, calendar: s.calendar, epic: s.epic }),
      onRehydrateStorage: () => () => {
        useBetweenStore.setState({ hydrated: true });
      },
    },
  ),
);

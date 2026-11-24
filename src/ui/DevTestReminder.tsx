import { Pressable, StyleSheet, Text } from 'react-native';

import type { AgendaItem } from '../model/types';
import { sendTestReminder } from '../notifications/native';
import { reminderTitle } from '../notifications/reminderPlan';
import { colors, radius, TAP, type } from './theme';

/**
 * Development builds only: sends a real reminder for the first unfinished
 * session today in 10 seconds, so lock-screen actions can be tried quickly.
 */
export function DevTestReminder({ agenda }: { agenda: AgendaItem[] }) {
  if (!__DEV__) return null;
  const target = agenda.find((i) => i.kind === 'exercise' && !i.done);
  if (!target || target.kind !== 'exercise') return null;

  return (
    <Pressable
      onPress={() =>
        void sendTestReminder({
          title: reminderTitle(target.title),
          body: target.detail,
          data: { occurrenceId: target.id, exerciseId: target.exerciseId, scheduledFor: target.start.toISOString() },
        })
      }
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityHint="Developer tool. Sends a test reminder in 10 seconds."
    >
      <Text style={styles.text}>Dev: test reminder in 10 seconds</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TAP,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.onBlueMuted,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.white, fontSize: type.small, fontWeight: '700' },
});

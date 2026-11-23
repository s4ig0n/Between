import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ExerciseOccurrence } from '../model/types';
import { formatTime } from '../logic/dates';
import { LogoMark } from './Logo';
import { colors, radius, TAP, type } from './theme';

interface Props {
  occurrence: ExerciseOccurrence;
  now: Date;
  onDone: () => void;
  onLater: () => void;
}

/**
 * In-app version of the reminder notification from the mockup, with the same
 * two actions so the patient sees one consistent pattern.
 */
export function NextUpCard({ occurrence, now, onDone, onLater }: Props) {
  const due = occurrence.start <= now ? 'now' : formatTime(occurrence.start);
  const heading = `Time for your ${occurrence.title.toLowerCase()}`;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={styles.badge}>
          <LogoMark size={20} color={colors.white} />
        </View>
        <Text style={styles.app}>Between</Text>
        <Text style={styles.due}>{due}</Text>
      </View>
      <Text style={styles.heading} accessibilityRole="header">
        {heading}
      </Text>
      <Text style={styles.detail}>{occurrence.detail}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.button, styles.primary, pressed && { backgroundColor: colors.blueDark }]}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${occurrence.title.toLowerCase()} done`}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>Mark done</Text>
        </Pressable>
        <Pressable
          onPress={onLater}
          style={({ pressed }) => [styles.button, styles.secondary, pressed && { backgroundColor: colors.line }]}
          accessibilityRole="button"
          accessibilityLabel="Remind me in 1 hour"
        >
          <Text style={[styles.buttonText, { color: colors.navy }]}>In 1 hour</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cardSoft, borderRadius: radius.card, padding: 20, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  app: { flex: 1, fontSize: type.small, fontWeight: '700', color: colors.navy },
  due: { fontSize: type.small, color: colors.muted },
  heading: { fontSize: type.heading, fontWeight: '800', color: colors.navy, marginTop: 4 },
  detail: { fontSize: type.small, color: colors.muted, lineHeight: 25 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  button: {
    flex: 1,
    minHeight: TAP,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primary: { backgroundColor: colors.blue },
  secondary: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line },
  buttonText: { fontSize: type.body, fontWeight: '700' },
});

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReminderPermission } from '../notifications/native';
import { colors, radius, TAP, type } from './theme';

interface Props {
  permission: ReminderPermission;
  onEnable: () => void;
}

/** Explains reminders before the OS prompt, or points to Settings if they were turned off. */
export function RemindersBanner({ permission, onEnable }: Props) {
  if (permission === 'granted' || permission === 'unsupported') return null;
  const denied = permission === 'denied';

  return (
    <View style={styles.box}>
      <Text style={styles.heading} accessibilityRole="header">
        {denied ? 'Reminders are off' : 'Get a reminder for each session'}
      </Text>
      <Text style={styles.body}>
        {denied
          ? 'Turn on notifications for this app in Settings to get exercise reminders.'
          : 'Between can remind you when it is time to exercise. You can mark it done right from the reminder.'}
      </Text>
      <Pressable
        onPress={denied ? () => void Linking.openSettings() : onEnable}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{denied ? 'Open Settings' : 'Turn on reminders'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: radius.card, padding: 20, gap: 8 },
  heading: { fontSize: type.heading - 2, fontWeight: '800', color: colors.navy },
  body: { fontSize: type.small, color: colors.muted, lineHeight: 25 },
  button: {
    marginTop: 6,
    minHeight: TAP,
    borderRadius: radius.button,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: type.body, fontWeight: '800', color: colors.navy },
});

import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CalendarPermission } from '../calendar/native';
import type { CalendarStatus } from '../calendar/useCalendarSync';
import { formatTime } from '../logic/dates';
import { colors, radius, TAP, type } from './theme';

interface Props {
  permission: CalendarPermission;
  status: CalendarStatus;
  enabled: boolean;
  lastSyncedAt?: string;
  onEnable: () => void;
  onDisable: () => void;
  onSync: () => void;
}

export function CalendarCard({ permission, status, enabled, lastSyncedAt, onEnable, onDisable, onSync }: Props) {
  if (permission === 'unsupported') return null;
  const busy = status === 'syncing';

  if (permission === 'denied') {
    return (
      <View style={styles.box}>
        <Text style={styles.heading} accessibilityRole="header">
          Calendar access is off
        </Text>
        <Text style={styles.body}>To see your plan in your phone's calendar, allow calendar access in Settings.</Text>
        <Button label="Open Settings" onPress={() => void Linking.openSettings()} />
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={styles.box}>
        <Text style={styles.heading} accessibilityRole="header">
          Put your plan in your calendar
        </Text>
        <Text style={styles.body}>
          Between adds your exercise sessions and visits to a separate "Between" calendar on this phone. Your other
          calendars are not changed.
        </Text>
        <Button label="Add to my calendar" onPress={onEnable} />
      </View>
    );
  }

  const confirmRemove = () =>
    Alert.alert(
      'Remove from calendar?',
      'This removes the Between calendar and its events from your phone. You can add it again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDisable },
      ],
    );

  const statusText =
    status === 'error'
      ? 'Could not update your calendar. Try again.'
      : busy
        ? 'Updating your calendar…'
        : lastSyncedAt
          ? `Updated at ${formatTime(new Date(lastSyncedAt))}`
          : 'Waiting to update';

  return (
    <View style={styles.box}>
      <Text style={styles.heading} accessibilityRole="header">
        In your calendar
      </Text>
      <View style={styles.statusRow} accessible accessibilityLiveRegion="polite">
        {busy && <ActivityIndicator color={colors.blue} />}
        <Text style={[styles.body, status === 'error' && styles.error]}>{statusText}</Text>
      </View>
      <View style={styles.row}>
        <Button label="Update now" onPress={onSync} disabled={busy} style={{ flex: 1 }} />
        <Button label="Remove" onPress={confirmRemove} disabled={busy} variant="secondary" style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: object;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: colors.navy }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: radius.card, padding: 20, gap: 8 },
  heading: { fontSize: type.heading - 2, fontWeight: '800', color: colors.navy },
  body: { fontSize: type.small, color: colors.muted, lineHeight: 25 },
  error: { color: '#A3261A' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 12, marginTop: 6 },
  button: {
    marginTop: 6,
    minHeight: TAP,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primary: { backgroundColor: colors.yellow },
  secondary: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line },
  buttonText: { fontSize: type.body, fontWeight: '800' },
});

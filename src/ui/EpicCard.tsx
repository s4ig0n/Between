import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { EpicImportState } from '../store/useBetweenStore';
import type { EpicStatus } from '../fhir/useEpic';
import { formatTime } from '../logic/dates';
import { colors, radius, TAP, type } from './theme';

interface Props {
  epic: EpicImportState;
  status: EpicStatus;
  error?: string;
  redirectUri: string;
  onConnect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export function EpicCard({ epic, status, error, redirectUri, onConnect, onRefresh, onDisconnect }: Props) {
  const busy = status === 'working';

  if (!epic.connected) {
    return (
      <View style={styles.box}>
        <Text style={styles.tag}>EPIC SANDBOX · TEST PATIENTS ONLY</Text>
        <Text style={styles.heading} accessibilityRole="header">
          Bring in your visits
        </Text>
        <Text style={styles.body}>
          Sign in with a MyChart test patient to show its appointments here and in your calendar.
        </Text>
        {status === 'error' && <Text style={[styles.body, styles.error]}>{error}</Text>}
        <Button label={busy ? 'Signing in…' : 'Connect to Epic sandbox'} onPress={onConnect} disabled={busy} />
        {__DEV__ && (
          <Text style={styles.dev} selectable>
            Redirect URI to register in Epic: {redirectUri}
          </Text>
        )}
      </View>
    );
  }

  const now = Date.now();
  const upcoming = epic.appointments.filter((a) => Date.parse(a.start) >= now).length;
  const summary = `${epic.appointments.length} appointment${epic.appointments.length === 1 ? '' : 's'} imported, ${upcoming} upcoming`;

  const statusText =
    status === 'working'
      ? 'Checking Epic for changes…'
      : status === 'expired'
        ? 'Your Epic sign-in has ended. Sign in again to check for changes.'
        : status === 'error'
          ? error
          : epic.lastImportedAt
            ? `Updated at ${formatTime(new Date(epic.lastImportedAt))}`
            : undefined;

  const confirmDisconnect = () =>
    Alert.alert('Disconnect Epic?', 'This signs you out and removes the imported appointments from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: onDisconnect },
    ]);

  return (
    <View style={styles.box}>
      <Text style={styles.tag}>EPIC SANDBOX · TEST PATIENTS ONLY</Text>
      <Text style={styles.heading} accessibilityRole="header">
        {epic.patientName ? `Connected as ${epic.patientName}` : 'Connected to Epic'}
      </Text>
      <Text style={styles.body}>{summary}</Text>
      {statusText && (
        <View style={styles.statusRow} accessible accessibilityLiveRegion="polite">
          {busy && <ActivityIndicator color={colors.blue} />}
          <Text style={[styles.body, status === 'error' && styles.error]}>{statusText}</Text>
        </View>
      )}
      <View style={styles.row}>
        <Button
          label={status === 'expired' ? 'Sign in again' : 'Update'}
          onPress={status === 'expired' ? onConnect : onRefresh}
          disabled={busy}
          style={{ flex: 1 }}
        />
        <Button label="Disconnect" onPress={confirmDisconnect} disabled={busy} variant="secondary" style={{ flex: 1 }} />
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: radius.card, padding: 20, gap: 8 },
  tag: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: colors.muted },
  heading: { fontSize: type.heading - 2, fontWeight: '800', color: colors.navy },
  body: { fontSize: type.small, color: colors.muted, lineHeight: 25 },
  error: { color: '#A3261A' },
  dev: { fontSize: 13, color: colors.muted, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
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
  buttonText: { fontSize: type.body, fontWeight: '800', color: colors.navy },
});

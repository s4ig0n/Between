import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { EpicImportState } from '../store/useBetweenStore';
import type { EpicStatus } from '../fhir/useEpic';
import { formatMediumDate, formatTime } from '../logic/dates';
import { colors, radius, TAP, type } from './theme';

interface Props {
  epic: EpicImportState;
  status: EpicStatus;
  error?: string;
  redirectUri: string;
  onConnect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  onToggleDemo: (on: boolean) => void;
}

export function EpicCard({ epic, status, error, redirectUri, onConnect, onRefresh, onDisconnect, onToggleDemo }: Props) {
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

      {epic.appointments.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listHeading} accessibilityRole="header">
            Imported from Epic
          </Text>
          {epic.appointments.map((a) => {
            const start = new Date(a.start);
            const past = start.getTime() < now;
            const when = `${formatMediumDate(start)} · ${formatTime(start)}`;
            return (
              <View
                key={a.id}
                style={styles.item}
                accessible
                accessibilityLabel={`${a.title}, ${when}${a.location ? `, ${a.location}` : ''}${past ? ', past visit' : ''}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{a.title}</Text>
                  <Text style={styles.itemMeta}>{when}</Text>
                  {a.location ? <Text style={styles.itemMeta}>{a.location}</Text> : null}
                </View>
                {past && <Text style={styles.pastTag}>Past</Text>}
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={() => onToggleDemo(!epic.demoDates)}
        style={styles.demoRow}
        accessibilityRole="switch"
        accessibilityState={{ checked: !!epic.demoDates }}
        accessibilityLabel="Demo: show sandbox visits as upcoming"
        accessibilityHint="Moves the test patient's past visits into the coming days on the Today screen and calendar"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.demoTitle}>Demo: show as upcoming</Text>
          <Text style={styles.itemMeta}>
            Moves these test visits into the coming days on Today and in your calendar, marked "demo date".
          </Text>
        </View>
        <Switch
          value={!!epic.demoDates}
          onValueChange={onToggleDemo}
          trackColor={{ true: colors.blue, false: colors.ring }}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      </Pressable>

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
  list: { marginTop: 4, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 10 },
  listHeading: { fontSize: type.small, fontWeight: '800', color: colors.navy },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { fontSize: type.small, fontWeight: '700', color: colors.navy },
  itemMeta: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  pastTag: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.muted,
    borderWidth: 1.5,
    borderColor: colors.ring,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: TAP,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    marginTop: 4,
  },
  demoTitle: { fontSize: type.small, fontWeight: '700', color: colors.navy },
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

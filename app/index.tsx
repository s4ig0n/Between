import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCalendarSync } from '../src/calendar/useCalendarSync';
import { formatDuration, formatLongDate, formatShortWeekday, formatTime } from '../src/logic/dates';
import { agendaFor, nextUp, upcomingAppointments } from '../src/logic/schedule';
import { useReminders } from '../src/notifications/useReminders';
import { useBetweenStore } from '../src/store/useBetweenStore';
import { usePlan } from '../src/store/usePlan';
import { AgendaRow } from '../src/ui/AgendaRow';
import { CalendarCard } from '../src/ui/CalendarCard';
import { EpicCard } from '../src/ui/EpicCard';
import { epicRedirectUri } from '../src/fhir';
import { useEpic } from '../src/fhir/useEpic';
import { DevTestReminder } from '../src/ui/DevTestReminder';
import { Logo } from '../src/ui/Logo';
import { NextUpCard } from '../src/ui/NextUpCard';
import { RemindersBanner } from '../src/ui/RemindersBanner';
import { colors, radius, type } from '../src/ui/theme';

/** Re-render every minute so "next up" and overdue state stay current. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function TodayScreen() {
  const now = useNow();
  const plan = usePlan(now);
  const { permission, requestPermission } = useReminders(plan);
  const cal = useCalendarSync(plan);
  const epic = useEpic();

  const { log, snoozes, hydrated, toggle, markDone, snooze } = useBetweenStore();

  const agenda = useMemo(() => agendaFor(plan, now, log), [plan, now, log]);
  const upcoming = useMemo(() => upcomingAppointments(plan, now, 7), [plan, now]);
  const next = nextUp(agenda, now, snoozes);

  if (!hydrated) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.white} size="large" accessibilityLabel="Loading" />
      </View>
    );
  }

  const rows = [
    ...agenda.map((item) => ({
      item,
      when: undefined as string | undefined,
      subtitle: item.kind === 'appointment' ? formatDuration(item.durationMinutes) : undefined,
    })),
    ...upcoming.map((a) => ({
      item: { ...a, done: false },
      when: formatShortWeekday(a.start),
      subtitle: formatTime(a.start),
    })),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Logo />
        <View style={styles.header}>
          <Text style={styles.date}>{formatLongDate(now)}</Text>
          <Text style={styles.title} accessibilityRole="header">
            Today
          </Text>
        </View>

        <View style={styles.card}>
          {next && (
            <NextUpCard
              occurrence={next}
              now={now}
              onDone={() => markDone(next, 'app')}
              onLater={() => snooze(next.id, 60)}
            />
          )}

          <View style={next ? styles.listAfterCard : undefined}>
            {rows.length === 0 ? (
              <Text style={styles.empty}>Nothing scheduled today. Enjoy the rest.</Text>
            ) : (
              rows.map(({ item, when, subtitle }, i) => (
                <AgendaRow
                  key={item.id}
                  item={item}
                  when={when}
                  subtitle={subtitle}
                  last={i === rows.length - 1}
                  onToggle={item.kind === 'exercise' ? () => toggle(item) : undefined}
                />
              ))
            )}
          </View>
        </View>

        <RemindersBanner permission={permission} onEnable={requestPermission} />
        {epic.available && (
          <EpicCard
            epic={epic.epic}
            status={epic.status}
            error={epic.error}
            redirectUri={epicRedirectUri()}
            onConnect={epic.connect}
            onRefresh={epic.refresh}
            onDisconnect={epic.disconnect}
          />
        )}
        <CalendarCard
          permission={cal.permission}
          status={cal.status}
          enabled={cal.enabled}
          lastSyncedAt={cal.lastSyncedAt}
          onEnable={cal.enable}
          onDisable={cal.disable}
          onSync={cal.syncNow}
        />
        {permission === 'granted' && <DevTestReminder agenda={agenda} />}

        <Text style={styles.footnote}>
          {epic.epic.connected
            ? 'Visits from the Epic sandbox (test patient). Exercises are sample data.'
            : 'Sample data for demonstration. Not a real patient.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blue },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  header: { marginTop: 8 },
  date: { fontSize: type.body, color: colors.onBlueMuted },
  title: { fontSize: type.title, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 16 },
  listAfterCard: { marginTop: 12 },
  empty: { fontSize: type.body, color: colors.muted, paddingVertical: 24, textAlign: 'center' },
  footnote: { fontSize: type.small - 2, color: colors.onBlueMuted, textAlign: 'center' },
});

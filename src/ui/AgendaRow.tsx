import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AgendaItem } from '../model/types';
import { formatTime } from '../logic/dates';
import { CheckCircle } from './CheckCircle';
import { colors, TAP, type } from './theme';

interface Props {
  item: AgendaItem;
  /** Left column text; defaults to the start time. */
  when?: string;
  /** Second line under the title. */
  subtitle?: string;
  onToggle?: () => void;
  last?: boolean;
}

export function AgendaRow({ item, when, subtitle, onToggle, last }: Props) {
  const time = when ?? formatTime(item.start);
  const isExercise = item.kind === 'exercise';

  const body = (
    <>
      <Text style={styles.time} maxFontSizeMultiplier={1.6}>
        {time}
      </Text>
      <View style={styles.main}>
        <Text style={[styles.title, item.done && styles.titleDone]} maxFontSizeMultiplier={1.8}>
          {item.title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.8}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {isExercise && <CheckCircle done={item.done} />}
    </>
  );

  const rowStyle = [styles.row, !last && styles.divider];

  if (!isExercise || !onToggle) {
    return (
      <View
        style={rowStyle}
        accessible
        accessibilityLabel={`${item.title}, ${time}${subtitle ? `, ${subtitle}` : ''}`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.done }}
      // Web needs the explicit ARIA attribute to announce checked state.
      aria-checked={item.done}
      accessibilityLabel={`${item.title}, ${time}`}
      accessibilityHint={item.done ? 'Mark as not done' : 'Mark as done'}
      // Checkboxes toggle with Space on a keyboard; Enter is handled by Pressable.
      onKeyDown={(e) => {
        const key = (e.nativeEvent as { key?: string }).key;
        if (key === ' ' || key === 'Spacebar') {
          (e as unknown as { preventDefault?: () => void }).preventDefault?.();
          onToggle();
        }
      }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TAP + 16,
    paddingVertical: 14,
    gap: 14,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.cardSoft },
  time: { width: 80, fontSize: type.small, color: colors.muted, fontVariant: ['tabular-nums'] },
  main: { flex: 1 },
  title: { fontSize: type.body, fontWeight: '700', color: colors.navy },
  titleDone: { textDecorationLine: 'line-through', color: colors.muted, fontWeight: '500' },
  subtitle: { fontSize: type.small, color: colors.muted, marginTop: 2 },
});

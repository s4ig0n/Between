import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

/** The three-bar mark and wordmark from the mockup. */
export function Logo({ color = colors.white }: { color?: string }) {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Between">
      <LogoMark />
      <Text style={[styles.word, { color }]}>between</Text>
    </View>
  );
}

export function LogoMark({ size = 26, color = colors.yellow }: { size?: number; color?: string }) {
  const bar = { height: Math.max(3, size / 9), backgroundColor: color, borderRadius: 2 };
  return (
    <View style={{ width: size, height: size * 0.75, justifyContent: 'space-between' }}>
      <View style={[bar, { width: size }]} />
      <View style={[bar, { width: size * 0.7, marginLeft: size * 0.3 }]} />
      <View style={[bar, { width: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  word: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
});

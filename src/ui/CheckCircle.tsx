import { StyleSheet, View } from 'react-native';
import { colors } from './theme';

/** Yellow filled circle with a check when done, empty ring otherwise. Decorative only. */
export function CheckCircle({ done, size = 34 }: { done: boolean; size?: number }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        done ? styles.done : styles.empty,
      ]}
    >
      {done && (
        <View
          style={{
            width: size * 0.42,
            height: size * 0.24,
            borderLeftWidth: 3,
            borderBottomWidth: 3,
            borderColor: colors.navy,
            transform: [{ rotate: '-45deg' }],
            marginTop: -size * 0.08,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.yellow },
  empty: { borderWidth: 2.5, borderColor: colors.ring, backgroundColor: colors.white },
});

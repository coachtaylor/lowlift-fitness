import { Play } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { colors, easing, motion, radius, spacing } from '../theme/tokens';

type Props = {
  onPress: () => void;
};

export function StartSessionButton({ onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start session"
        onPress={onPress}
        onPressIn={() =>
          Animated.timing(scale, {
            toValue: 0.97,
            duration: motion.fast,
            easing: Easing.bezier(...easing.default),
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.timing(scale, {
            toValue: 1,
            duration: motion.fast,
            easing: Easing.bezier(...easing.bounce),
            useNativeDriver: true,
          }).start()
        }
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: pressed ? colors.voltDark : colors.volt },
        ]}
      >
        <Play size={20} color={colors.black} strokeWidth={2} fill={colors.black} />
        <Text style={styles.label}>Start session</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.lg,
    minHeight: 56,
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  label: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '700',
  },
});

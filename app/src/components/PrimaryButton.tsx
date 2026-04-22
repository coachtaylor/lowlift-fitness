import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { colors, easing, motion, radius, spacing } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
};

export function PrimaryButton({ label, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.97,
      duration: motion.fast,
      easing: Easing.bezier(...easing.default),
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: motion.fast,
      easing: Easing.bezier(...easing.bounce),
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: pressed ? colors.voltDark : colors.volt },
        ]}
      >
        <Text style={styles.label}>{label}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '700',
  },
});

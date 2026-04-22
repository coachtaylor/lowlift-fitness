import { BlurView } from 'expo-blur';
import { ChevronRight, Dumbbell, StretchHorizontal, Zap } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedTransparency } from '../hooks/useReducedTransparency';
import { colors, motion, radius, spacing } from '../theme/tokens';

export type SessionType = 'move' | 'stretch' | 'both';

type Props = {
  type: SessionType;
  name: string;
  duration: string;
  onPress: () => void;
};

const ICONS = {
  move: Dumbbell,
  stretch: StretchHorizontal,
  both: Zap,
} as const;

export function SessionCard({ type, name, duration, onPress }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const Icon = ICONS[type];
  const reduced = useReducedTransparency();

  const pressIn = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -2,
        duration: motion.normal,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.98,
        duration: motion.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.normal,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const inner = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${duration}`}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={styles.content}
    >
      <View style={styles.left}>
        <Icon size={20} color={colors.gray400} strokeWidth={2} />
        <View style={styles.text}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
      </View>
      <View style={styles.arrow}>
        <ChevronRight size={20} color={colors.gray600} strokeWidth={2} />
      </View>
    </Pressable>
  );

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {reduced ? (
        <View style={[styles.surface, styles.surfaceSolid]}>{inner}</View>
      ) : (
        <BlurView intensity={30} tint="light" style={[styles.surface, styles.surfaceBlur]}>
          {inner}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  surface: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  surfaceBlur: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  surfaceSolid: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  content: {
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  text: {
    gap: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.black,
  },
  duration: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.dustyBlue,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

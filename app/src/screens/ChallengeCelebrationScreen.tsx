import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, easing, radius, spacing } from '../theme/tokens';

type Props = {
  onDismiss: () => void;
};

// Brief dramatic arrival on completion. Fades in over 400ms, holds for ~1.8s,
// fades out over 400ms, then calls onDismiss. The Challenge tab now owns the
// post-completion resting state (OptionDone), so this screen has no buttons —
// just the moment. Tap anywhere to skip ahead.
const ENTRY_MS = 400;
const HOLD_MS = 1800;
const EXIT_MS = 400;
const TOTAL_MS = ENTRY_MS + HOLD_MS + EXIT_MS;

export function ChallengeCelebrationScreen({ onDismiss }: Props) {
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.85)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.5)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;

  const dismissedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: EXIT_MS,
      easing: Easing.bezier(...easing.default),
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  useEffect(() => {
    const ease = Easing.bezier(...easing.default);
    const bounce = Easing.bezier(...easing.bounce);

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 200,
        easing: ease,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: ENTRY_MS,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: ENTRY_MS,
          easing: bounce,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(checkOpacity, {
            toValue: 1,
            duration: 280,
            easing: ease,
            useNativeDriver: true,
          }),
          Animated.timing(checkScale, {
            toValue: 1,
            duration: 320,
            easing: bounce,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(280),
        Animated.parallel([
          Animated.timing(headlineOpacity, {
            toValue: 1,
            duration: 320,
            easing: ease,
            useNativeDriver: true,
          }),
          Animated.timing(headlineY, {
            toValue: 0,
            duration: 320,
            easing: ease,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 280,
          easing: ease,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      dismiss();
    }, ENTRY_MS + HOLD_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue"
        onPress={dismiss}
        style={StyleSheet.absoluteFill}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <View style={styles.heroWrap}>
              <Animated.View
                style={[
                  styles.halo,
                  { opacity: haloOpacity, transform: [{ scale: haloScale }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.checkWrap,
                  { opacity: checkOpacity, transform: [{ scale: checkScale }] },
                ]}
              >
                <Check size={56} color={colors.black} strokeWidth={4} />
              </Animated.View>
            </View>

            <Animated.Text
              style={[
                styles.headline,
                { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
              ]}
            >
              You earned the day.
            </Animated.Text>

            <Animated.Text style={[styles.sub, { opacity: subOpacity }]}>
              Tomorrow's challenge unlocks at midnight.
            </Animated.Text>
          </View>
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
}

// Exported so App.tsx knows roughly how long the moment runs, in case it
// wants to coordinate other transitions. The screen itself self-dismisses
// reliably via onDismiss, so no consumer is required to use this.
export const CHALLENGE_CELEBRATION_DURATION_MS = TOTAL_MS;

const HALO_SIZE = 220;
const CHECK_TILE = 96;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
    gap: spacing.s5,
  },
  heroWrap: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s2,
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radius.full,
    backgroundColor: 'rgba(205,255,0,0.14)',
    borderColor: 'rgba(205,255,0,0.32)',
    borderWidth: 1,
  },
  checkWrap: {
    width: CHECK_TILE,
    height: CHECK_TILE,
    borderRadius: radius.full,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.volt,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.08,
    lineHeight: 40,
    color: colors.white,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },
});

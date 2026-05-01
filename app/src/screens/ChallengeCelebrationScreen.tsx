import { useEffect, useRef } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import {
  DailyChallenge,
  DailyChallengeMovementType,
} from '../data/dailyChallenge';
import { colors, easing, radius, spacing } from '../theme/tokens';

type Props = {
  challenge: DailyChallenge;
  onSetTomorrow: () => void;
  onBackToDashboard: () => void;
};

const MOVEMENT_LABELS: Record<DailyChallengeMovementType, string> = {
  pushups: 'push ups',
  squats: 'squats',
  burpees: 'burpees',
};

function formatBreakdown(challenge: DailyChallenge): string {
  return challenge.movements
    .map((m) => `${m.goalReps} ${MOVEMENT_LABELS[m.type]}`)
    .join(', ');
}

export function ChallengeCelebrationScreen({
  challenge,
  onSetTomorrow,
  onBackToDashboard,
}: Props) {
  const totalReps = challenge.movements.reduce((a, m) => a + m.goalReps, 0);
  const breakdown = formatBreakdown(challenge);
  const repeatDaily = challenge.repeatDaily;

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.8)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(8)).current;
  const repeatOpacity = useRef(new Animated.Value(0)).current;
  const primaryOpacity = useRef(new Animated.Value(0)).current;
  const primaryY = useRef(new Animated.Value(8)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;
  const secondaryY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const ease = Easing.bezier(...easing.default);
    const fadeIn = (val: Animated.Value, duration: number) =>
      Animated.timing(val, { toValue: 1, duration, easing: ease, useNativeDriver: true });
    const slideTo0 = (val: Animated.Value, duration: number) =>
      Animated.timing(val, { toValue: 0, duration, easing: ease, useNativeDriver: true });
    const delay = (ms: number) => Animated.delay(ms);

    Animated.parallel([
      fadeIn(bgOpacity, 300),
      Animated.sequence([
        delay(100),
        Animated.parallel([fadeIn(haloOpacity, 400), Animated.timing(haloScale, {
          toValue: 1,
          duration: 400,
          easing: ease,
          useNativeDriver: true,
        })]),
      ]),
      Animated.sequence([
        delay(250),
        Animated.parallel([fadeIn(headlineOpacity, 350), slideTo0(headlineY, 350)]),
      ]),
      Animated.sequence([
        delay(550),
        Animated.parallel([fadeIn(cardOpacity, 300), slideTo0(cardY, 300)]),
      ]),
      Animated.sequence([delay(800), fadeIn(repeatOpacity, 250)]),
      Animated.sequence([
        delay(900),
        Animated.parallel([fadeIn(primaryOpacity, 250), slideTo0(primaryY, 250)]),
      ]),
      Animated.sequence([
        delay(1000),
        Animated.parallel([fadeIn(secondaryOpacity, 250), slideTo0(secondaryY, 250)]),
      ]),
    ]).start();
  }, [
    bgOpacity,
    haloOpacity,
    haloScale,
    headlineOpacity,
    headlineY,
    cardOpacity,
    cardY,
    repeatOpacity,
    primaryOpacity,
    primaryY,
    secondaryOpacity,
    secondaryY,
  ]);

  return (
    <Animated.View style={[styles.root, { opacity: bgOpacity }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.heroWrap}>
            <Animated.View
              style={[
                styles.halo,
                { opacity: haloOpacity, transform: [{ scale: haloScale }] },
              ]}
            />
            <Animated.Text
              style={[
                styles.headline,
                { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
              ]}
            >
              Challenge{'\n'}crushed!
            </Animated.Text>
          </View>

          <Animated.View
            style={{ opacity: cardOpacity, transform: [{ translateY: cardY }] }}
          >
            <GlassCard tint="dark" style={styles.cardWrap} contentStyle={styles.card}>
              <Text style={styles.totalLabel}>TOTAL REPS TODAY</Text>
              <Text style={styles.totalReps}>{totalReps}</Text>
              <Text style={styles.breakdown}>{breakdown}</Text>
            </GlassCard>
          </Animated.View>

          <View style={styles.bottomSpacer} />

          {repeatDaily ? (
            <>
              <Animated.Text style={[styles.repeatNote, { opacity: repeatOpacity }]}>
                Same challenge tomorrow
              </Animated.Text>
              <Animated.View
                style={{ opacity: primaryOpacity, transform: [{ translateY: primaryY }] }}
              >
                <PrimaryButton label="See You Tomorrow" onPress={onBackToDashboard} />
              </Animated.View>
            </>
          ) : (
            <>
              <Animated.View
                style={{ opacity: primaryOpacity, transform: [{ translateY: primaryY }] }}
              >
                <PrimaryButton label="Set Tomorrow's Challenge" onPress={onSetTomorrow} />
              </Animated.View>
              <View style={{ height: spacing.s3 }} />
              <Animated.View
                style={{ opacity: secondaryOpacity, transform: [{ translateY: secondaryY }] }}
              >
                <SecondaryButton label="Back to Dashboard" onPress={onBackToDashboard} />
              </Animated.View>
            </>
          )}
          <View style={{ height: spacing.s6 }} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const HALO_SIZE = 280;

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
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s16,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s10,
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radius.full,
    backgroundColor: 'rgba(205,255,0,0.12)',
    borderColor: 'rgba(205,255,0,0.25)',
    borderWidth: 1,
  },
  headline: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 52,
    color: colors.volt,
    textAlign: 'center',
    paddingVertical: spacing.s10,
  },
  cardWrap: {
    borderColor: 'rgba(205,255,0,0.4)',
    shadowColor: colors.volt,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    paddingVertical: spacing.s8,
    paddingHorizontal: spacing.s6,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.gray400,
    textTransform: 'uppercase',
  },
  totalReps: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -2,
    lineHeight: 78,
    marginTop: spacing.s2,
  },
  breakdown: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray300,
    textAlign: 'center',
    marginTop: spacing.s3,
    lineHeight: 24,
  },
  bottomSpacer: {
    flex: 1,
  },
  repeatNote: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.s4,
  },
});

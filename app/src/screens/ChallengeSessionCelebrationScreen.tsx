import { useEffect, useRef } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  DailyChallenge,
  DailyChallengeMovementType,
} from '../data/dailyChallenge';
import { colors, easing, radius, spacing } from '../theme/tokens';

type Props = {
  challenge: DailyChallenge;
  sessionReps: Partial<Record<DailyChallengeMovementType, number>>;
  onContinue: () => void;
};

const MOVEMENT_LABELS: Record<DailyChallengeMovementType, string> = {
  pushups: 'push ups',
  squats: 'squats',
  burpees: 'burpees',
};

function progressFor(challenge: DailyChallenge) {
  return challenge.movements.map((m) => {
    const pct = m.goalReps > 0 ? Math.min(1, m.completedReps / m.goalReps) : 0;
    return {
      type: m.type,
      completed: m.completedReps,
      goal: m.goalReps,
      pct,
    };
  });
}

export function ChallengeSessionCelebrationScreen({
  challenge,
  sessionReps,
  onContinue,
}: Props) {
  const sessionTotal = challenge.movements.reduce(
    (a, m) => a + (sessionReps[m.type] ?? 0),
    0,
  );
  const dayRemaining = challenge.movements.reduce(
    (a, m) => a + Math.max(0, m.goalReps - m.completedReps),
    0,
  );
  const rows = progressFor(challenge);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(8)).current;
  const noteOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaY = useRef(new Animated.Value(8)).current;
  const barFills = useRef(rows.map(() => new Animated.Value(0))).current;

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
        Animated.parallel([fadeIn(headlineOpacity, 350), slideTo0(headlineY, 350)]),
      ]),
      Animated.sequence([
        delay(350),
        Animated.parallel([fadeIn(cardOpacity, 300), slideTo0(cardY, 300)]),
      ]),
      Animated.sequence([
        delay(550),
        Animated.stagger(
          120,
          barFills.map((v, i) =>
            Animated.timing(v, {
              toValue: rows[i].pct,
              duration: 600,
              easing: ease,
              useNativeDriver: false,
            }),
          ),
        ),
      ]),
      Animated.sequence([delay(800), fadeIn(noteOpacity, 250)]),
      Animated.sequence([
        delay(950),
        Animated.parallel([fadeIn(ctaOpacity, 250), slideTo0(ctaY, 250)]),
      ]),
    ]).start();
  }, [bgOpacity, headlineOpacity, headlineY, cardOpacity, cardY, noteOpacity, ctaOpacity, ctaY, barFills, rows]);

  return (
    <Animated.View style={[styles.root, { opacity: bgOpacity }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Animated.View
            style={{ opacity: headlineOpacity, transform: [{ translateY: headlineY }] }}
          >
            <Text style={styles.overline}>SESSION DONE</Text>
            <Text style={styles.headline}>Nice work.</Text>
            <Text style={styles.subhead}>
              {sessionTotal} {sessionTotal === 1 ? 'rep' : 'reps'} banked.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.cardWrap,
              { opacity: cardOpacity, transform: [{ translateY: cardY }] },
            ]}
          >
            <GlassCard tint="dark" contentStyle={styles.card}>
              <Text style={styles.cardLabel}>TODAY'S PROGRESS</Text>
              {rows.map((row, i) => (
                <View key={row.type} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowName}>{MOVEMENT_LABELS[row.type]}</Text>
                    <Text style={styles.rowCount}>
                      {row.completed}
                      <Text style={styles.rowGoal}> / {row.goal}</Text>
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <Animated.View
                      style={[
                        styles.fill,
                        {
                          width: barFills[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </GlassCard>
          </Animated.View>

          <View style={styles.bottomSpacer} />

          <Animated.Text style={[styles.note, { opacity: noteOpacity }]}>
            {dayRemaining > 0
              ? `${dayRemaining} ${dayRemaining === 1 ? 'rep' : 'reps'} left for the day.`
              : 'You finished the whole challenge.'}
          </Animated.Text>

          <Animated.View
            style={{ opacity: ctaOpacity, transform: [{ translateY: ctaY }] }}
          >
            <PrimaryButton label="Continue" onPress={onContinue} />
          </Animated.View>
          <View style={{ height: spacing.s6 }} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

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
  overline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.volt,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  headline: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 44,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.s3,
  },
  subhead: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.gray300,
    textAlign: 'center',
    marginTop: spacing.s2,
  },
  cardWrap: {
    marginTop: spacing.s10,
  },
  card: {
    paddingVertical: spacing.s6,
    paddingHorizontal: spacing.s5,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.gray400,
    textTransform: 'uppercase',
    marginBottom: spacing.s4,
  },
  row: {
    marginTop: spacing.s4,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.s2,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  rowCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  rowGoal: {
    fontWeight: '500',
    color: colors.gray400,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.volt,
  },
  bottomSpacer: {
    flex: 1,
  },
  note: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.s4,
  },
});

import { X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { ProgressDots } from '../components/ProgressDots';
import {
  DailyChallenge,
  DailyChallengeMovementType,
  SessionRepPlan,
  calculateSessionReps,
  completeSession,
  loadChallenge,
} from '../data/dailyChallenge';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  onFinish: (
    updated: DailyChallenge | null,
    sessionReps: Partial<Record<DailyChallengeMovementType, number>>,
  ) => void;
  onExit: () => void;
};

const MOVEMENT_LABELS: Record<DailyChallengeMovementType, string> = {
  pushups: 'Push Ups',
  squats: 'Squats',
  burpees: 'Burpees',
};

const NEXT_DELAY_MS = 2000;

function repsLabel(reps: number): string {
  return `${reps} ${reps === 1 ? 'rep' : 'reps'}`;
}

function coachingText(type: DailyChallengeMovementType, reps: number): string {
  const r = repsLabel(reps);
  switch (type) {
    case 'pushups':
      return `Drop down and give yourself ${r}. Steady pace, breathe through it.`;
    case 'squats':
      return `Plant your feet, sit back, and power through ${r}. You set the tempo.`;
    case 'burpees':
      return `Full send for ${r}. Drop, push, jump. You know the drill.`;
  }
}

export function ChallengeSessionScreen({ onFinish, onExit }: Props) {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [plan, setPlan] = useState<SessionRepPlan[]>([]);
  const [index, setIndex] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await loadChallenge();
      if (cancelled) return;
      if (!c) {
        onExit();
        return;
      }
      const sessionPlan = calculateSessionReps(c).filter(
        (p) => p.repsThisSession > 0,
      );
      if (sessionPlan.length === 0) {
        onExit();
        return;
      }
      setChallenge(c);
      setPlan(sessionPlan);
    })();
    return () => {
      cancelled = true;
    };
  }, [onExit]);

  // Lock the Next button briefly when the movement changes.
  useEffect(() => {
    if (plan.length === 0) return;
    setCanAdvance(false);
    const id = setTimeout(() => setCanAdvance(true), NEXT_DELAY_MS);
    return () => clearTimeout(id);
  }, [index, plan.length]);

  const repsPerMovement = useMemo(() => {
    const map: Partial<Record<DailyChallengeMovementType, number>> = {};
    for (const p of plan) {
      map[p.type] = (map[p.type] ?? 0) + p.repsThisSession;
    }
    return map;
  }, [plan]);

  if (!challenge || plan.length === 0) {
    return <SafeAreaView style={styles.safe} />;
  }

  const total = plan.length;
  const current = plan[index];
  const isLast = index === total - 1;
  const sessionNumber = challenge.sessionsCompletedToday + 1;

  const advance = () => {
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIndex((i) => i + 1);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    let updated: DailyChallenge | null = null;
    try {
      updated = await completeSession(repsPerMovement);
    } catch (e) {
      console.warn('[challenge-session] completeSession failed:', e);
    }
    onFinish(updated, repsPerMovement);
  };

  const handlePress = () => {
    if (!canAdvance) return;
    if (isLast) {
      finish();
    } else {
      advance();
    }
  };

  const buttonLabel = isLast ? 'Complete' : 'Next';
  const buttonDisabled = !canAdvance || submitting;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.overline}>SESSION {sessionNumber}</Text>
          <View style={styles.headerRight}>
            <ProgressDots total={total} current={index} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit challenge session"
              onPress={onExit}
              hitSlop={16}
              style={styles.exitBtn}
            >
              <X size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />

        <Animated.View style={{ opacity: contentOpacity }}>
          <GlassCard tint="dark" contentStyle={styles.card}>
            <Text style={styles.repCount}>{repsLabel(current.repsThisSession)}</Text>
            <Text style={styles.movementName}>{MOVEMENT_LABELS[current.type]}</Text>
            <Text style={styles.coaching}>
              {coachingText(current.type, current.repsThisSession)}
            </Text>
          </GlassCard>
        </Animated.View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            accessibilityState={{ disabled: buttonDisabled }}
            disabled={buttonDisabled}
            onPress={handlePress}
            style={({ pressed }) => [
              styles.cta,
              buttonDisabled && styles.ctaDisabled,
              pressed && !buttonDisabled && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.ctaLabel}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.black,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s4,
  },
  overline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.gray400,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  exitBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },
  card: {
    paddingVertical: spacing.s10,
    paddingHorizontal: spacing.s6,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repCount: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.volt,
    letterSpacing: -2,
    lineHeight: 60,
    textAlign: 'center',
  },
  movementName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.s4,
    letterSpacing: -0.5,
  },
  coaching: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: spacing.s5,
    paddingHorizontal: spacing.s2,
  },
  footer: {
    paddingBottom: spacing.s6,
  },
  cta: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s8,
  },
  ctaDisabled: {
    backgroundColor: 'rgba(205,255,0,0.35)',
  },
  ctaLabel: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '700',
  },
});

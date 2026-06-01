import { Check, Minus, Pencil, Play, Plus, Target } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import {
  AppState,
  AppStateStatus,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import {
  DailyChallenge,
  DailyChallengeMovementType,
  flushPendingProgress,
  incrementMovementReps,
} from '../data/dailyChallenge';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  challenge: DailyChallenge | null;
  onSetupChallenge: () => void;
  onStartChallengeSession: () => void;
  onEditChallenge: () => void;
  onSeeProgress: () => void;
  onChallengeUpdated: (next: DailyChallenge) => void;
};

const MOVEMENT_LABELS: Record<DailyChallengeMovementType, string> = {
  pushups: 'Push Ups',
  squats: 'Squats',
  situps: 'Sit Ups',
  burpees: 'Burpees',
};

const MOVEMENT_COLORS: Record<DailyChallengeMovementType, string> = {
  pushups: colors.dustyBlue,
  squats: colors.volt,
  situps: colors.amber,
  burpees: colors.coral,
};

type Copy = { eyebrow: string; headline: string; lede: string };

function fmtCopyByPct(pct: number, movementCount: number): Copy {
  if (pct === 0) {
    return {
      eyebrow: "Today's challenge",
      headline: "Let's cook.",
      lede: `${movementCount} movement${movementCount === 1 ? '' : 's'}, one daily goal. Start whenever you're ready.`,
    };
  }
  if (pct < 25) {
    return {
      eyebrow: 'In progress',
      headline: 'Warmed up.',
      lede: "You're moving. Keep the rhythm.",
    };
  }
  if (pct < 60) {
    return {
      eyebrow: 'In progress',
      headline: 'Halfway window.',
      lede: 'More than a third done. The hardest part is behind you.',
    };
  }
  if (pct < 95) {
    return {
      eyebrow: 'Close',
      headline: 'Almost there.',
      lede: 'A handful of reps from a clean sheet.',
    };
  }
  if (pct < 100) {
    return {
      eyebrow: 'One last push',
      headline: 'Last reps.',
      lede: 'Finish what you started.',
    };
  }
  return {
    eyebrow: 'Challenge complete',
    headline: 'Cleared.',
    lede: "That's a clean sheet for today.",
  };
}

type CtaCopy = { label: string; style: 'volt' | 'dark' };

function ctaCopyByPct(pct: number): CtaCopy {
  if (pct === 0) return { label: 'Knock out some reps', style: 'volt' };
  if (pct < 100) return { label: 'Keep going', style: 'volt' };
  return { label: 'See your progress', style: 'dark' };
}

function totals(challenge: DailyChallenge) {
  const done = challenge.movements.reduce((s, m) => s + m.completedReps, 0);
  const goal = challenge.movements.reduce((s, m) => s + m.goalReps, 0);
  const pct = goal > 0 ? Math.round((done / goal) * 100) : 0;
  return { done, goal, pct };
}

type SplitRingProps = {
  challenge: DailyChallenge;
  size?: number;
  stroke?: number;
  gapPx?: number;
};

function SplitRing({ challenge, size = 212, stroke = 13, gapPx = 7 }: SplitRingProps) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const goalTotal = challenge.movements.reduce((s, m) => s + m.goalReps, 0) || 1;
  const gapFrac = gapPx / C;

  let cursor = 0;
  const arcs = challenge.movements.map((m) => {
    const share = m.goalReps / goalTotal;
    const arcLen = Math.max(0, share - gapFrac);
    const start = cursor;
    cursor += share;
    return { m, start, share, arcLen };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G originX={cx} originY={cy} rotation={-90}>
        {arcs.map((a) => {
          const trackLen = a.arcLen * C;
          const offsetTrack = -a.start * C;
          const pct = a.m.goalReps > 0 ? Math.min(1, a.m.completedReps / a.m.goalReps) : 0;
          const filledLen = trackLen * pct;
          return (
            <G key={a.m.type}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={colors.gray100}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${trackLen} ${C}`}
                strokeDashoffset={offsetTrack}
                strokeLinecap="round"
              />
              {filledLen > 0.001 && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={MOVEMENT_COLORS[a.m.type]}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${filledLen} ${C}`}
                  strokeDashoffset={offsetTrack}
                  strokeLinecap="round"
                />
              )}
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

export function ChallengeScreen({
  challenge,
  onSetupChallenge,
  onStartChallengeSession,
  onEditChallenge,
  onSeeProgress,
  onChallengeUpdated,
}: Props) {
  // Force-flush pending rep writes when the app backgrounds.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'background' || s === 'inactive') {
        void flushPendingProgress();
      }
    });
    return () => sub.remove();
  }, []);

  // Also flush on unmount (e.g. user switches tabs).
  useEffect(() => () => void flushPendingProgress(), []);

  const handleIncrement = useCallback(
    async (type: DailyChallengeMovementType, delta: number) => {
      const next = await incrementMovementReps(type, delta);
      if (next) onChallengeUpdated(next);
    },
    [onChallengeUpdated],
  );

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSpacer} />
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>TODAY</Text>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyIll}>
            <Target size={36} color={colors.gray400} strokeWidth={1.8} />
            <View style={styles.emptyDot} />
          </View>
          <Text style={styles.emptyHeadline}>Pick your movements.</Text>
          <Text style={styles.emptyBody}>
            Choose your movements and a daily goal. The reps add up over the
            day, however you want to break them up.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyCta,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            onPress={onSetupChallenge}
          >
            <Plus size={16} color={colors.black} strokeWidth={2.4} />
            <Text style={styles.emptyCtaLabel}>Build a challenge</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const t = totals(challenge);
  const copy = fmtCopyByPct(t.pct, challenge.movements.length);
  const cta = ctaCopyByPct(t.pct);
  const showPulse = t.pct < 100;

  // Complete-state variant: the day is cleared. Replace the ring+steppers with
  // a celebratory banner + read-only per-movement done rows. The brief moment
  // (ChallengeCelebrationScreen) fires first; users land here afterward.
  if (challenge.isComplete) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSpacer} />
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>TODAY</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit daily challenge"
            onPress={onEditChallenge}
            hitSlop={8}
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          >
            <Pencil size={14} color={colors.gray700} strokeWidth={1.8} />
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.eyebrow}>
              <View style={styles.pulse} />
              <Text style={styles.eyebrowText}>CHALLENGE COMPLETE</Text>
            </View>
            <Text style={styles.heroHeadline}>Cleared.</Text>
            <Text style={styles.heroLede}>{copy.lede}</Text>
          </View>

          <View style={styles.doneBanner}>
            <View style={styles.doneBadgeWrap}>
              <View style={styles.doneBadge}>
                <Check size={26} color={colors.white} strokeWidth={3.2} />
              </View>
              <View style={styles.doneMeta}>
                <Text style={styles.doneOverline}>CLEARED</Text>
                <Text style={styles.doneWhen}>today</Text>
              </View>
            </View>
            <Text style={styles.doneTitle}>You earned the day.</Text>
            <Text style={styles.doneBody}>
              No catch-up, no makeups. Tomorrow's challenge unlocks at midnight.
            </Text>
          </View>

          <View style={styles.doneRows}>
            {challenge.movements.map((m) => (
              <View key={m.type} style={[styles.card, styles.doneRow]}>
                <View
                  style={[
                    styles.doneRowSwatch,
                    { backgroundColor: MOVEMENT_COLORS[m.type] },
                  ]}
                />
                <Text style={styles.doneRowLabel}>
                  {MOVEMENT_LABELS[m.type]}
                </Text>
                <Text style={styles.doneRowValue}>
                  {m.completedReps}
                  <Text style={styles.doneRowGoal}> / {m.goalReps}</Text>
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.ctaRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See your progress"
            onPress={onSeeProgress}
            style={({ pressed }) => [
              styles.cta,
              styles.ctaDark,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.ctaLabel, styles.ctaLabelDark]}>
              See your progress
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSpacer} />
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>TODAY</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit daily challenge"
          onPress={onEditChallenge}
          hitSlop={8}
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
        >
          <Pencil size={14} color={colors.gray700} strokeWidth={1.8} />
          <Text style={styles.editLabel}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            {showPulse && <View style={styles.pulse} />}
            <Text style={styles.eyebrowText}>{copy.eyebrow.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroHeadline}>{copy.headline}</Text>
          <Text style={styles.heroLede}>{copy.lede}</Text>
        </View>

        {/* Split ring card */}
        <View style={[styles.card, styles.ringCard]}>
          <View style={styles.ringWrap}>
            <SplitRing challenge={challenge} />
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringValue}>{t.done}</Text>
              <Text style={styles.ringOf}>
                of <Text style={styles.ringOfBold}>{t.goal}</Text> reps today
              </Text>
              {t.pct >= 100 ? (
                <View style={[styles.ringTag, styles.ringTagCoral]}>
                  <Text style={styles.ringTagTextCoral}>COMPLETE</Text>
                </View>
              ) : t.pct >= 25 ? (
                <View style={styles.ringTag}>
                  <Text style={styles.ringTagText}>{t.pct}% IN</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Movement steppers */}
        <View style={styles.moves}>
          {challenge.movements.map((m) => {
            const done = m.completedReps >= m.goalReps;
            const minusDisabled = m.completedReps === 0;
            return (
              <View
                key={m.type}
                style={[styles.move, styles.card, done && styles.moveDone]}
              >
                <View
                  style={[
                    styles.moveSwatch,
                    { backgroundColor: MOVEMENT_COLORS[m.type] },
                  ]}
                />
                <View style={styles.moveBody}>
                  <Text style={[styles.moveName, done && styles.moveNameDone]}>
                    {MOVEMENT_LABELS[m.type]}
                  </Text>
                  <View style={styles.moveProgress}>
                    <Text style={[styles.moveProgressDone, done && styles.moveProgressDoneMuted]}>
                      {m.completedReps}
                    </Text>
                    <Text style={styles.moveProgressGoal}>/ {m.goalReps} reps</Text>
                  </View>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove a ${MOVEMENT_LABELS[m.type].toLowerCase()} rep`}
                    accessibilityState={{ disabled: minusDisabled }}
                    disabled={minusDisabled}
                    onPress={() => handleIncrement(m.type, -1)}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.stepBtn,
                      minusDisabled && styles.stepBtnDisabled,
                      pressed && !minusDisabled && styles.stepBtnPressed,
                    ]}
                  >
                    <Minus
                      size={16}
                      color={minusDisabled ? colors.gray300 : colors.gray700}
                      strokeWidth={2.4}
                    />
                  </Pressable>
                  <Text style={styles.stepValue}>{m.completedReps}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add a ${MOVEMENT_LABELS[m.type].toLowerCase()} rep`}
                    onPress={() => handleIncrement(m.type, 1)}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.stepBtn,
                      pressed && styles.stepBtnPressed,
                    ]}
                  >
                    {done ? (
                      <Check size={16} color={colors.voltDark} strokeWidth={3} />
                    ) : (
                      <Plus size={16} color={colors.gray700} strokeWidth={2.4} />
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          onPress={cta.style === 'dark' ? onSeeProgress : onStartChallengeSession}
          style={({ pressed }) => [
            styles.cta,
            cta.style === 'dark' && styles.ctaDark,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          {cta.style === 'volt' && (
            <Play size={16} color={colors.black} fill={colors.black} />
          )}
          <Text
            style={[
              styles.ctaLabel,
              cta.style === 'dark' && styles.ctaLabelDark,
            ]}
          >
            {cta.label}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  headerSpacer: {
    height: 48,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s4,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.gray400,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray700,
  },
  pressed: {
    opacity: 0.7,
  },
  scroll: {
    paddingHorizontal: spacing.s5,
    paddingBottom: spacing.s4,
  },

  // Hero
  hero: {
    marginTop: 2,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.coral,
    borderWidth: 4,
    borderColor: 'rgba(255,79,79,0.16)',
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.dustyBlueDark,
  },
  heroHeadline: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.84,
    lineHeight: 30,
    color: colors.black,
  },
  heroLede: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: colors.dustyBlueDark,
    lineHeight: 18,
  },

  // Card shared
  card: {
    backgroundColor: colors.white,
    borderColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },

  // Ring card
  ringCard: {
    marginTop: 12,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  ringWrap: {
    width: 212,
    height: 212,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  ringValue: {
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -2.6,
    lineHeight: 56,
    color: colors.black,
  },
  ringOf: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
    textAlign: 'center',
  },
  ringOfBold: {
    color: colors.black,
    fontWeight: '800',
  },
  ringTag: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.voltMuted,
  },
  ringTagCoral: {
    backgroundColor: 'rgba(255,79,79,0.10)',
  },
  ringTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.voltDark,
  },
  ringTagTextCoral: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.coral,
  },

  // Movement steppers
  moves: {
    marginTop: 10,
    gap: 10,
  },
  move: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  moveDone: {
    // subtle de-emphasis is handled by name/value styling
  },
  moveSwatch: {
    width: 7,
    alignSelf: 'stretch',
    borderRadius: 3.5,
  },
  moveBody: {
    flex: 1,
    minWidth: 0,
  },
  moveName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.08,
  },
  moveNameDone: {
    color: colors.gray500,
    textDecorationLine: 'line-through',
    textDecorationColor: colors.gray300,
  },
  moveProgress: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  moveProgressDone: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.black,
  },
  moveProgressDoneMuted: {
    color: colors.gray500,
  },
  moveProgressGoal: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 999,
    padding: 3,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(0,0,0,0.04)',
  },
  stepBtnPressed: {
    opacity: 0.6,
  },
  stepValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: -0.15,
  },

  // CTA
  ctaRow: {
    paddingHorizontal: spacing.s5,
    paddingTop: 8,
    paddingBottom: spacing.s4,
    backgroundColor: colors.offWhite,
  },
  cta: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.volt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    shadowColor: colors.voltDark,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  ctaDark: {
    backgroundColor: colors.black,
    shadowColor: colors.black,
    shadowOpacity: 0.4,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.16,
  },
  ctaLabelDark: {
    color: colors.white,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingBottom: 60,
    gap: 14,
  },
  emptyIll: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  emptyDot: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.volt,
    borderWidth: 4,
    borderColor: 'rgba(205,255,0,0.18)',
  },
  emptyHeadline: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 31,
    color: colors.black,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.dustyBlueDark,
    lineHeight: 21,
    maxWidth: 280,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyCta: {
    marginTop: 14,
    backgroundColor: colors.volt,
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.voltDark,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  emptyCtaLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.16,
  },

  // OptionDone — complete-state banner + done rows
  doneBanner: {
    marginTop: 14,
    backgroundColor: '#FFEAEA',
    borderColor: 'rgba(255,79,79,0.15)',
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 22,
    shadowColor: colors.coral,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    overflow: 'hidden',
  },
  doneBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  doneBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coral,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4,
  },
  doneMeta: {
    flex: 1,
  },
  doneOverline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.coral,
  },
  doneWhen: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 31,
    color: colors.black,
  },
  doneBody: {
    marginTop: 8,
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
  },
  doneRows: {
    marginTop: 12,
    gap: 10,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  doneRowSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  doneRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  doneRowValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.black,
  },
  doneRowGoal: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
  },
});

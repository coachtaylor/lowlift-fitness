import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { DailyChallenge, DailyChallengeMovementType } from '../data/dailyChallenge';
import { colors, radius, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';

const RING_SIZE = 184;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MOVEMENT_LABELS: Record<DailyChallengeMovementType, string> = {
  pushups: 'Push Ups',
  squats: 'Squats',
  situps: 'Sit Ups',
  burpees: 'Burpees',
};

type Props = {
  challenge: DailyChallenge | null;
  onSetup: () => void;
};

export function DailyChallengeCard({
  challenge,
  onSetup,
}: Props) {
  if (!challenge) {
    return (
      <Pressable
        onPress={onSetup}
        accessibilityRole="button"
        accessibilityLabel="Set up daily challenge"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <GlassCard contentStyle={styles.emptyCard}>
          <View style={styles.plusBadge}>
            <Plus size={18} color={colors.black} strokeWidth={2.5} />
          </View>
          <Text style={styles.emptyLabel}>Daily Challenge</Text>
        </GlassCard>
      </Pressable>
    );
  }

  const totalGoal = challenge.movements.reduce((sum, m) => sum + m.goalReps, 0);
  const totalDone = challenge.movements.reduce(
    (sum, m) => sum + Math.min(m.goalReps, m.completedReps),
    0,
  );
  const totalRemaining = Math.max(0, totalGoal - totalDone);
  const allComplete = challenge.isComplete || totalRemaining === 0;
  const ratio = totalGoal > 0 ? Math.min(1, totalDone / totalGoal) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - ratio);

  return (
    <GlassCard contentStyle={styles.activeCard}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.gray200}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.volt}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            fill="none"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          {allComplete ? (
            <>
              <View style={styles.checkBadge}>
                <Check size={20} color={colors.black} strokeWidth={3} />
              </View>
              <Text style={styles.completeLabel}>Crushed it.</Text>
            </>
          ) : (
            <>
              <Text style={styles.ringNumber}>{totalDone}</Text>
              <Text style={styles.ringLabel}>of {totalGoal} reps</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.bars}>
        {challenge.movements.map((m) => {
          const r = m.goalReps > 0 ? Math.min(1, m.completedReps / m.goalReps) : 0;
          const done = m.completedReps >= m.goalReps;
          return (
            <View key={m.type} style={styles.barRow}>
              <View style={styles.barHeader}>
                <Text style={styles.movementName}>{MOVEMENT_LABELS[m.type]}</Text>
                <Text style={[styles.count, done && styles.countDone]}>
                  {m.completedReps} / {m.goalReps}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${r * 100}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
    gap: spacing.s4,
  },
  plusBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  activeCard: {
    paddingVertical: spacing.s8,
    paddingHorizontal: spacing.s6,
    alignItems: 'stretch',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s8,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.black,
    letterSpacing: -3,
    lineHeight: 56,
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray500,
    marginTop: spacing.s2,
  },
  bars: {
    gap: spacing.s4,
  },
  barRow: {
    gap: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  movementName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.dustyBlueDark,
    fontVariant: ['tabular-nums'],
  },
  countDone: {
    color: colors.black,
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.volt,
    borderRadius: radius.full,
  },
  checkBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s2,
  },
  completeLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.3,
  },
});

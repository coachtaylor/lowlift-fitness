import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DailyChallenge, DailyChallengeMovementType } from '../data/dailyChallenge';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';

const MOVEMENT_LABELS: Record<DailyChallengeMovementType, string> = {
  pushups: 'Push Ups',
  squats: 'Squats',
  burpees: 'Burpees',
};

type Props = {
  challenge: DailyChallenge | null;
  onSetup: () => void;
  onEdit: () => void;
  onStartSession: () => void;
};

export function DailyChallengeCard({
  challenge,
  onSetup,
  onEdit,
  onStartSession,
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

  const totalRemaining = challenge.movements.reduce(
    (sum, m) => sum + Math.max(0, m.goalReps - m.completedReps),
    0,
  );
  const allComplete = challenge.isComplete || totalRemaining === 0;

  return (
    <GlassCard contentStyle={styles.activeCard}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Challenge</Text>
        <Pressable
          onPress={onEdit}
          accessibilityRole="link"
          accessibilityLabel="Edit daily challenge"
          hitSlop={10}
          style={({ pressed }) => [styles.editHit, pressed && styles.pressed]}
        >
          <Text style={styles.editLabel}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.bars}>
        {challenge.movements.map((m) => {
          const ratio = m.goalReps > 0 ? Math.min(1, m.completedReps / m.goalReps) : 0;
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
                <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      {allComplete ? (
        <View style={styles.completeRow}>
          <View style={styles.checkBadge}>
            <Check size={16} color={colors.black} strokeWidth={3} />
          </View>
          <Text style={styles.completeLabel}>Complete!</Text>
        </View>
      ) : (
        <>
          <Text style={styles.remaining}>
            {totalRemaining} {totalRemaining === 1 ? 'rep' : 'reps'} remaining
          </Text>
          <View style={styles.cta}>
            <PrimaryButton label="Do a session" onPress={onStartSession} />
          </View>
        </>
      )}
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
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.2,
  },
  editHit: {
    paddingVertical: spacing.s1,
    paddingLeft: spacing.s3,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dustyBlueDark,
  },
  bars: {
    gap: spacing.s3,
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
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.volt,
    borderRadius: radius.full,
  },
  remaining: {
    ...typeTokens.caption,
    color: colors.gray500,
    marginTop: spacing.s4,
  },
  cta: {
    marginTop: spacing.s4,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    marginTop: spacing.s4,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
});

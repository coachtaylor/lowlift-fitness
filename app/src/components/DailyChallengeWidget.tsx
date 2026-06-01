import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DailyChallenge, DailyChallengeMovementType } from '../data/dailyChallenge';
import { colors, radius, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';

type Props = {
  challenge: DailyChallenge | null;
  onContinue: () => void;
  onSetup: () => void;
};

export function DailyChallengeWidget({ challenge, onContinue, onSetup }: Props) {
  if (!challenge) {
    return (
      <Pressable
        onPress={onSetup}
        accessibilityRole="button"
        accessibilityLabel="Set up daily challenge"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <GlassCard contentStyle={styles.row}>
          <View style={styles.left}>
            <View style={styles.voltBadge}>
              <Plus size={14} color={colors.black} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Daily Challenge</Text>
          </View>
          <Text style={styles.actionText}>Set up</Text>
        </GlassCard>
      </Pressable>
    );
  }

  const totalRemaining = challenge.movements.reduce(
    (sum, m) => sum + Math.max(0, m.goalReps - m.completedReps),
    0,
  );
  const allComplete = challenge.isComplete || totalRemaining === 0;

  if (allComplete) {
    return (
      <View>
        <GlassCard contentStyle={styles.row}>
          <View style={styles.left}>
            <View style={styles.voltBadge}>
              <Check size={14} color={colors.black} strokeWidth={3} />
            </View>
            <Text style={styles.completeLabel}>Complete!</Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onContinue}
      accessibilityRole="button"
      accessibilityLabel="Continue daily challenge"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <GlassCard contentStyle={styles.row}>
        <View style={styles.left}>
          <View style={styles.repsBadge}>
            <Text style={styles.repsBadgeText}>{totalRemaining}</Text>
          </View>
          <Text style={styles.repsLeftLabel}>reps left</Text>
        </View>
        <Text style={[styles.actionText, styles.actionUnderline]}>Continue challenge</Text>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  voltBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dustyBlueDark,
  },
  actionUnderline: {
    textDecorationLine: 'underline',
  },
  repsBadge: {
    backgroundColor: colors.black,
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  repsBadgeText: {
    color: colors.volt,
    fontSize: 15,
    fontWeight: '700',
  },
  repsLeftLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray500,
  },
  completeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
});

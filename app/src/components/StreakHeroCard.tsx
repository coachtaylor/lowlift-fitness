import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';

type Props = {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
};

export function StreakHeroCard({ currentStreak, longestStreak, totalSessions }: Props) {
  const showFire = currentStreak >= 3;
  const dayWord = currentStreak === 1 ? 'day' : 'days';

  return (
    <GlassCard contentStyle={styles.card}>
      {currentStreak === 0 ? (
        <>
          <Text style={styles.number}>0</Text>
          <Text style={styles.label}>Start a new streak</Text>
        </>
      ) : (
        <>
          <Text style={styles.number}>{currentStreak}</Text>
          <View style={styles.labelRow}>
            {showFire && <Text style={styles.fire}>🔥</Text>}
            <Text style={styles.label}>{dayWord} streak</Text>
          </View>
        </>
      )}
      <Text style={styles.secondary}>
        Longest: {longestStreak} {longestStreak === 1 ? 'day' : 'days'} · {totalSessions}{' '}
        {totalSessions === 1 ? 'session' : 'sessions'} total
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.s6,
    alignItems: 'center',
  },
  number: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 56,
    color: colors.black,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.s2,
  },
  fire: {
    fontSize: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  secondary: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray400,
    marginTop: spacing.s1,
  },
});

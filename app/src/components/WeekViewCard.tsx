import { StyleSheet, Text, View } from 'react-native';
import { WeekDay } from '../data/history';
import { colors, radius, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';

type Props = {
  days: WeekDay[];
};

export function WeekViewCard({ days }: Props) {
  return (
    <GlassCard contentStyle={styles.card}>
      <Text style={styles.label}>This Week</Text>
      <View style={styles.row}>
        {days.map((d, i) => (
          <View key={i} style={styles.col}>
            <Text style={styles.dayLabel}>{d.letter}</Text>
            <View style={[styles.dot, dotStyle(d)]} />
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

function dotStyle(d: WeekDay) {
  if (d.completed) {
    return {
      backgroundColor: colors.volt,
      shadowColor: colors.volt,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    };
  }
  if (d.isToday) {
    return {
      backgroundColor: colors.offWhite,
      borderColor: colors.volt,
      borderWidth: 2,
    };
  }
  if (d.inFuture) {
    return { backgroundColor: colors.gray100 };
  }
  return { backgroundColor: colors.gray100 };
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.s4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.s2,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray400,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
});

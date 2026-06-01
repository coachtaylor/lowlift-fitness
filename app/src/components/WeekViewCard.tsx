import { StyleSheet, Text, View } from 'react-native';
import { WeekDay } from '../data/history';
import { colors, radius, spacing } from '../theme/tokens';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Props = {
  days: WeekDay[];
};

export function WeekViewCard({ days }: Props) {
  const todayIndex = days.findIndex((d) => d.isToday);
  const todayCaption = todayIndex >= 0 ? `${DAY_NAMES[todayIndex]} · today` : '';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>This Week</Text>
        {!!todayCaption && <Text style={styles.caption}>{todayCaption}</Text>}
      </View>
      <View style={styles.row}>
        {days.map((d, i) => (
          <View key={i} style={[styles.col, d.isToday && styles.colToday]}>
            <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>{d.letter}</Text>
            <View style={[styles.dot, dotStyle(d)]} />
          </View>
        ))}
      </View>
    </View>
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
  return { backgroundColor: colors.gray100 };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingVertical: spacing.s4,
    paddingHorizontal: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: colors.gray400,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray400,
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
  colToday: {},
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray400,
  },
  dayLabelToday: {
    color: colors.black,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
});

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RecentSessionsCard } from '../components/RecentSessionsCard';
import { StartSessionButton } from '../components/StartSessionButton';
import { StreakHeroCard } from '../components/StreakHeroCard';
import { WeekViewCard } from '../components/WeekViewCard';
import {
  CompletedSession,
  buildWeek,
  currentStreak,
  longestStreak,
} from '../data/history';
import { colors, spacing } from '../theme/tokens';

type Props = {
  history: CompletedSession[];
  onStart: () => void;
};

export function DashboardScreen({ history, onStart }: Props) {
  const isEmpty = history.length === 0;

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSpacer} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyTop} />
          <View style={styles.emptyContent}>
            <Text style={styles.emptyHeadline}>Your journey starts here.</Text>
            <Text style={styles.emptySubtext}>
              Complete your first session and start building momentum.
            </Text>
          </View>
          <View style={styles.emptyBottom} />
          <StartSessionButton onPress={onStart} />
          <View style={{ height: spacing.s6 }} />
        </View>
      </SafeAreaView>
    );
  }

  const streak = currentStreak(history);
  const longest = longestStreak(history);
  const week = buildWeek(history);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSpacer} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <StreakHeroCard
          currentStreak={streak}
          longestStreak={longest}
          totalSessions={history.length}
        />
        <View style={{ height: spacing.s4 }} />
        <WeekViewCard days={week} />
        <View style={{ height: spacing.s4 }} />
        <RecentSessionsCard sessions={history} />
      </ScrollView>
      <View style={styles.cta}>
        <StartSessionButton onPress={onStart} />
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
  scroll: {
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s2,
    paddingBottom: spacing.s5,
  },
  cta: {
    paddingHorizontal: spacing.s6,
    paddingBottom: spacing.s6,
    paddingTop: spacing.s4,
    backgroundColor: colors.offWhite,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: spacing.s6,
  },
  emptyTop: {
    flex: 1,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyHeadline: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
    color: colors.black,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.dustyBlueDark,
    textAlign: 'center',
    marginTop: spacing.s3,
    lineHeight: 26,
  },
  emptyBottom: {
    flex: 1.2,
  },
});

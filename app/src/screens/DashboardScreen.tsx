import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DailyChallengeCard } from '../components/DailyChallengeCard';
import { FeedbackCard } from '../components/FeedbackCard';
import { SessionsCard } from '../components/SessionsCard';
import { StartSessionButton } from '../components/StartSessionButton';
import { StreakHeroCard } from '../components/StreakHeroCard';
import { WeekViewCard } from '../components/WeekViewCard';
import {
  DailyChallenge,
  deleteChallenge,
  isNewDay,
  loadChallenge,
  resetForNewDay,
} from '../data/dailyChallenge';
import {
  CompletedSession,
  buildWeek,
  currentStreak,
  longestStreak,
} from '../data/history';
import { Session } from '../data/sessions';
import { useFeedbackPrompt } from '../hooks/useFeedbackPrompt';
import { colors, spacing } from '../theme/tokens';

type Props = {
  history: CompletedSession[];
  favoriteSlugs: Set<string>;
  favoriteSessions: Session[];
  onToggleFavorite: (sessionId: string) => void;
  onStartFavorite: (sessionId: string) => void;
  onStart: () => void;
  onSetupChallenge: () => void;
  onStartChallengeSession: () => void;
};

export function DashboardScreen({
  history,
  favoriteSlugs,
  favoriteSessions,
  onToggleFavorite,
  onStartFavorite,
  onStart,
  onSetupChallenge,
  onStartChallengeSession,
}: Props) {
  const isEmpty = history.length === 0;
  const feedback = useFeedbackPrompt(history.length);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadChallenge();
      if (cancelled) return;
      if (loaded && loaded.repeatDaily && isNewDay(loaded)) {
        const reset = await resetForNewDay();
        if (!cancelled) setChallenge(reset);
        return;
      }
      if (loaded && !loaded.repeatDaily && isNewDay(loaded)) {
        await deleteChallenge();
        if (!cancelled) setChallenge(null);
        return;
      }
      setChallenge(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {feedback.visible && (
          <>
            <View style={{ height: spacing.s4 }} />
            <FeedbackCard
              question={feedback.question}
              onSubmit={feedback.onSubmit}
              onDismiss={feedback.onDismiss}
            />
          </>
        )}
        <View style={{ height: spacing.s4 }} />
        <WeekViewCard days={week} />
        <View style={{ height: spacing.s4 }} />
        <DailyChallengeCard
          challenge={challenge}
          onSetup={onSetupChallenge}
          onEdit={onSetupChallenge}
          onStartSession={onStartChallengeSession}
        />
        <View style={{ height: spacing.s4 }} />
        <SessionsCard
          history={history}
          favoriteSlugs={favoriteSlugs}
          favoriteSessions={favoriteSessions}
          onToggleFavorite={onToggleFavorite}
          onStartFavorite={onStartFavorite}
        />
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

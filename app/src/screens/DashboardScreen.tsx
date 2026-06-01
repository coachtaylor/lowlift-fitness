import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { FeedbackCard } from '../components/FeedbackCard';
import { IntentHeroCard } from '../components/IntentHeroCard';
import { SessionsCard } from '../components/SessionsCard';
import { WeekViewCard } from '../components/WeekViewCard';
import { DailyChallenge } from '../data/dailyChallenge';
import { CompletedSession, buildWeek } from '../data/history';
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
  challenge: DailyChallenge | null;
  onNavigateToChallenge: () => void;
  onSetupChallenge: () => void;
};

export function DashboardScreen({
  history,
  favoriteSlugs,
  favoriteSessions,
  onToggleFavorite,
  onStartFavorite,
  onStart,
  challenge,
  onNavigateToChallenge,
  onSetupChallenge,
}: Props) {
  const isEmpty = history.length === 0;
  const feedback = useFeedbackPrompt(history.length);

  const week = buildWeek(history);
  const lastCompletedAt = history[0]?.completedAt;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSpacer} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <IntentHeroCard
          totalSessions={history.length}
          lastCompletedAt={lastCompletedAt}
          challenge={challenge}
          onStart={onStart}
          onNavigateToChallenge={onNavigateToChallenge}
          onSetupChallenge={onSetupChallenge}
        />
        {!isEmpty && (
          <>
            <View style={{ height: spacing.s4 }} />
            <WeekViewCard days={week} />
            <View style={{ height: spacing.s4 }} />
            <SessionsCard
              history={history}
              favoriteSlugs={favoriteSlugs}
              favoriteSessions={favoriteSessions}
              onToggleFavorite={onToggleFavorite}
              onStartFavorite={onStartFavorite}
            />
          </>
        )}
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
      </ScrollView>
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
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s2,
    paddingBottom: spacing.s8,
  },
});

import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { AccountButton } from './src/components/AccountButton';
import {
  FavoriteRecord,
  loadFavorites,
  removeFavorite,
  saveFavorite,
} from './src/data/favorites';
import { flushPendingFeedback } from './src/data/feedback';
import {
  cancelDailyReminder,
  isDailyReminderScheduled,
  promptAndScheduleDailyReminder,
  scheduleDailyReminder,
  wasDailyReminderDeclined,
} from './src/data/notifications';
import { loadChallenge } from './src/data/dailyChallenge';
import * as Notifications from 'expo-notifications';
import { CompletedSession } from './src/data/history';
import { loadMovements } from './src/data/movements';
import {
  Session,
  getRandomSession,
  getSessionBySlug,
} from './src/data/sessions';
import {
  endAttempt,
  loadCompletedSessions,
  markMovementCompleted,
  markMovementStarted,
  recoverStaleAttempts,
  startAttempt,
} from './src/data/sessionTracking';
import {
  getPendingPasswordReset,
  loadState,
  saveOnboarded,
  setPendingPasswordReset,
} from './src/data/storage';
import { supabase } from './src/data/supabase';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ChallengeCelebrationScreen } from './src/screens/ChallengeCelebrationScreen';
import { ChallengeSessionCelebrationScreen } from './src/screens/ChallengeSessionCelebrationScreen';
import { ChallengeSessionScreen } from './src/screens/ChallengeSessionScreen';
import { CompletionScreen } from './src/screens/CompletionScreen';
import { DailyChallenge, DailyChallengeMovementType } from './src/data/dailyChallenge';
import { DailyChallengeSetupScreen } from './src/screens/DailyChallengeSetupScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { PasswordResetScreen } from './src/screens/PasswordResetScreen';
import { SessionPlayerScreen } from './src/screens/SessionPlayerScreen';
import { SessionPreviewScreen } from './src/screens/SessionPreviewScreen';
import { SessionSelectionScreen } from './src/screens/SessionSelectionScreen';
import { Movement } from './src/data/movements';
import { SessionType } from './src/components/SessionCard';
import { colors } from './src/theme/tokens';

type Screen =
  | 'auth'
  | 'password-reset'
  | 'onboarding'
  | 'selection'
  | 'preview'
  | 'player'
  | 'completion'
  | 'dashboard'
  | 'account'
  | 'daily-challenge-setup'
  | 'challenge-session'
  | 'challenge-session-celebration'
  | 'challenge-celebration';

// Screens that should NOT show the floating Account silhouette.
// Player is focus mode; auth/password-reset have no account yet;
// account itself has its own back navigation.
const HIDE_ACCOUNT_BUTTON: Screen[] = ['auth', 'password-reset', 'preview', 'player', 'account', 'challenge-session', 'challenge-session-celebration', 'challenge-celebration'];

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('auth');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [previewSession, setPreviewSession] = useState<Session | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletedSession | null>(null);
  const [history, setHistory] = useState<CompletedSession[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [favoriteSessions, setFavoriteSessions] = useState<Session[]>([]);
  const favoriteSlugs = useMemo(
    () => new Set(favorites.map((f) => f.sessionId)),
    [favorites],
  );
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [completedChallenge, setCompletedChallenge] = useState<DailyChallenge | null>(null);
  const [postSessionChallenge, setPostSessionChallenge] = useState<DailyChallenge | null>(null);
  const [postSessionReps, setPostSessionReps] = useState<
    Partial<Record<DailyChallengeMovementType, number>>
  >({});

  useEffect(() => {
    let cancelled = false;

    const hydrateAuthedUser = async () => {
      await recoverStaleAttempts();
      const [{ onboarded }, completed, favs] = await Promise.all([
        loadState(),
        loadCompletedSessions(),
        loadFavorites(),
        loadMovements(),
      ]);
      if (cancelled) return;
      setHistory(completed);
      setFavorites(favs);
      setScreen(onboarded ? 'dashboard' : 'onboarding');
      flushPendingFeedback().catch(() => {});
      reconcileDailyReminder().catch(() => {});
    };

    const hydrationTimeout = setTimeout(() => {
      if (cancelled) return;
      console.warn('[app] hydration timeout — falling back to auth');
      setScreen('auth');
      setHydrated(true);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        const hasSession = !!data.session;
        setAuthed(hasSession);
        setUserEmail(data.session?.user.email ?? null);
        if (!hasSession) {
          setScreen('auth');
          setHydrated(true);
          clearTimeout(hydrationTimeout);
          return;
        }
        hydrateAuthedUser().finally(() => {
          if (!cancelled) setHydrated(true);
          clearTimeout(hydrationTimeout);
        });
      })
      .catch((err) => {
        console.warn('[app] getSession failed:', err);
        if (cancelled) return;
        setScreen('auth');
        setHydrated(true);
        clearTimeout(hydrationTimeout);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const hasSession = !!session;
      setAuthed(hasSession);
      setUserEmail(session?.user.email ?? null);
      if (!hasSession) {
        setScreen('auth');
        setHistory([]);
        setFavorites([]);
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        setScreen('password-reset');
        return;
      }
      if (event === 'SIGNED_IN') {
        if (await getPendingPasswordReset()) {
          setScreen('password-reset');
          return;
        }
        hydrateAuthedUser();
      }
    });

    const handleAuthUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        if (!code) return;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.warn('[auth] exchangeCodeForSession error:', error);
      } catch (e) {
        console.warn('[auth] failed to parse redirect url:', url, e);
      }
    };

    Linking.getInitialURL().then(handleAuthUrl);
    const urlSub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      urlSub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved: Session[] = [];
      for (const f of favorites) {
        const s = await getSessionBySlug(f.sessionId);
        if (s) resolved.push(s);
      }
      if (!cancelled) setFavoriteSessions(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  const reconcileDailyReminder = async () => {
    const challenge = await loadChallenge();
    if (challenge) {
      if (await isDailyReminderScheduled()) {
        await cancelDailyReminder();
      }
      return;
    }
    if (await isDailyReminderScheduled()) return;
    if (await wasDailyReminderDeclined()) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await scheduleDailyReminder();
  };

  const finishOnboarding = () => {
    saveOnboarded(true);
    setScreen('selection');
  };

  const previewSessionForType = async (type: SessionType) => {
    const session = await getRandomSession(type);
    if (!session) {
      console.warn('[app] no session available for type', type);
      return;
    }
    setPreviewSession(session);
    setScreen('preview');
  };

  const startSessionWithMovements = async (movements: Movement[]) => {
    if (!previewSession) return;
    const session: Session = { ...previewSession, movements };
    const attemptId = await startAttempt(session);
    setActiveSession(session);
    setActiveAttemptId(attemptId);
    setPreviewSession(null);
    setScreen('player');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      console.warn('[app] delete-account failed:', error);
      Alert.alert(
        'Could not delete account',
        'Something went wrong. Please try again, or email support if it keeps happening.',
      );
      return;
    }
    await supabase.auth.signOut();
  };

  const handleMovementStart = (index: number) => {
    if (!activeAttemptId) return;
    markMovementStarted(activeAttemptId, index).catch(() => {});
  };

  const handleMovementComplete = (index: number) => {
    if (!activeAttemptId) return;
    markMovementCompleted(activeAttemptId, index).catch(() => {});
  };

  const handleComplete = () => {
    if (!activeSession) return;
    const durationSeconds = activeSession.movements.reduce((a, m) => a + m.duration, 0);
    const entry: CompletedSession = {
      id: activeAttemptId ?? `${activeSession.slug}-${Date.now()}`,
      sessionSlug: activeSession.slug,
      type: activeSession.type,
      sessionName: activeSession.name,
      durationSeconds,
      completedAt: Date.now(),
      movements: activeSession.movements.map((m) => ({
        slug: m.slug,
        name: m.name,
        durationSeconds: m.duration,
      })),
    };
    const isFirstEverCompletion = history.length === 0;
    setHistory((prev) => [entry, ...prev]);
    setLastCompletion(entry);
    if (activeAttemptId) {
      endAttempt(activeAttemptId, 'completed', durationSeconds).catch(() => {});
    }
    setScreen('completion');
    if (isFirstEverCompletion) {
      promptAndScheduleDailyReminder().catch(() => {});
    }
  };

  const toggleFavorite = async (sessionId: string) => {
    const isSaved = favoriteSlugs.has(sessionId);
    if (isSaved) {
      await removeFavorite(sessionId);
    } else {
      const result = await saveFavorite(sessionId);
      if (result === 'full') {
        Alert.alert('Favorites full', 'Remove a favorite to add a new one.');
        return;
      }
    }
    const updated = await loadFavorites();
    setFavorites(updated);
  };

  const startFavoriteSession = async (sessionId: string) => {
    const session = await getSessionBySlug(sessionId);
    if (!session) {
      console.warn('[app] favorite session not found:', sessionId);
      return;
    }
    const attemptId = await startAttempt(session);
    setActiveSession(session);
    setActiveAttemptId(attemptId);
    setScreen('player');
  };

  const handlePlayerExit = () => {
    if (activeAttemptId) {
      endAttempt(activeAttemptId, 'abandoned', 0).catch(() => {});
    }
    setActiveAttemptId(null);
    setScreen('selection');
  };

  const handlePreviewBack = () => {
    setPreviewSession(null);
    setScreen('selection');
  };

  if (!hydrated) {
    return <View style={styles.splash} />;
  }

  const renderScreen = () => {
    if (screen === 'auth' || !authed) return <AuthScreen />;
    if (screen === 'password-reset') {
      return (
        <PasswordResetScreen
          onComplete={async () => {
            await setPendingPasswordReset(false);
            const [{ onboarded }, completed, favs] = await Promise.all([
              loadState(),
              loadCompletedSessions(),
              loadFavorites(),
            ]);
            setHistory(completed);
            setFavorites(favs);
            setScreen(onboarded ? 'dashboard' : 'onboarding');
          }}
        />
      );
    }
    if (screen === 'onboarding') return <OnboardingFlow onComplete={finishOnboarding} />;
    if (screen === 'selection') {
      return (
        <SessionSelectionScreen
          onSelect={previewSessionForType}
          onBack={history.length > 0 ? () => setScreen('dashboard') : undefined}
        />
      );
    }
    if (screen === 'preview' && previewSession) {
      return (
        <SessionPreviewScreen
          session={previewSession}
          onStart={startSessionWithMovements}
          onSkip={() => startSessionWithMovements(previewSession.movements)}
          onBack={handlePreviewBack}
        />
      );
    }
    if (screen === 'player' && activeSession) {
      return (
        <SessionPlayerScreen
          session={activeSession}
          onComplete={handleComplete}
          onExit={handlePlayerExit}
          onMovementStart={handleMovementStart}
          onMovementComplete={handleMovementComplete}
        />
      );
    }
    if (screen === 'daily-challenge-setup') {
      return (
        <DailyChallengeSetupScreen
          onComplete={() => setScreen('dashboard')}
          onBack={() => setScreen('dashboard')}
        />
      );
    }
    if (screen === 'challenge-session') {
      return (
        <ChallengeSessionScreen
          onFinish={(updated, sessionReps) => {
            if (!updated) {
              setScreen('dashboard');
              return;
            }
            setPostSessionChallenge(updated);
            setPostSessionReps(sessionReps);
            setScreen('challenge-session-celebration');
          }}
          onExit={() => setScreen('dashboard')}
        />
      );
    }
    if (screen === 'challenge-session-celebration' && postSessionChallenge) {
      return (
        <ChallengeSessionCelebrationScreen
          challenge={postSessionChallenge}
          sessionReps={postSessionReps}
          onContinue={() => {
            const finished = postSessionChallenge;
            setPostSessionChallenge(null);
            setPostSessionReps({});
            if (finished.isComplete) {
              setCompletedChallenge(finished);
              setScreen('challenge-celebration');
            } else {
              setScreen('dashboard');
            }
          }}
        />
      );
    }
    if (screen === 'challenge-celebration' && completedChallenge) {
      return (
        <ChallengeCelebrationScreen
          challenge={completedChallenge}
          onSetTomorrow={() => {
            setCompletedChallenge(null);
            setScreen('daily-challenge-setup');
          }}
          onBackToDashboard={() => {
            setCompletedChallenge(null);
            setScreen('dashboard');
          }}
        />
      );
    }
    if (screen === 'account') {
      return (
        <AccountScreen
          email={userEmail}
          onBack={() => setScreen('dashboard')}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
        />
      );
    }
    if (screen === 'completion' && activeSession && lastCompletion) {
      return (
        <CompletionScreen
          session={activeSession}
          isFavorited={favoriteSlugs.has(activeSession.slug)}
          onToggleFavorite={() => toggleFavorite(activeSession.slug)}
          onDoAnother={() => setScreen('selection')}
          onFinish={() => setScreen('dashboard')}
        />
      );
    }
    return (
      <DashboardScreen
        history={history}
        favoriteSlugs={favoriteSlugs}
        favoriteSessions={favoriteSessions}
        onToggleFavorite={toggleFavorite}
        onStartFavorite={startFavoriteSession}
        onStart={() => setScreen('selection')}
        onSetupChallenge={() => setScreen('daily-challenge-setup')}
        onStartChallengeSession={() => setScreen('challenge-session')}
      />
    );
  };

  const showAccountButton = authed && !HIDE_ACCOUNT_BUTTON.includes(screen);
  const statusBarStyle =
    screen === 'player' ||
    screen === 'challenge-session' ||
    screen === 'challenge-session-celebration' ||
    screen === 'challenge-celebration'
      ? 'light'
      : 'dark';

  return (
    <View style={styles.root}>
      <StatusBar style={statusBarStyle} />
      {renderScreen()}
      {showAccountButton && (
        <AccountButton onPress={() => setScreen('account')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
});

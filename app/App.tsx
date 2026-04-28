import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { AccountButton } from './src/components/AccountButton';
import { CompletedSession } from './src/data/history';
import { loadMovements } from './src/data/movements';
import { Session, getRandomSession } from './src/data/sessions';
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
import { CompletionScreen } from './src/screens/CompletionScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { PasswordResetScreen } from './src/screens/PasswordResetScreen';
import { SessionPlayerScreen } from './src/screens/SessionPlayerScreen';
import { SessionSelectionScreen } from './src/screens/SessionSelectionScreen';
import { SessionType } from './src/components/SessionCard';
import { colors } from './src/theme/tokens';

type Screen =
  | 'auth'
  | 'password-reset'
  | 'onboarding'
  | 'selection'
  | 'player'
  | 'completion'
  | 'dashboard'
  | 'account';

// Screens that should NOT show the floating Account silhouette.
// Player is focus mode; auth/password-reset have no account yet;
// account itself has its own back navigation.
const HIDE_ACCOUNT_BUTTON: Screen[] = ['auth', 'password-reset', 'player', 'account'];

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('auth');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletedSession | null>(null);
  const [history, setHistory] = useState<CompletedSession[]>([]);
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrateAuthedUser = async () => {
      await recoverStaleAttempts();
      const [{ onboarded }, completed] = await Promise.all([
        loadState(),
        loadCompletedSessions(),
        loadMovements(),
      ]);
      if (cancelled) return;
      setHistory(completed);
      setScreen(onboarded ? 'dashboard' : 'onboarding');
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

  const finishOnboarding = () => {
    saveOnboarded(true);
    setScreen('selection');
  };

  const startSession = async (type: SessionType) => {
    const session = await getRandomSession(type);
    if (!session) {
      console.warn('[app] no session available for type', type);
      return;
    }
    const attemptId = await startAttempt(session);
    setActiveSession(session);
    setActiveAttemptId(attemptId);
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
    setHistory((prev) => [entry, ...prev]);
    setLastCompletion(entry);
    if (activeAttemptId) {
      endAttempt(activeAttemptId, 'completed', durationSeconds).catch(() => {});
    }
    setScreen('completion');
  };

  const handlePlayerExit = () => {
    if (activeAttemptId) {
      endAttempt(activeAttemptId, 'abandoned', 0).catch(() => {});
    }
    setActiveAttemptId(null);
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
            const [{ onboarded }, completed] = await Promise.all([
              loadState(),
              loadCompletedSessions(),
            ]);
            setHistory(completed);
            setScreen(onboarded ? 'dashboard' : 'onboarding');
          }}
        />
      );
    }
    if (screen === 'onboarding') return <OnboardingFlow onComplete={finishOnboarding} />;
    if (screen === 'selection') {
      return (
        <SessionSelectionScreen
          onSelect={startSession}
          onBack={history.length > 0 ? () => setScreen('dashboard') : undefined}
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
          onDoAnother={() => setScreen('selection')}
          onFinish={() => setScreen('dashboard')}
        />
      );
    }
    return (
      <DashboardScreen history={history} onStart={() => setScreen('selection')} />
    );
  };

  const showAccountButton = authed && !HIDE_ACCOUNT_BUTTON.includes(screen);
  const statusBarStyle = screen === 'player' ? 'light' : 'dark';

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

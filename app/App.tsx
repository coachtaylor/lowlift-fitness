import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { AccountButton } from './src/components/AccountButton';
import {
  FavoriteRecord,
  FavoriteSnapshot,
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
import {
  deleteChallenge,
  isNewDay,
  loadChallenge,
  resetForNewDay,
} from './src/data/dailyChallenge';
import * as Notifications from 'expo-notifications';
import { CompletedSession } from './src/data/history';
import { loadMovements } from './src/data/movements';
import { Session, getSessionBySlug } from './src/data/sessions';
import { generateSession, SessionSelection } from './src/data/generateSession';
import {
  MovementPrefs,
  clearHidden,
  clearLocalMovementPrefs,
  loadMovementPreferences,
  setMovementPreference,
} from './src/data/movementPreferences';
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
import TabNavigator from './src/navigation/TabNavigator';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { PasswordResetScreen } from './src/screens/PasswordResetScreen';
import { SessionPlayerScreen } from './src/screens/SessionPlayerScreen';
import { SessionPreviewScreen } from './src/screens/SessionPreviewScreen';
import { SessionSelectionScreen } from './src/screens/SessionSelectionScreen';
import { Movement } from './src/data/movements';
import { colors } from './src/theme/tokens';

// Module-scope ref so we can dispatch tab navigations from imperative
// callbacks (e.g. dismissing the celebration moment) without threading
// useNavigation everywhere.
const navigationRef = createNavigationContainerRef();

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

// Build a slim, replayable snapshot from a full generated Session.
function toFavoriteSnapshot(session: Session): FavoriteSnapshot {
  return {
    slug: session.slug,
    type: session.type,
    name: session.name,
    movements: session.movements.map((m) => ({
      slug: m.slug,
      name: m.name,
      duration: m.duration,
    })),
  };
}

// Build a snapshot from a completed-history row — used when favoriting from the
// Recent/Progress lists, where we only have the slim history record.
function snapshotFromHistory(h: CompletedSession): FavoriteSnapshot {
  return {
    slug: h.sessionSlug,
    type: h.type,
    name: h.sessionName,
    movements: (h.movements ?? []).map((m) => ({
      slug: m.slug,
      name: m.name,
      duration: m.durationSeconds,
    })),
  };
}

// Re-hydrate a favorite into a full, replayable Session. Templates (no snapshot)
// resolve live by slug. Generated sessions store movements by slug; we pull the
// rich Movement from the live library and override the duration with the saved
// value (generated sessions pad durations to hit an exact length), falling back
// to a minimal Movement if a slug has since been removed from the library.
async function hydrateFavorite(record: FavoriteRecord): Promise<Session | null> {
  if (!record.snapshot) return getSessionBySlug(record.sessionId);
  const snap = record.snapshot;
  const lib = await loadMovements();
  const movements: Movement[] = snap.movements.map((ref) => {
    const full = lib.get(ref.slug);
    if (full) return { ...full, duration: ref.duration };
    return {
      id: ref.slug,
      slug: ref.slug,
      name: ref.name,
      category: 'move',
      subcategory: null,
      bodyArea: 'full',
      duration: ref.duration,
      difficulty: 1,
      steps: [],
      cues: [],
      videoUrl: null,
      thumbUrl: null,
    };
  });
  return { id: snap.slug, slug: snap.slug, type: snap.type, name: snap.name, movements };
}

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('auth');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [previewSession, setPreviewSession] = useState<Session | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletedSession | null>(null);
  // Session generator: per-movement favorite/hide signals, recency, last picks.
  const [movementPrefs, setMovementPrefs] = useState<MovementPrefs>({ favorites: [], hidden: [] });
  const [recentMovements, setRecentMovements] = useState<string[]>([]);
  const [lastSelection, setLastSelection] = useState<SessionSelection>({
    type: 'move',
    length: 'standard',
    focus: 'full',
  });
  const [previewRelaxed, setPreviewRelaxed] = useState(false);
  const [history, setHistory] = useState<CompletedSession[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [favoriteSessions, setFavoriteSessions] = useState<Session[]>([]);
  const favoriteSlugs = useMemo(
    () => new Set(favorites.map((f) => f.sessionId)),
    [favorites],
  );
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  // Snapshot of the most recent challenge state worth celebrating. Drives the
  // per-session celebration (which uses `reps` for the "this session" total)
  // and the full-completion celebration (which reads only `challenge`).
  // `reps` is only set when completion came from a guided session — manual
  // tap-to-add completion goes straight to the full-completion screen and
  // doesn't carry a per-session breakdown.
  const [lastChallengeSession, setLastChallengeSession] = useState<{
    challenge: DailyChallenge;
    reps?: Partial<Record<DailyChallengeMovementType, number>>;
  } | null>(null);

  // After the celebration moment dismisses we want users back on the Challenge
  // tab (which now renders OptionDone), not the dashboard's default Home tab.
  // We can't pass a tab destination through screen state alone, so use a flag
  // and a useEffect to dispatch a tab navigate once the TabNavigator is back
  // in the tree.
  const [pendingChallengeTab, setPendingChallengeTab] = useState(false);

  // refreshChallenge does a check-then-act on isNewDay/resetForNewDay; without
  // a lock, two concurrent callers (app resume + tab focus) can both fire
  // resetForNewDay and double-schedule notifications. Coalesce concurrent calls
  // onto a single in-flight promise.
  const refreshingChallengeRef = useRef<Promise<void> | null>(null);
  const refreshChallenge = (): Promise<void> => {
    if (refreshingChallengeRef.current) return refreshingChallengeRef.current;
    const work = (async () => {
      try {
        const loaded = await loadChallenge();
        if (loaded && loaded.repeatDaily && isNewDay(loaded)) {
          const reset = await resetForNewDay();
          setChallenge(reset);
          return;
        }
        if (loaded && !loaded.repeatDaily && isNewDay(loaded)) {
          await deleteChallenge();
          setChallenge(null);
          return;
        }
        setChallenge(loaded);
      } finally {
        refreshingChallengeRef.current = null;
      }
    })();
    refreshingChallengeRef.current = work;
    return work;
  };

  useEffect(() => {
    let cancelled = false;

    const hydrateAuthedUser = async () => {
      await recoverStaleAttempts();
      const [{ onboarded }, completed, favs, , prefs] = await Promise.all([
        loadState(),
        loadCompletedSessions(),
        loadFavorites(),
        loadMovements(),
        loadMovementPreferences(),
      ]);
      if (cancelled) return;
      setHistory(completed);
      setFavorites(favs);
      setMovementPrefs(prefs);
      // Returning users skip onboarding. The onboarded flag is only device-local,
      // so a returning user on a new device — or after sign-out clears the flag —
      // would otherwise be re-onboarded. Server-side history proves they're an
      // existing user, so treat that as onboarded and repair the local flag.
      const returning = onboarded || completed.length > 0;
      if (returning && !onboarded) saveOnboarded(true).catch(() => {});
      setScreen(returning ? 'dashboard' : 'onboarding');
      flushPendingFeedback().catch(() => {});
      reconcileDailyReminder().catch(() => {});
      refreshChallenge().catch(() => {});
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
        const s = await hydrateFavorite(f);
        if (s) resolved.push(s);
      }
      if (!cancelled) setFavoriteSessions(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  // After the celebration dismisses to 'dashboard', jump the TabNavigator to
  // the Challenge tab on the next frame (so TabNavigator has mounted before
  // we dispatch). Then clear the flag.
  useEffect(() => {
    if (!pendingChallengeTab || screen !== 'dashboard') return;
    const id = requestAnimationFrame(() => {
      if (navigationRef.isReady()) {
        try {
          navigationRef.navigate('ChallengeTab' as never);
        } catch (err) {
          console.warn('[app] navigate to ChallengeTab failed:', err);
        }
      }
      setPendingChallengeTab(false);
    });
    return () => cancelAnimationFrame(id);
  }, [pendingChallengeTab, screen]);

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

  const generateAndPreview = async (selection: SessionSelection) => {
    setLastSelection(selection);
    const catalog = await loadMovements();
    const pool = Array.from(catalog.values());
    const { session, relaxed } = generateSession({
      pool,
      selection,
      favorites: movementPrefs.favorites,
      hidden: movementPrefs.hidden,
      recent: recentMovements,
    });
    setPreviewSession(session);
    setPreviewRelaxed(relaxed);
    setScreen('preview');
  };

  const regeneratePreview = async () => {
    const catalog = await loadMovements();
    const pool = Array.from(catalog.values());
    const avoid = previewSession ? previewSession.movements.map((m) => m.slug) : [];
    const { session, relaxed } = generateSession({
      pool,
      selection: lastSelection,
      favorites: movementPrefs.favorites,
      hidden: movementPrefs.hidden,
      recent: recentMovements,
      avoid,
    });
    setPreviewSession(session);
    setPreviewRelaxed(relaxed);
  };

  const favoriteMovement = (slug: string, willFav: boolean) => {
    setMovementPrefs((prev) => ({
      favorites: willFav
        ? Array.from(new Set([slug, ...prev.favorites]))
        : prev.favorites.filter((s) => s !== slug),
      hidden: prev.hidden.filter((s) => s !== slug),
    }));
    setMovementPreference(slug, willFav ? 'favorite' : null);
  };

  const hideMovement = (slug: string) => {
    setMovementPrefs((prev) => ({
      favorites: prev.favorites.filter((s) => s !== slug),
      hidden: Array.from(new Set([slug, ...prev.hidden])),
    }));
    setMovementPreference(slug, 'hidden');
  };

  const unhideMovement = (slug: string) => {
    setMovementPrefs((prev) => ({ ...prev, hidden: prev.hidden.filter((s) => s !== slug) }));
    setMovementPreference(slug, null);
  };

  const unhideAllMovements = () => {
    const toClear = movementPrefs.hidden;
    setMovementPrefs((prev) => ({ ...prev, hidden: [] }));
    clearHidden(toClear);
  };

  const startSessionWithMovements = async (movements: Movement[]) => {
    if (!previewSession) return;
    const session: Session = { ...previewSession, movements };
    setRecentMovements(movements.map((m) => m.slug).slice(0, 10));
    const attemptId = await startAttempt(session);
    setActiveSession(session);
    setActiveAttemptId(attemptId);
    setPreviewSession(null);
    setScreen('player');
  };

  // Reset device-local state on sign-out so it doesn't bleed into the next
  // account on this device. The active challenge and onboarding flag are now
  // per-user keyed (dailyChallenge.ts / storage.ts), so they're intentionally
  // NOT wiped — each account keeps its own and a returning user isn't reset.
  // The movement-pref mirror is a single device cache, so clear it (it
  // repopulates from Supabase for whoever signs in next). In-memory state is
  // reset so the UI doesn't flash the previous user's data before re-hydrate.
  const clearDeviceLocalState = async () => {
    await clearLocalMovementPrefs();
    setChallenge(null);
    setMovementPrefs({ favorites: [], hidden: [] });
  };

  const handleSignOut = async () => {
    await clearDeviceLocalState();
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
    await clearDeviceLocalState();
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
      // Generated sessions are random — persist a snapshot so they can be
      // resolved into the Favorites tab and replayed exactly. Templates keep
      // resolving live by slug (no snapshot).
      let snapshot: FavoriteSnapshot | undefined;
      if (sessionId.startsWith('generated-')) {
        const fromSession = [activeSession, previewSession].find((s) => s?.slug === sessionId);
        if (fromSession) snapshot = toFavoriteSnapshot(fromSession);
        else {
          const h = history.find((x) => x.sessionSlug === sessionId);
          if (h) snapshot = snapshotFromHistory(h);
        }
      }
      const result = await saveFavorite(sessionId, snapshot);
      if (result === 'full') {
        Alert.alert('Favorites full', 'Remove a favorite to add a new one.');
        return;
      }
    }
    const updated = await loadFavorites();
    setFavorites(updated);
  };

  const startFavoriteSession = async (sessionId: string) => {
    const record = favorites.find((f) => f.sessionId === sessionId);
    const session = record
      ? await hydrateFavorite(record)
      : await getSessionBySlug(sessionId);
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
            const returning = onboarded || completed.length > 0;
            if (returning && !onboarded) saveOnboarded(true).catch(() => {});
            setScreen(returning ? 'dashboard' : 'onboarding');
          }}
        />
      );
    }
    if (screen === 'onboarding') return <OnboardingFlow onComplete={finishOnboarding} />;
    if (screen === 'selection') {
      return (
        <SessionSelectionScreen
          initialSelection={lastSelection}
          onGenerate={generateAndPreview}
          onBack={history.length > 0 ? () => setScreen('dashboard') : undefined}
        />
      );
    }
    if (screen === 'preview' && previewSession) {
      return (
        <SessionPreviewScreen
          session={previewSession}
          selection={lastSelection}
          favorites={movementPrefs.favorites}
          hidden={movementPrefs.hidden}
          recent={recentMovements}
          relaxed={previewRelaxed}
          firstSession={history.length === 0}
          onFavorite={favoriteMovement}
          onHide={hideMovement}
          onUnhideOne={unhideMovement}
          onUnhideAll={unhideAllMovements}
          onRegenerate={regeneratePreview}
          onStart={startSessionWithMovements}
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
          existingChallenge={challenge}
          onComplete={() => {
            refreshChallenge().catch(() => {});
            setScreen('dashboard');
          }}
          onBack={() => setScreen('dashboard')}
        />
      );
    }
    if (screen === 'challenge-session') {
      return (
        <ChallengeSessionScreen
          challenge={challenge}
          onFinish={(updated, sessionReps) => {
            if (!updated) {
              refreshChallenge().catch(() => {});
              setScreen('dashboard');
              return;
            }
            // updated is the post-completeSession local state. Authoritative
            // for the celebration flow; we don't need to refresh from disk.
            setChallenge(updated);
            setLastChallengeSession({ challenge: updated, reps: sessionReps });
            setScreen('challenge-session-celebration');
          }}
          onExit={() => {
            refreshChallenge().catch(() => {});
            setScreen('dashboard');
          }}
        />
      );
    }
    if (screen === 'challenge-session-celebration' && lastChallengeSession) {
      return (
        <ChallengeSessionCelebrationScreen
          challenge={lastChallengeSession.challenge}
          sessionReps={lastChallengeSession.reps ?? {}}
          onContinue={() => {
            if (lastChallengeSession.challenge.isComplete) {
              setScreen('challenge-celebration');
            } else {
              setLastChallengeSession(null);
              setScreen('dashboard');
            }
          }}
        />
      );
    }
    if (screen === 'challenge-celebration' && lastChallengeSession) {
      return (
        <ChallengeCelebrationScreen
          onDismiss={() => {
            setLastChallengeSession(null);
            refreshChallenge().catch(() => {});
            setPendingChallengeTab(true);
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
      <TabNavigator
        history={history}
        favoriteSlugs={favoriteSlugs}
        favoriteSessions={favoriteSessions}
        onToggleFavorite={toggleFavorite}
        onStartFavorite={startFavoriteSession}
        onStart={() => setScreen('selection')}
        challenge={challenge}
        onSetupChallenge={() => setScreen('daily-challenge-setup')}
        onStartChallengeSession={() => setScreen('challenge-session')}
        onEditChallenge={() => setScreen('daily-challenge-setup')}
        onChallengeUpdated={(next) => {
          setChallenge(next);
          if (next.isComplete && !challenge?.isComplete) {
            // Manual tap-to-add completion: no per-session reps to surface,
            // and we skip the per-session celebration screen entirely.
            setLastChallengeSession({ challenge: next });
            setScreen('challenge-celebration');
          }
        }}
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
    <NavigationContainer ref={navigationRef}>
      <View style={styles.root}>
        <StatusBar style={statusBarStyle} />
        {renderScreen()}
        {showAccountButton && (
          <AccountButton onPress={() => setScreen('account')} />
        )}
      </View>
    </NavigationContainer>
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

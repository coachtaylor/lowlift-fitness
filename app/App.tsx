import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SessionType } from './src/components/SessionCard';
import { CompletedSession, countByType } from './src/data/history';
import { Session, getSession } from './src/data/sessions';
import { loadState, saveHistory, saveOnboarded } from './src/data/storage';
import { CompletionScreen } from './src/screens/CompletionScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { SessionPlayerScreen } from './src/screens/SessionPlayerScreen';
import { SessionSelectionScreen } from './src/screens/SessionSelectionScreen';
import { colors } from './src/theme/tokens';

type Screen = 'onboarding' | 'selection' | 'player' | 'completion' | 'dashboard';

const TYPE_LABEL: Record<SessionType, string> = {
  move: 'Move',
  stretch: 'Stretch',
  both: 'Both',
};

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletedSession | null>(null);
  const [history, setHistory] = useState<CompletedSession[]>([]);

  useEffect(() => {
    loadState().then(({ onboarded, history: saved }) => {
      setHistory(saved);
      setScreen(onboarded ? 'dashboard' : 'onboarding');
      setHydrated(true);
    });
  }, []);

  const finishOnboarding = () => {
    saveOnboarded(true);
    setScreen('selection');
  };

  const startSession = (type: SessionType) => {
    setActiveSession(getSession(type));
    setScreen('player');
  };

  const handleComplete = () => {
    if (!activeSession) return;
    const durationSeconds = activeSession.movements.reduce((a, m) => a + m.duration, 0);
    const number = countByType(history, activeSession.type) + 1;
    const entry: CompletedSession = {
      id: `${activeSession.id}-${Date.now()}`,
      type: activeSession.type,
      sessionName: `${TYPE_LABEL[activeSession.type]} #${number}`,
      durationSeconds,
      completedAt: Date.now(),
    };
    const next = [entry, ...history];
    setHistory(next);
    setLastCompletion(entry);
    saveHistory(next);
    setScreen('completion');
  };

  if (!hydrated) {
    return <View style={styles.splash} />;
  }

  if (screen === 'onboarding') {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingFlow onComplete={finishOnboarding} />
      </>
    );
  }

  if (screen === 'selection') {
    return (
      <>
        <StatusBar style="dark" />
        <SessionSelectionScreen
          onSelect={startSession}
          onBack={history.length > 0 ? () => setScreen('dashboard') : undefined}
        />
      </>
    );
  }

  if (screen === 'player' && activeSession) {
    return (
      <>
        <StatusBar style="light" />
        <SessionPlayerScreen
          session={activeSession}
          onComplete={handleComplete}
          onExit={() => setScreen('selection')}
        />
      </>
    );
  }

  if (screen === 'completion' && activeSession && lastCompletion) {
    return (
      <>
        <StatusBar style="dark" />
        <CompletionScreen
          session={activeSession}
          onDoAnother={() => setScreen('selection')}
          onFinish={() => setScreen('dashboard')}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <DashboardScreen history={history} onStart={() => setScreen('selection')} />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
});

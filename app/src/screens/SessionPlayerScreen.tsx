import { BlurView } from 'expo-blur';
import { Pause, Play, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ExitConfirmModal } from '../components/ExitConfirmModal';
import { MovementList } from '../components/MovementList';
import { ProgressDots } from '../components/ProgressDots';
import { Session } from '../data/sessions';
import { useReducedTransparency } from '../hooks/useReducedTransparency';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  session: Session;
  onComplete: () => void;
  onExit: () => void;
};

type Phase = 'countdown' | 'movement';

const COUNTDOWN_SECONDS = 5;

export function SessionPlayerScreen({ session, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const movement = session.movements[index];
  const total = session.movements.length;
  const reducedTransparency = useReducedTransparency();

  const startedAt = useRef<number>(Date.now());
  const pausedAt = useRef<number | null>(null);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const dimOpacity = useRef(new Animated.Value(1)).current;
  const colonOpacity = useRef(new Animated.Value(1)).current;

  const currentDuration =
    phase === 'countdown' ? COUNTDOWN_SECONDS : movement.duration;

  // Colon pulse: 1 -> 0.4 -> 1 every second. Runs for all phases.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(colonOpacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        Animated.timing(colonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [colonOpacity]);

  // Tick. Re-runs whenever phase, movement, or pause flips.
  useEffect(() => {
    if (paused) {
      pausedAt.current = Date.now();
      Animated.timing(dimOpacity, { toValue: 0.5, duration: 250, useNativeDriver: true }).start();
      return;
    }
    if (pausedAt.current != null) {
      startedAt.current += Date.now() - pausedAt.current;
      pausedAt.current = null;
    }
    Animated.timing(dimOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    const tick = () => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const next = Math.max(0, currentDuration - Math.floor(elapsed));
      setRemaining(next);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [paused, phase, index, currentDuration, dimOpacity]);

  // Pause when app backgrounds.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // Phase / movement transitions when remaining hits 0.
  useEffect(() => {
    if (paused) return;
    if (remaining > 0) return;

    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (phase === 'countdown') {
        setPhase('movement');
        setIndex(0);
        setRemaining(session.movements[0].duration);
        startedAt.current = Date.now();
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
        return;
      }

      const isLast = index === total - 1;
      if (isLast) {
        onComplete();
        return;
      }
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setRemaining(session.movements[nextIndex].duration);
      startedAt.current = Date.now();
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [remaining, paused, phase, index, total, session.movements, contentOpacity, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const openExit = () => {
    setPaused(true);
    setConfirmExit(true);
  };
  const dismissExit = () => {
    setConfirmExit(false);
    setPaused(false);
  };
  const leave = () => {
    setConfirmExit(false);
    onExit();
  };

  const overlineText =
    phase === 'countdown' ? 'GET READY' : `MOVEMENT ${index + 1} OF ${total}`;

  const glassContent = (
    <Animated.View style={{ opacity: contentOpacity }}>
      {phase === 'countdown' ? (
        <>
          <Text style={styles.countdown}>{remaining}</Text>
          <Text style={styles.movementName}>Up next: {session.movements[0].name}</Text>
          <Text style={styles.coaching}>Take a breath. You've got this.</Text>
        </>
      ) : (
        <>
          <View style={styles.timerRow}>
            <Text style={styles.timer}>{minutes}</Text>
            <Animated.Text style={[styles.timer, styles.colon, { opacity: colonOpacity }]}>
              :
            </Animated.Text>
            <Text style={styles.timer}>{seconds.toString().padStart(2, '0')}</Text>
          </View>
          <Text style={styles.movementName}>{movement.name}</Text>
          <Text style={styles.coaching}>{movement.coachingText}</Text>
        </>
      )}
    </Animated.View>
  );

  // In the list, highlight movement 0 as "current" during countdown so the user
  // sees what they're about to start.
  const listCurrentIndex = phase === 'countdown' ? 0 : index;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.overline}>{overlineText}</Text>
          <View style={styles.headerRight}>
            <ProgressDots total={total} current={phase === 'countdown' ? -1 : index} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit session"
              onPress={openExit}
              hitSlop={16}
              style={styles.exitBtn}
            >
              <X size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.glassWrap, { opacity: dimOpacity }]}>
          {reducedTransparency ? (
            <View style={[styles.glassContainer, styles.glassSolid]}>{glassContent}</View>
          ) : (
            <BlurView
              intensity={20}
              tint="dark"
              style={[styles.glassContainer, styles.glassBlur]}
            >
              {glassContent}
            </BlurView>
          )}
        </Animated.View>

        <View style={styles.listWrap}>
          <MovementList movements={session.movements} currentIndex={listCurrentIndex} />
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
            onPress={() => setPaused((p) => !p)}
            style={({ pressed }) => [
              styles.pauseBtn,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            {paused ? (
              <Play size={20} color={colors.white} strokeWidth={2} fill={colors.white} />
            ) : (
              <Pause size={20} color={colors.white} strokeWidth={2} fill={colors.white} />
            )}
          </Pressable>
        </View>
      </View>

      <ExitConfirmModal visible={confirmExit} onKeepGoing={dismissExit} onLeave={leave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.black,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s4,
  },
  overline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.gray400,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  exitBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },
  glassWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  glassContainer: {
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.s8,
    paddingHorizontal: spacing.s6,
    overflow: 'hidden',
    minHeight: 320,
    justifyContent: 'center',
  },
  glassBlur: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  glassSolid: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  timer: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -3,
    lineHeight: 72,
  },
  colon: {
    color: colors.volt,
  },
  countdown: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.volt,
    letterSpacing: -3,
    lineHeight: 72,
    textAlign: 'center',
  },
  movementName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.s6,
  },
  coaching: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 30,
    marginTop: spacing.s4,
  },
  listWrap: {
    marginTop: spacing.s12,
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.s6,
  },
  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

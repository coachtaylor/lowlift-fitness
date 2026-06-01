import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ExitConfirmModal } from '../components/ExitConfirmModal';
import { MovementAnimation } from '../components/MovementAnimation';
import { Session } from '../data/sessions';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  session: Session;
  onComplete: () => void;
  onExit: () => void;
  onMovementStart?: (index: number) => void;
  onMovementComplete?: (index: number) => void;
};

type Phase = 'countdown' | 'movement';

const COUNTDOWN_SECONDS = 5;
const STAGE = 300; // pt — Direction A "Spotlight" stage (handoff spec)
const RING_R = 138;
const RING_C = 2 * Math.PI * RING_R;

/* ── Control / chrome icons (drawn so we don't depend on an icon set) ── */
function Icon({ name, size = 24, color }: { name: string; size?: number; color: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24' as const };
  switch (name) {
    case 'close':
      return (
        <Svg {...common}>
          <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2.1} strokeLinecap="round" fill="none" />
        </Svg>
      );
    case 'pause':
      return (
        <Svg {...common}>
          <Rect x={6} y={4.5} width={4.2} height={15} rx={1.4} fill={color} />
          <Rect x={13.8} y={4.5} width={4.2} height={15} rx={1.4} fill={color} />
        </Svg>
      );
    case 'play':
      return (
        <Svg {...common}>
          <Path d="M7 4.5v15l13-7.5z" fill={color} />
        </Svg>
      );
    case 'prev':
      return (
        <Svg {...common}>
          <Rect x={5} y={5} width={2.6} height={14} rx={1.1} fill={color} />
          <Path d="M20 5.6v12.8a1 1 0 0 1-1.55.83L9 12.83a1 1 0 0 1 0-1.66l9.45-6.4A1 1 0 0 1 20 5.6z" fill={color} />
        </Svg>
      );
    case 'skip':
      return (
        <Svg {...common}>
          <Rect x={16.4} y={5} width={2.6} height={14} rx={1.1} fill={color} />
          <Path d="M4 5.6v12.8a1 1 0 0 0 1.55.83L15 12.83a1 1 0 0 0 0-1.66L5.55 4.77A1 1 0 0 0 4 5.6z" fill={color} />
        </Svg>
      );
    default:
      return null;
  }
}

/* ── Progress dots (current = volt pill, done = faint white, upcoming = fainter) ── */
function Dots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => {
        const isCur = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isCur && styles.dotCurrent,
              !isCur && i < current && styles.dotDone,
            ]}
          />
        );
      })}
    </View>
  );
}

/* ── Countdown ring: a volt arc that depletes over the GET READY window ── */
function CountdownRing({ size, progress }: { size: number; progress: number }) {
  const offset = RING_C * Math.min(1, Math.max(0, progress));
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
      <Circle cx={150} cy={150} r={RING_R} fill="none" stroke="rgba(10,10,10,0.06)" strokeWidth={6} />
      <Circle
        cx={150}
        cy={150}
        r={RING_R}
        fill="none"
        stroke={colors.volt}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={offset}
        transform="rotate(-90 150 150)"
      />
    </Svg>
  );
}

export function SessionPlayerScreen({
  session,
  onComplete,
  onExit,
  onMovementStart,
  onMovementComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [ringProgress, setRingProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const movement = session.movements[index];
  const total = session.movements.length;
  const isCountdown = phase === 'countdown';

  const startedAt = useRef<number>(Date.now());
  const pausedAt = useRef<number | null>(null);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const colonOpacity = useRef(new Animated.Value(1)).current;

  const currentDuration = isCountdown ? COUNTDOWN_SECONDS : movement.duration;

  // Colon pulse: 1 -> 0.25 -> 1 every second.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(colonOpacity, { toValue: 0.25, duration: 500, useNativeDriver: true }),
        Animated.timing(colonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [colonOpacity]);

  // Timer tick. Re-runs whenever phase, movement, or pause flips.
  useEffect(() => {
    if (paused) {
      pausedAt.current = Date.now();
      return;
    }
    if (pausedAt.current != null) {
      startedAt.current += Date.now() - pausedAt.current;
      pausedAt.current = null;
    }
    const tick = () => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setRemaining(Math.max(0, currentDuration - Math.floor(elapsed)));
      if (isCountdown) setRingProgress(Math.min(1, elapsed / COUNTDOWN_SECONDS));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [paused, isCountdown, index, currentDuration]);

  // Pause when app backgrounds.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setPaused(true);
    });
    return () => sub.remove();
  }, []);

  // ── Transitions ──
  const goToMovement = useCallback(
    (nextIndex: number) => {
      Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setPhase('movement');
        setIndex(nextIndex);
        setRemaining(session.movements[nextIndex].duration);
        startedAt.current = Date.now();
        pausedAt.current = null;
        onMovementStart?.(nextIndex);
        Animated.timing(contentOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    },
    [contentOpacity, session.movements, onMovementStart],
  );

  // Auto-advance when the timer hits zero.
  useEffect(() => {
    if (paused || remaining > 0) return;
    if (isCountdown) {
      goToMovement(0);
      return;
    }
    onMovementComplete?.(index);
    if (index >= total - 1) {
      Animated.timing(contentOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onComplete());
      return;
    }
    goToMovement(index + 1);
  }, [remaining, paused, isCountdown, index, total, goToMovement, onMovementComplete, onComplete, contentOpacity]);

  // ── Controls ──
  const handlePrev = () => {
    if (isCountdown) return;
    goToMovement(index === 0 ? 0 : index - 1);
  };
  const handleSkip = () => {
    if (isCountdown) return;
    if (index >= total - 1) onComplete();
    else goToMovement(index + 1);
  };
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

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const nextMovement = !isCountdown && index < total - 1 ? session.movements[index + 1] : null;
  const catLabel = movement.category === 'stretch' ? 'STRETCH' : 'MOVE';
  const isStretch = movement.category === 'stretch';

  const headerLabel = isCountdown
    ? 'GET READY'
    : paused
      ? `PAUSED · MOVEMENT ${index + 1} OF ${total}`
      : `MOVEMENT ${index + 1} OF ${total}`;
  const headerAccent = isCountdown || paused;

  const cueText = paused
    ? `Paused at ${minutes}:${seconds.toString().padStart(2, '0')} remaining`
    : movement.cues.join(' · ');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[styles.overline, headerAccent && { color: colors.volt }]}
            numberOfLines={1}
          >
            {headerLabel}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Exit session"
            onPress={openExit}
            hitSlop={16}
            style={styles.iconBtn}
          >
            <Icon name="close" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <View style={styles.dotsWrap}>
          <Dots total={total} current={isCountdown ? -1 : index} />
        </View>

        {/* Center: stage + meta + timer */}
        <Animated.View style={[styles.center, { opacity: contentOpacity }]}>
          <View style={styles.stage}>
            <MovementAnimation
              slug={isCountdown ? session.movements[0].slug : movement.slug}
              size={STAGE}
              dimmed={isCountdown || paused}
            />

            {isCountdown && <CountdownRing size={STAGE} progress={ringProgress} />}

            {isCountdown && (
              <View style={styles.stageOverlay} pointerEvents="none">
                <Text style={styles.countdownNum}>{Math.max(1, remaining)}</Text>
              </View>
            )}

            {paused && (
              <View style={styles.pausedScrim} pointerEvents="none">
                <View style={styles.pauseBadge}>
                  <Icon name="pause" size={30} color={colors.volt} />
                </View>
              </View>
            )}
          </View>

          {isCountdown ? (
            <View style={styles.countdownMeta}>
              <Text style={styles.upNext}>UP NEXT</Text>
              <Text style={styles.countdownName}>{session.movements[0].name}</Text>
              <Text style={styles.encourage}>Take a breath. You&apos;ve got this.</Text>
            </View>
          ) : (
            <>
              <View style={styles.meta}>
                <View style={[styles.tag, isStretch ? styles.tagStretch : styles.tagMove]}>
                  <Text style={[styles.tagText, { color: isStretch ? colors.dustyBlue : colors.voltDark }]}>
                    {catLabel}
                  </Text>
                </View>
                <Text style={styles.name}>{movement.name}</Text>
                <Text style={styles.cues}>{cueText}</Text>
              </View>

              <View style={styles.timerRow}>
                <Text style={styles.timer}>{minutes}</Text>
                <Animated.Text style={[styles.timer, styles.colon, { opacity: colonOpacity }]}>:</Animated.Text>
                <Text style={styles.timer}>{seconds.toString().padStart(2, '0')}</Text>
              </View>

              {!paused && nextMovement && (
                <View style={styles.nextPeek}>
                  <Text style={styles.nextLabel}>NEXT</Text>
                  <View style={styles.nextSep} />
                  <Text style={styles.nextName}>{nextMovement.name}</Text>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Footer controls — vary by phase */}
        <View style={styles.footer}>
          {isCountdown ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip countdown"
              onPress={() => goToMovement(0)}
              style={({ pressed }) => [styles.skipPill, pressed && styles.pressed]}
            >
              <Text style={styles.skipPillText}>Skip countdown</Text>
              <Icon name="skip" size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          ) : paused ? (
            <View style={styles.pausedFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Resume"
                onPress={() => setPaused(false)}
                style={({ pressed }) => [styles.resumeBtn, pressed && styles.pressed]}
              >
                <Icon name="play" size={19} color={colors.black} />
                <Text style={styles.resumeText}>Resume</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={openExit} hitSlop={12}>
                <Text style={styles.endText}>End session</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous movement"
                onPress={handlePrev}
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              >
                <Icon name="prev" size={22} color="rgba(255,255,255,0.85)" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pause"
                onPress={() => setPaused(true)}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Icon name="pause" size={30} color={colors.black} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip movement"
                onPress={handleSkip}
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              >
                <Icon name="skip" size={22} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <ExitConfirmModal visible={confirmExit} onKeepGoing={dismissExit} onLeave={leave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  container: { flex: 1, paddingHorizontal: spacing.s8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s4,
    gap: spacing.s3,
  },
  overline: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotsWrap: { alignItems: 'center', marginTop: spacing.s4 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.20)' },
  dotDone: { backgroundColor: 'rgba(255,255,255,0.45)' },
  dotCurrent: { width: 22, backgroundColor: colors.volt },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s5,
  },

  stage: {
    width: STAGE,
    height: STAGE,
    borderRadius: radius.xl,
    backgroundColor: colors.offWhite,
    overflow: 'hidden',
    // volt-tinted spotlight glow
    shadowColor: colors.volt,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(10,10,10,0.06)',
  },
  stageOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  countdownNum: { fontSize: 150, fontWeight: '900', letterSpacing: -6, color: colors.black, lineHeight: 160 },

  pausedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247,247,245,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBadge: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: 'rgba(10,10,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  meta: { alignItems: 'center', gap: spacing.s2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  tagMove: { backgroundColor: 'rgba(168,214,0,0.16)' },
  tagStretch: { backgroundColor: 'rgba(123,167,194,0.16)' },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  name: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: colors.white, textAlign: 'center' },
  cues: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 300,
  },

  timerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  timer: { fontSize: 72, fontWeight: '900', color: colors.white, letterSpacing: -3, lineHeight: 76 },
  colon: { color: colors.volt, marginHorizontal: -2 },

  nextPeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  nextLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)' },
  nextSep: { width: 3, height: 3, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.3)' },
  nextName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  countdownMeta: { alignItems: 'center', gap: spacing.s2 },
  upNext: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
  countdownName: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6, color: colors.white, textAlign: 'center' },
  encourage: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 27,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    maxWidth: 260,
  },

  footer: { paddingBottom: spacing.s10, minHeight: 96, justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26 },
  ghostBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.volt,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },

  skipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  skipPillText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  pausedFooter: { alignItems: 'center', gap: spacing.s4 },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    width: '100%',
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.volt,
    shadowColor: colors.volt,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 8,
  },
  resumeText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: colors.black },
  endText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
});

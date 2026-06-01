import { ChevronRight, Play, Target } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { DailyChallenge } from '../data/dailyChallenge';
import { colors, easing, motion, radius, spacing } from '../theme/tokens';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function greetingDate(now: Date): string {
  return `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

function trainedToday(lastCompletedAt: number | undefined, now: number): boolean {
  if (!lastCompletedAt) return false;
  const a = new Date(lastCompletedAt);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Copy = { headline: string; sub: string };

function pickCopy({
  totalSessions,
  didToday,
}: {
  totalSessions: number;
  didToday: boolean;
}): Copy {
  // First run — no sessions yet. Welcome the new user and point at the first session.
  if (totalSessions === 0) {
    return {
      headline: 'Your journey starts here.',
      sub: 'Complete your first session and start building momentum.',
    };
  }
  // Already moved today.
  if (didToday) {
    return {
      headline: 'You showed up today.',
      sub: 'Nice work. Tap below if you want another round.',
    };
  }
  // Has history, hasn’t moved today yet.
  return {
    headline: 'Three minutes. That’s the whole ask.',
    sub: `${totalSessions} session${totalSessions === 1 ? '' : 's'} in the bank. Build from here.`,
  };
}

type Props = {
  totalSessions: number;
  lastCompletedAt?: number;
  challenge: DailyChallenge | null;
  onStart: () => void;
  onNavigateToChallenge: () => void;
  onSetupChallenge: () => void;
};

export function IntentHeroCard({
  totalSessions,
  lastCompletedAt,
  challenge,
  onStart,
  onNavigateToChallenge,
  onSetupChallenge,
}: Props) {
  const now = Date.now();
  const didToday = trainedToday(lastCompletedAt, now);
  const { headline, sub } = pickCopy({ totalSessions, didToday });

  return (
    <View style={styles.card}>
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.topRow}>
        <Text style={styles.greet}>{greetingDate(new Date(now))}</Text>
      </View>

      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.sub}>{sub}</Text>

      <StartHeroButton onPress={onStart} />

      <ChallengeRow
        challenge={challenge}
        onNavigateToChallenge={onNavigateToChallenge}
        onSetupChallenge={onSetupChallenge}
      />
    </View>
  );
}

function StartHeroButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }], marginTop: 22 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start session"
        onPress={onPress}
        onPressIn={() =>
          Animated.timing(scale, {
            toValue: 0.97,
            duration: motion.fast,
            easing: Easing.bezier(...easing.default),
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.timing(scale, {
            toValue: 1,
            duration: motion.fast,
            easing: Easing.bezier(...easing.bounce),
            useNativeDriver: true,
          }).start()
        }
        style={({ pressed }) => [
          styles.startBtn,
          { backgroundColor: pressed ? colors.voltDark : colors.volt },
        ]}
      >
        <View style={styles.playBadge}>
          <Play size={14} color={colors.volt} fill={colors.volt} strokeWidth={2} />
        </View>
        <View style={styles.startText}>
          <Text style={styles.startOverline}>Tap to begin</Text>
          <Text style={styles.startBig}>Start session</Text>
        </View>
        <ChevronRight size={18} color={colors.black} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

function ChallengeRow({
  challenge,
  onNavigateToChallenge,
  onSetupChallenge,
}: {
  challenge: DailyChallenge | null;
  onNavigateToChallenge: () => void;
  onSetupChallenge: () => void;
}) {
  const noChallenge = !challenge;
  const totalRemaining = challenge
    ? challenge.movements.reduce((sum, m) => sum + Math.max(0, m.goalReps - m.completedReps), 0)
    : 0;
  const isComplete = !!challenge && (challenge.isComplete || totalRemaining === 0);

  let body: React.ReactNode;
  let onPress: (() => void) | undefined;
  let showArrow = true;

  if (noChallenge) {
    body = <Text style={styles.challengeBody}>Set up today’s challenge</Text>;
    onPress = onSetupChallenge;
  } else if (isComplete) {
    body = <Text style={styles.challengeBody}>Challenge complete — nice work</Text>;
    showArrow = false;
  } else {
    body = (
      <Text style={styles.challengeBody}>
        <Text style={styles.challengeBodyBold}>{totalRemaining} reps</Text> left in today’s challenge
      </Text>
    );
    onPress = onNavigateToChallenge;
  }

  const inner = (
    <View style={styles.challengeRow}>
      <View style={styles.challengeIcon}>
        <Target size={18} color={colors.volt} strokeWidth={2} />
      </View>
      <View style={styles.challengeBodyWrap}>{body}</View>
      {showArrow && <ChevronRight size={16} color="rgba(255,255,255,0.5)" strokeWidth={2} />}
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? styles.challengePressed : undefined)}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.black,
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: {
    position: 'absolute',
    right: -60,
    bottom: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(205,255,0,0.08)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greet: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.75,
    lineHeight: 32,
    color: colors.white,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    marginTop: spacing.s2,
  },
  startBtn: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    shadowColor: colors.volt,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  playBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: {
    flex: 1,
  },
  startOverline: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(10,10,10,0.55)',
  },
  startBig: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.black,
    marginTop: 2,
  },
  challengeRow: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(205,255,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeBodyWrap: {
    flex: 1,
  },
  challengeBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 21,
  },
  challengeBodyBold: {
    color: colors.white,
    fontWeight: '700',
  },
  challengePressed: {
    opacity: 0.7,
  },
});

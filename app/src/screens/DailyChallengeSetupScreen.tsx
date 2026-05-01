import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  DailyChallengeMovementType,
  NewChallengeMovement,
  createChallenge,
} from '../data/dailyChallenge';
import {
  requestNotificationPermission,
  scheduleChallengeNotifications,
} from '../data/notifications';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';

const NOTIF_PERMISSION_REQUESTED_KEY = 'lowlift:has_requested_notif_permission';

type Props = {
  onComplete: () => void;
  onBack: () => void;
};

type MovementDef = {
  type: DailyChallengeMovementType;
  name: string;
};

const MOVEMENTS: MovementDef[] = [
  { type: 'pushups', name: 'Push Ups' },
  { type: 'squats', name: 'Squats' },
  { type: 'burpees', name: 'Burpees' },
];

const REP_GOALS = [25, 50, 75, 100] as const;

type MovementState = {
  enabled: boolean;
  goal: number;
};

export function DailyChallengeSetupScreen({ onComplete, onBack }: Props) {
  const [state, setState] = useState<Record<DailyChallengeMovementType, MovementState>>({
    pushups: { enabled: true, goal: 50 },
    squats: { enabled: true, goal: 50 },
    burpees: { enabled: true, goal: 50 },
  });
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = MOVEMENTS.filter((m) => state[m.type].enabled).length;

  const toggleMovement = (type: DailyChallengeMovementType) => {
    setState((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));
    setShowError(false);
  };

  const setGoal = (type: DailyChallengeMovementType, goal: number) => {
    setState((prev) => ({ ...prev, [type]: { ...prev[type], goal } }));
  };

  const handleStart = async () => {
    if (selectedCount === 0) {
      setShowError(true);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const movements: NewChallengeMovement[] = MOVEMENTS
      .filter((m) => state[m.type].enabled)
      .map((m) => ({ type: m.type, goalReps: state[m.type].goal }));
    try {
      const challenge = await createChallenge(movements, repeatDaily);
      try {
        const alreadyAsked = await AsyncStorage.getItem(NOTIF_PERMISSION_REQUESTED_KEY);
        if (alreadyAsked !== '1') {
          await AsyncStorage.setItem(NOTIF_PERMISSION_REQUESTED_KEY, '1');
          const granted = await requestNotificationPermission();
          if (granted) {
            await scheduleChallengeNotifications(challenge);
          }
        } else {
          await scheduleChallengeNotifications(challenge);
        }
      } catch (err) {
        console.warn('[daily-challenge] notification setup failed:', err);
      }
      onComplete();
    } catch (err) {
      console.warn('[daily-challenge] createChallenge failed:', err);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSpacer} />

          <View style={styles.header}>
            <Text style={styles.headline}>Daily Challenge</Text>
            <Text style={styles.subtext}>
              Pick your movements and reps. We'll split them across sessions.
            </Text>
          </View>

          <View style={styles.cards}>
            {MOVEMENTS.map((m) => {
              const s = state[m.type];
              return (
                <GlassCard key={m.type} tint="dark" contentStyle={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.movementName}>{m.name}</Text>
                    <Switch
                      value={s.enabled}
                      onValueChange={() => toggleMovement(m.type)}
                      trackColor={{ false: colors.gray700, true: colors.volt }}
                      thumbColor={colors.white}
                      ios_backgroundColor={colors.gray700}
                    />
                  </View>

                  {s.enabled && (
                    <View style={styles.pillRow}>
                      {REP_GOALS.map((goal) => {
                        const selected = s.goal === goal;
                        return (
                          <Pressable
                            key={goal}
                            onPress={() => setGoal(m.type, goal)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`${goal} reps`}
                            style={({ pressed }) => [
                              styles.pill,
                              selected && styles.pillSelected,
                              pressed && !selected && styles.pillPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.pillLabel,
                                selected && styles.pillLabelSelected,
                              ]}
                            >
                              {goal}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </GlassCard>
              );
            })}
          </View>

          {showError && (
            <Text style={styles.errorText}>Select at least one movement.</Text>
          )}

          <View style={styles.repeatRow}>
            <View style={styles.repeatLabelWrap}>
              <Text style={styles.repeatLabel}>Repeat daily</Text>
              <Text style={styles.repeatHint}>Same challenge every day.</Text>
            </View>
            <Switch
              value={repeatDaily}
              onValueChange={setRepeatDaily}
              trackColor={{ false: colors.gray700, true: colors.volt }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.gray700}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label="Start Challenge" onPress={handleStart} />
          <Pressable
            accessibilityRole="link"
            onPress={onBack}
            hitSlop={12}
            style={styles.backLink}
          >
            {({ pressed }) => (
              <Text style={[styles.backLabel, pressed && styles.backLabelPressed]}>
                Back to Dashboard
              </Text>
            )}
          </Pressable>
        </View>
      </View>
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
  scroll: {
    paddingBottom: spacing.s6,
  },
  headerSpacer: {
    height: 48,
  },
  header: {
    marginTop: spacing.s6,
    marginBottom: spacing.s8,
  },
  headline: {
    ...typeTokens.h1,
    color: colors.white,
  },
  subtext: {
    ...typeTokens.body,
    color: colors.dustyBlueLight,
    marginTop: spacing.s3,
  },
  cards: {
    gap: spacing.s3,
  },
  cardInner: {
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  movementName: {
    ...typeTokens.h3,
    color: colors.white,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.s2,
    marginTop: spacing.s4,
  },
  pill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pillSelected: {
    backgroundColor: colors.volt,
    borderColor: colors.volt,
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  pillLabelSelected: {
    color: colors.black,
  },
  errorText: {
    ...typeTokens.caption,
    color: colors.coralMuted,
    marginTop: spacing.s4,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.s8,
    paddingVertical: spacing.s3,
  },
  repeatLabelWrap: {
    flex: 1,
    paddingRight: spacing.s4,
  },
  repeatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  repeatHint: {
    ...typeTokens.caption,
    color: colors.dustyBlueLight,
    marginTop: 2,
  },
  footer: {
    paddingTop: spacing.s4,
    paddingBottom: spacing.s6,
    gap: spacing.s3,
  },
  backLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.dustyBlueLight,
  },
  backLabelPressed: {
    textDecorationLine: 'underline',
  },
});

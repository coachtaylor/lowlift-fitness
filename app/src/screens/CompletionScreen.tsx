import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Session } from '../data/sessions';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  session: Session;
  onDoAnother: () => void;
  onFinish: () => void;
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CompletionScreen({ session, onDoAnother, onFinish }: Props) {
  const totalSeconds = session.movements.reduce((a, m) => a + m.duration, 0);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.8)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.5)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(12)).current;
  const subtextOpacity = useRef(new Animated.Value(0)).current;
  const subtextY = useRef(new Animated.Value(8)).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;
  const primaryOpacity = useRef(new Animated.Value(0)).current;
  const primaryY = useRef(new Animated.Value(8)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;
  const secondaryY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const ease = Easing.bezier(0.25, 0.1, 0.25, 1);
    const bounce = Easing.bezier(0.34, 1.56, 0.64, 1);

    const fadeIn = (val: Animated.Value, duration: number, easing = ease) =>
      Animated.timing(val, { toValue: 1, duration, easing, useNativeDriver: true });
    const slideTo0 = (val: Animated.Value, duration: number) =>
      Animated.timing(val, { toValue: 0, duration, easing: ease, useNativeDriver: true });
    const scaleTo1 = (val: Animated.Value, duration: number, easing = ease) =>
      Animated.timing(val, { toValue: 1, duration, easing, useNativeDriver: true });
    const delay = (ms: number) => Animated.delay(ms);

    Animated.parallel([
      fadeIn(bgOpacity, 300),
      Animated.sequence([delay(100), Animated.parallel([fadeIn(haloOpacity, 300), scaleTo1(haloScale, 300)])]),
      Animated.sequence([
        delay(200),
        Animated.parallel([fadeIn(badgeOpacity, 400), scaleTo1(badgeScale, 400, bounce)]),
      ]),
      Animated.sequence([delay(450), Animated.parallel([fadeIn(headlineOpacity, 300), slideTo0(headlineY, 300)])]),
      Animated.sequence([delay(600), Animated.parallel([fadeIn(subtextOpacity, 300), slideTo0(subtextY, 300)])]),
      Animated.sequence([delay(750), fadeIn(summaryOpacity, 250)]),
      Animated.sequence([delay(900), Animated.parallel([fadeIn(primaryOpacity, 250), slideTo0(primaryY, 250)])]),
      Animated.sequence([delay(1000), Animated.parallel([fadeIn(secondaryOpacity, 250), slideTo0(secondaryY, 250)])]),
    ]).start();
  }, [
    bgOpacity,
    haloOpacity,
    haloScale,
    badgeOpacity,
    badgeScale,
    headlineOpacity,
    headlineY,
    subtextOpacity,
    subtextY,
    summaryOpacity,
    primaryOpacity,
    primaryY,
    secondaryOpacity,
    secondaryY,
  ]);

  return (
    <Animated.View style={[styles.root, { opacity: bgOpacity }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.badgeWrapper}>
            <Animated.View
              style={[
                styles.halo,
                { opacity: haloOpacity, transform: [{ scale: haloScale }] },
              ]}
            />
            <Animated.View
              style={[
                styles.badge,
                { opacity: badgeOpacity, transform: [{ scale: badgeScale }] },
              ]}
            >
              <Check size={36} color={colors.white} strokeWidth={3} />
            </Animated.View>
          </View>

          <Animated.Text
            style={[
              styles.headline,
              { opacity: headlineOpacity, transform: [{ translateY: headlineY }] },
            ]}
          >
            Done.{'\n'}You showed up today.
          </Animated.Text>

          <Animated.Text
            style={[
              styles.subtext,
              { opacity: subtextOpacity, transform: [{ translateY: subtextY }] },
            ]}
          >
            That matters.
          </Animated.Text>

          <Animated.View style={[styles.summary, { opacity: summaryOpacity }]}>
            <Text style={styles.summaryName}>{session.name}</Text>
            <Text style={styles.summaryDuration}>{formatDuration(totalSeconds)}</Text>
          </Animated.View>

          <View style={styles.bottomSpacer} />

          <Animated.View
            style={{ opacity: primaryOpacity, transform: [{ translateY: primaryY }] }}
          >
            <PrimaryButton label="Do Another" onPress={onDoAnother} />
          </Animated.View>
          <View style={{ height: spacing.s3 }} />
          <Animated.View
            style={{ opacity: secondaryOpacity, transform: [{ translateY: secondaryY }] }}
          >
            <SecondaryButton label="See you tomorrow" onPress={onFinish} />
          </Animated.View>
          <View style={{ height: spacing.s6 }} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const BADGE_SIZE = 80;
const HALO_SIZE = 120;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s20,
  },
  badgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s10,
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,79,79,0.12)',
    borderColor: 'rgba(255,79,79,0.2)',
    borderWidth: 1,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
    color: colors.black,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.s2,
  },
  summary: {
    alignItems: 'center',
    marginTop: spacing.s12,
  },
  summaryName: {
    fontSize: 14,
    color: colors.gray400,
  },
  summaryDuration: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginTop: spacing.s1,
  },
  bottomSpacer: {
    flex: 1,
  },
});

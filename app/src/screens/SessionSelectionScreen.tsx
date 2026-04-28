import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { SessionCard, SessionType } from '../components/SessionCard';
import { colors, spacing, type as typeTokens } from '../theme/tokens';

type Props = {
  onSelect: (type: SessionType) => void;
  onBack?: () => void;
};

const SESSIONS: { type: SessionType; name: string; duration: string }[] = [
  { type: 'move', name: 'Move', duration: '2-3 min' },
  { type: 'stretch', name: 'Stretch', duration: '2-3 min' },
  { type: 'both', name: 'Both', duration: '4-5 min' },
];

export function SessionSelectionScreen({ onSelect, onBack }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerSpacer} />

        <View style={styles.header}>
          <Text style={styles.headline}>How do you want to move?</Text>
          <Text style={styles.subtext}>Pick what fits. We'll handle the rest.</Text>
        </View>

        <View style={styles.cards}>
          {SESSIONS.map((s) => (
            <SessionCard
              key={s.type}
              type={s.type}
              name={s.name}
              duration={s.duration}
              onPress={() => onSelect(s.type)}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />

        {onBack && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="link"
              onPress={onBack}
              hitSlop={12}
              style={styles.link}
            >
              {({ pressed }) => (
                <Text style={[styles.linkLabel, pressed && styles.linkLabelPressed]}>
                  Back to Dashboard
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.s6,
  },
  headerSpacer: {
    height: 48,
  },
  header: {
    marginTop: spacing.s6,
    marginBottom: spacing.s10,
  },
  headline: {
    ...typeTokens.h1,
    color: colors.black,
  },
  subtext: {
    ...typeTokens.body,
    color: colors.dustyBlueDark,
    marginTop: spacing.s3,
  },
  cards: {
    gap: spacing.s3,
  },
  bottomSpacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: spacing.s6,
    alignItems: 'center',
  },
  link: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.s4,
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.dustyBlueDark,
    textAlign: 'center',
  },
  linkLabelPressed: {
    textDecorationLine: 'underline',
  },
});

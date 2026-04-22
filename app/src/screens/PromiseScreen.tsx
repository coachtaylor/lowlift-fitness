import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { VoltHighlight } from '../components/VoltHighlight';
import { colors, spacing } from '../theme/tokens';

type Props = {
  onContinue: () => void;
};

export function PromiseScreen({ onContinue }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topSpacer} />
        <View style={styles.content}>
          <Text style={styles.line}>
            This takes <VoltHighlight textStyle={styles.line}>2 minutes.</VoltHighlight>
          </Text>
          <Text style={styles.line}>You can do it at your desk.</Text>
          <Text style={styles.line}>Right now.</Text>
          <Text style={styles.subtext}>
            No judgment. No streaks.{'\n'}Just you, moving.
          </Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton label="I'm ready" onPress={onContinue} />
        </View>
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
  topSpacer: {
    flex: 1.2,
  },
  content: {
    flexShrink: 0,
  },
  line: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 39,
    color: colors.black,
    marginTop: spacing.s2,
  },
  subtext: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.dustyBlueDark,
    marginTop: spacing.s8,
    lineHeight: 26,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.s6,
  },
});

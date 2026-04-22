import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { VoltHighlight } from '../components/VoltHighlight';
import { colors, spacing } from '../theme/tokens';

type Props = {
  onContinue: () => void;
};

export function WelcomeScreen({ onContinue }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topSpacer} />
        <View style={styles.content}>
          <Text style={styles.headline}>
            Movement{'\n'}that fits your{'\n'}
            <VoltHighlight textStyle={styles.headline}>real life.</VoltHighlight>
          </Text>
          <Text style={styles.subtext}>
            2-5 minute sessions. No equipment.{'\n'}No experience needed.
          </Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton label="Let's go" onPress={onContinue} />
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
  headline: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 41,
    color: colors.black,
  },
  subtext: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.dustyBlueDark,
    marginTop: spacing.s4,
    lineHeight: 26,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.s6,
  },
});

import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.headline}>Something went wrong.</Text>
          <Text style={styles.body}>
            Sorry about that. Tap below to try again.
          </Text>
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offWhite },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
    gap: spacing.s4,
  },
  headline: {
    ...typeTokens.h2,
    color: colors.black,
    textAlign: 'center',
  },
  body: {
    ...typeTokens.body,
    color: colors.dustyBlueDark,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.s4,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s4,
    backgroundColor: colors.black,
    borderRadius: radius.lg,
  },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: {
    ...typeTokens.body,
    color: colors.white,
    fontWeight: '600',
  },
});

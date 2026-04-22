import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useReducedTransparency } from '../hooks/useReducedTransparency';
import { radius } from '../theme/tokens';

type Tint = 'light' | 'dark';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  tint?: Tint;
};

export function GlassCard({ children, style, contentStyle, tint = 'light' }: Props) {
  const reduced = useReducedTransparency();

  if (reduced) {
    return (
      <View
        style={[
          styles.base,
          tint === 'light' ? styles.solidLight : styles.solidDark,
          tint === 'light' ? styles.borderLight : styles.borderDark,
          styles.shadow,
          style,
        ]}
      >
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.shadow, styles.wrap, style]}>
      <BlurView
        intensity={tint === 'light' ? 30 : 20}
        tint={tint === 'light' ? 'light' : 'dark'}
        style={[
          styles.blur,
          tint === 'light' ? styles.tintLight : styles.tintDark,
          tint === 'light' ? styles.borderLight : styles.borderDark,
        ]}
      >
        <View style={contentStyle}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  base: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tintLight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  tintDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  solidLight: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
  },
  solidDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
  },
  borderLight: {
    borderColor: 'rgba(255,255,255,0.7)',
  },
  borderDark: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export const colors = {
  volt: '#CDFF00',
  voltDark: '#A8D600',
  voltMuted: '#E8FF80',
  dustyBlue: '#7BA7C2',
  dustyBlueDark: '#5E8BA6',
  dustyBlueLight: '#A8CBE0',
  dustyBlueMuted: '#D6E6F0',
  coral: '#FF4F4F',
  coralDark: '#E03E3E',
  coralMuted: '#FF8A8A',
  black: '#0A0A0A',
  white: '#FFFFFF',
  offWhite: '#F7F7F5',
  gray900: '#1A1A1A',
  gray800: '#2D2D2D',
  gray700: '#404040',
  gray600: '#555555',
  gray500: '#717171',
  gray400: '#9E9E9E',
  gray300: '#CFCFCF',
  gray200: '#E5E5E5',
  gray100: '#F0F0F0',
} as const;

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
  s10: 40,
  s12: 48,
  s16: 64,
  s20: 80,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const type = {
  display: { fontSize: 48, fontWeight: '900' as const, letterSpacing: -1.5, lineHeight: 53 },
  h1: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -1, lineHeight: 43 },
  h2: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 38 },
  h3: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.3, lineHeight: 31 },
  bodyLarge: { fontSize: 18, fontWeight: '400' as const, lineHeight: 30 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  overline: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1.5, lineHeight: 17 },
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// Bezier tuples per design system: ease-default, ease-bounce.
// Pass to Easing.bezier(...) at call sites.
export const easing = {
  default: [0.25, 0.1, 0.25, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
} as const;

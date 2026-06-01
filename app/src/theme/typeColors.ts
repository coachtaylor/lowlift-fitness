import { colors } from './tokens';

// Single source of truth for the color associated with each session type /
// movement category. Move = dusty blue, Stretch = coral, Both = volt green.
// `fg` is the icon/accent color; `bg` a soft tile/card fill; `border` the card
// outline. (Both is type-only — individual movements are move or stretch.)
export type TypeColorKey = 'move' | 'stretch' | 'both';

export const typeColor: Record<TypeColorKey, { fg: string; bg: string; border: string }> = {
  move: {
    fg: colors.dustyBlueDark,
    bg: 'rgba(123,167,194,0.16)',
    border: 'transparent',
  },
  stretch: {
    fg: colors.coralDark,
    bg: 'rgba(255,79,79,0.10)',
    border: 'transparent',
  },
  both: {
    fg: colors.voltDark,
    bg: 'rgba(232,255,128,0.40)',
    border: 'rgba(205,255,0,0.35)',
  },
};

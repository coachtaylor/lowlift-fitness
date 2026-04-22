import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  children: string;
  textStyle?: TextStyle;
};

export function VoltHighlight({ children, textStyle }: Props) {
  return <Text style={[styles.pill, textStyle]}>{children}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.volt,
    color: colors.black,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});

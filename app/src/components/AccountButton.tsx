import { CircleUser } from 'lucide-react-native';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  onPress: () => void;
  tone?: 'dark' | 'light';
};

export function AccountButton({ onPress, tone = 'dark' }: Props) {
  const stroke = tone === 'dark' ? colors.black : colors.white;
  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safe}>
      <View pointerEvents="box-none" style={styles.row}>
        <Pressable
          onPress={onPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <CircleUser size={26} color={stroke} strokeWidth={2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s2,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  pressed: {
    opacity: 0.5,
  },
});

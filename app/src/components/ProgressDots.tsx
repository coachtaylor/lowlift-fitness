import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  total: number;
  current: number;
};

export function ProgressDots({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isCompleted = i < current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isCompleted && styles.completed,
              isActive && styles.active,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray300,
  },
  completed: {
    backgroundColor: colors.dustyBlue,
  },
  active: {
    width: 24,
    backgroundColor: colors.volt,
    borderRadius: radius.full,
  },
});

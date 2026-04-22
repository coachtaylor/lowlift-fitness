import { StyleSheet, Text, View } from 'react-native';
import { Movement } from '../data/sessions';
import { colors, spacing } from '../theme/tokens';

type RowState = 'completed' | 'current' | 'upcoming';

type Props = {
  movements: Movement[];
  currentIndex: number;
};

export function MovementList({ movements, currentIndex }: Props) {
  return (
    <View style={styles.list}>
      {movements.map((m, i) => {
        const state: RowState =
          i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'upcoming';
        return <Row key={m.id} name={m.name} state={state} />;
      })}
    </View>
  );
}

function Row({ name, state }: { name: string; state: RowState }) {
  return (
    <Text style={[styles.label, labelStyle(state)]} numberOfLines={1}>
      {name}
    </Text>
  );
}

function labelStyle(state: RowState) {
  if (state === 'current') {
    return { color: colors.volt, fontWeight: '600' as const };
  }
  if (state === 'completed') {
    return {
      color: 'rgba(255,255,255,0.35)',
      textDecorationLine: 'line-through' as const,
    };
  }
  return { color: 'rgba(255,255,255,0.55)' };
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.s4,
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
});

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  visible: boolean;
  onKeepGoing: () => void;
  onLeave: () => void;
};

export function ExitConfirmModal({ visible, onKeepGoing, onLeave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepGoing}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Leave this session?</Text>
          <Text style={styles.subtitle}>You can always start a new one.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onKeepGoing}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.primaryLabel}>Keep going</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onLeave}
            style={({ pressed }) => [
              styles.ghostBtn,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.ghostLabel}>Leave</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
  },
  dialog: {
    width: '100%',
    backgroundColor: 'rgba(26,26,26,0.95)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.s8,
    gap: spacing.s3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.s4,
  },
  primaryBtn: {
    backgroundColor: colors.volt,
    borderRadius: radius.lg,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black,
  },
  ghostBtn: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderRadius: radius.lg,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});

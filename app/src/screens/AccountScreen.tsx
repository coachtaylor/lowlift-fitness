import { ChevronLeft, ChevronRight, LogOut, Trash2 } from 'lucide-react-native';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';

type Props = {
  email: string | null;
  onBack: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

export function AccountScreen({ email, onBack, onSignOut, onDeleteAccount }: Props) {
  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onSignOut },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all your session history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: onDeleteAccount,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.black} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Account</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.content}>
        {email ? (
          <View style={styles.emailWrap}>
            <Text style={styles.emailLabel}>Signed in as</Text>
            <Text style={styles.emailValue}>{email}</Text>
          </View>
        ) : null}

        <GlassCard contentStyle={styles.card}>
          <Row
            icon={<LogOut size={18} color={colors.black} strokeWidth={2} />}
            label="Sign out"
            onPress={confirmSignOut}
            isLast={false}
          />
          <Row
            icon={<Trash2 size={18} color={colors.coral} strokeWidth={2} />}
            label="Delete account"
            labelColor={colors.coral}
            onPress={confirmDelete}
            isLast
          />
        </GlassCard>
      </View>
    </SafeAreaView>
  );
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  onPress: () => void;
  isLast: boolean;
};

function Row({ icon, label, labelColor, onPress, isLast }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : null]}>
          {label}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.gray400} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s2,
    paddingBottom: spacing.s4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  title: {
    ...typeTokens.h3,
    color: colors.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s4,
  },
  emailWrap: {
    marginBottom: spacing.s4,
    paddingHorizontal: spacing.s2,
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.gray400,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
    marginTop: spacing.s1,
  },
  card: {
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s4,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
  },
  pressed: {
    opacity: 0.6,
  },
});

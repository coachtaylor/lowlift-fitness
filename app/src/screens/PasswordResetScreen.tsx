import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { supabase } from '../data/supabase';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';

type Props = {
  onComplete: () => void;
};

export function PasswordResetScreen({ onComplete }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lengthOk = password.length >= 6;
  const matches = password === confirm;
  const canSubmit = lengthOk && matches && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.warn('[auth] updateUser error:', error);
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }
    } catch (e: any) {
      console.warn('[auth] updateUser threw:', e);
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onComplete();
  };

  const hint = !lengthOk
    ? 'At least 6 characters.'
    : !matches && confirm.length > 0
      ? "Passwords don't match."
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.topSpacer} />

          <View style={styles.content}>
            <Text style={styles.headline}>Set a new password</Text>
            <Text style={styles.subtext}>Almost there. Pick something you'll remember.</Text>

            <View style={styles.form}>
              <TextInput
                style={[styles.input, passwordFocused && styles.inputFocused]}
                placeholder="New password"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                secureTextEntry
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                editable={!submitting}
              />
              <TextInput
                style={[styles.input, confirmFocused && styles.inputFocused]}
                placeholder="Confirm password"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                secureTextEntry
                textContentType="newPassword"
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                editable={!submitting}
              />

              {errorMsg ? (
                <Text style={styles.error}>{errorMsg}</Text>
              ) : hint ? (
                <Text style={styles.hint}>{hint}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.footer}>
            {submitting ? (
              <View style={styles.spinnerWrap}>
                <ActivityIndicator color={colors.black} />
              </View>
            ) : (
              <PrimaryButton label="Update password" onPress={submit} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offWhite },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.s6 },
  topSpacer: { flex: 0.8 },
  content: { flexShrink: 0 },
  headline: {
    ...typeTokens.h1,
    color: colors.black,
  },
  subtext: {
    ...typeTokens.body,
    color: colors.dustyBlueDark,
    marginTop: spacing.s4,
  },
  form: {
    marginTop: spacing.s10,
    gap: spacing.s3,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    minHeight: 56,
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s4,
    fontSize: 16,
    color: colors.black,
  },
  inputFocused: {
    borderColor: colors.gray900,
  },
  hint: {
    ...typeTokens.caption,
    color: colors.dustyBlueDark,
    marginTop: spacing.s2,
  },
  error: {
    ...typeTokens.caption,
    color: colors.coral,
    marginTop: spacing.s2,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.s6,
    gap: spacing.s4,
  },
  spinnerWrap: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { setPendingPasswordReset } from '../data/storage';
import { supabase } from '../data/supabase';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';

const AUTH_REDIRECT_URL = 'lowliftfitness://auth-callback';

type Mode = 'signIn' | 'signUp' | 'forgotPassword';

const HEADLINES: Record<Mode, string> = {
  signUp: 'Create your account',
  signIn: 'Welcome back',
  forgotPassword: 'Reset your password',
};

const SUBTEXT: Record<Mode, string> = {
  signUp: 'So your progress sticks around.',
  signIn: 'Pick up right where you left off.',
  forgotPassword: "We'll email you a link to set a new one.",
};

const PRIMARY_LABEL: Record<Mode, string> = {
  signUp: 'Create account',
  signIn: 'Sign in',
  forgotPassword: 'Send reset link',
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const emailValid = email.trim().length > 3;
  const canSubmit = submitting
    ? false
    : mode === 'forgotPassword'
      ? emailValid
      : emailValid && password.length >= 6;

  const setModeAndReset = (next: Mode) => {
    setMode(next);
    setErrorMsg(null);
    setInfoMsg(null);
    if (next === 'forgotPassword') setPassword('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: AUTH_REDIRECT_URL },
        });
        if (error) {
          console.warn('[auth] supabase error:', error);
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }
        if (!data.session) {
          const alreadyRegistered = (data.user?.identities?.length ?? 0) === 0;
          if (alreadyRegistered) {
            setErrorMsg('An account with this email already exists. Try signing in instead.');
          } else {
            setInfoMsg(`We sent a confirmation link to ${email.trim()}. Tap it to finish signing up.`);
          }
          setSubmitting(false);
          return;
        }
      } else if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          console.warn('[auth] supabase error:', error);
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: AUTH_REDIRECT_URL,
        });
        if (error) {
          console.warn('[auth] resetPasswordForEmail error:', error);
          setErrorMsg(error.message);
          setSubmitting(false);
          return;
        }
        await setPendingPasswordReset(true);
        setInfoMsg(
          `If an account exists for ${email.trim()}, we sent a reset link. Check your inbox.`,
        );
        setSubmitting(false);
        return;
      }
    } catch (e: any) {
      console.warn('[auth] fetch threw:', e);
      setErrorMsg(e?.message ?? 'Network error. Check your connection and try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  const switchRowLabel =
    mode === 'signUp'
      ? 'Already have an account? Sign in'
      : mode === 'signIn'
        ? 'New here? Create an account'
        : 'Back to sign in';

  const handleSwitch = () => {
    if (mode === 'signUp') setModeAndReset('signIn');
    else setModeAndReset('signUp');
  };

  const handleSwitchFromForgot = () => setModeAndReset('signIn');

  // Pressable wrapper around password input forces re-focus even when iOS
  // Strong Password autofill leaves the input in a stuck state.
  const focusPassword = () => passwordRef.current?.focus();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.topSpacer} />
          <View style={styles.content}>
            <Text style={styles.headline}>{HEADLINES[mode]}</Text>
            <Text style={styles.subtext}>{SUBTEXT[mode]}</Text>

            <View style={styles.form}>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="Email"
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType={mode === 'forgotPassword' ? 'done' : 'next'}
                onSubmitEditing={mode === 'forgotPassword' ? submit : focusPassword}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                editable={!submitting}
              />
              {mode !== 'forgotPassword' && (
                <Pressable onPress={focusPassword}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, passwordFocused && styles.inputFocused]}
                    placeholder="Password"
                    placeholderTextColor={colors.gray400}
                    autoCapitalize="none"
                    secureTextEntry
                    textContentType="password"
                    autoComplete={mode === 'signUp' ? 'new-password' : 'password'}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!submitting}
                  />
                </Pressable>
              )}

              {mode === 'signIn' && (
                <Pressable
                  onPress={() => setModeAndReset('forgotPassword')}
                  disabled={submitting}
                  hitSlop={8}
                  style={styles.forgotRow}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
              {infoMsg ? <Text style={styles.info}>{infoMsg}</Text> : null}
            </View>
          </View>

          <View style={styles.footer}>
            {submitting ? (
              <View style={styles.spinnerWrap}>
                <ActivityIndicator color={colors.black} />
              </View>
            ) : (
              <PrimaryButton label={PRIMARY_LABEL[mode]} onPress={submit} />
            )}
            <Pressable
              onPress={mode === 'forgotPassword' ? handleSwitchFromForgot : handleSwitch}
              disabled={submitting}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>{switchRowLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offWhite },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.s6,
    paddingBottom: spacing.s6,
  },
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
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.s1,
  },
  forgotText: {
    ...typeTokens.caption,
    color: colors.dustyBlueDark,
  },
  error: {
    ...typeTokens.caption,
    color: colors.coral,
    marginTop: spacing.s2,
  },
  info: {
    ...typeTokens.caption,
    color: colors.dustyBlueDark,
    marginTop: spacing.s2,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.s4,
  },
  spinnerWrap: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    alignItems: 'center',
    paddingVertical: spacing.s3,
  },
  switchText: {
    ...typeTokens.caption,
    color: colors.dustyBlueDark,
  },
});

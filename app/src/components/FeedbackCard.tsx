import { Meh, ThumbsDown, ThumbsUp, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmojiRating } from '../data/feedback';
import { colors, radius, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';

type Props = {
  question: string;
  onSubmit: (rating: EmojiRating, text: string) => void;
  onDismiss: () => void;
};

const RATINGS: { value: EmojiRating; Icon: typeof ThumbsUp; label: string }[] = [
  { value: 'up', Icon: ThumbsUp, label: 'Thumbs up' },
  { value: 'meh', Icon: Meh, label: 'Neutral' },
  { value: 'down', Icon: ThumbsDown, label: 'Thumbs down' },
];

export function FeedbackCard({ question, onSubmit, onDismiss }: Props) {
  const [rating, setRating] = useState<EmojiRating | null>(null);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(onDismiss, 2000);
    return () => clearTimeout(t);
  }, [submitted, onDismiss]);

  if (submitted) {
    return (
      <GlassCard contentStyle={styles.thanksCard}>
        <Text style={styles.thanks}>Thanks!</Text>
      </GlassCard>
    );
  }

  const handleSubmit = () => {
    if (!rating) return;
    Keyboard.dismiss();
    onSubmit(rating, text.trim());
    setSubmitted(true);
  };

  return (
    <GlassCard contentStyle={styles.card}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss feedback prompt"
        hitSlop={12}
        style={styles.close}
      >
        <X size={16} color={colors.gray400} strokeWidth={2} />
      </Pressable>

      <Text style={styles.question}>{question}</Text>

      <View style={styles.ratings}>
        {RATINGS.map(({ value, Icon, label }) => {
          const selected = rating === value;
          return (
            <Pressable
              key={value}
              onPress={() => setRating(value)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.rating,
                selected && styles.ratingSelected,
                pressed && styles.ratingPressed,
              ]}
            >
              <Icon
                size={24}
                color={selected ? colors.black : colors.gray600}
                strokeWidth={2}
              />
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Tell us more (optional)"
        placeholderTextColor={colors.gray400}
        multiline
        style={styles.input}
        maxLength={500}
      />

      <View style={styles.actions}>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.notNow}
        >
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!rating}
          accessibilityRole="button"
          accessibilityState={{ disabled: !rating }}
          style={({ pressed }) => [
            styles.submit,
            !rating && styles.submitDisabled,
            pressed && rating && styles.submitPressed,
          ]}
        >
          <Text style={[styles.submitText, !rating && styles.submitTextDisabled]}>
            Send
          </Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
  },
  close: {
    position: 'absolute',
    top: spacing.s3,
    right: spacing.s3,
    padding: spacing.s2,
    zIndex: 1,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    lineHeight: 22,
    paddingRight: spacing.s6,
    marginBottom: spacing.s4,
  },
  ratings: {
    flexDirection: 'row',
    gap: spacing.s3,
    marginBottom: spacing.s4,
  },
  rating: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSelected: {
    backgroundColor: colors.volt,
    borderColor: colors.volt,
  },
  ratingPressed: {
    transform: [{ scale: 0.97 }],
  },
  input: {
    minHeight: 44,
    maxHeight: 96,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    fontSize: 14,
    color: colors.black,
    marginBottom: spacing.s4,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s4,
  },
  notNow: {
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s2,
  },
  notNowText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray500,
  },
  submit: {
    height: 36,
    paddingHorizontal: spacing.s5,
    borderRadius: radius.sm,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    backgroundColor: colors.gray200,
  },
  submitPressed: {
    backgroundColor: colors.voltDark,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  submitTextDisabled: {
    color: colors.gray400,
  },
  thanksCard: {
    paddingVertical: spacing.s8,
    alignItems: 'center',
  },
  thanks: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
});

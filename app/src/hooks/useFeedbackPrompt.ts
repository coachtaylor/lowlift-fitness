import { useCallback, useEffect, useState } from 'react';
import {
  EmojiRating,
  FeedbackState,
  fetchQuestions,
  loadFeedbackState,
  pickQuestion,
  recordAnswered,
  recordDismissed,
  shouldShowFeedback,
  submitFeedback,
} from '../data/feedback';

type Result = {
  visible: boolean;
  question: string;
  onSubmit: (rating: EmojiRating, text: string) => void;
  onDismiss: () => void;
};

export function useFeedbackPrompt(totalSessions: number): Result {
  const [state, setState] = useState<FeedbackState | null>(null);
  const [pool, setPool] = useState<string[]>([]);
  const [hiddenForSession, setHiddenForSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFeedbackState(), fetchQuestions()]).then(([s, q]) => {
      if (cancelled) return;
      setState(s);
      setPool(q);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setHiddenForSession(false);
  }, [totalSessions]);

  const onDismiss = useCallback(() => {
    setHiddenForSession(true);
    recordDismissed(totalSessions, pool.length).then(setState).catch(() => {});
  }, [totalSessions, pool.length]);

  const onSubmit = useCallback(
    (rating: EmojiRating, text: string) => {
      if (!state) return;
      const question = pickQuestion(state, pool);
      submitFeedback({
        question,
        emojiRating: rating,
        textResponse: text,
        timestamp: Date.now(),
        sessionCount: totalSessions,
      }).catch(() => {});
      setHiddenForSession(true);
      recordAnswered(totalSessions, pool.length).then(setState).catch(() => {});
    },
    [state, pool, totalSessions],
  );

  if (!state || hiddenForSession) {
    return { visible: false, question: '', onSubmit, onDismiss };
  }

  const visible = shouldShowFeedback(state, totalSessions);
  const question = pickQuestion(state, pool);
  return { visible, question, onSubmit, onDismiss };
}

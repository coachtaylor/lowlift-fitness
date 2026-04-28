import { CompletedSession } from './history';
import { Session } from './sessions';
import { supabase } from './supabase';

export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';

export async function startAttempt(session: Session): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: attempt, error: attemptError } = await supabase
    .from('session_attempts')
    .insert({
      user_id: user.id,
      session_slug: session.slug,
      session_type: session.type,
      session_name: session.name,
    })
    .select('id')
    .single();

  if (attemptError || !attempt) {
    console.warn('[tracking] startAttempt failed:', attemptError?.message);
    return null;
  }

  const rows = session.movements.map((m, i) => ({
    session_attempt_id: attempt.id,
    movement_id: m.id,
    movement_slug: m.slug,
    movement_name: m.name,
    order_index: i,
    planned_duration_seconds: m.duration,
    status: 'pending' as const,
  }));

  const { error: movementsError } = await supabase
    .from('session_attempt_movements')
    .insert(rows);

  if (movementsError) {
    console.warn(
      '[tracking] movement rows insert failed:',
      movementsError.message,
    );
  }

  return attempt.id;
}

export async function markMovementStarted(
  attemptId: string,
  orderIndex: number,
): Promise<void> {
  const { error } = await supabase
    .from('session_attempt_movements')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('session_attempt_id', attemptId)
    .eq('order_index', orderIndex);
  if (error) console.warn('[tracking] markMovementStarted:', error.message);
}

export async function markMovementCompleted(
  attemptId: string,
  orderIndex: number,
): Promise<void> {
  const { error } = await supabase
    .from('session_attempt_movements')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('session_attempt_id', attemptId)
    .eq('order_index', orderIndex);
  if (error) console.warn('[tracking] markMovementCompleted:', error.message);
}

export async function endAttempt(
  attemptId: string,
  status: 'completed' | 'abandoned',
  totalDurationSeconds: number,
): Promise<void> {
  const { error } = await supabase
    .from('session_attempts')
    .update({
      status,
      ended_at: new Date().toISOString(),
      total_duration_seconds: totalDurationSeconds,
    })
    .eq('id', attemptId);
  if (error) console.warn('[tracking] endAttempt:', error.message);
}

// On app launch, any attempt still 'in_progress' for this user is stale
// (app was killed mid-session). Mark them abandoned so dashboards don't
// show lingering ghosts.
export async function recoverStaleAttempts(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  const { error } = await supabase
    .from('session_attempts')
    .update({ status: 'abandoned', ended_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'in_progress');
  if (error) console.warn('[tracking] recoverStaleAttempts:', error.message);
}

export async function loadCompletedSessions(): Promise<CompletedSession[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('session_attempts')
    .select(
      'id, session_type, session_name, total_duration_seconds, ended_at, started_at, session_attempt_movements(movement_slug, movement_name, order_index, planned_duration_seconds)',
    )
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('[tracking] loadCompletedSessions:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const rawMovements = (row.session_attempt_movements ?? []) as Array<{
      movement_slug: string;
      movement_name: string;
      order_index: number;
      planned_duration_seconds: number;
    }>;
    const movements = rawMovements
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => ({
        slug: m.movement_slug,
        name: m.movement_name,
        durationSeconds: m.planned_duration_seconds,
      }));
    return {
      id: row.id,
      type: row.session_type,
      sessionName: row.session_name,
      durationSeconds: row.total_duration_seconds ?? 0,
      completedAt: new Date(row.ended_at ?? row.started_at).getTime(),
      movements,
    };
  });
}

import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Heart,
  Play,
  Sparkles,
  StretchHorizontal,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SessionType } from '../components/SessionCard';
import { DailyChallenge } from '../data/dailyChallenge';
import {
  ChallengeHistoryStats,
  loadChallengeHistory,
} from '../data/dailyChallengeHistory';
import {
  CompletedSession,
  CompletedSessionMovement,
  formatMMSS,
  longestStreak,
} from '../data/history';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  history: CompletedSession[];
  favoriteSlugs: Set<string>;
  onToggleFavorite: (sessionId: string) => void;
  challenge: DailyChallenge | null;
  onStart: () => void;
  onNavigateToChallenge: () => void;
};

const MILESTONE_THRESHOLDS = [5, 10, 25, 50, 100] as const;
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatMonthDay(ts: number): string {
  const d = new Date(ts);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function formatHistoryDate(ts: number, now: number): string {
  const today = startOfDay(now);
  const target = startOfDay(ts);
  const DAY = 24 * 60 * 60 * 1000;
  const diff = Math.round((today - target) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatMonthDay(ts);
}

function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

type Aggregates = {
  totalSessions: number;
  minutesMoved: number;
  sessionsThisMonth: number;
  activeDays: number;
  bestWeekCount: number;
  bestWeekStart: number | null;
  longestStreakDays: number;
  mix: { move: number; stretch: number; both: number };
  firstSessionAt: number | null;
};

function computeAggregates(
  history: CompletedSession[],
  now: number,
): Aggregates {
  if (history.length === 0) {
    return {
      totalSessions: 0,
      minutesMoved: 0,
      sessionsThisMonth: 0,
      activeDays: 0,
      bestWeekCount: 0,
      bestWeekStart: null,
      longestStreakDays: 0,
      mix: { move: 0, stretch: 0, both: 0 },
      firstSessionAt: null,
    };
  }

  const today = new Date(now);
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  let totalSeconds = 0;
  let sessionsThisMonth = 0;
  const dayBuckets = new Set<number>();
  const weekBuckets = new Map<number, number>();
  const typeCounts = { move: 0, stretch: 0, both: 0 };
  let firstSessionAt = history[0].completedAt;

  for (const h of history) {
    totalSeconds += h.durationSeconds;
    const d = new Date(h.completedAt);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      sessionsThisMonth += 1;
    }
    dayBuckets.add(startOfDay(h.completedAt));
    const wk = startOfWeek(d).getTime();
    weekBuckets.set(wk, (weekBuckets.get(wk) ?? 0) + 1);
    if (h.type === 'move' || h.type === 'stretch' || h.type === 'both') {
      typeCounts[h.type] += 1;
    }
    if (h.completedAt < firstSessionAt) firstSessionAt = h.completedAt;
  }

  let bestWeekCount = 0;
  let bestWeekStart: number | null = null;
  for (const [start, count] of weekBuckets) {
    if (
      count > bestWeekCount ||
      (count === bestWeekCount && (bestWeekStart === null || start > bestWeekStart))
    ) {
      bestWeekCount = count;
      bestWeekStart = start;
    }
  }

  const total = history.length;
  const rawMix = {
    move: (typeCounts.move / total) * 100,
    stretch: (typeCounts.stretch / total) * 100,
    both: (typeCounts.both / total) * 100,
  };
  // Largest-remainder rounding so percentages sum to 100.
  const floored = {
    move: Math.floor(rawMix.move),
    stretch: Math.floor(rawMix.stretch),
    both: Math.floor(rawMix.both),
  };
  let remainder = 100 - (floored.move + floored.stretch + floored.both);
  const order: Array<'move' | 'stretch' | 'both'> = (
    ['move', 'stretch', 'both'] as const
  )
    .slice()
    .sort((a, b) => rawMix[b] - rawMix[a] || 0);
  for (let i = 0; i < remainder; i++) {
    floored[order[i % order.length]] += 1;
  }

  return {
    totalSessions: total,
    minutesMoved: Math.round(totalSeconds / 60),
    sessionsThisMonth,
    activeDays: dayBuckets.size,
    bestWeekCount,
    bestWeekStart,
    longestStreakDays: longestStreak(history),
    mix: floored,
    firstSessionAt,
  };
}

function remainingChallengeReps(challenge: DailyChallenge | null): number {
  if (!challenge) return 0;
  return challenge.movements.reduce(
    (sum, m) => sum + Math.max(0, m.goalReps - m.completedReps),
    0,
  );
}

function typeIcon(type: SessionType) {
  if (type === 'move') return Dumbbell;
  if (type === 'stretch') return StretchHorizontal;
  return Zap;
}

function typeBgFg(type: SessionType): { bg: string; fg: string } {
  if (type === 'move') {
    return { bg: 'rgba(123,167,194,0.18)', fg: colors.dustyBlueDark };
  }
  if (type === 'stretch') {
    return { bg: 'rgba(232,255,128,0.55)', fg: colors.voltDark };
  }
  return { bg: 'rgba(255,79,79,0.10)', fg: colors.coral };
}

export function ProgressScreen({
  history,
  favoriteSlugs,
  onToggleFavorite,
  challenge,
  onStart,
  onNavigateToChallenge,
}: Props) {
  const now = Date.now();
  const agg = useMemo(() => computeAggregates(history, now), [history, now]);
  const [challengeStats, setChallengeStats] = useState<ChallengeHistoryStats>({
    totalChallengesCompleted: 0,
    currentChallengeStreak: 0,
    longestChallengeStreak: 0,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    let cancelled = false;
    loadChallengeHistory().then((stats) => {
      if (!cancelled) setChallengeStats(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [history.length, challenge?.sessionsCompletedToday, challenge?.isComplete]);

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSpacer} />
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>PROGRESS</Text>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyIll}>
            <Sparkles size={36} color={colors.gray300} strokeWidth={1.8} />
            <View style={styles.emptyDot} />
          </View>
          <Text style={styles.emptyHeadline}>Your wins live here.</Text>
          <Text style={styles.emptyBody}>
            Finish your first session and this room starts filling up.
          </Text>
          <Pressable style={styles.emptyCta} onPress={onStart}>
            <Play size={16} color={colors.black} fill={colors.black} />
            <Text style={styles.emptyCtaLabel}>Start a session</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const earnedCount = MILESTONE_THRESHOLDS.filter(
    (n) => agg.totalSessions >= n,
  ).length;
  const nextMilestone = MILESTONE_THRESHOLDS.find(
    (n) => agg.totalSessions < n,
  );
  const sessionsToNext = nextMilestone ? nextMilestone - agg.totalSessions : 0;
  const recentHistory = history.slice(0, 5);
  const challengeRepsToGo = remainingChallengeReps(challenge);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSpacer} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>PROGRESS</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroHeadline}>Hey, glad you're back.</Text>
          <Text style={styles.heroLede}>
            No catching up needed. Here's what you've built so far.
          </Text>
        </View>

        {/* Numbers card */}
        <View style={[styles.card, styles.numbersCard]}>
          <View style={styles.numbersLead}>
            <Text style={styles.numbersLeadValue}>{agg.totalSessions}</Text>
            <Text style={styles.numbersLeadLabel}>
              sessions{'\n'}completed
            </Text>
          </View>
          <View style={styles.numbersGrid}>
            <View style={[styles.numbersItem, styles.numbersItemBorder]}>
              <Text style={styles.numbersItemValue}>{agg.minutesMoved}</Text>
              <Text style={styles.numbersItemLabel}>minutes moved</Text>
            </View>
            <View style={[styles.numbersItem, styles.numbersItemBorder]}>
              <Text style={styles.numbersItemValue}>{agg.sessionsThisMonth}</Text>
              <Text style={styles.numbersItemLabel}>sessions this month</Text>
            </View>
            <View style={styles.numbersItem}>
              <Text style={styles.numbersItemValue}>{agg.activeDays}</Text>
              <Text style={styles.numbersItemLabel}>days you showed up</Text>
            </View>
          </View>
        </View>

        {/* Records card */}
        <View style={[styles.card, styles.recordCard]}>
          <View style={styles.recordCol}>
            <View style={styles.recordLabel}>
              <Text style={styles.recordLabelText}>BEST WEEK EVER</Text>
              <Trophy size={15} color={colors.voltDark} strokeWidth={2.6} />
            </View>
            <View style={styles.recordValueRow}>
              <Text style={styles.recordBig}>{agg.bestWeekCount}</Text>
              <Text style={styles.recordUnit}> sessions</Text>
            </View>
            <Text style={styles.recordSub}>
              {agg.bestWeekStart
                ? `week of ${formatMonthDay(agg.bestWeekStart)}`
                : '—'}
            </Text>
          </View>
          <View style={styles.recordDivider} />
          <View style={styles.recordCol}>
            <View style={styles.recordLabel}>
              <Text style={styles.recordLabelText}>LONGEST STREAK</Text>
              <Flame size={15} color={colors.coral} strokeWidth={2.6} />
            </View>
            <View style={styles.recordValueRow}>
              <Text style={styles.recordBig}>{agg.longestStreakDays}</Text>
              <Text style={styles.recordUnit}> days</Text>
            </View>
            <Text style={styles.recordSub}>in a row</Text>
          </View>
        </View>

        {/* Mix card */}
        <View style={[styles.card, styles.mixCard]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadTitle}>How you like to move</Text>
            <Text style={styles.cardHeadMini}>
              all time · {agg.totalSessions} sessions
            </Text>
          </View>
          <View style={styles.stackedBar}>
            {agg.mix.move > 0 && (
              <View
                style={[
                  styles.stackedSeg,
                  { backgroundColor: colors.dustyBlue, flex: agg.mix.move },
                ]}
              />
            )}
            {agg.mix.stretch > 0 && (
              <View
                style={[
                  styles.stackedSeg,
                  { backgroundColor: colors.volt, flex: agg.mix.stretch },
                ]}
              />
            )}
            {agg.mix.both > 0 && (
              <View
                style={[
                  styles.stackedSeg,
                  { backgroundColor: colors.coral, flex: agg.mix.both },
                ]}
              />
            )}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: colors.dustyBlue }]}
              />
              <Text style={styles.legendLabel}>Move</Text>
              <Text style={styles.legendPct}>{agg.mix.move}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: colors.volt }]}
              />
              <Text style={styles.legendLabel}>Stretch</Text>
              <Text style={styles.legendPct}>{agg.mix.stretch}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: colors.coral }]}
              />
              <Text style={styles.legendLabel}>Both</Text>
              <Text style={styles.legendPct}>{agg.mix.both}%</Text>
            </View>
          </View>
        </View>

        {/* Challenge card */}
        <Pressable
          style={[styles.card, styles.challengeCard]}
          onPress={onNavigateToChallenge}
        >
          <View style={styles.challengeIcon}>
            <Target size={18} color={colors.voltDark} strokeWidth={1.8} />
          </View>
          <View style={styles.challengeBody}>
            <Text style={styles.challengeTitle}>
              {challenge
                ? challengeRepsToGo > 0
                  ? `Today's challenge: ${challengeRepsToGo} reps to go.`
                  : "Today's challenge: complete."
                : 'Set up a daily challenge.'}
            </Text>
            <View style={styles.challengeStats}>
              <Text style={styles.challengeStat}>
                <Text style={styles.challengeStatNum}>
                  {challengeStats.totalChallengesCompleted}
                </Text>
                {' challenges completed'}
              </Text>
              <Text style={styles.challengeStat}>
                <Text style={styles.challengeStatNum}>
                  {challengeStats.currentChallengeStreak}
                </Text>
                {' day streak'}
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color={colors.gray400} />
        </Pressable>

        {/* Milestones */}
        <View style={[styles.card, styles.milestonesCard]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadTitle}>Milestones</Text>
            <Text style={styles.cardHeadMini}>
              {earnedCount} of {MILESTONE_THRESHOLDS.length} earned
            </Text>
          </View>
          <View style={styles.msPath}>
            <View style={styles.msLineBg} />
            {(() => {
              const earnedSegments = Math.max(0, earnedCount - 1);
              const totalSegments = MILESTONE_THRESHOLDS.length - 1;
              const filledPct =
                totalSegments === 0 ? 0 : (earnedSegments / totalSegments) * 100;
              return (
                <View style={[styles.msLineFill, { width: `${filledPct}%` }]} />
              );
            })()}
            {MILESTONE_THRESHOLDS.map((n, idx) => {
              const earned = agg.totalSessions >= n;
              const isNext = !earned && idx === earnedCount;
              const state: 'earned' | 'next' | 'future' = earned
                ? 'earned'
                : isNext
                  ? 'next'
                  : 'future';
              return (
                <View key={n} style={styles.msNode}>
                  <View
                    style={[
                      styles.msDot,
                      state === 'earned' && styles.msDotEarned,
                      state === 'next' && styles.msDotNext,
                      state === 'future' && styles.msDotFuture,
                    ]}
                  >
                    {state === 'earned' ? (
                      <Check size={16} color={colors.white} strokeWidth={3} />
                    ) : (
                      <Text
                        style={[
                          styles.msDotNumber,
                          state === 'next' && styles.msDotNumberNext,
                          state === 'future' && styles.msDotNumberFuture,
                        ]}
                      >
                        {n}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.msCap,
                      state === 'earned' && styles.msCapEarned,
                      state === 'next' && styles.msCapNext,
                    ]}
                    numberOfLines={1}
                  >
                    {state === 'next' ? `${n} next` : `${n}`}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.msFoot}>
            <View style={styles.msPill}>
              <Text style={styles.msPillText}>
                {nextMilestone ? 'NEXT' : 'DONE'}
              </Text>
            </View>
            <Text style={styles.msFootText}>
              {nextMilestone ? (
                <>
                  <Text style={styles.msFootBold}>
                    {sessionsToNext}{' '}
                    {sessionsToNext === 1 ? 'session' : 'sessions'} to{' '}
                    {nextMilestone}.
                  </Text>
                  {nextMilestone < 100 ? ' Keep showing up.' : ''}
                </>
              ) : (
                "Every milestone earned. You're writing your own scale now."
              )}
            </Text>
          </View>
        </View>

        {/* Session history */}
        <View style={[styles.card, styles.historyCard]}>
          <View style={styles.historyHead}>
            <Text style={styles.cardHeadTitle}>Session history</Text>
          </View>
          {recentHistory.map((s) => (
            <HistoryRow
              key={s.id}
              session={s}
              now={now}
              expanded={expandedId === s.id}
              favorited={favoriteSlugs.has(s.sessionSlug)}
              onPress={() => toggleExpanded(s.id)}
              onToggleFavorite={() => onToggleFavorite(s.sessionSlug)}
            />
          ))}
        </View>

        {/* Tail */}
        <View style={styles.tail}>
          <Text style={styles.tailText}>
            {agg.totalSessions} sessions
            {agg.firstSessionAt ? (
              <>
                <Text style={styles.tailDot}> · </Text>
                since {formatMonthDay(agg.firstSessionAt)}
              </>
            ) : null}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type HistoryRowProps = {
  session: CompletedSession;
  now: number;
  expanded: boolean;
  favorited: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

function HistoryRow({
  session,
  now,
  expanded,
  favorited,
  onPress,
  onToggleFavorite,
}: HistoryRowProps) {
  const I = typeIcon(session.type);
  const { bg, fg } = typeBgFg(session.type);
  const movements: CompletedSessionMovement[] = session.movements ?? [];
  const hasMovements = movements.length > 0;

  return (
    <View style={styles.hRowOuter}>
      <View style={styles.hRow}>
        <Pressable
          onPress={hasMovements ? onPress : undefined}
          accessibilityRole={hasMovements ? 'button' : undefined}
          accessibilityState={hasMovements ? { expanded } : undefined}
          style={({ pressed }) => [
            styles.hRowMain,
            pressed && hasMovements && styles.hRowPressed,
          ]}
        >
          <View style={[styles.hRowIcon, { backgroundColor: bg }]}>
            <I size={16} color={fg} strokeWidth={1.8} />
          </View>
          <View style={styles.hRowText}>
            <Text style={styles.hRowName} numberOfLines={1}>
              {session.sessionName}
            </Text>
            <View style={styles.hRowMeta}>
              <Text style={styles.hRowMetaText}>
                {formatHistoryDate(session.completedAt, now)}
              </Text>
              <View style={styles.hRowMetaSep} />
              <Text style={styles.hRowMetaText}>
                {formatDurationShort(session.durationSeconds)}
              </Text>
            </View>
          </View>
          {hasMovements && (
            <ChevronDown
              size={14}
              color={colors.gray400}
              strokeWidth={2}
              style={expanded ? styles.hChevronOpen : styles.hChevron}
            />
          )}
        </Pressable>
        <Pressable
          onPress={onToggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={
            favorited
              ? `Remove ${session.sessionName} from favorites`
              : `Save ${session.sessionName} to favorites`
          }
          accessibilityState={{ selected: favorited }}
          hitSlop={10}
          style={({ pressed }) => [styles.heartHit, pressed && styles.heartPressed]}
        >
          <Heart
            size={18}
            color={favorited ? colors.coral : colors.gray400}
            fill={favorited ? colors.coral : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
      </View>
      {expanded && hasMovements && (
        <View style={styles.hExpanded}>
          {movements.map((m) => (
            <View key={m.slug} style={styles.movementRow}>
              <Text style={styles.movementName} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={styles.movementDuration}>
                {formatMMSS(m.durationSeconds)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <View style={styles.totalRight}>
              <Clock size={12} color={colors.dustyBlue} strokeWidth={2} />
              <Text style={styles.totalDuration}>
                {formatMMSS(session.durationSeconds)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  headerSpacer: {
    height: 48,
  },
  scroll: {
    paddingHorizontal: spacing.s5,
    paddingBottom: spacing.s8,
  },
  topBar: {
    paddingTop: spacing.s3,
    paddingBottom: spacing.s4,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.gray400,
  },

  // Hero
  hero: {
    marginTop: 4,
    marginBottom: spacing.s4,
  },
  heroHeadline: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 33,
    color: colors.black,
  },
  heroLede: {
    marginTop: 10,
    fontSize: 14,
    color: colors.dustyBlueDark,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Card shared
  card: {
    backgroundColor: colors.white,
    borderColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.15,
  },
  cardHeadMini: {
    fontSize: 11,
    color: colors.gray400,
    fontWeight: '500',
  },

  // Numbers
  numbersCard: {
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 4,
  },
  numbersLead: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  numbersLeadValue: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -3.2,
    lineHeight: 68,
    color: colors.black,
  },
  numbersLeadLabel: {
    fontSize: 13,
    color: colors.gray500,
    fontWeight: '600',
    marginLeft: 10,
    paddingBottom: 6,
    lineHeight: 16,
  },
  numbersGrid: {
    marginTop: 14,
    paddingTop: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
  },
  numbersItem: {
    flex: 1,
    paddingHorizontal: 7,
  },
  numbersItemBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.06)',
  },
  numbersItemValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.55,
    lineHeight: 22,
    color: colors.black,
  },
  numbersItemLabel: {
    fontSize: 11,
    color: colors.gray500,
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 14,
  },

  // Record
  recordCard: {
    marginTop: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordCol: {
    flex: 1,
  },
  recordDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 16,
  },
  recordLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: colors.gray400,
  },
  recordValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  recordBig: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.48,
    lineHeight: 24,
    color: colors.black,
  },
  recordUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray500,
    paddingBottom: 1,
  },
  recordSub: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 5,
  },

  // Mix
  mixCard: {
    marginTop: 14,
    padding: 20,
  },
  stackedBar: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 2,
  },
  stackedSeg: {
    height: '100%',
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '500',
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.black,
    marginLeft: 2,
  },

  // Challenge
  challengeCard: {
    marginTop: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  challengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.voltMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeBody: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.14,
  },
  challengeStats: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 14,
  },
  challengeStat: {
    fontSize: 12,
    color: colors.gray500,
  },
  challengeStatNum: {
    color: colors.gray900,
    fontWeight: '700',
  },

  // Milestones
  milestonesCard: {
    marginTop: 14,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  msPath: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  msLineBg: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 22,
    height: 2,
    backgroundColor: colors.gray200,
  },
  msLineFill: {
    position: 'absolute',
    left: 24,
    top: 22,
    height: 2,
    backgroundColor: colors.coral,
  },
  msNode: {
    alignItems: 'center',
    flex: 1,
  },
  msDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msDotEarned: {
    backgroundColor: colors.coral,
    shadowColor: colors.coral,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    borderWidth: 4,
    borderColor: 'rgba(255,79,79,0.10)',
  },
  msDotNext: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
  },
  msDotFuture: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
  },
  msDotNumber: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.26,
    color: colors.black,
  },
  msDotNumberNext: {
    color: colors.black,
  },
  msDotNumberFuture: {
    color: colors.gray400,
  },
  msCap: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray500,
    textAlign: 'center',
  },
  msCapEarned: {
    color: colors.gray900,
    fontWeight: '700',
  },
  msCapNext: {
    color: colors.black,
    fontWeight: '700',
  },
  msFoot: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  msPill: {
    backgroundColor: colors.black,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  msPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  msFootText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 18,
  },
  msFootBold: {
    color: colors.black,
    fontWeight: '700',
  },

  // History
  historyCard: {
    marginTop: 14,
    paddingVertical: 6,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  hRowOuter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  hRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  hRowPressed: {
    opacity: 0.6,
  },
  hRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hRowText: {
    flex: 1,
  },
  hRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: -0.07,
  },
  hRowMeta: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hRowMetaText: {
    fontSize: 12,
    color: colors.gray500,
  },
  hRowMetaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.gray300,
  },
  hChevron: {
    marginLeft: spacing.s2,
    transform: [{ rotate: '0deg' }],
  },
  hChevronOpen: {
    marginLeft: spacing.s2,
    transform: [{ rotate: '180deg' }],
  },
  heartHit: {
    paddingLeft: spacing.s3,
    paddingVertical: spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartPressed: {
    opacity: 0.5,
  },
  hExpanded: {
    paddingLeft: 66,
    paddingRight: 18,
    paddingBottom: spacing.s3,
    paddingTop: 2,
    gap: 6,
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementName: {
    fontSize: 13,
    color: colors.gray400,
    flex: 1,
    paddingRight: spacing.s3,
  },
  movementDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray400,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.dustyBlue,
  },

  // Tail
  tail: {
    marginTop: 18,
    alignItems: 'center',
  },
  tailText: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: '500',
  },
  tailDot: {
    color: colors.gray300,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingBottom: 60,
    gap: 16,
  },
  emptyIll: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  emptyDot: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.volt,
    borderWidth: 4,
    borderColor: 'rgba(205,255,0,0.18)',
  },
  emptyHeadline: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.75,
    lineHeight: 33,
    color: colors.black,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    color: colors.dustyBlueDark,
    lineHeight: 22,
    maxWidth: 280,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyCta: {
    marginTop: 14,
    backgroundColor: colors.volt,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.voltDark,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  emptyCtaLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: -0.16,
  },
});

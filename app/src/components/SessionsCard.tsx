import { ChevronDown, Clock, Dumbbell, Heart, Play, StretchHorizontal, Zap } from 'lucide-react-native';
import { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CompletedSession,
  CompletedSessionMovement,
  formatMMSS,
  formatRelativeDate,
} from '../data/history';
import { Movement, Session } from '../data/sessions';
import { colors, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';
import { SessionType } from './SessionCard';

type Tab = 'recent' | 'favorites';

type Props = {
  history: CompletedSession[];
  favoriteSlugs: Set<string>;
  favoriteSessions: Session[];
  onToggleFavorite: (sessionId: string) => void;
  onStartFavorite: (sessionId: string) => void;
};

const TYPE_ICONS: Record<SessionType, typeof Dumbbell> = {
  move: Dumbbell,
  stretch: StretchHorizontal,
  both: Zap,
};

export function SessionsCard({
  history,
  favoriteSlugs,
  favoriteSessions,
  onToggleFavorite,
  onStartFavorite,
}: Props) {
  const [tab, setTab] = useState<Tab>('recent');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(null);
    setTab(next);
  };

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const recent = history.slice(0, 4);

  return (
    <GlassCard contentStyle={styles.card}>
      <View style={styles.tabs}>
        <TabButton
          label="Recent"
          active={tab === 'recent'}
          onPress={() => switchTab('recent')}
        />
        <TabButton
          label="Favorites"
          active={tab === 'favorites'}
          onPress={() => switchTab('favorites')}
        />
      </View>

      {tab === 'recent' ? (
        recent.length === 0 ? (
          <Text style={styles.empty}>Your sessions will show up here.</Text>
        ) : (
          recent.map((s, i) => (
            <RecentRow
              key={s.id}
              type={s.type}
              name={s.sessionName}
              date={formatRelativeDate(s.completedAt)}
              duration={formatMMSS(s.durationSeconds)}
              movements={s.movements ?? []}
              expanded={expandedId === s.id}
              favorited={favoriteSlugs.has(s.sessionSlug)}
              onPress={() => toggleExpanded(s.id)}
              onToggleFavorite={() => onToggleFavorite(s.sessionSlug)}
              isLast={i === recent.length - 1}
            />
          ))
        )
      ) : favoriteSessions.length === 0 ? (
        <Text style={styles.empty}>Tap the heart on a session to save it here.</Text>
      ) : (
        favoriteSessions.map((s, i) => {
          const totalSeconds = s.movements.reduce((a, m) => a + m.duration, 0);
          return (
            <FavoriteRow
              key={s.slug}
              type={s.type}
              name={s.name}
              duration={formatMMSS(totalSeconds)}
              movements={s.movements}
              expanded={expandedId === s.slug}
              onPress={() => toggleExpanded(s.slug)}
              onStart={() => onStartFavorite(s.slug)}
              isLast={i === favoriteSessions.length - 1}
            />
          );
        })
      )}
    </GlassCard>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={8}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>
        {label.toUpperCase()}
      </Text>
      <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
    </Pressable>
  );
}

type RecentRowProps = {
  type: SessionType;
  name: string;
  date: string;
  duration: string;
  movements: CompletedSessionMovement[];
  expanded: boolean;
  favorited: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  isLast: boolean;
};

function RecentRow({
  type,
  name,
  date,
  duration,
  movements,
  expanded,
  favorited,
  onPress,
  onToggleFavorite,
  isLast,
}: RecentRowProps) {
  const Icon = TYPE_ICONS[type];
  const hasMovements = movements.length > 0;
  return (
    <View style={!isLast && styles.rowDivider}>
      <View style={styles.row}>
        <Pressable
          onPress={hasMovements ? onPress : undefined}
          accessibilityRole={hasMovements ? 'button' : undefined}
          accessibilityState={hasMovements ? { expanded } : undefined}
          style={({ pressed }) => [
            styles.rowMain,
            pressed && hasMovements && styles.rowPressed,
          ]}
        >
          <View style={styles.left}>
            <Icon size={16} color={colors.dustyBlueDark} strokeWidth={2} />
            <View>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.date}>{date}</Text>
            </View>
          </View>
          <View style={styles.right}>
            <Clock size={12} color={colors.dustyBlue} strokeWidth={2} />
            <Text style={styles.duration}>{duration}</Text>
            {hasMovements && (
              <ChevronDown
                size={14}
                color={colors.gray400}
                strokeWidth={2}
                style={expanded ? styles.chevronOpen : styles.chevron}
              />
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={onToggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={favorited ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
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
        <View style={styles.expanded}>
          {movements.map((m) => (
            <View key={m.slug} style={styles.movementRow}>
              <Text style={styles.movementName} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={styles.movementDuration}>{formatMMSS(m.durationSeconds)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type FavoriteRowProps = {
  type: SessionType;
  name: string;
  duration: string;
  movements: Movement[];
  expanded: boolean;
  onPress: () => void;
  onStart: () => void;
  isLast: boolean;
};

function FavoriteRow({
  type,
  name,
  duration,
  movements,
  expanded,
  onPress,
  onStart,
  isLast,
}: FavoriteRowProps) {
  const Icon = TYPE_ICONS[type];
  const hasMovements = movements.length > 0;
  return (
    <View style={!isLast && styles.rowDivider}>
      <View style={styles.row}>
        <Pressable
          onPress={hasMovements ? onPress : undefined}
          accessibilityRole={hasMovements ? 'button' : undefined}
          accessibilityState={hasMovements ? { expanded } : undefined}
          style={({ pressed }) => [
            styles.rowMain,
            pressed && hasMovements && styles.rowPressed,
          ]}
        >
          <View style={styles.favLeft}>
            <Icon size={16} color={colors.dustyBlueDark} strokeWidth={2} />
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <View style={styles.right}>
            <Clock size={12} color={colors.dustyBlue} strokeWidth={2} />
            <Text style={styles.duration}>{duration}</Text>
            {hasMovements && (
              <ChevronDown
                size={14}
                color={colors.gray400}
                strokeWidth={2}
                style={expanded ? styles.chevronOpen : styles.chevron}
              />
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={`Start ${name}`}
          hitSlop={10}
          style={({ pressed }) => [styles.playHit, pressed && styles.playPressed]}
        >
          <Play size={16} color={colors.black} fill={colors.black} strokeWidth={2} />
        </Pressable>
      </View>
      {expanded && hasMovements && (
        <View style={styles.expanded}>
          {movements.map((m) => (
            <View key={m.slug} style={styles.movementRow}>
              <Text style={styles.movementName} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={styles.movementDuration}>{formatMMSS(m.duration)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.s5,
    marginBottom: spacing.s3,
  },
  tab: {
    paddingBottom: 6,
  },
  tabPressed: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tabLabelActive: {
    color: colors.black,
  },
  tabLabelInactive: {
    color: colors.gray400,
  },
  tabUnderline: {
    height: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
    borderRadius: 1,
  },
  tabUnderlineActive: {
    backgroundColor: colors.black,
  },
  empty: {
    fontSize: 16,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: spacing.s6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    paddingVertical: spacing.s2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.black,
    flexShrink: 1,
  },
  date: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.dustyBlue,
  },
  chevron: {
    marginLeft: 4,
    transform: [{ rotate: '0deg' }],
  },
  chevronOpen: {
    marginLeft: 4,
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
  expanded: {
    paddingLeft: 26,
    paddingRight: 2,
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
  favLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: spacing.s3,
  },
  playHit: {
    paddingLeft: spacing.s3,
    paddingVertical: spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPressed: {
    opacity: 0.5,
  },
});

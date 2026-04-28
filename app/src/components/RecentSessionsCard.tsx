import { ChevronDown, Clock, Dumbbell, StretchHorizontal, Zap } from 'lucide-react-native';
import { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SessionType } from './SessionCard';
import {
  CompletedSession,
  CompletedSessionMovement,
  formatMMSS,
  formatRelativeDate,
} from '../data/history';
import { colors, spacing } from '../theme/tokens';
import { GlassCard } from './GlassCard';

type Props = {
  sessions: CompletedSession[];
};

const TYPE_ICONS = {
  move: Dumbbell,
  stretch: StretchHorizontal,
  both: Zap,
} as const;

export function RecentSessionsCard({ sessions }: Props) {
  const visible = sessions.slice(0, 4);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <GlassCard contentStyle={styles.card}>
      <Text style={styles.label}>Recent</Text>
      {visible.length === 0 ? (
        <Text style={styles.empty}>Your sessions will show up here.</Text>
      ) : (
        visible.map((s, i) => (
          <Row
            key={s.id}
            type={s.type}
            name={s.sessionName}
            date={formatRelativeDate(s.completedAt)}
            duration={formatMMSS(s.durationSeconds)}
            movements={s.movements ?? []}
            expanded={expandedId === s.id}
            onPress={() => toggle(s.id)}
            isLast={i === visible.length - 1}
          />
        ))
      )}
    </GlassCard>
  );
}

type RowProps = {
  type: SessionType;
  name: string;
  date: string;
  duration: string;
  movements: CompletedSessionMovement[];
  expanded: boolean;
  onPress: () => void;
  isLast: boolean;
};

function Row({ type, name, date, duration, movements, expanded, onPress, isLast }: RowProps) {
  const Icon = TYPE_ICONS[type];
  const hasMovements = movements.length > 0;
  return (
    <View style={!isLast && styles.rowDivider}>
      <Pressable
        onPress={hasMovements ? onPress : undefined}
        accessibilityRole={hasMovements ? 'button' : undefined}
        accessibilityState={hasMovements ? { expanded } : undefined}
        style={({ pressed }) => [styles.row, pressed && hasMovements && styles.rowPressed]}
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

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.gray400,
    marginBottom: spacing.s3,
  },
  empty: {
    fontSize: 16,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: spacing.s6,
  },
  row: {
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
});

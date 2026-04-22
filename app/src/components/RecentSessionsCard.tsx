import { Clock, Dumbbell, StretchHorizontal, Zap } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SessionType } from './SessionCard';
import { CompletedSession, formatMMSS, formatRelativeDate } from '../data/history';
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
  isLast: boolean;
};

function Row({ type, name, date, duration, isLast }: RowProps) {
  const Icon = TYPE_ICONS[type];
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={styles.left}>
        <Icon size={16} color={colors.gray400} strokeWidth={2} />
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Clock size={12} color={colors.dustyBlue} strokeWidth={2} />
        <Text style={styles.duration}>{duration}</Text>
      </View>
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
});

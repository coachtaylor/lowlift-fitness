import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { ComponentType, useState } from 'react';
import { BothIcon, MoveIcon, StretchIcon } from '../components/MovementIcons';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SessionType } from '../components/SessionCard';
import {
  DurationTier,
  FOCI,
  Focus,
  LENGTHS,
  SessionSelection,
  TYPES,
  focusDescription,
} from '../data/generateSession';
import { colors, radius, spacing } from '../theme/tokens';
import { typeColor } from '../theme/typeColors';

type Props = {
  initialSelection?: SessionSelection;
  onGenerate: (selection: SessionSelection) => void;
  onBack?: () => void;
};

const TYPE_ICON: Record<SessionType, ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  move: MoveIcon,
  stretch: StretchIcon,
  both: BothIcon,
};

type Cell = { id: string; label: string; hint?: string };

function Segmented({
  options,
  value,
  onChange,
  withIcon,
  tall,
}: {
  options: Cell[];
  value: string;
  onChange: (id: string) => void;
  withIcon?: boolean;
  tall?: boolean;
}) {
  return (
    <View style={styles.segTrack}>
      {options.map((o) => {
        const active = o.id === value;
        const Icon = withIcon ? TYPE_ICON[o.id as SessionType] : null;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={({ pressed }) => [
              styles.segCell,
              tall && styles.segCellTall,
              active && styles.segCellActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {Icon && (
              <Icon
                size={20}
                color={typeColor[o.id as SessionType].fg}
                strokeWidth={1.9}
              />
            )}
            <Text style={[styles.segName, active && styles.segNameActive]}>{o.label}</Text>
            {o.hint && (
              <Text style={[styles.segHint, active && styles.segHintActive]}>{o.hint}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SessionSelectionScreen({ initialSelection, onGenerate, onBack }: Props) {
  const [sel, setSel] = useState<SessionSelection>(
    initialSelection ?? { type: 'move', length: 'standard', focus: 'full' },
  );
  const isStretch = sel.type === 'stretch';

  const update = <K extends keyof SessionSelection>(key: K, val: SessionSelection[K]) =>
    setSel((s) => ({ ...s, [key]: val }));

  // Color associated with the selected type (move=blue, stretch=coral, both=volt).
  const tc = typeColor[sel.type];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to Dashboard"
            hitSlop={8}
          >
            <ChevronLeft size={15} color={colors.gray700} strokeWidth={2.2} />
            <Text style={styles.backLabel}>Dashboard</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TODAY</Text>
          <Text style={styles.title}>Let's move.</Text>
          <Text style={styles.lede}>
            Three quick calls and we'll build it. You're one tap from going.
          </Text>
        </View>

        <View style={styles.groups}>
          <View style={styles.group}>
            <Text style={styles.groupLabel}>TYPE</Text>
            <Segmented
              options={TYPES.map((t) => ({ id: t.id, label: t.label }))}
              value={sel.type}
              onChange={(v) => update('type', v as SessionType)}
              withIcon
              tall
            />
          </View>

          <View style={styles.group}>
            <View style={styles.groupLabelRow}>
              <Text style={styles.groupLabel}>LENGTH</Text>
              <Text style={styles.groupLabelSub}>how long you've got</Text>
            </View>
            <Segmented
              options={LENGTHS.map((l) => ({ id: l.id, label: l.label, hint: l.hint }))}
              value={sel.length}
              onChange={(v) => update('length', v as DurationTier)}
            />
          </View>

          <View style={styles.group}>
            <Text style={styles.groupLabel}>FOCUS</Text>
            {isStretch ? (
              <View style={[styles.focusLocked, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                <View style={styles.focusLockedIcon}>
                  <StretchIcon size={21} color={tc.fg} strokeWidth={1.9} />
                </View>
                <View style={styles.focusLockedMeta}>
                  <Text style={styles.focusLockedName}>Mobility</Text>
                  <Text style={styles.focusLockedSub}>
                    Gentle range-of-motion for stretch sessions
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.focusPick}>
                <Segmented
                  options={FOCI.map((f) => ({ id: f.id, label: f.label }))}
                  value={sel.focus}
                  onChange={(v) => update('focus', v as Focus)}
                />
                <View style={[styles.focusLocked, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                  <View style={styles.focusLockedIcon}>
                    {(() => {
                      const Icon = TYPE_ICON[sel.type];
                      return <Icon size={21} color={tc.fg} strokeWidth={1.9} />;
                    })()}
                  </View>
                  <View style={styles.focusLockedMeta}>
                    <Text style={styles.focusLockedName}>
                      {FOCI.find((f) => f.id === sel.focus)?.label}
                    </Text>
                    <Text style={styles.focusLockedSub}>
                      {focusDescription(sel.type, sel.focus)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Pressable
          onPress={() => onGenerate(sel)}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel="Generate session"
        >
          <Sparkles size={19} color={colors.black} strokeWidth={1.9} />
          <Text style={styles.ctaLabel}>Generate session</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offWhite },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s2,
    minHeight: 40,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s1,
    height: 34,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  backLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, letterSpacing: -0.1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 },
  hero: { paddingTop: spacing.s3, paddingHorizontal: 2 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: colors.dustyBlueDark },
  title: { marginTop: 7, fontSize: 38, fontWeight: '800', letterSpacing: -1.3, lineHeight: 39, color: colors.black },
  lede: {
    marginTop: 9,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    color: colors.dustyBlueDark,
    maxWidth: 280,
  },
  groups: { marginTop: spacing.s5, gap: spacing.s5 },
  group: { gap: spacing.s3 },
  groupLabelRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s2, paddingHorizontal: 2 },
  groupLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, color: colors.gray500, paddingHorizontal: 2 },
  groupLabelSub: { fontSize: 11.5, fontWeight: '500', color: colors.gray400 },
  segTrack: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 18,
    padding: 5,
  },
  segCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 13,
  },
  segCellTall: { paddingVertical: 20, gap: 8, minHeight: 88 },
  segCellActive: { backgroundColor: colors.black },
  segName: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1, color: colors.gray700 },
  segNameActive: { color: colors.white },
  segHint: { fontSize: 11, fontWeight: '600', color: colors.gray400 },
  segHintActive: { color: 'rgba(255,255,255,0.6)' },
  focusLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    backgroundColor: 'rgba(232,255,128,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(205,255,0,0.35)',
    borderRadius: 18,
    padding: 14,
  },
  focusLockedIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPick: { gap: 10 },
  focusLockedMeta: { flex: 1, gap: 2 },
  focusLockedName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1, color: colors.gray900 },
  focusLockedSub: { fontSize: 12, fontWeight: '500', color: colors.gray600, lineHeight: 16 },
  ctaBar: { paddingHorizontal: spacing.s5, paddingTop: spacing.s3, paddingBottom: spacing.s6 },
  cta: {
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.volt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: colors.voltDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaPressed: { transform: [{ scale: 0.98 }], backgroundColor: colors.voltDark },
  ctaLabel: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: colors.black },
});

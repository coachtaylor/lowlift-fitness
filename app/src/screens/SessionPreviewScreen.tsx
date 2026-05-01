import {
  Check,
  ChevronDown,
  Dumbbell,
  GripVertical,
  StretchHorizontal,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Movement, MovementCategory, loadMovements } from '../data/movements';
import { Session } from '../data/sessions';
import { colors, radius, spacing, type as typeTokens } from '../theme/tokens';

type Props = {
  session: Session;
  onStart: (movements: Movement[]) => void;
  onSkip: () => void;
  onBack: () => void;
};

const CATEGORY_ICON = {
  move: Dumbbell,
  stretch: StretchHorizontal,
} as const;

export function SessionPreviewScreen({ session, onStart, onSkip, onBack }: Props) {
  const [movements, setMovements] = useState<Movement[]>(session.movements);
  const [catalog, setCatalog] = useState<Map<string, Movement> | null>(null);
  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMovements().then((map) => {
      if (!cancelled) setCatalog(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSlugs = useMemo(
    () => new Set(movements.map((m) => m.slug)),
    [movements],
  );

  const swapTarget = swapTargetIndex !== null ? movements[swapTargetIndex] : null;
  const swapAlternatives = useMemo(() => {
    if (!swapTarget || !catalog) return [];
    const alts: Movement[] = [];
    catalog.forEach((m) => {
      if (m.category !== swapTarget.category) return;
      if (m.slug === swapTarget.slug) return;
      if (currentSlugs.has(m.slug)) return;
      alts.push(m);
    });
    return alts.sort((a, b) => a.name.localeCompare(b.name));
  }, [swapTarget, catalog, currentSlugs]);

  const handleSwap = (replacement: Movement) => {
    if (swapTargetIndex === null) return;
    setMovements((prev) => {
      const next = [...prev];
      next[swapTargetIndex] = replacement;
      return next;
    });
    setSwapTargetIndex(null);
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Movement>) => {
    const Icon = CATEGORY_ICON[item.category];
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={1.04}>
        <Pressable
          onLongPress={drag}
          delayLongPress={150}
          disabled={isActive}
          style={[styles.row, isActive && styles.rowActive]}
        >
          <Pressable
            onLongPress={drag}
            delayLongPress={150}
            hitSlop={8}
            accessibilityLabel={`Drag handle for ${item.name}`}
            accessibilityRole="button"
            style={styles.handle}
          >
            <GripVertical size={20} color={colors.gray400} strokeWidth={2} />
          </Pressable>

          <View style={styles.iconPill}>
            <Icon size={18} color={colors.gray600} strokeWidth={2} />
          </View>

          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>

          <Pressable
            onPress={() => setSwapTargetIndex(index)}
            hitSlop={10}
            accessibilityLabel={`Swap ${item.name}`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.swapBtn, pressed && styles.swapBtnPressed]}
          >
            <ChevronDown size={20} color={colors.gray700} strokeWidth={2} />
          </Pressable>
        </Pressable>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerSpacer} />

        <View style={styles.header}>
          <Text style={styles.headline}>Preview your session</Text>
          <Text style={styles.subtext}>
            Tap the arrow to swap. Hold and drag to reorder.
          </Text>
        </View>

        <GlassCard style={styles.listCard} contentStyle={styles.listInner}>
          <DraggableFlatList
            data={movements}
            keyExtractor={(item) => item.slug}
            renderItem={renderItem}
            onDragEnd={({ data }) => setMovements(data)}
            activationDistance={8}
            containerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </GlassCard>

        <View style={styles.bottomSpacer} />

        <View style={styles.footer}>
          <PrimaryButton label="Start Session" onPress={() => onStart(movements)} />
          <Pressable
            accessibilityRole="link"
            onPress={onSkip}
            hitSlop={12}
            style={styles.skipLink}
          >
            {({ pressed }) => (
              <Text style={[styles.skipLabel, pressed && styles.skipLabelPressed]}>
                Skip — start with default order
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={onBack}
            hitSlop={12}
            style={styles.skipLink}
          >
            {({ pressed }) => (
              <Text
                style={[styles.backLabel, pressed && styles.skipLabelPressed]}
              >
                Back
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <SwapModal
        visible={swapTargetIndex !== null}
        target={swapTarget}
        alternatives={swapAlternatives}
        onSelect={handleSwap}
        onClose={() => setSwapTargetIndex(null)}
      />
    </SafeAreaView>
  );
}

type SwapModalProps = {
  visible: boolean;
  target: Movement | null;
  alternatives: Movement[];
  onSelect: (m: Movement) => void;
  onClose: () => void;
};

function SwapModal({ visible, target, alternatives, onSelect, onClose }: SwapModalProps) {
  const Icon = target ? CATEGORY_ICON[target.category] : null;
  const categoryLabel = target?.category === 'move' ? 'Move' : 'Stretch';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetOverline}>SWAP {categoryLabel.toUpperCase()}</Text>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {target?.name}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <X size={18} color={colors.gray600} strokeWidth={2} />
            </Pressable>
          </View>

          {alternatives.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No other {categoryLabel.toLowerCase()} movements available.
              </Text>
            </View>
          ) : (
            <FlatList
              data={alternatives}
              keyExtractor={(m) => m.slug}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const ItemIcon = Icon!;
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                      styles.altRow,
                      pressed && styles.altRowPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Swap to ${item.name}`}
                  >
                    <View style={styles.iconPill}>
                      <ItemIcon size={18} color={colors.gray600} strokeWidth={2} />
                    </View>
                    <Text style={styles.altName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          {target && (
            <View style={styles.currentBanner}>
              <Check size={14} color={colors.dustyBlueDark} strokeWidth={2.5} />
              <Text style={styles.currentBannerText} numberOfLines={1}>
                Currently selected: {target.name}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.s6,
  },
  headerSpacer: {
    height: 48,
  },
  header: {
    marginTop: spacing.s6,
    marginBottom: spacing.s8,
  },
  headline: {
    ...typeTokens.h1,
    color: colors.black,
  },
  subtext: {
    ...typeTokens.body,
    color: colors.dustyBlueDark,
    marginTop: spacing.s3,
  },
  listCard: {
    flexShrink: 1,
  },
  listInner: {
    paddingVertical: spacing.s2,
  },
  listContainer: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s4,
    gap: spacing.s3,
    minHeight: 64,
  },
  rowActive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  handle: {
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    letterSpacing: -0.2,
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtnPressed: {
    backgroundColor: colors.dustyBlueMuted,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: spacing.s4,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: spacing.s6,
  },
  footer: {
    paddingBottom: spacing.s6,
    gap: spacing.s3,
  },
  skipLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
  },
  skipLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.dustyBlueDark,
  },
  skipLabelPressed: {
    textDecorationLine: 'underline',
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray500,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s8,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s6,
    paddingBottom: spacing.s4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  sheetTitleWrap: {
    flex: 1,
    paddingRight: spacing.s3,
  },
  sheetOverline: {
    ...typeTokens.overline,
    color: colors.gray400,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.black,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s6,
    gap: spacing.s3,
    minHeight: 60,
  },
  altRowPressed: {
    backgroundColor: colors.gray100,
  },
  altName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
  },
  emptyState: {
    paddingVertical: spacing.s10,
    paddingHorizontal: spacing.s6,
    alignItems: 'center',
  },
  emptyText: {
    ...typeTokens.body,
    color: colors.gray500,
    textAlign: 'center',
  },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s4,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  currentBannerText: {
    ...typeTokens.caption,
    color: colors.dustyBlueDark,
    flex: 1,
  },
});

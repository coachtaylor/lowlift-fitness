import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Movement, loadMovements } from '../data/movements';
import {
  FOCUS_LABEL,
  Focus,
  SessionSelection,
  TYPES,
  pickReplacement,
  sessionName,
  totalLabel,
} from '../data/generateSession';
import { Session } from '../data/sessions';
import { MoveIcon, StretchIcon } from '../components/MovementIcons';
import { typeColor } from '../theme/typeColors';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  session: Session;
  selection: SessionSelection;
  favorites: string[];
  hidden: string[];
  recent: string[];
  relaxed: boolean;
  freshnessCopy?: boolean;
  firstSession?: boolean;
  offline?: boolean;
  onFavorite: (slug: string, willFav: boolean) => void;
  onHide: (slug: string) => void;
  onUnhideOne: (slug: string) => void;
  onUnhideAll: () => void;
  onRegenerate: () => void;
  onStart: (movements: Movement[]) => void;
  onBack: () => void;
};

function tagFor(m: Movement): string {
  return m.category === 'stretch' ? 'Stretch' : FOCUS_LABEL[m.bodyArea] || 'Move';
}
function durLabel(sec: number): string {
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`;
}
function MovementGlyph({ m, size }: { m: Movement; size: number }) {
  return m.category === 'stretch' ? (
    <StretchIcon size={size} color={typeColor.stretch.fg} strokeWidth={1.9} />
  ) : (
    <MoveIcon size={size} color={typeColor.move.fg} strokeWidth={1.9} />
  );
}

// ── One movement row: entrance / exit / favorite-pulse + long-press to drag ──
function MoveRow({
  m,
  index,
  exiting,
  drag,
  isActive,
  onHide,
  onSwap,
}: {
  m: Movement;
  index: number;
  exiting: boolean;
  drag: () => void;
  isActive: boolean;
  onHide: (index: number) => void;
  onSwap: (index: number) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(tx, { toValue: 0, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!exiting) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 240, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.timing(tx, { toValue: -14, duration: 240, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [exiting, opacity, tx]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX: tx }] }}>
      <Pressable
        onLongPress={drag}
        delayLongPress={200}
        disabled={isActive}
        style={[styles.row, isActive && styles.rowActive]}
        accessibilityLabel={`${m.name}. Hold to reorder.`}
      >
        <Text style={styles.rowIdx}>{index + 1}</Text>
        <View style={[styles.rowIcon, m.category === 'stretch' ? styles.rowIconStretch : styles.rowIconMove]}>
          <MovementGlyph m={m} size={20} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>{m.name}</Text>
          <View style={styles.rowSub}>
            <Text style={styles.rowTag}>{tagFor(m).toUpperCase()}</Text>
            <Text style={styles.dot}>·</Text>
            <View style={styles.rowDur}>
              <Clock size={12} color={colors.dustyBlueDark} strokeWidth={1.9} />
              <Text style={styles.rowDurText}>{durLabel(m.duration)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.rowActions}>
          <Pressable
            onPress={() => onSwap(index)}
            style={({ pressed }) => [styles.act, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Swap for another movement"
          >
            <ArrowLeftRight size={18} color={colors.gray500} strokeWidth={1.9} />
          </Pressable>
          <Pressable
            onPress={() => onHide(index)}
            style={({ pressed }) => [styles.act, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Hide this move"
          >
            <EyeOff size={18} color={colors.gray500} strokeWidth={1.9} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function SessionPreviewScreen({
  session,
  selection,
  favorites,
  hidden,
  recent,
  relaxed,
  freshnessCopy = true,
  firstSession = false,
  offline = false,
  onHide,
  onUnhideOne,
  onUnhideAll,
  onRegenerate,
  onStart,
  onBack,
}: Props) {
  const [items, setItems] = useState<Movement[]>(session.movements);
  const [catalog, setCatalog] = useState<Map<string, Movement> | null>(null);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ move: Movement; index: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    loadMovements().then((map) => !cancelled && setCatalog(map));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setItems(session.movements);
    setExitingIndex(null);
    setSwapIndex(null);
    clearUndo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (sheetOpen && hidden.length === 0) setSheetOpen(false);
  }, [hidden, sheetOpen]);

  useEffect(() => () => clearUndo(), []);

  const pool = useMemo(() => (catalog ? Array.from(catalog.values()) : []), [catalog]);

  function clearUndo() {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndo(null);
  }

  function handleHide(index: number) {
    const cur = items[index];
    if (!cur) return;
    const focus: Focus = selection.type === 'stretch' ? 'full' : selection.focus;
    const rep = pickReplacement({
      pool,
      slotType: cur.category,
      focus,
      exclude: items.map((x) => x.slug),
      hidden: [...hidden, cur.slug],
      favorites,
      recent,
    });
    onHide(cur.slug);
    setExitingIndex(index);
    setTimeout(() => {
      setItems((list) => {
        const next = list.slice();
        // keep the slot's duration so the session length stays exact
        if (rep) next[index] = { ...rep, duration: cur.duration };
        else next.splice(index, 1);
        return next;
      });
      setExitingIndex(null);
    }, 240);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ move: cur, index });
    undoTimer.current = setTimeout(() => clearUndo(), 5000);
  }

  function handleUndo() {
    if (!undo) return;
    const { move, index } = undo;
    onUnhideOne(move.slug);
    setItems((list) => {
      const next = list.slice();
      if (index < next.length) next[index] = move;
      else next.push(move);
      return next;
    });
    clearUndo();
  }

  function handleSwapPick(replacement: Movement) {
    if (swapIndex === null) return;
    setItems((list) => {
      const next = list.slice();
      const slot = next[swapIndex];
      // preserve the slot's duration so total session length is unchanged
      next[swapIndex] = { ...replacement, duration: slot ? slot.duration : replacement.duration };
      return next;
    });
    setSwapIndex(null);
  }

  function handleRegen() {
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    clearUndo();
    onRegenerate();
  }

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const typeMeta = TYPES.find((t) => t.id === selection.type);
  const fresh = firstSession
    ? 'A fresh mix to ease you in.'
    : offline
      ? "Built from your saved moves — picks you haven't done lately."
      : "Fresh picks you haven't done lately.";

  // Library alternatives for the manual swap sheet (same category, not already
  // in the session, not hidden).
  const swapTarget = swapIndex !== null ? items[swapIndex] : null;
  const swapAlternatives = useMemo(() => {
    if (!swapTarget) return [];
    const current = new Set(items.map((x) => x.slug));
    const hid = new Set(hidden);
    return pool
      .filter((m) => m.category === swapTarget.category && !current.has(m.slug) && !hid.has(m.slug))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [swapTarget, items, hidden, pool]);

  const header = (
    <View>
      <View style={styles.hero}>
        <Text style={styles.title}>{sessionName(selection)}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaType}>{typeMeta?.label ?? ''}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{items.length} moves</Text>
          <Text style={styles.dot}>·</Text>
          <View style={styles.metaTime}>
            <Clock size={14} color={colors.dustyBlueDark} strokeWidth={1.9} />
            <Text style={styles.metaTimeText}>{totalLabel(items)}</Text>
          </View>
        </View>
        {freshnessCopy && (
          <View style={styles.fresh}>
            <Sparkles size={15} color={colors.dustyBlue} strokeWidth={1.9} />
            <Text style={styles.freshText}>{fresh}</Text>
          </View>
        )}
      </View>
      {relaxed && hidden.length > 0 && (
        <View style={styles.nudge}>
          <View style={styles.nudgeBody}>
            <Text style={styles.nudgeTitle}>You've hidden a lot of moves.</Text>
            <Text style={styles.nudgeSub}>
              We loosened things up to fill this one. Bring a few back for more variety.
            </Text>
          </View>
          <Pressable onPress={() => setSheetOpen(true)} style={({ pressed }) => [styles.nudgeBtn, pressed && styles.pressed]}>
            <Undo2 size={14} color={colors.white} strokeWidth={2} />
            <Text style={styles.nudgeBtnText}>Review</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.listTopSpacer} />
    </View>
  );

  const footer = (
    <View>
      <Pressable onPress={handleRegen} style={({ pressed }) => [styles.regen, pressed && styles.regenPressed]}>
        <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
          <Shuffle size={17} color={colors.gray700} strokeWidth={1.9} />
        </Animated.View>
        <Text style={styles.regenText}>Regenerate the whole set</Text>
      </Pressable>
      {hidden.length > 0 && (
        <Pressable onPress={() => setSheetOpen(true)} style={({ pressed }) => [styles.hiddenEntry, pressed && styles.pressed]}>
          <View style={styles.hiddenEntryL}>
            <EyeOff size={17} color={colors.gray500} strokeWidth={1.9} />
            <Text style={styles.hiddenEntryText}>Hidden moves</Text>
          </View>
          <View style={styles.hiddenEntryCount}>
            <Text style={styles.hiddenEntryCountText}>{hidden.length}</Text>
            <ChevronRight size={15} color={colors.gray400} strokeWidth={2.2} />
          </View>
        </Pressable>
      )}
      <Text style={styles.hint}>Hold a row to reorder · swap to pick another</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Adjust selection" hitSlop={8}>
          <ChevronLeft size={15} color={colors.gray700} strokeWidth={2.2} />
          <Text style={styles.backLabel}>Adjust</Text>
        </Pressable>
      </View>

      <DraggableFlatList
        data={items}
        keyExtractor={(item) => item.slug}
        onDragEnd={({ data }) => setItems(data)}
        activationDistance={12}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        containerStyle={styles.listFill}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.rowGap} />}
        renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<Movement>) => {
          const idx = getIndex() ?? 0;
          return (
            <ScaleDecorator activeScale={1.03}>
              <MoveRow
                m={item}
                index={idx}
                exiting={exitingIndex === idx}
                drag={drag}
                isActive={isActive}
                onHide={handleHide}
                onSwap={setSwapIndex}
              />
            </ScaleDecorator>
          );
        }}
      />

      <View style={styles.ctaBar}>
        <Pressable onPress={() => onStart(items)} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} accessibilityRole="button" accessibilityLabel="Start session">
          <Play size={18} color={colors.black} fill={colors.black} strokeWidth={1} />
          <Text style={styles.ctaLabel}>Start session</Text>
        </Pressable>
      </View>

      {undo && (
        <View style={styles.toast}>
          <View style={styles.toastMsg}>
            <EyeOff size={16} color="rgba(255,255,255,0.55)" strokeWidth={1.9} />
            <Text style={styles.toastText} numberOfLines={1}>
              Hid <Text style={styles.toastBold}>{undo.move.name}</Text>
            </Text>
          </View>
          <Pressable onPress={handleUndo} style={({ pressed }) => [styles.undoBtn, pressed && styles.pressed]}>
            <Undo2 size={14} color={colors.black} strokeWidth={2} />
            <Text style={styles.undoBtnText}>Undo</Text>
          </Pressable>
        </View>
      )}

      <HiddenSheet
        visible={sheetOpen}
        hidden={hidden}
        catalog={catalog}
        onUnhideOne={onUnhideOne}
        onUnhideAll={() => { onUnhideAll(); setSheetOpen(false); }}
        onClose={() => setSheetOpen(false)}
      />

      <SwapSheet
        visible={swapIndex !== null}
        target={swapTarget}
        alternatives={swapAlternatives}
        onSelect={handleSwapPick}
        onClose={() => setSwapIndex(null)}
      />
    </SafeAreaView>
  );
}

function HiddenSheet({
  visible, hidden, catalog, onUnhideOne, onUnhideAll, onClose,
}: {
  visible: boolean;
  hidden: string[];
  catalog: Map<string, Movement> | null;
  onUnhideOne: (slug: string) => void;
  onUnhideAll: () => void;
  onClose: () => void;
}) {
  const moves = hidden.map((s) => catalog?.get(s)).filter((m): m is Movement => !!m);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <View>
              <Text style={styles.sheetOv}>HIDDEN MOVES</Text>
              <Text style={styles.sheetTitle}>{moves.length} hidden</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityLabel="Close">
              <X size={16} color={colors.gray600} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={styles.sheetNote}>These won't show up in your sessions. Bring any back anytime.</Text>
          <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
            {moves.map((m) => (
              <View key={m.slug} style={styles.hdRow}>
                <View style={[styles.hdIcon, m.category === 'stretch' ? styles.rowIconStretch : styles.rowIconMove]}>
                  <MovementGlyph m={m} size={18} />
                </View>
                <View style={styles.hdBody}>
                  <Text style={styles.hdName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.hdSub}>{tagFor(m)} · {durLabel(m.duration)}</Text>
                </View>
                <Pressable onPress={() => onUnhideOne(m.slug)} style={({ pressed }) => [styles.hdAction, pressed && styles.pressed]}>
                  <Eye size={15} color={colors.gray800} strokeWidth={1.9} />
                  <Text style={styles.hdActionText}>Unhide</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={onUnhideAll} style={({ pressed }) => [styles.sheetAll, pressed && styles.pressed]}>
            <RotateCcw size={17} color={colors.white} strokeWidth={1.9} />
            <Text style={styles.sheetAllText}>Unhide all ({moves.length})</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SwapSheet({
  visible, target, alternatives, onSelect, onClose,
}: {
  visible: boolean;
  target: Movement | null;
  alternatives: Movement[];
  onSelect: (m: Movement) => void;
  onClose: () => void;
}) {
  const categoryLabel = target?.category === 'stretch' ? 'Stretch' : 'Move';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1, paddingRight: spacing.s3 }}>
              <Text style={styles.sheetOv}>SWAP {categoryLabel.toUpperCase()}</Text>
              <Text style={styles.sheetTitle} numberOfLines={1}>{target?.name ?? ''}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityLabel="Close">
              <X size={16} color={colors.gray600} strokeWidth={2} />
            </Pressable>
          </View>
          <Text style={styles.sheetNote}>Pick another {categoryLabel.toLowerCase()} from the library. Same time slot.</Text>
          {alternatives.length === 0 ? (
            <View style={styles.swapEmpty}>
              <Text style={styles.swapEmptyText}>No other {categoryLabel.toLowerCase()} movements available.</Text>
            </View>
          ) : (
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {alternatives.map((m) => (
                <Pressable
                  key={m.slug}
                  onPress={() => onSelect(m)}
                  style={({ pressed }) => [styles.hdRow, pressed && styles.hdRowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap to ${m.name}`}
                >
                  <View style={[styles.hdIcon, m.category === 'stretch' ? styles.rowIconStretch : styles.rowIconMove]}>
                    <MovementGlyph m={m} size={18} />
                  </View>
                  <View style={styles.hdBody}>
                    <Text style={styles.hdName} numberOfLines={1}>{m.name}</Text>
                    <Text style={styles.hdSub}>{tagFor(m)} · {durLabel(m.duration)}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.gray400} strokeWidth={2.2} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offWhite },
  topbar: { flexDirection: 'row', paddingHorizontal: spacing.s5, paddingTop: spacing.s2, minHeight: 40 },
  back: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s1, height: 34,
    paddingHorizontal: spacing.s3, borderRadius: radius.full,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(255,255,255,0.7)',
  },
  backLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, letterSpacing: -0.1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  listFill: { flex: 1 },
  listContent: { paddingHorizontal: spacing.s5, paddingBottom: spacing.s8 },
  rowGap: { height: 9 },
  listTopSpacer: { height: 16 },
  hero: { paddingTop: spacing.s3, paddingHorizontal: 2 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 36, color: colors.black },
  meta: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaType: { fontSize: 13.5, fontWeight: '600', color: colors.gray800 },
  metaText: { fontSize: 13.5, fontWeight: '600', color: colors.gray500 },
  metaTime: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTimeText: { fontSize: 13.5, fontWeight: '600', color: colors.dustyBlueDark },
  dot: { color: colors.gray300, fontSize: 13.5 },
  fresh: {
    marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(123,167,194,0.12)', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 13,
  },
  freshText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: colors.dustyBlueDark },
  nudge: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(255,149,0,0.25)',
    borderRadius: 18, paddingVertical: 14, paddingLeft: 16, paddingRight: 14,
  },
  nudgeBody: { flex: 1 },
  nudgeTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1, color: colors.gray900 },
  nudgeSub: { marginTop: 3, fontSize: 12.5, fontWeight: '500', lineHeight: 17, color: colors.gray600 },
  nudgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 13, borderRadius: radius.full, backgroundColor: colors.gray900 },
  nudgeBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14,
  },
  rowActive: {
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 6,
  },
  rowIdx: { width: 16, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.gray300 },
  rowIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  rowIconMove: { backgroundColor: 'rgba(123,167,194,0.16)' },
  rowIconStretch: { backgroundColor: 'rgba(255,79,79,0.14)' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1, color: colors.black, lineHeight: 19 },
  rowSub: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.gray500 },
  rowDur: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDurText: { fontSize: 12, fontWeight: '600', color: colors.dustyBlueDark },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  act: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  regen: {
    marginTop: 16, height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: colors.gray300,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  regenPressed: { borderColor: colors.gray900, opacity: 0.9 },
  regenText: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.1, color: colors.gray700 },
  hiddenEntry: {
    marginTop: 10, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  hiddenEntryL: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  hiddenEntryText: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1, color: colors.gray700 },
  hiddenEntryCount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hiddenEntryCountText: { fontSize: 13, fontWeight: '700', color: colors.gray400 },
  hint: { marginTop: 14, textAlign: 'center', fontSize: 12, fontWeight: '500', color: colors.gray400, lineHeight: 18 },
  ctaBar: { paddingHorizontal: spacing.s5, paddingTop: spacing.s2, paddingBottom: spacing.s6 },
  cta: {
    height: 58, borderRadius: 18, backgroundColor: colors.volt,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    shadowColor: colors.voltDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6,
  },
  ctaPressed: { transform: [{ scale: 0.98 }], backgroundColor: colors.voltDark },
  ctaLabel: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: colors.black },
  toast: {
    position: 'absolute', left: 18, right: 18, bottom: 100, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    backgroundColor: colors.gray900, borderRadius: 16, paddingVertical: 12, paddingLeft: 16, paddingRight: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  toastMsg: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toastText: { flex: 1, fontSize: 13.5, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  toastBold: { fontWeight: '700', color: colors.white },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.volt },
  undoBtnText: { fontSize: 13, fontWeight: '700', color: colors.black },
  scrim: { flex: 1, backgroundColor: 'rgba(10,10,10,0.32)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.offWhite, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 12, paddingHorizontal: spacing.s5, paddingBottom: spacing.s6, maxHeight: '80%',
  },
  grab: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.gray300, alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sheetOv: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: colors.gray400 },
  sheetTitle: { marginTop: 3, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: colors.black },
  sheetClose: { width: 34, height: 34, borderRadius: radius.full, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  sheetNote: { marginTop: 8, fontSize: 13, fontWeight: '500', lineHeight: 18, color: colors.gray600 },
  sheetList: { marginTop: 10, marginBottom: 4 },
  hdRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderRadius: 16, padding: 11, marginBottom: 8,
  },
  hdRowPressed: { backgroundColor: colors.gray100 },
  hdIcon: { width: 38, height: 38, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  hdBody: { flex: 1, minWidth: 0 },
  hdName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1, color: colors.black },
  hdSub: { marginTop: 2, fontSize: 11.5, fontWeight: '500', color: colors.gray500 },
  hdAction: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 13, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray300 },
  hdActionText: { fontSize: 13, fontWeight: '700', color: colors.gray800 },
  sheetAll: { marginTop: 10, height: 50, borderRadius: 16, backgroundColor: colors.gray900, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheetAllText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1, color: colors.white },
  swapEmpty: { paddingVertical: spacing.s10, alignItems: 'center' },
  swapEmptyText: { fontSize: 14, fontWeight: '500', color: colors.gray500, textAlign: 'center' },
});

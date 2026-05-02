import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, TextInput, Image, ScrollView, StatusBar,
  Modal, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useStore from "../../repository/store";
import { getBusinessList, getBusinessCategories, toggleFollowBusiness } from "./Businessapi";
import CreateModal from "../groups/CreateModal";
import { Colors } from "../../theme";

const BRAND      = Colors.primaryDark;
const ACCENT     = Colors.primary;
const CREAM      = Colors.background;
const CARD       = Colors.white;
const BORDER     = Colors.border;
const MUTED      = Colors.secondaryText;
const DARK       = Colors.black;
const WHITE      = Colors.white;
const ON_DARK_14 = WHITE + '24';

const decodeHtml = (text = '') =>
  String(text)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#039;/g, "'")
    .replace(/&mdash;/g, '—').replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'");

const cleanText = (text = '') =>
  decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');

const hex2 = (hex, op) => {
  const h = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

// ─── Category icon map ────────────────────────────────────────────────────────
const BIZ_CAT_MAP = {
  'automotive':   { icon: 'car-sport-outline',         color: '#3b82f6' },
  'vehicle':      { icon: 'car-sport-outline',         color: '#3b82f6' },
  'education':    { icon: 'school-outline',            color: '#7c3aed' },
  'school':       { icon: 'school-outline',            color: '#7c3aed' },
  'entertainment':{ icon: 'film-outline',              color: '#db2777' },
  'music':        { icon: 'musical-notes-outline',     color: '#db2777' },
  'event':        { icon: 'calendar-outline',          color: '#f59e0b' },
  'food':         { icon: 'restaurant-outline',        color: '#ea580c' },
  'restaurant':   { icon: 'restaurant-outline',        color: '#ea580c' },
  'health':       { icon: 'medkit-outline',            color: '#dc2626' },
  'medical':      { icon: 'medkit-outline',            color: '#dc2626' },
  'fitness':      { icon: 'barbell-outline',           color: '#16a34a' },
  'logistics':    { icon: 'cube-outline',              color: '#0891b2' },
  'transport':    { icon: 'bus-outline',               color: '#0891b2' },
  'shipping':     { icon: 'send-outline',              color: '#0891b2' },
  'tech':         { icon: 'laptop-outline',            color: '#0284c7' },
  'software':     { icon: 'code-slash-outline',        color: '#0284c7' },
  'it ':          { icon: 'laptop-outline',            color: '#0284c7' },
  'finance':      { icon: 'wallet-outline',            color: '#16a34a' },
  'banking':      { icon: 'card-outline',              color: '#16a34a' },
  'insurance':    { icon: 'shield-checkmark-outline',  color: '#059669' },
  'fashion':      { icon: 'shirt-outline',             color: '#ec4899' },
  'clothing':     { icon: 'shirt-outline',             color: '#ec4899' },
  'real estate':  { icon: 'home-outline',              color: '#059669' },
  'property':     { icon: 'home-outline',              color: '#059669' },
  'services':     { icon: 'hammer-outline',            color: '#78716c' },
  'travel':       { icon: 'airplane-outline',          color: '#6366f1' },
  'hospitality':  { icon: 'bed-outline',               color: '#6366f1' },
  'hotel':        { icon: 'bed-outline',               color: '#6366f1' },
  'beauty':       { icon: 'rose-outline',              color: '#f43f5e' },
  'salon':        { icon: 'rose-outline',              color: '#f43f5e' },
  'cosmetic':     { icon: 'color-wand-outline',        color: '#f43f5e' },
  'sports':       { icon: 'trophy-outline',            color: '#22c55e' },
  'media':        { icon: 'mic-outline',               color: '#8b5cf6' },
  'marketing':    { icon: 'megaphone-outline',         color: '#8b5cf6' },
  'retail':       { icon: 'cart-outline',              color: '#f97316' },
  'shop':         { icon: 'bag-handle-outline',        color: '#f97316' },
  'agriculture':  { icon: 'leaf-outline',              color: '#65a30d' },
  'farm':         { icon: 'leaf-outline',              color: '#65a30d' },
  'energy':       { icon: 'flash-outline',             color: '#eab308' },
  'manufacturing':{ icon: 'cog-outline',               color: '#64748b' },
  'consultancy':  { icon: 'briefcase-outline',         color: '#a78bfa' },
  'legal':        { icon: 'document-text-outline',     color: '#6366f1' },
  'art':          { icon: 'color-palette-outline',     color: '#f97316' },
  'design':       { icon: 'color-palette-outline',     color: '#f97316' },
};

const getCatIcon = (name = '') => {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(BIZ_CAT_MAP)) {
    if (lower.includes(key)) return val;
  }
  return { icon: 'storefront-outline', color: BRAND };
};

// ─── Skeleton block ───────────────────────────────────────────────────────────
function SkeletonBlock({ style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[{ backgroundColor: '#E2E8F0', borderRadius: 10, opacity: pulse }, style]} />;
}

// ─── Category Quick Links (2-row horizontal grid) ────────────────────────────
const CategoryChip = React.memo(({ cat, isActive, onPress, index }) => {
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, delay: index * 25, tension: 160, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, delay: index * 25, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const onIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, tension: 200 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200 }).start();

  const isAll = cat.id === null;
  const { icon, color } = isAll ? { icon: 'grid-outline', color: BRAND } : getCatIcon(cat.name ?? '');
  const label = cat.name ?? 'All';

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <TouchableOpacity
        style={cqs.item}
        onPress={() => onPress(cat.id)}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={isActive ? [color, BRAND] : [hex2(color, 0.16), WHITE]}
          style={[cqs.iconBox, isActive && { shadowColor: color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={21} color={isActive ? WHITE : color} />
        </LinearGradient>
        <Text style={[cqs.label, isActive && cqs.labelOn]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

function CategoryQuickLinks({ categories, activeCat, onSelect }) {
  const all = useMemo(() => [{ id: null, name: 'All' }, ...categories], [categories]);

  return (
    <View style={cqs.wrap}>
      <View style={cqs.header}>
        <View>
          <Text style={cqs.headerTxt}>Browse Categories</Text>
          <Text style={cqs.headerSub}>Find restaurants, schools, logistics, shops and more</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={cqs.scroll}
      >
        {all.map((cat, index) => (
          <CategoryChip
            key={cat.id === null ? 'all' : String(cat.id ?? cat.category_id)}
            cat={cat}
            index={index}
            isActive={activeCat === cat.id}
            onPress={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const cqs = StyleSheet.create({
  wrap: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: hex2(BRAND, 0.07),
    paddingTop: 14,
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTxt:    { fontSize: 17, fontWeight: '900', color: DARK },
  headerSub:    { fontSize: 12, color: MUTED, marginTop: 3 },
  scroll:       { paddingHorizontal: 14, gap: 14 },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 7,
  },
  iconBox: {
    width: 54, height: 54, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: hex2(BRAND, 0.06),
  },
  label:   { fontSize: 10.8, color: DARK, fontWeight: '800', textAlign: 'center', maxWidth: 72 },
  labelOn: { color: ACCENT, fontWeight: '900' },
});

// ─── Verified mini-card (horizontal scroll) ───────────────────────────────────
const VerifiedMiniCard = React.memo(({ business, onPress }) => {
  const title  = cleanText(business.title ?? '');
  const avatar = business.avatar ?? null;
  const cover  = business.cover ?? business.banner ?? null;
  const { icon: catIcon, color: catColor } = getCatIcon(business.category_name ?? '');

  return (
    <TouchableOpacity style={vfs.card} onPress={() => onPress(business)} activeOpacity={0.88}>
      {/* Cover */}
      {isRealImage(cover) ? (
        <Image source={{ uri: cover }} style={vfs.cover} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[BRAND, '#1a8a92']}
          style={vfs.cover}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="business" size={22} color={hex2(WHITE, 0.5)} />
        </LinearGradient>
      )}

      {/* Verified badge */}
      <View style={vfs.verifiedBadge}>
        <Ionicons name="checkmark-circle" size={11} color={WHITE} />
        <Text style={vfs.verifiedTxt}>Verified</Text>
      </View>

      {/* Avatar */}
      <View style={vfs.avatarWrap}>
        {isRealImage(avatar) ? (
          <Image source={{ uri: avatar }} style={vfs.avatar} resizeMode="cover" />
        ) : (
          <View style={[vfs.avatar, { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="business" size={16} color={WHITE} />
          </View>
        )}
      </View>

      <View style={vfs.body}>
        <Text style={vfs.name} numberOfLines={1}>{title || 'Business'}</Text>
        {!!business.category_name && (
          <View style={vfs.catRow}>
            <Ionicons name={catIcon} size={9} color={catColor} />
            <Text style={[vfs.catTxt, { color: catColor }]} numberOfLines={1}>
              {business.category_name}
            </Text>
          </View>
        )}
        <View style={vfs.viewBtn}>
          <Text style={vfs.viewBtnTxt}>View</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const vfs = StyleSheet.create({
  card: {
    width: 190, backgroundColor: CARD, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: hex2(BRAND, 0.1),
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  cover:    { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  verifiedBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: ACCENT, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedTxt: { fontSize: 9, fontWeight: '800', color: WHITE },
  avatarWrap: {
    position: 'absolute', top: 68, left: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 13,
    borderWidth: 2.5, borderColor: CARD,
    backgroundColor: CREAM,
  },
  body: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 14, marginTop: 14 },
  name:   { fontSize: 14, fontWeight: '800', color: DARK, marginBottom: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  catTxt: { fontSize: 11, fontWeight: '600' },
  viewBtn: {
    backgroundColor: BRAND, borderRadius: 100,
    paddingVertical: 7, alignItems: 'center',
  },
  viewBtnTxt: { fontSize: 12, fontWeight: '800', color: WHITE },
});

// ─── Verified Section ─────────────────────────────────────────────────────────
function VerifiedSection({ businesses, loading, onPress, onSeeAll }) {
  if (!loading && businesses.length === 0) return null;

  return (
    <View style={vs.wrap}>
      <View style={vs.header}>
        <View style={vs.titleRow}>
          <View style={vs.accentBar} />
          <Text style={vs.title}>Top Verified Businesses</Text>
        </View>
        {!loading && businesses.length > 0 && (
          <TouchableOpacity onPress={onSeeAll} style={vs.seeAllBtn} activeOpacity={0.8}>
            <Text style={vs.seeAllTxt}>See All</Text>
            <Ionicons name="arrow-forward" size={12} color={ACCENT} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={vs.skeletonRow}>
          {[0, 1, 2, 4].map(i => (
            <View key={i} style={[vfs.card, { width: 190 }]}>
              <SkeletonBlock style={{ height: 100, borderRadius: 0 }} />
              <View style={{ padding: 10, gap: 6, marginTop: 12 }}>
                <SkeletonBlock style={{ height: 12, width: '80%' }} />
                <SkeletonBlock style={{ height: 10, width: '55%' }} />
                <SkeletonBlock style={{ height: 24, width: '100%', borderRadius: 100, marginTop: 4 }} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={vs.scroll}
        >
          {businesses.map(b => (
            <VerifiedMiniCard key={String(b.id)} business={b} onPress={onPress} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DirectoryPulse({ totalCount, activeCatName, activeFilter }) {
  const scope = activeCatName || (activeFilter === 'following' ? 'Following' : 'All');
  return (
    <View style={pulse.wrap}>
      <LinearGradient colors={[BRAND, '#155f66']} style={pulse.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={pulse.orb} />
        <View style={pulse.item}>
          <Text style={pulse.value}>{fmtCount(totalCount || 0)}</Text>
          <Text style={pulse.label}>Businesses</Text>
        </View>
        <View style={pulse.divider} />
        <View style={pulse.item}>
          <Text style={pulse.value}>{scope}</Text>
          <Text style={pulse.label}>Current view</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const vs = StyleSheet.create({
  wrap: {
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: hex2(BRAND, 0.07),
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accentBar:  { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  title:      { fontSize: 14, fontWeight: '900', color: DARK },
  seeAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllTxt:  { fontSize: 12, fontWeight: '700', color: ACCENT },
  scroll:     { paddingHorizontal: 14, gap: 10 },
  skeletonRow:{ paddingHorizontal: 14, gap: 10 },
});

const pulse = StyleSheet.create({
  wrap: {
    backgroundColor: CREAM,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: WHITE,
    opacity: 0.06,
    right: -34,
    top: -54,
  },
  item: { flex: 1 },
  value: { color: WHITE, fontSize: 18, fontWeight: '900' },
  label: { color: WHITE + '99', fontSize: 11, fontWeight: '700', marginTop: 2 },
  divider: { width: 1, height: 34, backgroundColor: WHITE + '22', marginHorizontal: 14 },
});

// ─── Category Dropdown Modal ───────────────────────────────────────────────────
const CategoryDropdown = ({ visible, categories, activeCat, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={onClose}>
      <View style={dd.sheet}>
        <View style={dd.handle} />
        <View style={dd.sheetHeader}>
          <Text style={dd.sheetTitle}>Filter by Category</Text>
          <TouchableOpacity onPress={onClose} style={dd.closeBtn}>
            <Ionicons name="close" size={20} color={DARK} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dd.list}>
          <TouchableOpacity
            style={[dd.item, activeCat === null && dd.itemOn]}
            onPress={() => { onSelect(null); onClose(); }}
            activeOpacity={0.75}
          >
            <View style={[dd.itemDot, activeCat === null && dd.itemDotOn]} />
            <Text style={[dd.itemTxt, activeCat === null && dd.itemTxtOn]}>All Categories</Text>
            {activeCat === null && <Ionicons name="checkmark" size={16} color={ACCENT} />}
          </TouchableOpacity>
          {categories.map((cat) => {
            const id = cat.id ?? cat.category_id;
            const on = activeCat === id;
            const { icon, color } = getCatIcon(cat.name ?? '');
            return (
              <TouchableOpacity
                key={`cat-${id}`}
                style={[dd.item, on && dd.itemOn]}
                onPress={() => { onSelect(id); onClose(); }}
                activeOpacity={0.75}
              >
                <View style={[dd.itemIconBox, { backgroundColor: hex2(color, 0.1) }]}>
                  <Ionicons name={icon} size={14} color={color} />
                </View>
                <Text style={[dd.itemTxt, on && dd.itemTxtOn]} numberOfLines={1}>
                  {cat.name ?? cat.title ?? ''}
                </Text>
                {on && <Ionicons name="checkmark" size={16} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Business Card ────────────────────────────────────────────────────────────
const BusinessCard = ({ business, onOpen, user, categoryName }) => {
  const openComposer = useStore((s) => s.openComposer);
  const isVerified = business.verified_value === 1 || business.verified === true;
  const isOwner    =
    business.is_owner === true || business.is_owner === 1 ||
    (user?.id && String(business.user_id) === String(user.id));

  const [isLiked,     setIsLiked]     = useState(!!(business.is_liked));
  const [likeCount,   setLikeCount]   = useState(Number(business.likes ?? 0));
  const [likeLoading, setLikeLoading] = useState(false);
  const likeRef = useRef({ isLiked, likeLoading });
  likeRef.current = { isLiked, likeLoading };

  const handleLike = useCallback(async (e) => {
    e.stopPropagation?.();
    const { isLiked: was, likeLoading: busy } = likeRef.current;
    if (busy) return;
    setLikeLoading(true);
    setIsLiked(!was);
    setLikeCount(c => was ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await toggleFollowBusiness(business.id, was ? 'unlike' : 'like');
      const d   = res?.data ?? res;
      if (d?.is_liked != null) setIsLiked(!!d.is_liked);
      if (d?.likes    != null) setLikeCount(Number(d.likes) || 0);
    } catch {
      setIsLiked(was);
      setLikeCount(c => was ? c + 1 : Math.max(0, c - 1));
    }
    setLikeLoading(false);
  }, [business.id]);

  const title  = cleanText(business.title ?? '');
  const about  = cleanText(business.about ?? '');
  const avatar = business.avatar ?? null;
  const cover  = business.cover ?? business.banner ?? null;
  const { icon: catIcon, color: catColor } = getCatIcon(categoryName ?? '');

  return (
    <TouchableOpacity style={bs.card} activeOpacity={0.9} onPress={() => onOpen?.(business)}>

      {/* ── Cover image ── */}
      <View style={bs.coverWrap}>
        {isRealImage(cover) ? (
          <Image source={{ uri: cover }} style={bs.cover} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[BRAND, '#1a8a92']} style={bs.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="business-outline" size={36} color={hex2(WHITE, 0.25)} />
          </LinearGradient>
        )}
        {/* Bottom gradient fade */}
        <LinearGradient
          colors={['transparent', hex2(DARK, 0.45)]}
          style={bs.coverGradient}
          pointerEvents="none"
        />
        {/* Category pill on cover */}
        {!!categoryName && (
          <View style={[bs.coverCatPill, { backgroundColor: hex2(catColor, 0.92) }]}>
            <Ionicons name={catIcon} size={9} color={WHITE} />
            <Text style={bs.coverCatTxt}>{categoryName}</Text>
          </View>
        )}
        {/* Verified badge */}
        {isVerified && (
          <View style={bs.verifiedChip}>
            <Ionicons name="checkmark-circle" size={11} color={WHITE} />
            <Text style={bs.verifiedTxt}>Verified</Text>
          </View>
        )}
      </View>

      {/* ── Info row: avatar + name ── */}
      <View style={bs.infoRow}>
        {/* Avatar */}
        <View style={bs.avatarWrap}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={bs.avatar} resizeMode="cover" />
          ) : (
            <View style={[bs.avatar, bs.avatarFb]}>
              <Ionicons name="business" size={22} color={WHITE} />
            </View>
          )}
          {isVerified && (
            <View style={bs.avatarVerifiedDot}>
              <Ionicons name="checkmark-circle" size={14} color={ACCENT} />
            </View>
          )}
        </View>

        {/* Name + meta */}
        <View style={bs.nameMeta}>
          <View style={bs.nameRow}>
            <Text style={bs.title} numberOfLines={1}>{title || 'Business'}</Text>
            {isOwner && (
              <View style={bs.ownerPill}>
                <Ionicons name="shield-checkmark" size={9} color={ACCENT} />
                <Text style={bs.ownerPillTxt}>Your Page</Text>
              </View>
            )}
          </View>
          <View style={bs.statsRow}>
            <Ionicons name="heart" size={11} color={ACCENT} />
            <Text style={bs.statsTxt}>{fmtCount(likeCount)} likes</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={bs.actionGroup}>
          {isOwner ? (
            <>
              <TouchableOpacity
                style={bs.iconActionBtn}
                activeOpacity={0.8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  openComposer({ target_type: 'page', target_id: business.id, title, avatar: avatar ?? undefined, locked: true });
                }}
              >
                <Ionicons name="create-outline" size={15} color={ACCENT} />
              </TouchableOpacity>
              <TouchableOpacity style={bs.primaryBtn} onPress={() => onOpen?.(business)} activeOpacity={0.85}>
                <Text style={bs.primaryBtnTxt}>Manage</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[bs.iconActionBtn, isLiked && bs.iconActionBtnOn]}
                onPress={handleLike}
                activeOpacity={0.85}
                disabled={likeLoading}
              >
                {likeLoading
                  ? <ActivityIndicator size="small" color={isLiked ? ACCENT : MUTED} style={{ width: 15 }} />
                  : <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={15} color={isLiked ? ACCENT : MUTED} />
                }
              </TouchableOpacity>
              <TouchableOpacity style={bs.primaryBtn} onPress={() => onOpen?.(business)} activeOpacity={0.85}>
                <Text style={bs.primaryBtnTxt}>View</Text>
                <Ionicons name="arrow-forward" size={11} color={WHITE} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── About text ── */}
      {!!about && (
        <View style={bs.aboutWrap}>
          <Text style={bs.desc} numberOfLines={2}>{about}</Text>
        </View>
      )}

    </TouchableOpacity>
  );
};

// ─── Ad Banner ────────────────────────────────────────────────────────────────
const AdBanner = () => (
  <View style={adst.wrap}>
    <View style={adst.sponsorRow}>
      <Ionicons name="megaphone-outline" size={11} color={MUTED} />
      <Text style={adst.sponsorTxt}>Sponsored</Text>
    </View>
    <View style={adst.body}>
      <View style={adst.imgBox}>
        <Ionicons name="storefront-outline" size={24} color={ACCENT} />
      </View>
      <View style={adst.text}>
        <Text style={adst.adTitle} numberOfLines={2}>Grow your business with Hafrik</Text>
        <Text style={adst.adSub}>Reach thousands across Africa. List your business today.</Text>
        <View style={adst.cta}>
          <Text style={adst.ctaTxt}>Learn More</Text>
          <Ionicons name="arrow-forward" size={12} color={ACCENT} />
        </View>
      </View>
    </View>
  </View>
);

// ─── Business skeleton card ───────────────────────────────────────────────────
const SkeletonCard = () => (
  <View style={[bs.card, { gap: 0 }]}>
    <SkeletonBlock style={{ height: 110, borderRadius: 0 }} />
    <View style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SkeletonBlock style={{ width: 52, height: 52, borderRadius: 14 }} />
        <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
          <SkeletonBlock style={{ height: 13, width: '70%' }} />
          <SkeletonBlock style={{ height: 11, width: '40%' }} />
        </View>
      </View>
      <SkeletonBlock style={{ height: 11, width: '90%' }} />
      <SkeletonBlock style={{ height: 11, width: '65%' }} />
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BusinessList() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { top } = useSafeAreaInsets();

  const [pages,           setPages]          = useState([]);
  const [totalCount,      setTotalCount]     = useState(0);
  const [loading,         setLoading]        = useState(true);
  const [loadingMore,     setLoadingMore]    = useState(false);
  const [page,            setPage]           = useState(1);
  const [hasMore,         setHasMore]        = useState(true);
  const [search,          setSearch]         = useState('');
  const [categories,      setCategories]     = useState([]);
  const [activeCat,       setActiveCat]      = useState(null);
  const [showCatModal,    setShowCatModal]   = useState(false);
  const [showCreate,      setShowCreate]     = useState(false);
  const [refreshing,      setRefreshing]     = useState(false);
  const [activeFilter,    setActiveFilter]   = useState('all');

  // Verified section state
  const [verifiedPages,   setVerifiedPages]   = useState([]);
  const [loadingVerified, setLoadingVerified] = useState(true);

  const activeFilterRef = useRef('all');
  activeFilterRef.current = activeFilter;
  const activeCatRef = useRef(null);
  activeCatRef.current = activeCat;

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach(c => {
      const id = c.id ?? c.category_id;
      if (id != null) m[id] = c.name ?? c.title ?? '';
    });
    return m;
  }, [categories]);

  const activeCatName = activeCat != null ? (catMap[activeCat] ?? '') : '';

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCategories();
    loadPages(1, '', true);
    loadVerified();
  }, []); // eslint-disable-line

  const loadCategories = async () => {
    try {
      const res = await getBusinessCategories(token);
      if (res?.status === 'success') {
        const raw = Array.isArray(res.data) ? res.data : [];
        const seen = new Set();
        const parents = raw.filter(cat => {
          const id = cat.id ?? cat.category_id;
          if (seen.has(id)) return false;
          seen.add(id);
          const parentId = cat.parent_id ?? cat.parent ?? null;
          return parentId == null || parentId === 0 || parentId === '0';
        });
        setCategories(parents);
      }
    } catch {}
  };

  const loadVerified = async () => {
    setLoadingVerified(true);
    try {
      const res  = await getBusinessList(1, { verified: 1 });
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setVerifiedPages(list.slice(0, 10));
    } catch {}
    setLoadingVerified(false);
  };

  const loadPages = async (pageNum, query, replace = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const filters = {};
      if (query?.trim())                filters.search    = query.trim();
      const filter = activeFilterRef.current;
      if (filter === 'following')       filters.liked     = 1;
      if (filter === 'suggested')       filters.suggested = 1;
      if (filter === 'managed')         filters.managed   = 1;
      if (activeCatRef.current != null) filters.category  = activeCatRef.current;
      const res  = await getBusinessList(pageNum, filters);
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const total = Number(res?.data?.total ?? res?.data?.total_count ?? list.length);
      setPages(prev => replace || pageNum === 1 ? list : [...prev, ...list]);
      if (pageNum === 1) setTotalCount(total);
      setHasMore(list.length >= 20);
      setPage(pageNum);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  };

  const handleSearch = useCallback((text) => {
    setSearch(text);
    loadPages(1, text, true);
  }, []); // eslint-disable-line

  const handleFilter = useCallback((key) => {
    setActiveFilter(key);
    activeFilterRef.current = key;
    setPages([]); setPage(1); setHasMore(true);
    setTimeout(() => loadPages(1, search, true), 0);
  }, [search]); // eslint-disable-line

  const handleSelectCat = useCallback((id) => {
    setActiveCat(id);
    activeCatRef.current = id;
    // Always reset to "all" so suggested/following filters don't exclude followed pages
    setActiveFilter('all');
    activeFilterRef.current = 'all';
    setPages([]); setPage(1); setHasMore(true);
    setTimeout(() => loadPages(1, search, true), 0);
  }, [search]); // eslint-disable-line

  const processedPages = useMemo(() => {
    const result = [];
    pages.forEach((item, i) => {
      result.push(item);
      if ((i + 1) % 5 === 0 && i + 1 < pages.length) {
        result.push({ _isAd: true, id: `ad-${i}` });
      }
    });
    return result;
  }, [pages]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadPages(page + 1, search);
  }, [page, loadingMore, hasMore, search]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPages(1, search, true), loadVerified()]);
    setRefreshing(false);
  }, [search]); // eslint-disable-line

  const openBusiness = useCallback((b) => {
    navigation.navigate('BusinessDetails', { pageId: b.id });
  }, [navigation]);

  const handleSeeAllVerified = useCallback(() => {
    handleFilter('verified');
  }, [handleFilter]);

  // ─── List header ─────────────────────────────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* ── Hero ── */}
      <View style={bs.heroBlock}>
        <View style={bs.heroPills}>
          <View style={bs.heroLivePill}>
            <View style={bs.heroLiveDot} />
            <Text style={bs.heroLiveText}>FOREIGNER BUSINESS DIRECTORY</Text>
          </View>
        </View>
        <Text style={bs.heroTitle}>Discover African{'\n'}Businesses in China.</Text>
        <Text style={bs.heroSub}>
          Browse verified services, products, and opportunities built for Africa and the world.
        </Text>
        {/* Search */}
        <View style={bs.heroSearch}>
          <Ionicons name="search" size={19} color={WHITE + 'BF'} />
          <TextInput
            style={bs.searchInput}
            placeholder="Search businesses…"
            placeholderTextColor={WHITE + '70'}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity activeOpacity={0.85} style={bs.heroSearchBtn} onPress={() => handleSearch('')}>
            {search.length > 0
              ? <Ionicons name="close" size={16} color={BRAND} />
              : <Ionicons name="arrow-forward" size={17} color={BRAND} />
            }
          </TouchableOpacity>
        </View>
      </View>

      <DirectoryPulse
        totalCount={totalCount}
        activeCatName={activeCatName}
        activeFilter={activeFilter}
      />

      <VerifiedSection
        businesses={verifiedPages}
        loading={loadingVerified}
        onPress={openBusiness}
        onSeeAll={handleSeeAllVerified}
      />

      {/* ── Filter bar ── */}
      <View style={bs.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bs.filterScroll}>
          {[
            { key: 'all',       label: 'All' },
            { key: 'following', label: 'Following' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[bs.filterChip, activeFilter === key && bs.filterChipOn]}
              onPress={() => handleFilter(key)}
              activeOpacity={0.75}
            >
              <Text style={[bs.filterTxt, activeFilter === key && bs.filterTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}

          {/* Active category clear pill — shown when a category is selected */}
          {activeCat != null && (
            <TouchableOpacity
              style={bs.activeCatPill}
              onPress={() => handleSelectCat(null)}
              activeOpacity={0.8}
            >
              <View style={[bs.activeCatDot, { backgroundColor: getCatIcon(activeCatName).color }]} />
              <Text style={bs.activeCatTxt} numberOfLines={1}>{activeCatName}</Text>
              <Ionicons name="close" size={13} color={ACCENT} />
            </TouchableOpacity>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[bs.catDropBtn, activeCat != null && bs.catDropBtnOn]}
          onPress={() => setShowCatModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={14} color={activeCat != null ? ACCENT : BRAND} />
        </TouchableOpacity>
      </View>

      {/* ── Section label ── */}
      <View style={bs.sectionBar}>
        <View style={bs.sectionAccent} />
        <Text style={bs.sectionBarText}>
          {activeCatName
            ? activeCatName.toUpperCase()
            : activeFilter === 'following' ? 'BUSINESSES YOU FOLLOW'
            : 'ALL BUSINESSES'}
        </Text>
        {!loading && totalCount > 0 && (
          <Text style={bs.sectionCount}>{fmtCount(totalCount)} businesses</Text>
        )}
      </View>
    </View>
  ), [
    categories, activeCat,
    activeFilter, activeCatName, search, loading, totalCount,
  ]); // eslint-disable-line

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={bs.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Sticky header ── */}
      <View style={[bs.header, { paddingTop: top + 8 }]}>
        <View style={bs.headerTop}>
          <TouchableOpacity style={bs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={bs.headerLogoWrap} pointerEvents="none">
            <Image source={require('../../assl.js/Layer 3.png')} style={bs.headerLogo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={bs.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={WHITE} />
            <Text style={bs.createBtnTxt}>Add Page</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main list ── */}
      <FlatList
        data={loading && pages.length === 0 ? ['sk1', 'sk2', 'sk3'] : processedPages}
        keyExtractor={(item) =>
          typeof item === 'string' ? item
          : item._isAd ? item.id
          : String(item.id)
        }
        renderItem={({ item }) => {
          if (typeof item === 'string') return <SkeletonCard />;
          if (item._isAd) return <AdBanner />;
          return (
            <BusinessCard
              business={item}
              user={user}
              categoryName={catMap[item.category] ?? ''}
              onOpen={openBusiness}
            />
          );
        }}
        contentContainerStyle={bs.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={bs.emptyWrap}>
              <View style={bs.emptyCircle}>
                <Ionicons name="business-outline" size={36} color={MUTED} />
              </View>
              <Text style={bs.emptyTitle}>No businesses found</Text>
              <Text style={bs.emptySub}>Try adjusting your search or filters</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View>
            {loadingMore && <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />}
          </View>
        }
      />

      {/* ── Category dropdown modal ── */}
      <CategoryDropdown
        visible={showCatModal}
        categories={categories}
        activeCat={activeCat}
        onSelect={handleSelectCat}
        onClose={() => setShowCatModal(false)}
      />

      <CreateModal
        visible={showCreate}
        type="business"
        navigation={navigation}
        token={token}
        user={user}
        onClose={() => setShowCreate(false)}
        onCreated={() => { loadPages(1, search, true); loadVerified(); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const bs = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // ── Sticky header ──
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingBottom: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  headerTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: ON_DARK_14, alignItems: 'center', justifyContent: 'center' },
  headerLogoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  headerLogo:     { height: 26, width: 110 },
  createBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  createBtnTxt:   { fontSize: 12, fontWeight: '800', color: WHITE },

  // ── Hero ──
  heroBlock: {
    backgroundColor: '#0c3f44',
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 22,
    overflow: 'hidden',
  },
  heroPills:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  heroLivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WHITE + '12', borderWidth: 1, borderColor: WHITE + '1E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroLiveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  heroLiveText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: WHITE + 'BF' },
  heroTitle:    { fontSize: 27, fontWeight: '900', color: WHITE, lineHeight: 34 },
  heroSub:      { marginTop: 6, fontSize: 13, lineHeight: 18, color: WHITE + '99' },
  heroSearch:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE + '15', borderRadius: 999, borderWidth: 1, borderColor: WHITE + '28', paddingHorizontal: 18, paddingRight: 10, height: 52, marginTop: 18 },
  heroSearchBtn:{ width: 36, height: 36, borderRadius: 999, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  searchInput:  { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 0 },

  // ── Filter bar ──
  filterBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, marginHorizontal: 14, marginTop: 14, paddingLeft: 12, paddingRight: 10, paddingVertical: 10, gap: 8, borderRadius: 22, borderWidth: 1, borderColor: hex2(BRAND, 0.08), shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  filterScroll:   { gap: 8, alignItems: 'center' },
  filterChip:     { height: 34, paddingHorizontal: 16, borderRadius: 100, backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  filterChipOn:   { backgroundColor: BRAND, borderColor: BRAND },
  filterTxt:      { fontSize: 12, fontWeight: '700', color: MUTED },
  filterTxtOn:    { color: WHITE },

  // Active cat clear pill inside filter scroll
  activeCatPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 100, backgroundColor: hex2(ACCENT, 0.1), borderWidth: 1.5, borderColor: ACCENT },
  activeCatDot:   { width: 7, height: 7, borderRadius: 4 },
  activeCatTxt:   { fontSize: 12, fontWeight: '700', color: ACCENT, maxWidth: 100 },

  catDropBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  catDropBtnOn:   { backgroundColor: hex2(ACCENT, 0.12), borderColor: ACCENT },

  // ── Section bar ──
  sectionBar:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingTop: 18, paddingBottom: 4, gap: 8, backgroundColor: CREAM },
  sectionAccent: { width: 4, height: 18, borderRadius: 3, backgroundColor: ACCENT },
  sectionBarText:{ fontSize: 13, fontWeight: '900', color: DARK, letterSpacing: 0.6, flex: 1 },
  sectionCount:  { fontSize: 11, color: ACCENT, fontWeight: '800', backgroundColor: ACCENT + '14', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },

  listContent: { paddingBottom: 100, gap: 14 },

  // ── Business card (redesigned) ──
  card: {
    backgroundColor: CARD, borderRadius: 24, overflow: 'hidden',
    marginHorizontal: 14,
    borderWidth: 1, borderColor: hex2(BRAND, 0.08),
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09, shadowRadius: 16, elevation: 5,
  },

  // Cover
  coverWrap:       { position: 'relative' },
  cover:           { width: '100%', height: 118, alignItems: 'center', justifyContent: 'center' },
  coverGradient:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  coverCatPill:    { position: 'absolute', bottom: 10, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 },
  coverCatTxt:     { fontSize: 10, fontWeight: '800', color: WHITE, letterSpacing: 0.3 },
  verifiedChip:    { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedTxt:     { fontSize: 9, fontWeight: '800', color: WHITE },

  // Info row
  infoRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 0, paddingBottom: 12, marginTop: -18 },
  avatarWrap:      { position: 'relative' },
  avatar:          { width: 56, height: 56, borderRadius: 16, borderWidth: 3, borderColor: CARD, backgroundColor: BRAND },
  avatarFb:        { alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND },
  avatarVerifiedDot: { position: 'absolute', bottom: -2, right: -2, backgroundColor: CARD, borderRadius: 9 },
  nameMeta:        { flex: 1, paddingTop: 18 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title:           { fontSize: 15, fontWeight: '900', color: DARK, flexShrink: 1 },
  ownerPill:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: hex2(ACCENT, 0.12), borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  ownerPillTxt:    { fontSize: 9, color: ACCENT, fontWeight: '800' },
  statsRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  statsTxt:        { fontSize: 11, color: MUTED, fontWeight: '600' },

  // Action buttons
  actionGroup:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18 },
  iconActionBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: CREAM, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  iconActionBtnOn: { backgroundColor: hex2(ACCENT, 0.1), borderColor: ACCENT },
  primaryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BRAND, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  primaryBtnTxt:   { fontSize: 12, fontWeight: '800', color: WHITE },

  // About
  aboutWrap:       { paddingHorizontal: 14, paddingBottom: 14 },
  desc:            { fontSize: 13, color: MUTED, lineHeight: 19 },

  // ── Empty ──
  emptyWrap:   { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: hex2(ACCENT, 0.12) },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
});

const adst = StyleSheet.create({
  wrap:       { backgroundColor: CARD, marginHorizontal: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BRAND + '12', shadowColor: DARK, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingTop: 10, marginBottom: 6 },
  sponsorTxt: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  body:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 14 },
  imgBox:     { width: 72, height: 72, borderRadius: 14, backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center' },
  text:       { flex: 1 },
  adTitle:    { fontSize: 14, fontWeight: '800', color: DARK, lineHeight: 19, marginBottom: 3 },
  adSub:      { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 7 },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaTxt:     { fontSize: 12, fontWeight: '800', color: ACCENT },
});

const dd = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: DARK + '55', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '65%', paddingBottom: 30 },
  handle:     { width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  item:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  itemOn:     {},
  itemIconBox:{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: BORDER },
  itemDotOn:  { backgroundColor: ACCENT },
  itemTxt:    { flex: 1, fontSize: 14, color: DARK, fontWeight: '500' },
  itemTxtOn:  { color: BRAND, fontWeight: '700' },
});

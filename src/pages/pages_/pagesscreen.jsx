// src/pages/pages_/pagesscreen.jsx
import React, {
  useMemo, useRef, useEffect, useState, useCallback, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Image, ScrollView, FlatList, RefreshControl,
  StatusBar, Modal, ActivityIndicator, PanResponder, Linking,
  Alert, Clipboard, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppDetails from '../../helpers/appdetails';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import StaticShortcutRow from '../home/quicklinks';
import DrawerNavigation from '../home/drawernavigation';
import PostComposerModal from '../home/PostComposerModal';
import CreateMenuSheet from '../home/CreateMenuSheet';
import { fetchArticles, fetchTrendingArticles } from '../blogs/articlesApi';
import { useLiveCounts } from '../../hooks/useLiveCounts';
import { Colors } from '../../theme';
import { TOPIC_POOL, shuffle, pickRandom } from '../../helpers/topicPool';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const IS_TABLET  = SCREEN_W > 700;
const NUM_COLS   = IS_TABLET ? 3 : 2;
const CARD_GAP   = 14;  // gap between columns
const H_PAD      = 16;  // page horizontal padding each side
const SEC_PAD    = 14;  // section inner padding each side
// Total horizontal space used: H_PAD*2 + SEC_PAD*2 + CARD_GAP*(NUM_COLS-1)
const CARD_W     = (SCREEN_W - H_PAD * 2 - SEC_PAD * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

const BASE_URL           = 'https://hafrik.com';
const MARKETPLACE_URL    = 'https://hafrik.com/api/v1/marketplace/get_marketplace.php';
const EXPLORE_URL        = '/api/v1/explore/home.php?ads_placement=explore';
const MARKETPLACE_LIMIT  = 6;

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const BORDER = BRAND + '14';
const WHITE  = Colors.white;
const WARM   = Colors.warning;

const HERO_COLOR = '#0c3f44'; // solid brand color for hero + header

const COUNTRY_KEY     = 'selected_country';
const DEFAULT_COUNTRY = { country_id: 'all', name: 'All' };

// ─── Category grid ────────────────────────────────────────────────────────────
const EXPLORE_CATEGORIES = [
  { tag: 'Jobs',           icon: 'briefcase',          color: '#E74C3C' },
  { tag: 'Schools',        icon: 'school',              color: '#3498DB' },
  { tag: 'Universities',   icon: 'library',             color: '#9B59B6' },
  { tag: 'Visa',           icon: 'document-text',       color: '#1ABC9C' },
  { tag: 'Business',       icon: 'storefront',          color: '#F39C12' },
  { tag: 'Accommodation',  icon: 'home',                color: '#27AE60' },
  { tag: 'Shipping',       icon: 'cube',                color: '#2980B9' },
  { tag: 'BuyAndSell',     icon: 'cart',                color: '#E67E22' },
  { tag: 'Events',         icon: 'calendar',            color: '#8E44AD' },
  { tag: 'Health',         icon: 'medkit',              color: '#C0392B' },
  { tag: 'Food',           icon: 'restaurant',          color: '#D35400' },
  { tag: 'Technology',     icon: 'hardware-chip',       color: '#2C3E50' },
  { tag: 'Finance',        icon: 'cash',                color: '#16A085' },
  { tag: 'Travel',         icon: 'airplane',            color: '#2471A3' },
  { tag: 'Culture',        icon: 'color-palette',       color: '#A04000' },
  { tag: 'Sports',         icon: 'football',            color: '#117A65' },
  { tag: 'Music',          icon: 'musical-notes',       color: '#6C3483' },
  { tag: 'Fashion',        icon: 'shirt',               color: '#CB4335' },
  { tag: 'Remittance',     icon: 'swap-horizontal',     color: '#1F618D' },
  { tag: 'Housing',        icon: 'business',            color: '#0B5345' },
  { tag: 'Language',       icon: 'chatbubbles',         color: '#784212' },
  { tag: 'News',           icon: 'newspaper',           color: '#212F3D' },
  { tag: 'Community',      icon: 'people',              color: '#154360' },
  { tag: 'Diaspora',       icon: 'earth',               color: '#0E6655' },
];

const CAT_PALETTES = [
  { bg: BRAND,           text: WHITE, border: BRAND },
  { bg: ACCENT,          text: DARK,  border: ACCENT },
  { bg: '#E74C3C',       text: WHITE, border: '#E74C3C' },
  { bg: BRAND + '12',    text: BRAND, border: BRAND + '66' },
  { bg: ACCENT + '1A',   text: ACCENT, border: ACCENT },
  { bg: '#9B59B6',       text: WHITE, border: '#9B59B6' },
  { bg: '#27AE60' + '1A', text: '#27AE60', border: '#27AE60' },
  { bg: '#E67E22' + '1A', text: '#E67E22', border: '#E67E22' },
];

const CategoriesGrid = memo(() => {
  const navigation = useNavigation();
  return (
    <View style={catStyles.pillsWrap}>
      {EXPLORE_CATEGORIES.map((cat, i) => {
        const pal = CAT_PALETTES[i % CAT_PALETTES.length];
        return (
          <TouchableOpacity
            key={cat.tag}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('SearchScreen', { initialQuery: cat.tag, initialTab: 'all' })}
            style={[catStyles.pill, { backgroundColor: pal.bg, borderColor: pal.border }]}
          >
            <Ionicons name={cat.icon} size={13} color={pal.text} style={{ opacity: 0.85 }} />
            <Text style={[catStyles.pillText, { color: pal.text }]}>{cat.tag}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const catStyles = StyleSheet.create({
  pillsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 12.5, fontWeight: '800',
  },
});

// Hardcoded rank movement deltas for the 5 trending posts (positive = rising, 0 = stable, negative = dropping)
const RANK_DELTAS = [2, -1, 0, 1, -2];


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Attach a hard timeout to an AbortController; returns the timer id so callers
// can clearTimeout it in their finally block.
const addTimeout = (ctrl, ms = 8000) => setTimeout(() => ctrl.abort(), ms);

const exploreApiFetch = async (path, token, extraParams = {}, signal) => {
  try {
    const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v != null && v !== 'all') url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal,
    });
    return await res.json();
  } catch { return null; }
};

const decodeHtml = (text = '') =>
  String(text)
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('blank_profile') && !url.includes('default-article') && !url.includes('/default.');


const fmtPrice = (currency, price) => {
  if (price == null) return null;
  const n = Number(price);
  return `${currency ?? ''} ${isNaN(n) ? price : n.toLocaleString()}`.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// Section header
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeader = memo(({ title, onSeeAll }) => (
  <View style={ss.sectionHeader}>
    <View style={ss.sectionTitleRow}>
      <View style={ss.sectionAccent} />
      <Text style={ss.sectionTitle}>{title}</Text>
    </View>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} activeOpacity={0.8} style={ss.seeAllBtn}>
        <Text style={ss.seeAllText}>See all</Text>
        <Ionicons name="chevron-forward" size={14} color={ACCENT} />
      </TouchableOpacity>
    )}
  </View>
));



// ─────────────────────────────────────────────────────────────────────────────
// Inline Ad Card — replaces promo CTAs with live ads from /api/v1/ads/list.php
// ─────────────────────────────────────────────────────────────────────────────
const InlineAdCard = memo(({ ad, onPress }) => {
  if (!ad) return null;
  const img    = ad?.image ?? ad?.banner_image ?? ad?.thumbnail ?? null;
  const title  = decodeHtml(ad?.title ?? '');
  const sub    = decodeHtml(ad?.description ?? ad?.subtitle ?? '');
  const btnTxt = ad?.button_text ?? 'Learn More';
  const hasLink = !!(ad?.link ?? ad?.url ?? ad?.external_url);

  return (
    <TouchableOpacity
      onPress={() => onPress?.(ad)}
      activeOpacity={0.88}
      style={ss.inlineAdWrap}
    >
      {isRealImage(img) ? (
        <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[Colors.primaryDark, BRAND, ACCENT]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      <LinearGradient
        colors={[DARK + '14', DARK + 'BD']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={ss.inlineAdBadge}>
        <Text style={ss.inlineAdBadgeTxt}>SPONSORED</Text>
      </View>
      <View style={ss.inlineAdContent}>
        {!!title && <Text style={ss.inlineAdTitle} numberOfLines={2}>{title}</Text>}
        {!!sub   && <Text style={ss.inlineAdSub}   numberOfLines={2}>{sub}</Text>}
        {hasLink && (
          <View style={ss.inlineAdBtn}>
            <Text style={ss.inlineAdBtnTxt}>{btnTxt}</Text>
            <Ionicons name="arrow-forward" size={12} color={BRAND} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Ad banner (auto-rotating)
// ─────────────────────────────────────────────────────────────────────────────
const AdsBanner = memo(({ ads, onPress }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % ads.length);
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [ads.length]);

  if (!ads.length) return null;
  const ad = ads[activeIdx];
  const img = ad?.image ?? ad?.banner_image ?? ad?.thumbnail;

  return (
    <View style={ss.adWrap}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(ad)} style={ss.adCard}>
        {isRealImage(img) ? (
          <Image source={{ uri: img }} style={ss.adImg} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[BRAND, ACCENT]} style={ss.adImg}>
            <Text style={ss.adFallbackText}>{decodeHtml(ad?.title ?? 'Hafrik')}</Text>
          </LinearGradient>
        )}
        <View style={ss.adLabel}>
          <Text style={ss.adLabelText}>Sponsored</Text>
        </View>
      </TouchableOpacity>

      {ads.length > 1 && (
        <View style={ss.adDots}>
          {ads.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveIdx(i)}>
              <View style={[ss.adDot, i === activeIdx && ss.adDotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// People card (horizontal)
// ─────────────────────────────────────────────────────────────────────────────
const PersonHCard = memo(({ item, onPress, onFollow }) => {
  const avatar      = item?.avatar ?? item?.image ?? item?.thumbnail;
  const name        = decodeHtml(item?.username ?? item?.name ?? 'User');
  const count       = item?.followers_count ?? item?.followers ?? 0;
  const isFollowing = !!item?.is_follow;

  return (
    <TouchableOpacity style={ss.personCard} activeOpacity={0.88} onPress={onPress}>
      {isRealImage(avatar) ? (
        <Image source={{ uri: avatar }} style={ss.personAvatar} />
      ) : (
        <View style={[ss.personAvatar, ss.imgFallback]}>
          <Ionicons name="person-outline" size={26} color={BRAND} />
        </View>
      )}
      <Text numberOfLines={1} style={ss.personName}>{name}</Text>
      <Text numberOfLines={1} style={ss.personSub}>{Number(count).toLocaleString()} followers</Text>
      <TouchableOpacity
        style={[ss.followBtn, isFollowing && ss.followingBtn]}
        activeOpacity={0.85}
        onPress={(e) => { e.stopPropagation?.(); onFollow?.(); }}
      >
        <Text style={[ss.followBtnText, isFollowing && ss.followingBtnText]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Mini card (communities / businesses)
// ─────────────────────────────────────────────────────────────────────────────
const MiniCard = memo(({ title, subtitle, image, iconName, onPress, badge }) => (
  <TouchableOpacity style={ss.miniCard} activeOpacity={0.88} onPress={onPress}>
    {isRealImage(image) ? (
      <Image source={{ uri: image }} style={ss.miniAvatar} />
    ) : (
      <View style={[ss.miniAvatar, ss.imgFallback]}>
        <Ionicons name={iconName ?? 'people-outline'} size={18} color={BRAND} />
      </View>
    )}
    <View style={{ flex: 1 }}>
      <Text numberOfLines={1} style={ss.miniTitle}>{decodeHtml(title ?? '')}</Text>
      <Text numberOfLines={1} style={ss.miniSub}>{decodeHtml(subtitle ?? '')}</Text>
    </View>
    {badge ? (
      <View style={ss.badgeChip}><Text style={ss.badgeChipText}>{badge}</Text></View>
    ) : (
      <Ionicons name="chevron-forward" size={18} color={Colors.border} />
    )}
  </TouchableOpacity>
));

// ─────────────────────────────────────────────────────────────────────────────
// Marketplace product card — uses MarketplaceProduct from real endpoint
// 2-col grid, matches ProductCard.tsx visuals exactly
// ─────────────────────────────────────────────────────────────────────────────
const MarketplaceCard = memo(({ item, onPress }) => {
  const thumb      = item.thumbnail ?? item.photos?.[0] ?? null;
  const inStock    = item.stock_status === 'In Stock';
  const isPage     = item.seller?.type === 'page';
  const sellerName = isPage && item.seller?.page_name
    ? item.seller.page_name
    : item.seller?.username ?? null;
  const sellerAvatar = item.seller?.avatar ?? null;
  const photoCnt   = Number(item.photos_count ?? 0);

  return (
    <TouchableOpacity style={ss.gridCard} activeOpacity={0.88} onPress={onPress}>
      {/* Square image */}
      <View style={ss.gridImgWrap}>
        {isRealImage(thumb) ? (
          <Image source={{ uri: thumb }} style={ss.gridImg} resizeMode="cover" />
        ) : (
          <View style={[ss.gridImg, ss.imgFallback]}>
            <Ionicons name="image-outline" size={28} color={MUTED} />
          </View>
        )}

        {/* In Stock badge — bottom-left */}
        <View style={[ss.gridStockBadge, !inStock && ss.gridStockOut]}>
          <View style={ss.gridStockDot} />
          <Text style={ss.gridStockTxt}>{inStock ? 'In Stock' : 'Out'}</Text>
        </View>

        {/* Photo count — top-right */}
        {photoCnt > 1 && (
          <View style={ss.gridPhotoBadge}>
            <Ionicons name="images-outline" size={9} color={WHITE} />
            <Text style={ss.gridPhotoTxt}>{photoCnt}</Text>
          </View>
        )}

        {/* Digital pill — top-left */}
        {!!item.is_digital && (
          <View style={ss.gridDigitalBadge}>
            <Text style={ss.gridDigitalTxt}>Digital</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={ss.gridBody}>
        {/* Fixed 2-line title keeps all cards same height */}
        <Text numberOfLines={2} style={ss.gridTitle}>
          {decodeHtml(item.title ?? 'Product')}
        </Text>

        {/* Price in green */}
        <Text numberOfLines={1} style={ss.gridPrice}>
          {fmtPrice(item.currency, item.price) ?? '—'}
        </Text>

        {/* Seller row */}
        <View style={ss.gridSellerRow}>
          {isRealImage(sellerAvatar) ? (
            <Image source={{ uri: sellerAvatar }} style={ss.gridSellerAvatar} />
          ) : (
            <View style={[ss.gridSellerAvatar, ss.imgFallback]}>
              <Ionicons name="person-outline" size={10} color={BRAND} />
            </View>
          )}
          <Text numberOfLines={1} style={ss.gridSellerName}>{sellerName ?? '—'}</Text>
          <View style={{ flex: 1 }} />
          {sellerName && (
            <View style={[ss.gridTypeBadge, isPage && ss.gridTypeBadgePage]}>
              <Text style={ss.gridTypeTxt}>{isPage ? 'PAGE' : 'USER'}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Reel grid card — 3-col square thumbnail with play overlay
// ─────────────────────────────────────────────────────────────────────────────
const REEL_COLS    = 2;
const REEL_GAP     = 6;
const REEL_SIZE    = (SCREEN_W - H_PAD * 2 - SEC_PAD * 2 - REEL_GAP * (REEL_COLS - 1)) / REEL_COLS;
const REEL_H_W     = 130; // fixed width for horizontal-scroll reel card

const fmtViews = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return v > 0 ? String(v) : '';
};

const ReelGridCard = memo(({ item, onPress }) => {
  // reels API returns media as object: { video_url, thumbnail, ... }
  // feed API returns media as array: [{ video_url, thumbnail, ... }]
  const thumb    = item?.media?.thumbnail ?? item?.media?.[0]?.thumbnail ?? item?.thumbnail ?? item?.cover ?? null;
  const views    = fmtViews(item?.views);
  const username = item?.user?.username ?? item?.username ?? null;

  return (
    <TouchableOpacity
      style={[rg.card, { width: REEL_H_W, height: REEL_H_W * 1.6 }]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {isRealImage(thumb) ? (
        <Image source={{ uri: thumb }} style={rg.img} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[BRAND, Colors.primaryDark]} style={[rg.img, rg.imgFallback]}>
          <Ionicons name="play-circle-outline" size={28} color={WHITE + '73'} />
        </LinearGradient>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', DARK + 'B8']}
        style={rg.overlay}
      >
        {/* Play badge top-left */}
        <View style={rg.playBadge}>
          <Ionicons name="play" size={9} color={WHITE} />
        </View>

        {/* Bottom info */}
        <View style={rg.bottomRow}>
          {!!views && (
            <View style={rg.viewChip}>
              <Ionicons name="eye-outline" size={9} color={WHITE + 'CC'} />
              <Text style={rg.viewTxt}>{views}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

const rg = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceTint,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    padding: 6,
    justifyContent: 'flex-end',
  },
  playBadge: {
    position: 'absolute',
    top: -REEL_SIZE * 0.6,
    left: 6,
    backgroundColor: DARK + '59',
    borderRadius: 99,
    padding: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewTxt: {
    fontSize: 9,
    color: WHITE + 'E6',
    fontWeight: '700',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Rank delta indicator — bouncing arrow for rising/dropping posts
// ─────────────────────────────────────────────────────────────────────────────
const DeltaIndicator = memo(({ delta }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (delta === 0) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.delay(2500),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delta]);

  if (delta === 0) return <Text style={ss.rankStable}>—</Text>;
  const up = delta > 0;
  return (
    <Animated.View style={[ss.deltaWrap, { transform: [{ scale: pulse }] }]}>
      <Ionicons name={up ? 'caret-up' : 'caret-down'} size={9} color={up ? '#22c55e' : '#ef4444'} />
      <Text style={[ss.deltaText, { color: up ? '#22c55e' : '#ef4444' }]}>
        {up ? '+' : ''}{delta}
      </Text>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Ranked trending post card (leaderboard style)
// ─────────────────────────────────────────────────────────────────────────────
const sumReactions = (r) => {
  if (!r || typeof r !== 'object') return 0;
  return Object.entries(r).reduce((s, [k, v]) => k !== 'total' ? s + Number(v || 0) : s, 0);
};

const RankedTrendingCard = memo(({ item, rank, rankDelta, onPress }) => {
  const thumb    = item?.media?.[0]?.thumbnail ?? item?.media?.[0]?.url
                ?? item?.thumbnail ?? item?.image ?? item?.cover ?? null;
  const username = decodeHtml(item?.username ?? item?.user?.username ?? item?.name ?? 'User');
  const title    = decodeHtml(item?.title ?? item?.text ?? item?.caption ?? '');
  const reactions = sumReactions(item?.reactions);
  const likes    = reactions || Number(item?.likes_count ?? item?.likes ?? 0);
  const comments = Number(item?.comments_count ?? item?.comments ?? 0);
  const views    = Number(item?.views ?? 0);
  const avatar   = item?.user?.avatar ?? item?.avatar ?? null;

  return (
    <TouchableOpacity style={ss.rtCard} activeOpacity={0.86} onPress={onPress}>
      {/* ── Rank column ── */}
      <View style={ss.rtRankCol}>
        <Text style={[ss.rtRankNum, rank === 1 && ss.rtRankNumGold]}>{rank}</Text>
        <DeltaIndicator delta={rankDelta} />
      </View>

      <View style={ss.rtDivider} />

      {/* ── Thumbnail ── */}
      {isRealImage(thumb) ? (
        <Image source={{ uri: thumb }} style={ss.rtThumb} resizeMode="cover" />
      ) : (
        <View style={[ss.rtThumb, ss.imgFallback]}>
          <Ionicons name="flame-outline" size={20} color={MUTED} />
        </View>
      )}

      {/* ── Body ── */}
      <View style={ss.rtBody}>
        <View style={ss.rtUserRow}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={ss.rtAvatar} />
          ) : (
            <View style={[ss.rtAvatar, ss.imgFallback]}>
              <Ionicons name="person-outline" size={8} color={BRAND} />
            </View>
          )}
          <Text numberOfLines={1} style={ss.rtUsername}>@{username}</Text>
        </View>
        {!!title && <Text numberOfLines={2} style={ss.rtTitle}>{title}</Text>}
        <View style={ss.rtStats}>
          <View style={ss.rtStat}>
            <Ionicons name="heart-outline" size={11} color={MUTED} />
            <Text style={ss.rtStatText}>{likes.toLocaleString()}</Text>
          </View>
          <View style={ss.rtStat}>
            <Ionicons name="chatbubble-outline" size={11} color={MUTED} />
            <Text style={ss.rtStatText}>{comments.toLocaleString()}</Text>
          </View>
          {views > 0 && (
            <View style={ss.rtStat}>
              <Ionicons name="eye-outline" size={11} color={MUTED} />
              <Text style={ss.rtStatText}>{views.toLocaleString()}</Text>
            </View>
          )}
        </View>
      </View>
          
      <Ionicons name="chevron-forward" size={14} color={ACCENT + '70'} style={ss.rtChevron} />
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Post preview bottom sheet (opens when tapping a ranked card)
// ─────────────────────────────────────────────────────────────────────────────
const PostPreviewSheet = ({ visible, post, onClose, onViewFull }) => {
  if (!visible || !post) return null;
  const thumb    = post?.media?.[0]?.thumbnail ?? post?.media?.[0]?.url
                ?? post?.thumbnail ?? post?.image ?? post?.cover ?? null;
  const username = decodeHtml(post?.username ?? post?.user?.username ?? '');
  const title    = decodeHtml(post?.title ?? post?.text ?? post?.caption ?? '');
  const reactions = sumReactions(post?.reactions);
  const likes    = reactions || Number(post?.likes_count ?? post?.likes ?? 0);
  const comments = Number(post?.comments_count ?? post?.comments ?? 0);
  const views    = Number(post?.views ?? 0);
  const avatar   = post?.user?.avatar ?? post?.avatar ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={ss.previewBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={ss.previewSheet}>
        <View style={ss.previewHandle} />
        <Text style={ss.previewSheetTitle}>Post Preview</Text>
        {isRealImage(thumb) ? (
          <Image source={{ uri: thumb }} style={ss.previewThumb} resizeMode="cover" />
        ) : (
          <View style={[ss.previewThumb, ss.imgFallback]}>
            <Ionicons name="image-outline" size={36} color={MUTED} />
          </View>
        )}
        <View style={ss.previewMeta}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={ss.previewAvatar} />
          ) : (
            <View style={[ss.previewAvatar, ss.imgFallback]}>
              <Ionicons name="person-outline" size={12} color={BRAND} />
            </View>
          )}
          <Text numberOfLines={1} style={ss.previewUsername}>@{username}</Text>
        </View>
        {!!title && <Text numberOfLines={3} style={ss.previewCaption}>{title}</Text>}
        <View style={ss.previewStatsRow}>
          <View style={ss.previewStat}>
            <Ionicons name="heart" size={14} color="#ef4444" />
            <Text style={ss.previewStatText}>{likes.toLocaleString()} reactions</Text>
          </View>
          <View style={ss.previewStat}>
            <Ionicons name="chatbubble-ellipses" size={14} color={ACCENT} />
            <Text style={ss.previewStatText}>{comments.toLocaleString()} comments</Text>
          </View>
          {views > 0 && (
            <View style={ss.previewStat}>
              <Ionicons name="eye" size={14} color={MUTED} />
              <Text style={ss.previewStatText}>{views.toLocaleString()} views</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={ss.previewViewBtn} onPress={onViewFull} activeOpacity={0.88}>
          <Text style={ss.previewViewBtnText}>View Full Post</Text>
          <Ionicons name="arrow-forward" size={16} color={WHITE} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hot articles — animated fire header + styled article cards
// ─────────────────────────────────────────────────────────────────────────────
const FirePulse = memo(() => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 650, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 650, useNativeDriver: true }),
        Animated.delay(1700),
      ])
    ).start();
  }, []);
  return <Animated.Text style={[ss.firePulseEmoji, { transform: [{ scale }] }]}>🔥</Animated.Text>;
});

const HotArticleCard = memo(({ item, onPress }) => {
  const hasImg  = isRealImage(item?.image ?? null);
  const title   = decodeHtml(item?.title ?? '');
  const snippet = decodeHtml(item?.snippet ?? '');
  return (
    <TouchableOpacity style={ss.hotArticleCard} activeOpacity={0.85} onPress={onPress}>
      <View style={ss.hotArticleAccentBar} />
      {hasImg ? (
        <Image source={{ uri: item.image }} style={ss.hotArticleImg} resizeMode="cover" />
      ) : (
        <View style={[ss.hotArticleImg, ss.imgFallback]}>
          <Ionicons name="newspaper-outline" size={22} color={MUTED} />
        </View>
      )}
      <View style={ss.hotArticleBody}>
        {!!item?.category_name && (
          <View style={ss.articleCatBadge}>
            <Text style={ss.articleCatText}>{item.category_name}</Text>
          </View>
        )}
        <Text numberOfLines={2} style={ss.hotArticleTitle}>{title}</Text>
        {!!snippet && <Text numberOfLines={2} style={ss.articleSnippet}>{snippet}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={14} color={ACCENT} style={ss.articleArrow} />
    </TouchableOpacity>
  );
});

const HotArticlesSection = ({ articles, navigation }) => {
  const slideY  = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fired   = useRef(false);

  useEffect(() => {
    if (!articles.length || fired.current) return;
    fired.current = true;
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
    ]).start();
  }, [articles.length]);

  if (!articles.length) return null;

  return (
    <Animated.View style={[ss.hotArticlesWrap, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={ss.hotArticleHeader}>
        <FirePulse />
        <Text style={ss.hotArticleHeaderText}>Hot This Week</Text>
      </View>
      {articles.slice(0, 2).map((a, i) => (
        <HotArticleCard
          key={a.id ?? a.post_id ?? `ha-${i}`}
          item={a}
          onPress={() => navigation.navigate('ArticleDetails', { postId: a.post_id ?? a.id })}
        />
      ))}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Featured business horizontal card
// ─────────────────────────────────────────────────────────────────────────────
const FeaturedBizCard = memo(({ item, onPress }) => {
  const avatar    = item?.avatar ?? item?.image ?? item?.logo ?? null;
  const name      = decodeHtml(item?.title ?? item?.name ?? 'Business');
  const cat       = item?.category ?? item?.type ?? null;
  const desc      = decodeHtml(item?.description ?? item?.about ?? '');
  const followers = Number(item?.followers_count ?? item?.followers ?? 0);
  return (
    <TouchableOpacity style={ss.fbCard} activeOpacity={0.88} onPress={onPress}>
      {isRealImage(avatar) ? (
        <Image source={{ uri: avatar }} style={ss.fbAvatar} resizeMode="cover" />
      ) : (
        <View style={[ss.fbAvatar, ss.imgFallback]}><Text style={{fontSize:24}}>🏢</Text></View>
      )}
      <View style={ss.fbBody}>
        <View style={ss.fbNameRow}>
          <Text numberOfLines={1} style={ss.fbName}>{name}</Text>
          {!!item?.verified && <Ionicons name="checkmark-circle" size={14} color={ACCENT} />}
        </View>
        {!!cat  && <Text numberOfLines={1} style={ss.fbCat}>{cat}</Text>}
        {!!desc && <Text numberOfLines={2} style={ss.fbDesc}>{desc}</Text>}
        <Text style={ss.fbFollowers}>{followers.toLocaleString()} followers</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={ACCENT} />
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Featured Business Section — horizontal scroll, featured=1
// ─────────────────────────────────────────────────────────────────────────────
const FeaturedBusinessSection = ({ navigation, token, shuffleKey }) => {
  const [rawItems, setRawItems] = useState([]);
  const [loading,  setLoading]  = useState(true);
  useEffect(() => {
    fetch('https://hafrik.com/api/v1/business/list.php?limit=12&featured=1&verified=1', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => {
        const raw = j?.data?.businesses || j?.data?.pages || j?.data?.data || j?.data || [];
        setRawItems(Array.isArray(raw) ? raw : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Re-shuffle whenever parent shuffleKey changes (refresh / auto-rotate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => shuffle(rawItems).slice(0, 8), [rawItems, shuffleKey]);

  if (!loading && items.length === 0) return null;
  return (
    <View style={[ss.section, { paddingHorizontal: 0, overflow: 'hidden' }]}>
      <View style={{ paddingHorizontal: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={ss.sectionTitleRow}>
          <View style={ss.sectionAccent} />
          <Text style={ss.sectionTitle}>Verified Businesses Near You</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT + '1A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Ionicons name="shield-checkmark" size={10} color={ACCENT} />
          <Text style={{ fontSize: 9, fontWeight: '800', color: ACCENT, letterSpacing: 0.8 }}>VERIFIED</Text>
        </View>
      </View>
      {loading ? (
        <View style={[ss.sectionLoader, { paddingHorizontal: 14 }]}><ActivityIndicator size="small" color={BRAND} /></View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 14 }}>
          {items.map((biz, i) => (
            <FeaturedBizCard key={biz.id ?? `fb-${i}`} item={biz} onPress={() => navigation.navigate('BusinessDetails', { pageId: biz.id })} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Quick Access Section — merged, shuffled on every reload
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_ACCESS_ALL = [
  { id: 'hotels',          label: 'Hotels',          icon: '🏨', tab: 'all',  tag: 'hotel'            },
  { id: 'restaurants',     label: 'Restaurants',     icon: '🍽️', tab: 'all',  tag: 'restaurants'       },
  { id: 'hospitals',       label: 'Hospitals',       icon: '🏥', tab: 'all',  tag: 'hospitals'         },
  { id: 'parks',           label: 'Parks',           icon: '🌳', tab: 'all',  tag: 'parks'             },
  { id: 'bars',            label: 'Bars & Lounges',  icon: '🍺', tab: 'all',  tag: 'bar'              },
  { id: 'nightlife',       label: 'Nightlife',       icon: '🎶', tab: 'all',  tag: 'night life'         },
  { id: 'shopping',        label: 'Shopping',        icon: '🛍️', tab: 'all',  tag: 'shopping'          },
  { id: 'banks',           label: 'Banks & Finance', icon: '🏦', tab: 'all',  tag: 'banks'             },
  { id: 'visa-help',       label: 'Visa Help',       icon: '📋', tab: 'all',  tag: 'visa help support' },
  { id: 'halal-food',      label: 'Halal Food',      icon: '🍜', tab: 'all',  tag: 'best halal food'   },
  { id: 'new-to-china',    label: 'New to China',    icon: '🇨🇳', tab: 'all',  tag: 'new to china'         },
  { id: 'business-tips',   label: 'Business Tips',   icon: '💼', tab: 'all',  tag: 'business tips'      },
  { id: 'jobs',            label: 'Jobs',            icon: '🎯', tab: 'all',  tag: 'job'              },
  { id: 'study',           label: 'Study',           icon: '📚', tab: 'all',  tag: 'study'             },
  { id: 'logistics',       label: 'Logistics',       icon: '🚢', tab: 'all',  tag: 'shipping'          },
  { id: 'currency',        label: 'Exchange Rates',  icon: '💱', tab: 'all',  tag: 'currency exchange' },
];

const QuickAccessSection = memo(({ navigation, shuffleKey }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => shuffle(QUICK_ACCESS_ALL), [shuffleKey]);
  return (
    <View style={ss.section}>
      <View style={ss.sectionHeader}>
        <View style={ss.sectionTitleRow}>
          <View style={ss.sectionAccent} />
          <Text style={ss.sectionTitle}>Quick Access</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {items.map(item => (
          <TouchableOpacity
            key={item.id}
            style={ss.qaChip}
            activeOpacity={0.78}
            onPress={() => navigation.navigate('SearchScreen', { initialTab: item.tab, initialQuery: item.tag })}
          >
            <Text style={{ fontSize: 15 }}>{item.icon}</Text>
            <Text style={ss.qaChipLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Article card — horizontal card with image + content + category tag
// ─────────────────────────────────────────────────────────────────────────────
const ExploreArticleCard = memo(({ item, onPress }) => {
  const hasImg = isRealImage(item.image ?? null);
  const title  = decodeHtml(item.title ?? '');
  const snippet = decodeHtml(item.snippet ?? '');

  return (
    <TouchableOpacity style={ss.articleCard} activeOpacity={0.85} onPress={onPress}>
      {hasImg ? (
        <Image source={{ uri: item.image }} style={ss.articleImg} resizeMode="cover" />
      ) : (
        <View style={[ss.articleImg, ss.imgFallback]}>
          <Ionicons name="newspaper-outline" size={26} color={MUTED} />
        </View>
      )}

      <View style={ss.articleBody}>
        {!!item.category_name && (
          <View style={ss.articleCatBadge}>
            <Text style={ss.articleCatText}>{item.category_name}</Text>
          </View>
        )}
        <Text numberOfLines={2} style={ss.articleTitle}>{title}</Text>
        {!!snippet && (
          <Text numberOfLines={2} style={ss.articleSnippet}>{snippet}</Text>
        )}
      </View>

      <View style={ss.articleArrow}>
        <Ionicons name="chevron-forward" size={16} color={ACCENT} />
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Article grid card — 2-column vertical card
// ─────────────────────────────────────────────────────────────────────────────
const ARTICLE_GRID_GAP = 10;
const ARTICLE_GRID_W   = (SCREEN_W - H_PAD * 2 - SEC_PAD * 2 - ARTICLE_GRID_GAP) / 2;

const ArticleGridCard = memo(({ item, onPress }) => {
  const hasImg  = isRealImage(item.image ?? null);
  const title   = decodeHtml(item.title ?? '');
  const cat     = item.category_name ?? item.category ?? null;

  return (
    <TouchableOpacity style={ag.card} activeOpacity={0.85} onPress={onPress}>
      {hasImg ? (
        <Image source={{ uri: item.image }} style={ag.img} resizeMode="cover" />
      ) : (
        <View style={[ag.img, ag.imgFallback]}>
          <Ionicons name="newspaper-outline" size={28} color={MUTED} />
        </View>
      )}
      <View style={ag.body}>
        {!!cat && (
          <View style={ag.catBadge}>
            <Text style={ag.catText} numberOfLines={1}>{cat}</Text>
          </View>
        )}
        <Text numberOfLines={3} style={ag.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
});

const ag = StyleSheet.create({
  card: {
    width: ARTICLE_GRID_W,
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  img: {
    width: '100%',
    height: 110,
    backgroundColor: BRAND + '0F',
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 10,
    gap: 6,
  },
  catBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT + '1F',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    fontSize: 9,
    fontWeight: '700',
    color: ACCENT,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK,
    lineHeight: 18,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Country selector modal
// ─────────────────────────────────────────────────────────────────────────────
const COUNTRY_ROW_HEIGHT = 52;

const CountryModalRow = memo(({ item, selectedId, onSelect }) => {
  const id = item?.country_id ?? item?.id;
  const name = item?.name ?? item?.country ?? item?.country_name ?? item?.title ?? '';
  const isActive = String(id) === String(selectedId);

  const handlePress = useCallback(() => {
    onSelect({ country_id: id, name });
  }, [id, name, onSelect]);

  return (
    <TouchableOpacity
      style={[ss.countryRow, isActive && ss.countryRowActive]}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <Text style={[ss.countryName, isActive && ss.countryNameActive]}>
        {name}
      </Text>
      {isActive && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
    </TouchableOpacity>
  );
}, (prev, next) => {
  const prevId = prev.item?.country_id ?? prev.item?.id;
  const nextId = next.item?.country_id ?? next.item?.id;
  const prevSelected = String(prevId) === String(prev.selectedId);
  const nextSelected = String(nextId) === String(next.selectedId);
  return prevId === nextId && prevSelected === nextSelected && prev.onSelect === next.onSelect;
});

const CountryModal = memo(({ visible, countries, selected, onSelect, onClose }) => {
  if (!visible) return null;

  const countryData = useMemo(() => [DEFAULT_COUNTRY, ...(countries || [])], [countries]);
  const selectedId = selected?.country_id;

  const keyExtractor = useCallback((item) => String(item?.country_id ?? item?.id ?? item?.name ?? ''), []);

  const renderCountryItem = useCallback(
    ({ item }) => <CountryModalRow item={item} selectedId={selectedId} onSelect={onSelect} />,
    [selectedId, onSelect],
  );

  const getItemLayout = useCallback((_, index) => ({
    length: COUNTRY_ROW_HEIGHT,
    offset: COUNTRY_ROW_HEIGHT * index,
    index,
  }), []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ss.modalOverlay}>
        <View style={ss.modalSheet}>
          <View style={ss.modalHandle} />
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={countryData}
            keyExtractor={keyExtractor}
            renderItem={renderCountryItem}
            getItemLayout={getItemLayout}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </View>
    </Modal>
  );
}, (prev, next) => {
  return (
    prev.visible === next.visible &&
    prev.countries === next.countries &&
    prev.selected?.country_id === next.selected?.country_id &&
    prev.onSelect === next.onSelect &&
    prev.onClose === next.onClose
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Visa & Admission CTA card
// ─────────────────────────────────────────────────────────────────────────────
const VisaCTA = memo(({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={ss.visaWrap}>
    <LinearGradient
      colors={[Colors.primaryDark, BRAND, Colors.primaryDark]}
      style={ss.visaCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={ss.visaCircle1} />
      <View style={ss.visaCircle2} />

      <View style={ss.visaLeft}>
        <View style={ss.visaIconWrap}>
          <Ionicons name="airplane-outline" size={22} color={WHITE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.visaTitle}>Planning to Come to China?</Text>
          <Text style={ss.visaSub}>Visa · Admission · Business Support</Text>
        </View>
      </View>

      <TouchableOpacity style={ss.visaBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={ss.visaBtnText}>Get Assistance</Text>
        <Ionicons name="arrow-forward" size={12} color={BRAND} />
      </TouchableOpacity>
    </LinearGradient>
  </TouchableOpacity>
));

// ─────────────────────────────────────────────────────────────────────────────
// Visa modal popup
// ─────────────────────────────────────────────────────────────────────────────
const WECHAT_ID = 'TheHafrikBrand';
const PHONE_NUM = '+8615524362954';

const VisaModal = memo(({ visible, onClose }) => {
  const handleCall = () => {
    Linking.openURL(`tel:${PHONE_NUM}`).catch(() => {});
  };

  const handleCopyWechat = () => {
    try {
      Clipboard.setString(WECHAT_ID);
    } catch {}
    Alert.alert('Copied!', `WeChat ID: ${WECHAT_ID} has been copied.`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ss.visaModalOverlay}>
        <View style={ss.visaModalSheet}>
          <View style={ss.visaModalHandle} />

          {/* Icon + Title */}
          <View style={ss.visaModalIconWrap}>
            <Ionicons name="airplane" size={28} color={BRAND} />
          </View>
          <Text style={ss.visaModalTitle}>China Visa & Admission Support</Text>
          <Text style={ss.visaModalBody}>
            For visa assistance, student admission, or business visa support, contact us directly.
          </Text>

          {/* Contact rows */}
          <View style={ss.visaContactCard}>
            <View style={ss.visaContactRow}>
              <View style={ss.visaContactIcon}>
                <Ionicons name="logo-wechat" size={18} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.visaContactLabel}>WeChat</Text>
                <Text style={ss.visaContactValue}>{WECHAT_ID}</Text>
              </View>
              <TouchableOpacity style={ss.visaCopyBtn} activeOpacity={0.8} onPress={handleCopyWechat}>
                <Ionicons name="copy-outline" size={14} color={BRAND} />
                <Text style={ss.visaCopyText}>Copy</Text>
              </TouchableOpacity>
            </View>

            <View style={[ss.visaContactRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, marginTop: 0 }]}>
              <View style={ss.visaContactIcon}>
                <Ionicons name="call-outline" size={18} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.visaContactLabel}>Phone / WhatsApp</Text>
                <Text style={ss.visaContactValue}>{PHONE_NUM}</Text>
              </View>
              <TouchableOpacity style={[ss.visaCopyBtn, { backgroundColor: `${ACCENT}18` }]} activeOpacity={0.8} onPress={handleCall}>
                <Ionicons name="call" size={14} color={ACCENT} />
                <Text style={[ss.visaCopyText, { color: ACCENT }]}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Services list */}
          <View style={ss.visaServicesList}>
            {['China Business Visa', 'Student Admission', 'Study in China', 'Visa Extension', 'School Placement'].map((s) => (
              <View key={s} style={ss.visaServiceItem}>
                <Ionicons name="checkmark-circle" size={14} color={ACCENT} />
                <Text style={ss.visaServiceText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* CTA buttons */}
          <TouchableOpacity style={ss.visaCallBtn} activeOpacity={0.88} onPress={handleCall}>
            <Ionicons name="call-outline" size={16} color={WHITE} />
            <Text style={ss.visaCallBtnText}>Call Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={ss.visaCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Text style={ss.visaCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function DiscoveryScreen() {
  const navigation        = useNavigation();
  const isFocused         = useIsFocused();
  const { top }           = useSafeAreaInsets();
  const { token }         = useAuth();
  const notificationCount = useStore((s) => s.notificationCount ?? 0);
  const setSearchQuery    = useStore((s) => s.setSearchQuery);
  const openComposer      = useStore((s) => s.openComposer);
  const openCreateMenu    = useStore((s) => s.openCreateMenu);
  const scrollRef         = useRef(null);

  // Live notification + message counts
  useLiveCounts();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [explorePayload, setExplorePayload] = useState(null);
  const [refreshing,     setRefreshing]     = useState(false);
  const [heroQuery,      setHeroQuery]      = useState('');
  const [hotTopics,      setHotTopics]      = useState(() => pickRandom(TOPIC_POOL, 5));
  const [shuffleKey,     setShuffleKey]     = useState(0);
  const [drawerVisible,   setDrawerVisible]   = useState(false);
  const [visaModalVisible, setVisaModalVisible] = useState(false);

  // ── Country state (used for data fetching, UI trigger removed) ─────────────
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [countries,       setCountries]       = useState([]);

  // ── Real marketplace state ─────────────────────────────────────────────────
  const [marketProducts,  setMarketProducts]  = useState([]);
  const [marketLoading,   setMarketLoading]   = useState(false);
  const marketAbortRef = useRef(null);

  // ── Real articles state ────────────────────────────────────────────────────
  const [articleItems,       setArticleItems]       = useState([]);
  const [articleLoading,     setArticleLoading]     = useState(false);
  const [articlePage,        setArticlePage]        = useState(1);
  const [articleHasMore,     setArticleHasMore]     = useState(true);
  const [articleLoadingMore, setArticleLoadingMore] = useState(false);
  const articleAbortRef = useRef(null);

  // ── Trending articles state ────────────────────────────────────────────────
  const [trendingArticles, setTrendingArticles] = useState([]);
  const trendingAbortRef = useRef(null);

  // ── People state ───────────────────────────────────────────────────────────
  const [people,        setPeople]        = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const peopleAbortRef = useRef(null);

  // ── New users state ─────────────────────────────────────────────────────────
  const [newUsers,        setNewUsers]        = useState([]);
  const [newUsersLoading, setNewUsersLoading] = useState(false);
  const newUsersAbortRef = useRef(null);

  // ── Communities state ───────────────────────────────────────────────────────
  const [communities,        setCommunities]        = useState([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const communitiesAbortRef = useRef(null);

  // ── Ads state ───────────────────────────────────────────────────────────────
  const [exploreAds,        setExploreAds]        = useState([]);
  const exploreAdsAbortRef = useRef(null);

  // -- Trending posts state
  const [trendingPosts, setTrendingPosts] = useState([]);
  const trendingPostsRef = useRef(null);
  const [trendingDisplayKey, setTrendingDisplayKey] = useState(0);
  const [previewPost, setPreviewPost] = useState(null);

  // -- Sponsored businesses state
  const [sponsoredBiz, setSponsoredBiz] = useState([]);
  const sponsoredBizRef = useRef(null);

  // ── CTA ads state (loaded from /api/v1/ads/list.php) ─────────────────────
  const [ctaAds, setCtaAds] = useState([]);
  const ctaAdsAbortRef = useRef(null);

  // -- Reels preview state
  const [reels,            setReels]            = useState([]);
  const [reelsLoading,     setReelsLoading]     = useState(false);
  const [reelsLoadingMore, setReelsLoadingMore] = useState(false);
  const [reelsHasMore,     setReelsHasMore]     = useState(true);
  const reelsAbortRef  = useRef(null);
  const reelsPageRef   = useRef(1);
  const reelsSeedRef   = useRef(Math.floor(Math.random() * 2147483647));

  // ── Explore abort ref (loadExplore needs its own controller) ──────────────
  const exploreAbortRef = useRef(null);

  // ── Left-edge swipe → open drawer ─────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Only capture if the touch starts within 28px of the left edge, moves right
      onMoveShouldSetPanResponder: (_, g) =>
        g.moveX < 28 && g.dx > 12 && Math.abs(g.dy) < g.dx,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 40) setDrawerVisible(true);
      },
    }),
  ).current;

  // ── Load country from AsyncStorage on mount ────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(COUNTRY_KEY).then((raw) => {
      if (raw) {
        try { setSelectedCountry(JSON.parse(raw)); } catch {}
      }
    });
    fetchCountries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCountries = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/location/countries.php`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json = await res.json();
      const list = json?.data ?? json?.countries ?? [];
      if (Array.isArray(list)) setCountries(list);
    } catch {}
  }, [token]);

  // ── Load explore data (people, communities, businesses, events, ads) ────────
  const loadExplore = useCallback(async () => {
    if (exploreAbortRef.current) exploreAbortRef.current.abort();
    const ctrl = new AbortController();
    exploreAbortRef.current = ctrl;
    const timer = addTimeout(ctrl, 8000);
    try {
      const countryParam = selectedCountry.country_id !== 'all'
        ? { country_id: selectedCountry.country_id }
        : {};
      const res = await exploreApiFetch(EXPLORE_URL, token, countryParam, ctrl.signal);
      setExplorePayload(res?.data ?? null);
    } catch {
      // timeout or network error — leave existing payload in place
    } finally {
      clearTimeout(timer);
    }
  }, [token, selectedCountry.country_id]);

  const loadMarketplace = useCallback(async () => {
    if (marketAbortRef.current) marketAbortRef.current.abort();
    const ctrl = new AbortController();
    marketAbortRef.current = ctrl;
    setMarketLoading(true);
    const timer = addTimeout(ctrl, 8000);
    try {
      // Fetch more than we need so manual local shuffle has enough variance
      const url = `${MARKETPLACE_URL}?page=1&limit=${MARKETPLACE_LIMIT * 2}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      // Handle every possible response shape the API might return
      const raw = json?.data?.products ?? json?.products ?? json?.data ?? [];
      const products = Array.isArray(raw) ? raw : [];
      // Keep API order here; local shuffle button handles reordering
      setMarketProducts(products.slice(0, MARKETPLACE_LIMIT));
    } catch (e) {
      if (e?.name !== 'AbortError') setMarketProducts([]);
    } finally {
      clearTimeout(timer);
      setMarketLoading(false);
    }
  }, [token]);
  

  // ── Load articles via real endpoint ────────────────────────────────────────
  const loadArticles = useCallback(async (pageNum = 1, append = false) => {
    if (articleAbortRef.current) articleAbortRef.current.abort();
    const ctrl = new AbortController();
    articleAbortRef.current = ctrl;
    if (append) setArticleLoadingMore(true); else setArticleLoading(true);
    const timer = addTimeout(ctrl, 8000);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/articles/list.php?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const list = Array.isArray(json?.data?.data ?? json?.data ?? json?.articles ?? [])
        ? (json?.data?.data ?? json?.data ?? json?.articles ?? [])
        : [];
      if (append) setArticleItems((p) => [...p, ...list]); else setArticleItems(list);
      setArticleHasMore(list.length >= 10);
      setArticlePage(pageNum);
    } catch (e) {
      if (e.name !== 'AbortError' && !append) setArticleItems([]);
    } finally {
      clearTimeout(timer);
      if (append) setArticleLoadingMore(false); else setArticleLoading(false);
    }
  }, [token]);

  // ── Load trending articles (Popular This Week) ─────────────────────────────
  const loadTrendingArticles = useCallback(async () => {
    if (trendingAbortRef.current) trendingAbortRef.current.abort();
    const ctrl = new AbortController();
    trendingAbortRef.current = ctrl;
    const timer = addTimeout(ctrl, 8000);
    try {
      const items = await fetchTrendingArticles(5, ctrl.signal);
      setTrendingArticles(Array.isArray(items) ? items : []);
    } catch {
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // ── Load people from dedicated endpoint ────────────────────────────────────
  const loadPeople = useCallback(async () => {
    if (!token) return;
    if (peopleAbortRef.current) peopleAbortRef.current.abort();
    const ctrl = new AbortController();
    peopleAbortRef.current = ctrl;
    setPeopleLoading(true);
    const timer = addTimeout(ctrl, 8000);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/people/list.php?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Response shape: { status, data: { data: [...users] } } or { data: [...users] }
      const list = json?.data?.data ?? json?.data ?? [];
      setPeople(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setPeople([]);
      }
    } finally {
      clearTimeout(timer);
      setPeopleLoading(false);
    }
  }, [token]);

  // ── Load new users from dedicated endpoint ──────────────────────────────────
  const loadNewUsers = useCallback(async () => {
    if (!token) return;
    if (newUsersAbortRef.current) newUsersAbortRef.current.abort();
    const ctrl = new AbortController();
    newUsersAbortRef.current = ctrl;
    setNewUsersLoading(true);
    const timer = addTimeout(ctrl, 8000);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/people/new_user.php?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      setNewUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e?.name !== 'AbortError') setNewUsers([]);
    } finally {
      clearTimeout(timer);
      setNewUsersLoading(false);
    }
  }, [token]);

  // ── Load communities from dedicated endpoint ────────────────────────────────
  const loadCommunities = useCallback(async () => {
    if (!token) return;
    if (communitiesAbortRef.current) communitiesAbortRef.current.abort();
    const ctrl = new AbortController();
    communitiesAbortRef.current = ctrl;
    setCommunitiesLoading(true);
    const timer = addTimeout(ctrl, 8000);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/communities/list.php?limit=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data?.communities ?? json?.data?.groups ?? json?.data ?? [];
      setCommunities(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e?.name !== 'AbortError') setCommunities([]);
    } finally {
      clearTimeout(timer);
      setCommunitiesLoading(false);
    }
  }, [token]);

  // ── Load explore ads from dedicated endpoint ────────────────────────────────
  const loadExploreAds = useCallback(async () => {
    if (!token) return;
    if (exploreAdsAbortRef.current) exploreAdsAbortRef.current.abort();
    const ctrl = new AbortController();
    exploreAdsAbortRef.current = ctrl;
    const timer = addTimeout(ctrl, 8000);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/ads/list.php`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const raw  = json?.data?.data ?? json?.data ?? json?.ads ?? [];
      setExploreAds(Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []));
    } catch (e) {
      if (e?.name !== 'AbortError') setExploreAds([]);
    } finally {
      clearTimeout(timer);
    }
  }, [token]);

  // -- Load trending posts (up to 5) ─────────────────────────────────────────
  const loadTrendingPosts = useCallback(async () => {
    if (trendingPostsRef.current) trendingPostsRef.current.abort();
    const ctrl = new AbortController();
    trendingPostsRef.current = ctrl;
    const timer = addTimeout(ctrl, 8000);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/feed/list.php?get=popular&limit=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      setTrendingPosts(Array.isArray(list) ? list.slice(0, 5) : []);
    } catch (e) {
      if (e?.name !== 'AbortError') setTrendingPosts([]);
    } finally {
      clearTimeout(timer);
    }
  }, [token]);

  // -- Load sponsored/trending businesses ────────────────────────────────────
  const loadSponsoredBiz = useCallback(async () => {
    if (sponsoredBizRef.current) sponsoredBizRef.current.abort();
    const ctrl = new AbortController();
    sponsoredBizRef.current = ctrl;
    const timer = addTimeout(ctrl, 8000);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/business/list.php?limit=5&sponsored=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const list = json?.data?.businesses || json?.data?.pages || json?.data?.data || json?.data || [];
      setSponsoredBiz(Array.isArray(list) ? list.slice(0, 3) : []);
    } catch (e) {
      if (e?.name !== 'AbortError') setSponsoredBiz([]);
    } finally {
      clearTimeout(timer);
    }
  }, [token]);

  // ── Load CTA ads ────────────────────────────────────────────────────────────
  const loadCtaAds = useCallback(async () => {
    if (ctaAdsAbortRef.current) ctaAdsAbortRef.current.abort();
    const ctrl = new AbortController();
    ctaAdsAbortRef.current = ctrl;
    const timer = addTimeout(ctrl, 8000);
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/ads/list.php`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const raw  = json?.data?.data ?? json?.data ?? json?.ads ?? [];
      // API may return a single-object or an array — normalise to array
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
      setCtaAds(list);
    } catch (e) {
      if (e?.name !== 'AbortError') setCtaAds([]);
    } finally {
      clearTimeout(timer);
    }
  }, [token]);

  // -- Load reels for preview grid ───────────────────────────────────────────
  const loadReels = useCallback(async (append = false) => {
    if (reelsAbortRef.current) reelsAbortRef.current.abort();
    const ctrl = new AbortController();
    reelsAbortRef.current = ctrl;
    if (append) {
      setReelsLoadingMore(true);
    } else {
      setReelsLoading(true);
      reelsPageRef.current = 1;
      reelsSeedRef.current = Math.floor(Math.random() * 2147483647);
    }
    const page = append ? reelsPageRef.current + 1 : 1;
    const timer = addTimeout(ctrl, 8000);
    try {
      const reelsUrl = `${BASE_URL}/api/v1/reels/list.php?page=${page}&limit=6&mode=for_you&seed=${reelsSeedRef.current}`;
      console.log('[REELS] fetching:', reelsUrl);
      const res = await fetch(reelsUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: ctrl.signal,
      });
      console.log('[REELS] http status:', res.status);
      const json = await res.json();
      console.log('[REELS] raw json keys:', Object.keys(json || {}));
      console.log('[REELS] json.status:', json?.status, '| json.data type:', typeof json?.data);
      console.log('[REELS] json.data keys:', Object.keys(json?.data || {}));
      console.log('[REELS] json.data full:', JSON.stringify(json?.data));
      const list = json?.data?.reels ?? json?.data?.posts ?? json?.data?.data ?? json?.data ?? json?.reels ?? json?.posts ?? [];
      const fresh = Array.isArray(list) ? list : [];
      console.log('[REELS] fresh count:', fresh.length, '| first item id:', fresh[0]?.id ?? fresh[0]?.post_id);
      if (fresh.length === 0) {
        setReelsHasMore(false);
      } else {
        reelsPageRef.current = page;
        if (append) {
          setReels(prev => {
            const existing = new Set(prev.map(r => String(r.id ?? r.post_id)));
            const newItems = fresh.filter(r => !existing.has(String(r.id ?? r.post_id)));
            return [...prev, ...newItems];
          });
        } else {
          setReels(shuffle(fresh));
          setReelsHasMore(true);
        }
      }
    } catch (e) {
      console.log('[REELS] error:', e?.name, e?.message);
      if (e?.name !== 'AbortError' && !append) setReels([]);
    } finally {
      clearTimeout(timer);
      setReelsLoading(false);
      setReelsLoadingMore(false);
    }
  }, [token]);

  const handleLoadMoreReels = useCallback(() => {
    if (reelsLoadingMore || !reelsHasMore) return;
    loadReels(true);
  }, [loadReels, reelsLoadingMore, reelsHasMore]);

  const handleReelPress = useCallback((index) => {
    // Normalize media from reels API (object) format — already correct,
    // but ensure consistency for Reels2 viewer
    navigation.navigate('Reels2', {
      initialReels: reels,
      startIndex: index,
      initialReelId: reels[index]?.id,
    });
  }, [reels, navigation]);

    // ── Follow toggle with optimistic update ────────────────────────────────────
  const toggleFollowPerson = useCallback(async (userId) => {
    setPeople(prev => prev.map(p =>
      (p.id ?? p.user_id) === userId
        ? {
            ...p,
            is_follow: !p.is_follow,
            followers_count: Math.max(0, (p.followers_count ?? 0) + (p.is_follow ? -1 : 1)),
          }
        : p
    ));
    try {
      await fetch(`${BASE_URL}/api/v1/users/follow.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
    } catch {}
  }, [token]);

  // ── Manual local shuffle only (no API call) ───────────────────────────────
  const shuffleExplore = useCallback(() => {
    setHotTopics(pickRandom(TOPIC_POOL, 5));
    setShuffleKey((k) => k + 1);
    setTrendingDisplayKey((k) => k + 1);
  }, []);

  // ── Full API refresh only (no shuffle) ────────────────────────────────────
  const refreshExplore = useCallback(async ({ scrollToTop = false, showSpinner = true } = {}) => {
    if (showSpinner) setRefreshing(true);

    if (scrollToTop) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo?.({ y: 0, animated: true });
      });
    }

    try {
      await Promise.all([
        loadExplore(),
        loadTrendingPosts(),
        loadSponsoredBiz(),
        loadArticles(1, false),
        loadTrendingArticles(),
        loadPeople(),
        loadNewUsers(),
        loadCommunities(),
        loadExploreAds(),
        loadReels(),
        loadMarketplace(),
        loadCtaAds(),
      ]);
    } catch {
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, [
    loadExplore,
    loadTrendingPosts,
    loadSponsoredBiz,
    loadArticles,
    loadTrendingArticles,
    loadPeople,
    loadNewUsers,
    loadCommunities,
    loadExploreAds,
    loadReels,
    loadMarketplace,
    loadCtaAds,
  ]);

  // First mount load only
  useEffect(() => {
    refreshExplore({ scrollToTop: false, showSpinner: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual refresh whenever Explore tab is tapped
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      refreshExplore({ scrollToTop: true, showSpinner: false });
    });
    return unsubscribe;
  }, [navigation, refreshExplore]);

  // ── Country select ─────────────────────────────────────────────────────────
  const handleSelectCountry = useCallback(async (country) => {
    setSelectedCountry(country);
    await AsyncStorage.setItem(COUNTRY_KEY, JSON.stringify(country));
    await refreshExplore({ scrollToTop: true, showSpinner: true });
  }, [refreshExplore]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    await refreshExplore({ scrollToTop: false, showSpinner: true });
  }, [refreshExplore]);


  // ── Raw explore data ───────────────────────────────────────────────────────
  const counts          = explorePayload?.counts          ?? {};
  const suggestedGroups = explorePayload?.trending_groups ?? explorePayload?.groups   ?? [];
  const suggestedPages  = explorePayload?.trending_pages  ?? explorePayload?.pages    ?? [];
  const events          = explorePayload?.events          ?? [];
  const rawAds          = explorePayload?.ads             ?? explorePayload?.banners   ?? explorePayload?.announcements ?? [];

  // ── Shuffled & sliced (re-runs when shuffleKey changes) ───────────────────
  /* eslint-disable react-hooks/exhaustive-deps */
  const hotCommunities  = useMemo(() => shuffle(suggestedGroups).slice(0, 3), [suggestedGroups, shuffleKey]);
  const hotEvents       = useMemo(() => shuffle(events).slice(0, 8),           [events,          shuffleKey]);
  const ads             = useMemo(() => shuffle(rawAds),                        [rawAds,          shuffleKey]);
  const displayTrending = useMemo(() => trendingPosts.slice(0, 5),             [trendingPosts]); // eslint-disable-line

  const businessesInChina = useMemo(() => {
    const arr   = shuffle(suggestedPages);
    const china = arr.filter((p) => {
      const c = String(p?.country ?? p?.location ?? p?.user_country ?? '').toLowerCase();
      return c.includes('china') || c.includes('cn');
    });
    return (china.length ? china : arr).slice(0, 5);
  }, [suggestedPages, shuffleKey]);

  // Marketplace: shuffle client-side after every fetch or reshuffle
  const displayProducts = useMemo(
    () => [...marketProducts].sort(() => Math.random() - 0.5).slice(0, MARKETPLACE_LIMIT),
    [marketProducts, shuffleKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Community highlights — additional communities beyond the first 3 shown
  const communityHighlights = useMemo(() => shuffle(suggestedGroups).slice(3, 8), [suggestedGroups, shuffleKey]); // eslint-disable-line
  /* eslint-enable react-hooks/exhaustive-deps */

  // Popular This Week — 3 shuffled trending articles
  const popularThisWeek = useMemo(() => shuffle(trendingArticles).slice(0, 2), [trendingArticles, shuffleKey]); // eslint-disable-line

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goSearchScreen = useCallback((query) => {
    const q = String(query ?? '').trim();
    try { setSearchQuery?.(q); } catch {}
    navigation.navigate('SearchScreen', { initialQuery: q });
  }, [navigation, setSearchQuery]);

  const handleHeroSubmit = useCallback(() => {
    goSearchScreen(heroQuery);
    setHeroQuery('');
  }, [heroQuery, goSearchScreen]);

  const openInBrowser = useCallback((url, title = 'Hafrik') => {
    navigation.navigate('InAppBrowser', { url, title });
  }, [navigation]);

  const handleAdPress = useCallback((ad) => {
    const url  = ad?.link ?? ad?.url ?? ad?.external_url;
    const name = decodeHtml(ad?.title ?? 'Hafrik');
    if (url) openInBrowser(url, name);
  }, [openInBrowser]);

  const goToPopularFeedTab = useCallback(() => {
    try {
      navigation.navigate('Feed', { initialTabKey: 'trending' });
      return;
    } catch {}
    navigation.navigate('MainTabs', {
      screen: 'Feed',
      params: { initialTabKey: 'trending' },
    });
  }, [navigation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sections data for FlatList (virtualized rendering)
  // ─────────────────────────────────────────────────────────────────────────
  const flatListData = useMemo(() => {
    const items = [];
    // 1. Trending Now
    if (trendingPosts.length > 0)
      items.push({ id: 'trending', type: 'trending' });
    // 2. Reels (horizontal scroll, max 4)
    if (reels.length > 0 || reelsLoading)
      items.push({ id: 'reels', type: 'reels' });
    // 3. Browse Categories
    items.push({ id: 'categories_grid', type: 'categories_grid' });
    // 4. Hot Topics (search suggestion pills)
    items.push({ id: 'hot_topics', type: 'hot_topics' });
    // 4. People You May Know
    const realPeople = Array.isArray(people) && people.filter(p => isRealImage(p?.avatar ?? p?.image ?? p?.thumbnail) && !p.is_follow).length > 0;
    if (realPeople || peopleLoading)
      items.push({ id: 'people', type: 'people' });
    // 5. Suggested Communities
    if (communities.length > 0 || communitiesLoading)
      items.push({ id: 'community_highlights', type: 'community_highlights' });
    // 6. Verified Businesses Near You
    items.push({ id: 'featured_business', type: 'featured_business' });
    // 7. New Users
    if (newUsers.length > 0 || newUsersLoading)
      items.push({ id: 'new_users', type: 'new_users' });
    // 8. Articles
    if (articleItems.length > 0 || articleLoading)
      items.push({ id: 'articles', type: 'articles' });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendingPosts.length, reels.length, reelsLoading, people, peopleLoading, communities.length, communitiesLoading, newUsers.length, newUsersLoading, articleItems.length, articleLoading]);

  const renderSection = useCallback(({ item }) => {
    switch (item.type) {

      case 'trending':
        return (
          <View style={ss.section}>
            <View style={ss.sectionHeader}>
              <View style={ss.sectionTitleRow}>
                <View style={ss.sectionAccent} />
                <Text style={ss.sectionTitle}>🔥 Trending Now</Text>
                <View style={[ss.trendingBadge, { marginLeft: 8 }]}>
                  <View style={ss.liveDot} />
                  <Text style={ss.trendingBadgeTxt}>LIVE</Text>
                </View>
              </View>
            </View>
            <Text style={ss.sectionSubtitle}>What the community is talking about</Text>
            <View style={{ gap: 7 }}>
              {displayTrending.map((post, i) => (
                <RankedTrendingCard
                  key={post.id ?? post.post_id ?? `tp-${i}`}
                  item={post}
                  rank={i + 1}
                  rankDelta={RANK_DELTAS[i] ?? 0}
                  onPress={() => {
                    const id = post?.id ?? post?.post_id;
                    if (!id) return;
                    const pt = String(post?.type || '').toLowerCase();
                    if (pt === 'reel' || pt === 'video') {
                      navigation.navigate('Reels2', { initialReels: [post], startIndex: 0, initialReelId: id });
                    } else {
                      navigation.navigate('PostDetail', { postId: id });
                    }
                  }}
                />
              ))}
            </View>
            <HotArticlesSection articles={popularThisWeek} navigation={navigation} />
            <TouchableOpacity style={ss.viewMoreBtn} activeOpacity={0.85} onPress={goToPopularFeedTab}>
              <Ionicons name="flame-outline" size={14} color={ACCENT} />
              <Text style={ss.viewMoreText}>View All Trending Posts</Text>
              <Ionicons name="arrow-forward" size={14} color={ACCENT} />
            </TouchableOpacity>
          </View>
        );

      case 'ads_banner':
        return <AdsBanner ads={ads} onPress={handleAdPress} />;

      case 'featured_business':
        return <FeaturedBusinessSection navigation={navigation} token={token} shuffleKey={shuffleKey} />;

      case 'categories_grid':
        return (
          <View style={ss.section}>
            <View style={ss.sectionHeader}>
              <View style={ss.sectionTitleRow}>
                <View style={ss.sectionAccent} />
                <Text style={ss.sectionTitle}>📂 Browse Categories</Text>
              </View>
            </View>
            <Text style={ss.sectionSubtitle}>Tap any category to explore related posts</Text>
            <CategoriesGrid />
          </View>
        );

      case 'hot_topics':
        return (
          <View style={ss.section}>
            <View style={ss.hotHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={ss.hotTitle}>🔥 Hot Topics</Text>
                <View style={ss.hotBadge}><Text style={ss.hotBadgeTxt}>{hotTopics.length}</Text></View>
              </View>
              <TouchableOpacity
                style={ss.shuffleBtn}
                activeOpacity={0.75}
                onPress={() => setHotTopics(pickRandom(TOPIC_POOL, 5))}
              >
                <Ionicons name="shuffle" size={17} color={BRAND} />
              </TouchableOpacity>
            </View>
            <Text style={ss.hotSub}>Tap any tag to search posts instantly</Text>
            <View style={ss.hotTopicsWrap}>
              {hotTopics.map((t, i) => {
                const palettes = [
                  { bg: BRAND, text: WHITE, border: BRAND },
                  { bg: ACCENT, text: DARK, border: ACCENT },
                  { bg: Colors.warning + '1A', text: Colors.warning, border: Colors.warning },
                  { bg: BRAND + '12', text: BRAND, border: BRAND + '66' },
                  { bg: ACCENT + '1A', text: ACCENT, border: ACCENT },
                  { bg: ACCENT + '1F', text: BRAND, border: ACCENT },
                ];
                const pal = palettes[i % palettes.length];
                return (
                  <TouchableOpacity
                    key={`${t}-${i}`}
                    onPress={() => {
                      navigation.navigate('SearchScreen', { initialQuery: t, initialTab: 'posts' });
                    }}
                    activeOpacity={0.78}
                    style={[ss.topicPill, { backgroundColor: pal.bg, borderColor: pal.border }]}
                  >
                    <Text style={[ss.topicHashtag, { color: pal.text, opacity: 0.6 }]}>#</Text>
                    <Text style={[ss.topicPillText, { color: pal.text }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'people':
        return (
          <View style={ss.section}>
            <SectionHeader title="People You May Know" onSeeAll={() => navigation.navigate('PeopleYouMayKnow')} />
            <Text style={ss.sectionSubtitle}>Connect with people you might know</Text>
            {peopleLoading && people.length === 0 ? (
              <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                {people.filter(p => isRealImage(p?.avatar ?? p?.image ?? p?.thumbnail) && !p.is_follow).map((p, i) => (
                  <PersonHCard
                    key={`person-${p.id ?? p.user_id ?? i}`}
                    item={p}
                    onPress={() => navigation.navigate('UserProfile', { userId: p.id ?? p.user_id })}
                    onFollow={() => toggleFollowPerson(p.id ?? p.user_id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 'quick_access':
        return <QuickAccessSection navigation={navigation} shuffleKey={shuffleKey} />;

      case 'reels':
        return (
          <View style={ss.section}>
            <View style={ss.sectionHeader}>
              <View style={ss.sectionTitleRow}>
                <View style={ss.sectionAccent} />
                <Text style={ss.sectionTitle}>🎬 Reels</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Reels')} activeOpacity={0.8} style={ss.seeAllBtn}>
                <Text style={ss.seeAllText}>See More</Text>
                <Ionicons name="chevron-forward" size={14} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <Text style={ss.sectionSubtitle}>Short videos from your community</Text>
            {reelsLoading && reels.length === 0 ? (
              <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {reels.slice(0, 4).map((r, i) => (
                  <ReelGridCard key={r.id ?? `reel-${i}`} item={r} onPress={() => handleReelPress(i)} />
                ))}
                <TouchableOpacity
                  style={ss.reelSeeMoreCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Reels')}
                >
                  <Ionicons name="play-circle-outline" size={28} color={WHITE + 'CC'} />
                  <Text style={ss.reelSeeMoreText}>See{'\n'}More</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        );

      case 'new_users':
        return (
          <View style={ss.section}>
            <SectionHeader title="New on Hafrik" onSeeAll={() => navigation.navigate('PeopleYouMayKnow')} />
            <Text style={ss.sectionSubtitle}>Recently joined members you might like</Text>
            {newUsersLoading && newUsers.length === 0 ? (
              <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                {newUsers.filter(p => !p.is_follow).map((p, i) => (
                  <PersonHCard
                    key={`newuser-${p.id ?? p.user_id ?? i}`}
                    item={p}
                    onPress={() => navigation.navigate('UserProfile', { userId: p.id ?? p.user_id })}
                    onFollow={() => toggleFollowPerson(p.id ?? p.user_id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 'ad_cta':
        return ctaAds[item.adIndex] ? <InlineAdCard ad={ctaAds[item.adIndex]} onPress={handleAdPress} /> : null;

      case 'events':
        return (
          <View style={ss.section}>
            <SectionHeader title="Events This Week" onSeeAll={() => navigation.navigate('Events')} />
            <Text style={ss.sectionSubtitle}>Don't miss what's happening near you</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
              {hotEvents.map((ev, i) => {
                const title = decodeHtml(ev.title ?? ev.name ?? 'Event');
                const cover = ev.cover ?? ev.banner ?? ev.image ?? null;
                const loc   = ev.location ?? ev.venue ?? '';
                const date  = ev.start_date ?? ev.date ?? '';
                return (
                  <TouchableOpacity
                    key={ev.id ?? `ev-${i}`}
                    style={ss.eventCard}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('EventDetails', { eventId: ev.id })}
                  >
                    {isRealImage(cover) ? (
                      <Image source={{ uri: cover }} style={ss.eventCover} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={[BRAND, Colors.primaryDark]} style={[ss.eventCover, { alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="calendar" size={24} color={WHITE} />
                      </LinearGradient>
                    )}
                    <View style={ss.eventBody}>
                      <Text numberOfLines={2} style={ss.eventTitle}>{title}</Text>
                      {!!date && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="calendar-outline" size={11} color={ACCENT} />
                          <Text numberOfLines={1} style={ss.eventMeta}>{date}</Text>
                        </View>
                      )}
                      {!!loc && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="location-outline" size={11} color={MUTED} />
                          <Text numberOfLines={1} style={ss.eventMeta}>{loc}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 'community_highlights':
        return (
          <View style={ss.section}>
            <SectionHeader title="Suggested Communities" onSeeAll={() => navigation.navigate('GroupScreen')} />
            <Text style={ss.sectionSubtitle}>Join communities that match your interests</Text>
            {communitiesLoading && communities.length === 0 ? (
              <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
            ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
              {communities.map((g, i) => {
                const avatar  = g.avatar ?? g.image ?? null;
                const name    = decodeHtml(g.title ?? g.name ?? 'Community');
                const members = (g.members_count ?? g.members ?? 0).toLocaleString();
                return (
                  <TouchableOpacity
                    key={g.id ?? `ch-${i}`}
                    style={ss.commHCard}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('GroupDetails', { groupId: g.id })}
                  >
                    {isRealImage(avatar)
                      ? <Image source={{ uri: avatar }} style={ss.commHAvatar} resizeMode="cover" />
                      : <LinearGradient colors={[BRAND, Colors.primaryDark]} style={[ss.commHAvatar, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="people" size={18} color={WHITE} />
                        </LinearGradient>
                    }
                    <Text numberOfLines={1} style={ss.commHName}>{name}</Text>
                    <Text style={ss.commHSub}>{members} members</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            )}
          </View>
        );

      case 'guides':
        return (
          <View style={[ss.section, { marginBottom: 12 }]}>
            <SectionHeader title="Guides & Tips" onSeeAll={() => navigation.navigate('ArticlesScreen')} />
            {articleLoading && articleItems.length === 0 ? (
              <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
            ) : (
              <View style={{ gap: 10 }}>
                {articleItems.map((a, idx) => (
                  <React.Fragment key={String(a.id ?? a.post_id)}>
                    <ExploreArticleCard
                      item={a}
                      onPress={() => navigation.navigate('ArticleDetails', { postId: a.post_id ?? a.id })}
                    />
                    {(idx + 1) % 4 === 0 && ads.length > 0 && (
                      <AdsBanner ads={ads} onPress={handleAdPress} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            )}
            {articleHasMore && (
              <TouchableOpacity
                style={[ss.viewMoreBtn, { marginTop: 8 }]}
                activeOpacity={0.85}
                onPress={() => { if (!articleLoadingMore && !articleLoading) loadArticles(articlePage + 1, true); }}
              >
                {articleLoadingMore
                  ? <ActivityIndicator size="small" color={ACCENT} />
                  : <>
                      <Ionicons name="chevron-down" size={14} color={ACCENT} />
                      <Text style={ss.viewMoreText}>Load More Articles</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        );

      case 'articles':
        return (
          <View style={[ss.section, { marginBottom: 12 }]}>
            <SectionHeader title="Articles & Guides" onSeeAll={() => navigation.navigate('ArticlesScreen')} />
            <Text style={ss.sectionSubtitle}>Read the latest tips, stories and guides</Text>
            {articleLoading && articleItems.length === 0 ? (
              <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
            ) : (
              <View style={{ gap: 8 }}>
                {articleItems.map((a) => (
                  <ExploreArticleCard
                    key={String(a.id ?? a.post_id)}
                    item={a}
                    onPress={() => navigation.navigate('ArticleDetails', { postId: a.post_id ?? a.id })}
                  />
                ))}
              </View>
            )}
            {articleHasMore && (
              <TouchableOpacity
                style={ss.viewMoreBtn}
                activeOpacity={0.85}
                onPress={() => { if (!articleLoadingMore && !articleLoading) loadArticles(articlePage + 1, true); }}
              >
                {articleLoadingMore
                  ? <ActivityIndicator size="small" color={ACCENT} />
                  : <>
                      <Ionicons name="chevron-down" size={14} color={ACCENT} />
                      <Text style={ss.viewMoreText}>Load More Articles</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTrending, people, peopleLoading, reels, reelsLoading, communities, communitiesLoading, newUsers, newUsersLoading, articleItems, articleLoading, articleHasMore, articleLoadingMore, articlePage, navigation, token, shuffleKey, hotTopics]);

  const listHeader = (
    <>
      {/* ── HERO — blends seamlessly with the header above ── */}
      <View style={ss.hero}>
        {/* Label */}
        <View style={ss.heroLabelRow}>
          <View style={ss.heroLabelDot} />
          <Text style={ss.heroLabel}>HAFRIK DISCOVER</Text>
        </View>

        {/* Title */}
        <Text style={ss.heroTitle}>Discover people, ideas, and opportunities.</Text>

        {/* Subtitle */}
        <Text style={ss.heroSub}>
          Search communities, businesses, jobs, events, guides.
        </Text>

        {/* Search bar */}
        <View style={ss.heroSearch}>
          <Ionicons name="search" size={19} color={WHITE + 'BF'} />
          <TextInput
            value={heroQuery}
            onChangeText={setHeroQuery}
            placeholder="Search anything on Hafrik…"
            placeholderTextColor={WHITE + '70'}
            style={ss.heroInput}
            returnKeyType="search"
            onSubmitEditing={handleHeroSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={ACCENT}
          />
          <TouchableOpacity activeOpacity={0.85} onPress={handleHeroSubmit} style={ss.heroSearchBtn}>
            <Ionicons name="arrow-forward" size={17} color={BRAND} />
          </TouchableOpacity>
        </View>

        {/* Stats chips */}
        <View style={ss.heroChips}>
          {counts?.communities != null && (
            <View style={ss.heroChip}>
              <Ionicons name="people-outline" size={11} color={WHITE + 'CC'} />
              <Text style={ss.heroChipText}>{counts.communities} Communities</Text>
            </View>
          )}
          {suggestedPages.length > 0 && (
            <View style={ss.heroChip}>
              <Ionicons name="storefront-outline" size={11} color={WHITE + 'CC'} />
              <Text style={ss.heroChipText}>{suggestedPages.length} Businesses</Text>
            </View>
          )}
          {articleItems.length > 0 && (
            <View style={ss.heroChip}>
              <Ionicons name="newspaper-outline" size={11} color={WHITE + 'CC'} />
              <Text style={ss.heroChipText}>{articleItems.length} Articles</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── QUICK LINKS ── */}
      <StaticShortcutRow />
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Left-edge swipe zone (28px wide, invisible) ── */}
      <View
        {...panResponder.panHandlers}
        style={ss.swipeZone}
        pointerEvents="box-only"
      />

      {/* ════════════════════════════════════════════════════════════════════
          FIXED HEADER — always visible, outside scroll
          ════════════════════════════════════════════════════════════════════ */}
      <View style={[ss.header, { paddingTop: top + 6, backgroundColor: HERO_COLOR }]}>
        <View style={ss.headerInner}>
          {/* Hamburger — opens DrawerNavigation */}
          <TouchableOpacity
            style={ss.iconBtn}
            activeOpacity={0.85}
            onPress={() => setDrawerVisible(true)}
          >
            <Ionicons name="menu-outline" size={22} color={WHITE} />
          </TouchableOpacity>

          {/* CENTER — logo */}
          <View style={ss.headerCenter} pointerEvents="none">
            <Image
              source={require('../../assl.js/Layer 3.png')}
              style={ss.headerLogo}
              resizeMode="contain"
            />
          </View>

          <View style={ss.headerRight}>
            {/* Notifications */}
            <TouchableOpacity
              style={ss.iconBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name={notificationCount > 0 ? 'notifications' : 'notifications-outline'} size={22} color={WHITE} />
              {notificationCount > 0 && (
                <View style={ss.badge}>
                  <Text style={ss.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT (FlatList for virtualized section rendering)
          ════════════════════════════════════════════════════════════════════ */}
      <FlatList
        ref={scrollRef}
        data={flatListData}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        contentContainerStyle={ss.body}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* Post preview bottom sheet (modal — stays outside FlatList) */}
      <PostPreviewSheet
        visible={!!previewPost}
        post={previewPost}
        onClose={() => setPreviewPost(null)}
        onViewFull={() => {
          const id = previewPost?.id ?? previewPost?.post_id;
          const pt = String(previewPost?.type || '').toLowerCase();
          setPreviewPost(null);
          if (pt === 'reel' || pt === 'video') {
            navigation.navigate('Reels2', { initialReels: [previewPost], startIndex: 0, initialReelId: id });
          } else {
            navigation.navigate('PostDetail', { postId: id });
          }
        }}
      />


      {/* Visa modal */}
      <VisaModal
        visible={visaModalVisible}
        onClose={() => setVisaModalVisible(false)}
      />

      {/* Drawer navigation */}
      <DrawerNavigation
        isVisible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />

      {/* FAB — opens composer immediately */}
      <TouchableOpacity
        style={ss.fab}
        activeOpacity={0.88}
        onPress={() => openComposer()}
      >
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="add" size={28} color={WHITE} />
      </TouchableOpacity>

      {isFocused && <PostComposerModal />}
      <CreateMenuSheet />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:   { flex: 1, backgroundColor: CREAM },
  scroll: { flex: 1 },

  // ── FAB ──────────────────────────────────────────────────────────────────
  // ── Trending badge ────────────────────────────────────────────────────────
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '1A',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
  },
  trendingBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.warning,
    letterSpacing: 1,
  },

  // ── Section subtitle ─────────────────────────────────────────────────────
  sectionSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 16,
  },

  // ── View More button ─────────────────────────────────────────────────────
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: `${ACCENT}14`,
    borderWidth: 1,
    borderColor: `${ACCENT}2A`,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: ACCENT,
  },

  // ── Reel grid ─────────────────────────────────────────────────────────────
  reelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: REEL_GAP,
  },
  reelSeeMoreCard: {
    width: 80, height: REEL_H_W * 1.6,
    borderRadius: 8, overflow: 'hidden',
    backgroundColor: BRAND + 'CC',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  reelSeeMoreText: {
    fontSize: 11, fontWeight: '800', color: WHITE + 'CC', textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 100,
  },

  // ── Fixed header ─────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    elevation: 0,
  },
  headerInner:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  headerLogo:    { height: 30, width: 120 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: WHITE + '21',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: BRAND,
  },
  badgeText:  { color: WHITE, fontSize: 9, fontWeight: '900' },
  countryDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: HERO_COLOR,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  heroLabelDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: ACCENT },
  heroLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: WHITE + 'BB' },
  heroTitle: {
    fontSize: 27, fontWeight: '900', color: WHITE, lineHeight: 34,
  },
  heroSub: {
    marginTop: 6, fontSize: 13, lineHeight: 18, color: WHITE + '99',
  },
  heroSearch: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE + '15',
    borderRadius: 999, borderWidth: 1, borderColor: WHITE + '28',
    paddingHorizontal: 18, paddingRight: 10, height: 52,
  },
  heroSearchBtn: {
    width: 36, height: 36, borderRadius: 999,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
  },
  heroInput: { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 0 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: WHITE + '12', borderWidth: 1, borderColor: WHITE + '1E',
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999,
  },
  heroChipText: { fontSize: 11, fontWeight: '600', color: WHITE + 'C0' },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: { paddingTop: 0, paddingBottom: 100 },

  // ── Generic section ────────────────────────────────────────────────────────
  section: {
    backgroundColor: WHITE, borderRadius: 22, padding: 12, marginTop: 14, marginHorizontal: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:   { width: 4, height: 18, borderRadius: 3, backgroundColor: ACCENT },
  sectionTitle:    { fontSize: 16, fontWeight: '900', color: DARK },
  seeAllBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText:      { fontSize: 12, fontWeight: '800', color: ACCENT },
  sectionLoader:   { paddingVertical: 14, alignItems: 'center' },

  // ── Hot topics ────────────────────────────────────────────────────────────
  hotHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hotTitle:      { fontSize: 16, fontWeight: '900', color: DARK },
  hotBadge:      { backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  hotBadgeTxt:   { fontSize: 10, fontWeight: '900', color: WHITE },
  shuffleBtn:    { width: 36, height: 36, borderRadius: 12, backgroundColor: BRAND + '0F', alignItems: 'center', justifyContent: 'center' },
  hotSub:        { marginTop: 5, color: MUTED, fontSize: 12 },
  hotTopicsWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  topicPill:     { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1.5, gap: 2 },
  topicHashtag:  { fontSize: 12, fontWeight: '900' },
  topicPillText: { fontSize: 12.5, fontWeight: '800' },

  // ── Upgrade to Pro ────────────────────────────────────────────────────────
  proWrap: { marginTop: 12 },
  proCard: {
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    overflow: 'hidden',
  },
  proCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: WHITE + '0A', top: -40, right: -20 },
  proCircle2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: WHITE + '0F', bottom: -20, right: 60 },
  proLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  proCrown:   { width: 38, height: 38, borderRadius: 12, backgroundColor: WARM + '2E', alignItems: 'center', justifyContent: 'center' },
  proTitle:   { fontSize: 14, fontWeight: '900', color: WHITE },
  proSub:     { fontSize: 11, color: WHITE + 'B3', marginTop: 2 },
  proBtn:     { backgroundColor: WARM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  proBtnText: { fontSize: 12, fontWeight: '900', color: BRAND },

  // ── Hafrik Exchange CTA ───────────────────────────────────────────────────
  exWrap: { marginTop: 12 },
  exCard: {
    borderRadius: 20, padding: 20, overflow: 'hidden',
    shadowColor: DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  },
  exCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: ACCENT + '12', top: -60, right: -40 },
  exCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: WHITE + '0A', bottom: -30, left: 60 },
  exIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: ACCENT + '2E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  exContent:  { marginBottom: 18 },
  exTopRow:   { marginBottom: 8 },
  exPill: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT + '2E',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  exPillText: { fontSize: 9, fontWeight: '900', color: ACCENT, letterSpacing: 1.2 },
  exTitle:    { fontSize: 20, fontWeight: '900', color: WHITE, lineHeight: 26 },
  exSub:      { fontSize: 13, color: WHITE + 'A6', marginTop: 6, lineHeight: 19 },
  exBtnWrap:  {},
  exBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 13, alignSelf: 'flex-start',
  },
  exBtnText: { fontSize: 14, fontWeight: '900', color: BRAND },

  // ── Inline Ad Card ───────────────────────────────────────────────────────
  inlineAdWrap: {
    marginHorizontal: H_PAD,
    marginTop: 12,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
  },
  inlineAdBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: DARK + '73',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inlineAdBadgeTxt: { fontSize: 8, fontWeight: '800', color: WHITE, letterSpacing: 0.9 },
  inlineAdContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  inlineAdTitle: { fontSize: 17, fontWeight: '800', color: WHITE, marginBottom: 4, lineHeight: 22 },
  inlineAdSub:   { fontSize: 11, color: WHITE + 'B8', marginBottom: 10, lineHeight: 16 },
  inlineAdBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  inlineAdBtnTxt: { fontSize: 11, fontWeight: '700', color: BRAND },

  // ── Ads ───────────────────────────────────────────────────────────────────
  adWrap: { marginTop: 12 },
  adCard: { borderRadius: 18, overflow: 'hidden', position: 'relative' },
  adImg:  { width: '100%', height: 130, alignItems: 'center', justifyContent: 'center' },
  adFallbackText: { color: WHITE, fontSize: 18, fontWeight: '800' },
  adLabel: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: DARK + '73', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  adLabelText: { color: WHITE, fontSize: 10, fontWeight: '700' },
  adDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  adDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND + '33' },
  adDotActive: { backgroundColor: ACCENT, width: 18 },

  // ── People ────────────────────────────────────────────────────────────────
  personCard: {
    width: 140, alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  personAvatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: BRAND + '14', marginBottom: 10 },
  personName:   { fontSize: 13, fontWeight: '800', color: DARK, textAlign: 'center' },
  personSub:    { fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 3 },
  followBtn:        { marginTop: 12, backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  followBtnText:    { color: WHITE, fontSize: 11, fontWeight: '800' },
  followingBtn:     { backgroundColor: ACCENT + '1F', borderWidth: 1, borderColor: ACCENT },
  followingBtnText: { color: ACCENT },

  // ── Mini cards ────────────────────────────────────────────────────────────
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 16, backgroundColor: Colors.surfaceTint + 'CC', borderWidth: 1, borderColor: BORDER,
  },
  miniAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: BRAND + '14' },
  imgFallback:{ alignItems: 'center', justifyContent: 'center' },
  miniTitle:  { fontSize: 14, fontWeight: '900', color: DARK },
  miniSub:    { marginTop: 2, fontSize: 12, color: MUTED },
  badgeChip:  { backgroundColor: ACCENT + '24', borderWidth: 1, borderColor: ACCENT + '40', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeChipText: { color: BRAND, fontSize: 12, fontWeight: '900' },

  

  // ── 2-column marketplace grid ─────────────────────────────────────────────
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  gridCard: {
    width: CARD_W,
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  gridImgWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceTint,
  },

  gridImg: {
    width: '100%',
    height: '100%',
  },

  gridStockBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT + 'EB',
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  gridStockOut: {
    backgroundColor: Colors.destructive + 'EB',
  },

  gridStockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: WHITE,
  },

  gridStockTxt: {
    color: WHITE,
    fontSize: 9,
    fontWeight: '800',
  },

  gridPhotoBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: DARK + '85',
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  gridPhotoTxt: {
    color: WHITE,
    fontSize: 9,
    fontWeight: '800',
  },

  gridDigitalBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: BRAND,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  gridDigitalTxt: {
    color: WHITE,
    fontSize: 9,
    fontWeight: '800',
  },

  gridBody: {
    padding: 10,
    gap: 2,
  },

  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK,
    lineHeight: 17,
    minHeight: 34,
  },

  gridPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: ACCENT,
  },

  gridSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },

  gridSellerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.border,
  },

  gridSellerName: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
    flexShrink: 1,
  },

  gridTypeBadge: {
    backgroundColor: DARK,
    borderRadius: 100,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  gridTypeBadgePage: {
    backgroundColor: BRAND,
  },

  gridTypeTxt: {
    color: WHITE,
    fontSize: 8,
    fontWeight: '800',
  },

  
  // ── Article 2-col grid ────────────────────────────────────────────────────
  articleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ARTICLE_GRID_GAP,
  },

  // ── Article cards (vertical list) ─────────────────────────────────────────
  articleCard: {
    flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  articleImg: { width: 90, height: 90, backgroundColor: BRAND + '0F' },
  articleBody: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  articleCatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT + '1F',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  articleCatText:  { fontSize: 9, fontWeight: '700', color: ACCENT },
  articleTitle:    { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18 },
  articleSnippet:  { fontSize: 11, color: MUTED, lineHeight: 15 },
  articleArrow: {
    alignSelf: 'center', paddingRight: 10,
  },

  // ── Events ────────────────────────────────────────────────────────────────
  eventCard: {
    width: 230, backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  eventImg:   { width: '100%', height: 120, backgroundColor: BRAND + '0F' },
  eventTitle: { fontSize: 13.5, fontWeight: '900', color: DARK },
  eventMeta:  { marginTop: 4, fontSize: 11.5, color: MUTED },

  // ── Sponsored ─────────────────────────────────────────────────────────────
  sponsoredHeader:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  sponsoredTitle:   { fontSize: 10, color: MUTED, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  sponsoredCard:    { borderRadius: 14, overflow: 'hidden' },
  sponsoredInner:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sponsoredIconWrap:{ width: 44, height: 44, borderRadius: 14, backgroundColor: ACCENT + '1F', alignItems: 'center', justifyContent: 'center' },
  sponsoredCTA:     { fontSize: 13, fontWeight: '800', color: DARK },
  sponsoredSub:     { fontSize: 11, color: MUTED, marginTop: 2 },
  sponsoredBtn:     { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  sponsoredBtnText: { color: WHITE, fontSize: 11, fontWeight: '800' },

  // ── Country modal ─────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: DARK + '73', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 10, maxHeight: '70%',
  },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle:    { fontSize: 17, fontWeight: '900', color: DARK },
  countryRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  countryRowActive: { backgroundColor: ACCENT + '0D' },
  countryName:   { fontSize: 15, color: DARK },
  countryNameActive: { color: BRAND, fontWeight: '800' },

  emptyText: { marginTop: 6, color: MUTED, fontSize: 12 },

  // ── Trending article card (horizontal) ────────────────────────────────────
  trendCard: {
    width: 200, backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  trendImg:   { width: '100%', height: 110, backgroundColor: BRAND + '0F' },
  trendBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: WHITE + 'EB',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  trendBadgeText: { fontSize: 9, fontWeight: '800', color: ACCENT },
  trendBody:  { padding: 10 },
  trendTitle: { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18 },
  trendMeta:  { marginTop: 5, fontSize: 10, color: MUTED },

  // ── Community list row ─────────────────────────────────────────────────────
  communityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  communityRowAvatar: { width: 52, height: 52, borderRadius: 14 },
  communityRowName:   { fontSize: 14, fontWeight: '800', color: DARK },
  communityRowSub:    { fontSize: 11, color: MUTED },
  communityRowDesc:   { fontSize: 11, color: MUTED, marginTop: 5, lineHeight: 15 },
  communityRowCoverWrap: { marginTop: 6, borderRadius: 8, overflow: 'hidden' },
  communityRowCover:  { width: '100%', height: 36, borderRadius: 8 },
  communityRowJoin: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: BRAND, borderRadius: 999,
  },
  communityRowJoinTxt: { color: WHITE, fontSize: 12, fontWeight: '800' },

  // ── Left-edge swipe zone ──────────────────────────────────────────────────
  swipeZone: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, zIndex: 10,
  },

  // ── Visa CTA card ─────────────────────────────────────────────────────────
  visaWrap: { marginTop: 12 },
  visaCard: {
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    overflow: 'hidden',
  },
  visaCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: WHITE + '0D', top: -50, right: -30 },
  visaCircle2: { position: 'absolute', width: 90,  height: 90,  borderRadius: 45, backgroundColor: WHITE + '0A', bottom: -30, left: 50 },
  visaLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  visaIconWrap:{ width: 42, height: 42, borderRadius: 14, backgroundColor: WHITE + '24', alignItems: 'center', justifyContent: 'center' },
  visaTitle:   { fontSize: 14, fontWeight: '900', color: WHITE },
  visaSub:     { fontSize: 11, color: WHITE + 'A6', marginTop: 2 },
  visaBtn:     { backgroundColor: WHITE, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  visaBtnText: { fontSize: 11, fontWeight: '900', color: BRAND },

  // ── Visa modal ────────────────────────────────────────────────────────────
  visaModalOverlay: { flex: 1, backgroundColor: DARK + '8C', justifyContent: 'flex-end' },
  visaModalSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  visaModalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 },
  visaModalIconWrap: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: BRAND + '14',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14,
  },
  visaModalTitle: { fontSize: 20, fontWeight: '900', color: DARK, textAlign: 'center' },
  visaModalBody:  { marginTop: 8, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },

  visaContactCard: {
    marginTop: 18, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', backgroundColor: Colors.surfaceTint,
  },
  visaContactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  visaContactIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: BRAND + '0F',
    alignItems: 'center', justifyContent: 'center',
  },
  visaContactLabel: { fontSize: 10, color: MUTED, fontWeight: '600' },
  visaContactValue: { fontSize: 14, fontWeight: '800', color: DARK, marginTop: 1 },
  visaCopyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BRAND + '14',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  visaCopyText: { fontSize: 12, fontWeight: '800', color: BRAND },

  visaServicesList: { marginTop: 16, gap: 8 },
  visaServiceItem:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  visaServiceText:  { fontSize: 13, color: DARK, fontWeight: '600' },

  visaCallBtn: {
    marginTop: 20, backgroundColor: BRAND, borderRadius: 16,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  visaCallBtnText: { color: WHITE, fontSize: 15, fontWeight: '900' },

  visaCloseBtn: {
    marginTop: 10, paddingVertical: 13, alignItems: 'center',
  },
  visaCloseBtnText: { color: MUTED, fontSize: 14, fontWeight: '700' },
  // ── Trending post card ────────────────────────────────────────────────────
  tpCard: { flexDirection: 'row', backgroundColor: WHITE, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, shadowColor: DARK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tpThumb: { width: 80, height: 80, backgroundColor: BRAND + '0F' },
  tpBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: WHITE + 'EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  tpBadgeText: { fontSize: 8, fontWeight: '800', color: ACCENT },
  tpBody:     { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  tpUserRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tpAvatar:   { width: 18, height: 18, borderRadius: 9, backgroundColor: BRAND + '14' },
  tpUsername: { fontSize: 11, fontWeight: '700', color: MUTED },
  tpTitle:    { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18 },
  tpStats:    { flexDirection: 'row', gap: 12 },
  tpStat:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tpStatText: { fontSize: 11, color: MUTED },

  // ── Featured business horizontal card ────────────────────────────────────
  fbCard:     { width: 240, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  fbAvatar:   { width: 52, height: 52, borderRadius: 14, backgroundColor: BRAND + '14', alignItems: 'center', justifyContent: 'center' },
  fbBody:     { flex: 1, gap: 2 },
  fbNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fbName:     { fontSize: 13, fontWeight: '900', color: DARK, flex: 1 },
  fbCat:      { fontSize: 11, color: ACCENT, fontWeight: '600' },
  fbDesc:     { fontSize: 11, color: MUTED, lineHeight: 15 },
  fbFollowers:{ fontSize: 10, color: MUTED, marginTop: 2 },

  // ── Quick Access chips ────────────────────────────────────────────────────
  qaChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND + '0F', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BRAND + '14' },
  qaChipLabel: { fontSize: 12, fontWeight: '700', color: DARK },
  // Enhanced Quick Access
  qaSection:       { backgroundColor: WHITE, borderRadius: 22, padding: 12, marginTop: 14, marginHorizontal: 14, borderWidth: 1, borderColor: BORDER, shadowColor: DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4 },
  qaGroupCard:     { backgroundColor: WHITE, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BRAND + '12', shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  qaGroupHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  qaGroupIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: BRAND + '14', alignItems: 'center', justifyContent: 'center' },
  qaGroupTitle:    { fontSize: 13, fontWeight: '800', color: BRAND, flex: 1 },
  qaGroupSub:      { fontSize: 10, fontWeight: '600', color: MUTED, letterSpacing: 0.3 },
  // Place chips (horizontal scroll)
  qaPlaceChip:     { alignItems: 'center', gap: 5, backgroundColor: BRAND + '0D', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BRAND + '17', minWidth: 72 },
  qaPlaceIcon:     { width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND + '12', alignItems: 'center', justifyContent: 'center' },
  qaPlaceLabel:    { fontSize: 10, fontWeight: '700', color: BRAND, textAlign: 'center', maxWidth: 72 },
  // Topic chips (wrap)
  qaTopicChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT + '14', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: ACCENT + '2E' },
  qaTopicLabel:    { fontSize: 12, fontWeight: '700', color: BRAND },

  // ── Sponsored biz (horizontal scroll cards) ───────────────────────────────
  sponsoredChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: MUTED + '1A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sponsoredChipText: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  sponsBizCard: { width: 200, backgroundColor: WHITE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  sponsBizImg:  { width: '100%', height: 100, backgroundColor: BRAND + '0F' },
  sponsBizBody: { padding: 10 },
  sponsBizName: { fontSize: 13, fontWeight: '900', color: DARK },
  sponsBizSub:  { fontSize: 11, color: MUTED, marginTop: 2 },
  sponsBizBtn:  { marginHorizontal: 10, marginBottom: 10, backgroundColor: BRAND, borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  sponsBizBtnText: { color: WHITE, fontSize: 12, fontWeight: '800' },

  // ── Ranked trending card ──────────────────────────────────────────────────
  rtCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    paddingVertical: 10, paddingHorizontal: 10, gap: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rtRankCol:    { alignItems: 'center', justifyContent: 'center', width: 26, gap: 2 },
  rtRankNum:    { fontSize: 20, fontWeight: '900', color: BRAND, lineHeight: 24 },
  rtRankNumGold:{ color: '#f59e0b' },
  rtDivider:    { width: 1, alignSelf: 'stretch', backgroundColor: BORDER, marginHorizontal: 1 },
  rtThumb:      { width: 62, height: 62, borderRadius: 10, backgroundColor: BRAND + '14' },
  rtBody:       { flex: 1, gap: 3 },
  rtUserRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rtAvatar:     { width: 18, height: 18, borderRadius: 9, backgroundColor: BRAND + '14' },
  rtUsername:   { fontSize: 10, fontWeight: '700', color: MUTED, flex: 1 },
  rtTitle:      { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 17 },
  rtStats:      { flexDirection: 'row', gap: 10, marginTop: 1 },
  rtStat:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rtStatText:   { fontSize: 10, color: MUTED },
  rtChevron:    { marginLeft: 1 },

  // ── Rank delta indicator ──────────────────────────────────────────────────
  rankStable:   { fontSize: 10, fontWeight: '700', color: MUTED },
  deltaWrap:    { flexDirection: 'row', alignItems: 'center', gap: 1 },
  deltaText:    { fontSize: 9, fontWeight: '800' },

  // ── Post preview bottom sheet ─────────────────────────────────────────────
  previewBackdrop: { flex: 1, backgroundColor: DARK + '7A' },
  previewSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingBottom: 36, paddingTop: 12,
    shadowColor: DARK, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  previewHandle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 14 },
  previewSheetTitle:   { fontSize: 16, fontWeight: '900', color: DARK, marginBottom: 12, textAlign: 'center' },
  previewThumb:        { width: '100%', height: 200, borderRadius: 16, backgroundColor: BRAND + '0F', marginBottom: 14 },
  previewMeta:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  previewAvatar:       { width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND + '14' },
  previewUsername:     { fontSize: 14, fontWeight: '800', color: DARK, flex: 1 },
  previewCaption:      { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 14 },
  previewStatsRow:     { flexDirection: 'row', gap: 20, marginBottom: 18 },
  previewStat:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewStatText:     { fontSize: 13, color: DARK, fontWeight: '700' },
  previewViewBtn: {
    backgroundColor: BRAND, borderRadius: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  previewViewBtnText:  { color: WHITE, fontSize: 15, fontWeight: '900' },

  // ── Hot articles section ──────────────────────────────────────────────────
  hotArticlesWrap:     { marginTop: 10, gap: 7 },
  hotArticleHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  hotArticleHeaderText:{ fontSize: 14, fontWeight: '900', color: DARK },
  firePulseEmoji:      { fontSize: 18 },
  hotArticleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  hotArticleAccentBar: { width: 4, alignSelf: 'stretch', backgroundColor: ACCENT },
  hotArticleImg:       { width: 72, height: 72, backgroundColor: BRAND + '0F' },
  hotArticleBody:      { flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  hotArticleTitle:     { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 17 },

  // ── Marketplace grid ──────────────────────────────────────────────────────
  marketGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP,
  },

  // ── Event card (horizontal scroll) ────────────────────────────────────────
  eventCard: {
    width: 220, backgroundColor: WHITE, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  eventCover:  { width: '100%', height: 126, backgroundColor: BRAND + '0F' },
  eventBody:   { padding: 12 },
  eventTitle:  { fontSize: 14, fontWeight: '800', color: DARK, lineHeight: 18 },
  eventMeta:   { fontSize: 11, color: MUTED },

  // ── Community highlight card (horizontal scroll) ──────────────────────────
  commHCard: {
    width: 148, alignItems: 'center', backgroundColor: WHITE, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: BORDER, gap: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  commHAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND + '14' },
  commHName:   { fontSize: 13, fontWeight: '800', color: DARK, textAlign: 'center' },
  commHSub:    { fontSize: 10, color: MUTED, textAlign: 'center' },

});

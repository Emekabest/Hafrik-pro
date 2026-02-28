// src/pages/pages_/pagesscreen.jsx
import React, {
  useMemo, useRef, useEffect, useState, useCallback, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Dimensions, Image, ScrollView, FlatList, RefreshControl,
  StatusBar, Modal, ActivityIndicator, PanResponder, Linking,
  Alert, Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppDetails from '../../helpers/appdetails';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import StaticShortcutRow from '../home/quicklinks';
import DrawerNavigation from '../home/drawernavigation';
import PostComposerModal from '../home/PostComposerModal';
import { fetchArticles, fetchTrendingArticles } from '../blogs/articlesApi';
import { useLiveCounts } from '../../hooks/useLiveCounts';

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

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';
const BORDER = 'rgba(12,63,68,0.08)';

const COUNTRY_KEY     = 'selected_country';
const DEFAULT_COUNTRY = { country_id: 'all', name: 'All' };

// ─────────────────────────────────────────────────────────────────────────────
// Topic pool
// ─────────────────────────────────────────────────────────────────────────────
const TOPIC_POOL = [
  // Living & Community
  'Jobs in China', 'Student life in China', 'Best cities to live', 'How to find roommates',
  'Making friends in China', 'Mental health abroad', 'Fitness in China', 'Dating culture',
  'African community in Shanghai', 'African community in Guangzhou', 'African community in Shenzhen',
  'African community in Beijing', 'African community in Yiwu', 'African community in Hangzhou',
  'How to find churches', 'Best halal food', 'Best African restaurants', 'African hair salons',
  'African food shops', 'Nigerian community events', 'Ghanaian community events',
  'East African community groups', 'Francophone Africans in China', 'Pan-African events',

  // Business & Trade
  'Shipping from China to Africa', 'Business ideas in China', 'How to register a business',
  'Freight forwarders', 'Agent recommendations', 'China trade fairs', 'Canton Fair tips',
  'Guangzhou markets', 'Yiwu sourcing', 'Importing goods', 'Exporting from China',
  'Marketing for small business', 'How to price products', 'Customer service tips',
  'Starting a restaurant', 'Starting a salon', 'Logistics business', 'E-commerce tips',
  '1688 wholesale sourcing', 'Taobao shopping tips', 'AliExpress guide', 'JD.com deals',
  'Pinduoduo wholesale', 'Drop shipping from China', 'Product quality control',
  'Customs clearance tips', 'Import duties guide', 'How to find reliable suppliers',
  'Building a brand from China', 'Online reselling', 'Affiliate marketing',

  // Visa & Legal
  'Visa renewal tips', 'Work permits', 'Residence permits', 'Student visa tips',
  'Business visa guide', 'X1 visa requirements', 'Z visa guide', 'Embassy contacts Africa',
  'Embassy registration in China', 'How to extend a visa', 'Overstay fines China',
  'Green card equivalent China', 'Permanent residency China', 'Travel documents tips',
  'International driving license', 'Chinese driving license', 'Car ownership in China',

  // Finance & Banking
  'China banking tips', 'How to open a bank account', 'Best banks for foreigners',
  'WeChat pay setup', 'Alipay setup', 'Sending money back home', 'Best remittance apps',
  'Currency exchange tips', 'Crypto in China', 'International transfers',
  'Tax basics for foreigners', 'Tax filing in China', 'Managing finances abroad',

  // Tech & Apps
  'Best VPN in China', 'VPN recommendations 2025', 'Best SIM cards', 'Getting a Chinese number',
  'Internet in China guide', 'DiDi ride guide', 'Meituan food delivery', 'Eleme delivery tips',
  'Bicycle sharing apps', 'Metro apps China', 'High speed train booking', 'Ctrip travel tips',
  'YouTube alternatives China', 'WhatsApp alternatives China', 'Instagram alternatives China',
  'WeChat official accounts for Africans', 'WeChat groups for Africans', 'TikTok in China',
  'Best translation apps', 'Baidu Maps vs Google Maps',

  // Jobs & Education
  'Part-time jobs', 'Teaching English in China', 'TEFL certification', 'HSK exam tips',
  'Learning Chinese fast', 'Chinese language schools', 'Scholarships', 'Internships',
  'Job interviews in China', 'Resume tips for China', 'Networking events',
  'How to build connections', 'LinkedIn in China', 'Finding a job as a foreigner',

  // Housing & Lifestyle
  'How to find roommates', 'Apartment contracts tips', 'Where to buy furniture',
  'Accommodation hacks', 'Cheap flights Africa-China', 'Travel insurance guide',
  'Emergency contacts in China', 'Health check requirements', 'International health insurance',
  'Bringing family to China', 'Schools for African kids in China', 'Pet ownership in China',

  // Products & Sourcing
  'Fashion suppliers', 'Jewelry suppliers', 'Sneakers suppliers', 'Perfume sourcing',
  'Electronics wholesale', 'Best phones to buy in China', 'Best laptops deals',
  'Hair extensions suppliers', 'Cosmetics suppliers', 'Baby products wholesale',
  'Furniture suppliers China', 'Building materials import', 'Solar panels sourcing',
  'Auto parts suppliers', 'Textile suppliers', 'Fabric sourcing guide',

  // Side Hustles & Income
  'Side hustles for Africans in China', 'Freelancing online', 'Content creation tips',
  'YouTube monetization', 'Dropshipping guide', 'Print on demand', 'Amazon FBA tips',
  'Selling on Jumia from China', 'Selling on Konga from China',

  // Food & Culture
  'Food delivery apps', 'Best halal restaurants', 'African food recipes', 'Chinese cuisine guide',
  'Best street food China', 'Vegetarian food in China', 'Cooking African food in China',
  'Where to find African spices', 'African groceries online China',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const exploreApiFetch = async (path, token, extraParams = {}) => {
  try {
    const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v != null && v !== 'all') url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
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

function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, count) { return shuffle(arr).slice(0, count); }

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
// Upgrade to Pro card
// ─────────────────────────────────────────────────────────────────────────────
const UpgradeToProCard = memo(({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={ss.proWrap}>
    <LinearGradient
      colors={['#0C3F44', '#1A7A50', '#13C296']}
      style={ss.proCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={ss.proCircle1} />
      <View style={ss.proCircle2} />
      <View style={ss.proLeft}>
        <View style={ss.proCrown}>
          <Ionicons name="flash" size={18} color="#F4A535" />
        </View>
        <View>
          <Text style={ss.proTitle}>Grow faster on Hafrik</Text>
          <Text style={ss.proSub}>Unlock Pro tools, visibility{'\n'}& priority listing</Text>
        </View>
      </View>
      <TouchableOpacity style={ss.proBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={ss.proBtnText}>Upgrade Now</Text>
        <Ionicons name="arrow-forward" size={13} color={BRAND} />
      </TouchableOpacity>
    </LinearGradient>
  </TouchableOpacity>
));

// ─────────────────────────────────────────────────────────────────────────────
// Hafrik Exchange CTA
// ─────────────────────────────────────────────────────────────────────────────
const HafrikExchangeCTA = memo(({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={ss.exWrap}>
    <LinearGradient
      colors={['#062A2E', '#0C3F44', '#0a6b4f']}
      style={ss.exCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative circles */}
      <View style={ss.exCircle1} />
      <View style={ss.exCircle2} />

      <View style={ss.exIconWrap}>
        <Ionicons name="swap-horizontal" size={26} color={ACCENT} />
      </View>

      <View style={ss.exContent}>
        <View style={ss.exTopRow}>
          <View style={ss.exPill}>
            <Text style={ss.exPillText}>HAFRIK EXCHANGE</Text>
          </View>
        </View>
        <Text style={ss.exTitle}>Send & Receive Money{'\n'}Across Borders</Text>
        <Text style={ss.exSub}>Fast RMB → Africa transfers. Secure & instant.</Text>
      </View>

      <View style={ss.exBtnWrap}>
        <TouchableOpacity style={ss.exBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={ss.exBtnText}>Open Exchange</Text>
          <Ionicons name="arrow-forward" size={13} color={BRAND} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  </TouchableOpacity>
));

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
      <Ionicons name="chevron-forward" size={18} color="#c9d2d4" />
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
            <Ionicons name="images-outline" size={9} color="#fff" />
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
const REEL_COLS    = 3;
const REEL_GAP     = 4;
const REEL_SIZE    = (SCREEN_W - H_PAD * 2 - SEC_PAD * 2 - REEL_GAP * (REEL_COLS - 1)) / REEL_COLS;

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
      style={[rg.card, { width: REEL_SIZE, height: REEL_SIZE * 1.55 }]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {isRealImage(thumb) ? (
        <Image source={{ uri: thumb }} style={rg.img} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[BRAND, '#1a5c63']} style={[rg.img, rg.imgFallback]}>
          <Ionicons name="play-circle-outline" size={28} color="rgba(255,255,255,0.45)" />
        </LinearGradient>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={rg.overlay}
      >
        {/* Play badge top-left */}
        <View style={rg.playBadge}>
          <Ionicons name="play" size={9} color="#fff" />
        </View>

        {/* Bottom info */}
        <View style={rg.bottomRow}>
          {!!views && (
            <View style={rg.viewChip}>
              <Ionicons name="eye-outline" size={9} color="rgba(255,255,255,0.8)" />
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
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#D6E4E6',
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
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Trending post compact card
// ─────────────────────────────────────────────────────────────────────────────
const TrendingPostCard = memo(({ item, onPress }) => {
  const thumb    = item?.thumbnail ?? item?.image ?? item?.cover ?? null;
  const username = decodeHtml(item?.username ?? item?.user?.username ?? item?.name ?? 'User');
  const title    = decodeHtml(item?.title ?? item?.text ?? item?.caption ?? '');
  const likes    = Number(item?.likes_count ?? item?.likes ?? 0);
  const comments = Number(item?.comments_count ?? item?.comments ?? 0);
  const avatar   = item?.user?.avatar ?? item?.avatar ?? null;
  return (
    <TouchableOpacity style={ss.tpCard} activeOpacity={0.88} onPress={onPress}>
      {isRealImage(thumb) ? (
        <Image source={{ uri: thumb }} style={ss.tpThumb} resizeMode="cover" />
      ) : (
        <View style={[ss.tpThumb, ss.imgFallback]}>
          <Ionicons name="flame-outline" size={22} color={MUTED} />
        </View>
      )}
      <View style={ss.tpBadge}>
        <Ionicons name="trending-up" size={9} color={ACCENT} />
        <Text style={ss.tpBadgeText}>Trending</Text>
      </View>
      <View style={ss.tpBody}>
        <View style={ss.tpUserRow}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={ss.tpAvatar} />
          ) : (
            <View style={[ss.tpAvatar, ss.imgFallback]}>
              <Ionicons name="person-outline" size={10} color={BRAND} />
            </View>
          )}
          <Text numberOfLines={1} style={ss.tpUsername}>{username}</Text>
        </View>
        {!!title && <Text numberOfLines={2} style={ss.tpTitle}>{title}</Text>}
        <View style={ss.tpStats}>
          <View style={ss.tpStat}><Ionicons name="heart-outline" size={12} color={MUTED} /><Text style={ss.tpStatText}>{likes.toLocaleString()}</Text></View>
          <View style={ss.tpStat}><Ionicons name="chatbubble-outline" size={12} color={MUTED} /><Text style={ss.tpStatText}>{comments.toLocaleString()}</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

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
const FeaturedBusinessSection = ({ navigation, token }) => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('https://hafrik.com/api/v1/business/list.php?limit=8&featured=1', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(j => {
        const raw = j?.data?.businesses || j?.data?.pages || j?.data?.data || j?.data || [];
        setItems(Array.isArray(raw) ? raw.slice(0, 8) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (!loading && items.length === 0) return null;
  return (
    <View style={[ss.section, { paddingHorizontal: 0, overflow: 'hidden' }]}>
      <View style={{ paddingHorizontal: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={ss.sectionTitleRow}>
          <View style={ss.sectionAccent} />
          <Text style={ss.sectionTitle}>Featured Business</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(19,194,150,0.1)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Ionicons name="shield-checkmark" size={10} color={ACCENT} />
          <Text style={{ fontSize: 9, fontWeight: '800', color: ACCENT, letterSpacing: 0.8 }}>FEATURED</Text>
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
  { id: 'hotels',          label: 'Hotels',          icon: '🏨', tab: 'posts',     tag: 'hotels'            },
  { id: 'restaurants',     label: 'Restaurants',     icon: '🍽️', tab: 'posts',     tag: 'restaurants'       },
  { id: 'hospitals',       label: 'Hospitals',       icon: '🏥', tab: 'posts',     tag: 'hospitals'         },
  { id: 'parks',           label: 'Parks',           icon: '🌳', tab: 'posts',     tag: 'parks'             },
  { id: 'bars',            label: 'Bars & Lounges',  icon: '🍺', tab: 'posts',     tag: 'bars'              },
  { id: 'nightlife',       label: 'Nightlife',       icon: '🎶', tab: 'posts',     tag: 'nightlife'         },
  { id: 'shopping',        label: 'Shopping',        icon: '🛍️', tab: 'posts',     tag: 'shopping'          },
  { id: 'banks',           label: 'Banks & Finance', icon: '🏦', tab: 'posts',     tag: 'banks'             },
  { id: 'visa-help',       label: 'Visa Help',       icon: '📋', tab: 'posts',     tag: 'visa help support' },
  { id: 'halal-food',      label: 'Halal Food',      icon: '🍜', tab: 'posts',     tag: 'best halal food'   },
  { id: 'new-to-china',    label: 'New to China',    icon: '🇨🇳', tab: 'hashtags', tag: 'newtochina'         },
  { id: 'business-tips',   label: 'Business Tips',   icon: '💼', tab: 'hashtags', tag: 'businesstips'      },
  { id: 'jobs',            label: 'Jobs',            icon: '🎯', tab: 'hashtags', tag: 'jobs'              },
  { id: 'study',           label: 'Study',           icon: '📚', tab: 'hashtags', tag: 'study'             },
  { id: 'logistics',       label: 'Logistics',       icon: '🚢', tab: 'hashtags', tag: 'shipping'          },
  { id: 'currency',        label: 'Exchange Rates',  icon: '💱', tab: 'hashtags', tag: 'currency exchange' },
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
// Country selector modal
// ─────────────────────────────────────────────────────────────────────────────
const CountryModal = memo(({ visible, countries, selected, onSelect, onClose }) => (
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
          data={[DEFAULT_COUNTRY, ...(countries || [])]}
          keyExtractor={(c) => String(c.country_id ?? c.id ?? c.name)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item: c }) => {
            const id     = c.country_id ?? c.id;
            const name   = c.name ?? c.country ?? c.country_name ?? c.title ?? '';
            const isActive = String(id) === String(selected.country_id);
            return (
              <TouchableOpacity
                style={[ss.countryRow, isActive && ss.countryRowActive]}
                activeOpacity={0.8}
                onPress={() => onSelect({ country_id: id, name })}
              >
                <Text style={[ss.countryName, isActive && { color: BRAND, fontWeight: '800' }]}>
                  {name}
                </Text>
                {isActive && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  </Modal>
));

// ─────────────────────────────────────────────────────────────────────────────
// Visa & Admission CTA card
// ─────────────────────────────────────────────────────────────────────────────
const VisaCTA = memo(({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={ss.visaWrap}>
    <LinearGradient
      colors={['#1a0533', '#2D1B69', '#0C3F44']}
      style={ss.visaCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={ss.visaCircle1} />
      <View style={ss.visaCircle2} />

      <View style={ss.visaLeft}>
        <View style={ss.visaIconWrap}>
          <Ionicons name="airplane-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.visaTitle}>Planning to Come to China?</Text>
          <Text style={ss.visaSub}>Visa · Admission · Business Support</Text>
        </View>
      </View>

      <TouchableOpacity style={ss.visaBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={ss.visaBtnText}>Get Assistance</Text>
        <Ionicons name="arrow-forward" size={12} color="#2D1B69" />
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
                <Ionicons name="logo-wechat" size={18} color="#07C160" />
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
            <Ionicons name="call-outline" size={16} color="#fff" />
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
  const { top }           = useSafeAreaInsets();
  const { token }         = useAuth();
  const notificationCount = useStore((s) => s.notificationCount ?? 0);
  const setSearchQuery    = useStore((s) => s.setSearchQuery);
  const openComposer      = useStore((s) => s.openComposer);

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

  // -- Trending posts state
  const [trendingPosts, setTrendingPosts] = useState([]);
  const trendingPostsRef = useRef(null);
  const [trendingDisplayKey, setTrendingDisplayKey] = useState(0);

  // -- Sponsored businesses state
  const [sponsoredBiz, setSponsoredBiz] = useState([]);
  const sponsoredBizRef = useRef(null);

  // -- Reels preview state
  const [reels,        setReels]        = useState([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const reelsAbortRef = useRef(null);

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
    loadMarketplace();
    loadTrendingPosts();
    loadSponsoredBiz();
    loadArticles();
    loadTrendingArticles();
    loadPeople();
    loadReels();
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
    const countryParam = selectedCountry.country_id !== 'all'
      ? { country_id: selectedCountry.country_id }
      : {};
    const res = await exploreApiFetch(EXPLORE_URL, token, countryParam);
    setExplorePayload(res?.data ?? null);
  }, [token, selectedCountry.country_id]);

  useEffect(() => {
    loadExplore();
  }, [loadExplore]);


  const loadMarketplace = useCallback(async () => {
    if (marketAbortRef.current) marketAbortRef.current.abort();
    const ctrl = new AbortController();
    marketAbortRef.current = ctrl;
    setMarketLoading(true);
    try {
      // Fetch more than we need so the shuffle is meaningful
      const url = `${MARKETPLACE_URL}?page=1&limit=${MARKETPLACE_LIMIT * 2}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      // Handle every possible response shape the API might return
      const raw = json?.data?.products ?? json?.products ?? json?.data ?? [];
      const products = Array.isArray(raw) ? raw : [];
      // Shuffle client-side, cap at MARKETPLACE_LIMIT
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      setMarketProducts(shuffled.slice(0, MARKETPLACE_LIMIT));
    } catch (e) {
      if (e?.name !== 'AbortError') setMarketProducts([]);
    } finally {
      setMarketLoading(false);
    }
  }, [token]);
  

  // ── Load articles via real endpoint ────────────────────────────────────────
  const loadArticles = useCallback(async (pageNum = 1, append = false) => {
    if (articleAbortRef.current) articleAbortRef.current.abort();
    const ctrl = new AbortController();
    articleAbortRef.current = ctrl;
    if (append) setArticleLoadingMore(true); else setArticleLoading(true);
    try {
      const items = await fetchArticles({ page: pageNum, limit: 10 }, ctrl.signal);
      const list = Array.isArray(items) ? items : [];
      if (append) setArticleItems((p) => [...p, ...list]); else setArticleItems(list);
      setArticleHasMore(list.length >= 10);
      setArticlePage(pageNum);
    } catch (e) {
      if (e.name !== 'AbortError' && !append) setArticleItems([]);
    } finally {
      if (append) setArticleLoadingMore(false); else setArticleLoading(false);
    }
  }, []);

  // ── Load trending articles (Popular This Week) ─────────────────────────────
  const loadTrendingArticles = useCallback(async () => {
    if (trendingAbortRef.current) trendingAbortRef.current.abort();
    const ctrl = new AbortController();
    trendingAbortRef.current = ctrl;
    try {
      const items = await fetchTrendingArticles(5);
      setTrendingArticles(Array.isArray(items) ? items : []);
    } catch {}
  }, []);

  // ── Load people from dedicated endpoint ────────────────────────────────────
  const loadPeople = useCallback(async () => {
    if (peopleAbortRef.current) peopleAbortRef.current.abort();
    const ctrl = new AbortController();
    peopleAbortRef.current = ctrl;
    setPeopleLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/people/list.php?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      console.log('[People] API raw response:', JSON.stringify(json)?.slice(0, 400));
      // Response shape: { status, data: { page, limit, data: [...users] } }
      const list = json?.data?.data ?? [];
      console.log('[People] parsed list length:', list.length, '| first item:', list[0]);
      setPeople(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e?.name !== 'AbortError') {
        console.warn('[People] fetch error:', e?.message);
        setPeople([]);
      }
    } finally {
      setPeopleLoading(false);
    }
  }, [token]);

  // -- Load trending posts (3 only) ──────────────────────────────────────────
  const loadTrendingPosts = useCallback(async () => {
    if (trendingPostsRef.current) trendingPostsRef.current.abort();
    const ctrl = new AbortController();
    trendingPostsRef.current = ctrl;
    try {
      const res  = await fetch(`${BASE_URL}/api/v1/feed/trending.php?limit=3`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      setTrendingPosts(Array.isArray(list) ? list.slice(0, 3) : []);
    } catch (e) {
      if (e?.name !== 'AbortError') setTrendingPosts([]);
    }
  }, [token]);

  // -- Load sponsored/trending businesses ────────────────────────────────────
  const loadSponsoredBiz = useCallback(async () => {
    if (sponsoredBizRef.current) sponsoredBizRef.current.abort();
    const ctrl = new AbortController();
    sponsoredBizRef.current = ctrl;
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
    }
  }, [token]);

  // -- Load reels for preview grid ───────────────────────────────────────────
  const loadReels = useCallback(async () => {
    if (reelsAbortRef.current) reelsAbortRef.current.abort();
    const ctrl = new AbortController();
    reelsAbortRef.current = ctrl;
    setReelsLoading(true);
    try {
      const seed = Math.floor(Math.random() * 2147483647);
      const res  = await fetch(
        `${BASE_URL}/api/v1/reels/list.php?page=1&limit=6&mode=for_you&seed=${seed}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: ctrl.signal },
      );
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      setReels(Array.isArray(list) ? list.slice(0, 6) : []);
    } catch (e) {
      if (e?.name !== 'AbortError') setReels([]);
    } finally {
      setReelsLoading(false);
    }
  }, [token]);

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
      const form = new FormData();
      form.append('user_id', String(userId));
      await fetch(`${BASE_URL}/api/v1/people/follow_toggle.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    } catch {}
  }, [token]);

  // ── Reshuffle all ──────────────────────────────────────────────────────────
  const reshuffleAll = useCallback(() => {
    setHotTopics(pickRandom(TOPIC_POOL, 5));
    setShuffleKey((k) => k + 1);
  }, []);

  // ── Country select ─────────────────────────────────────────────────────────
  const handleSelectCountry = useCallback(async (country) => {
    setSelectedCountry(country);
    await AsyncStorage.setItem(COUNTRY_KEY, JSON.stringify(country));
    setShuffleKey((k) => k + 1);
    setHotTopics(pickRandom(TOPIC_POOL, 5));
    // loadMarketplace re-runs via useEffect dep on selectedCountry
    // loadExplore re-runs via useEffect dep on selectedCountry.country_id
  }, []);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reshuffleAll();
    await Promise.all([loadExplore(), loadTrendingPosts(), loadSponsoredBiz(), loadArticles(), loadTrendingArticles(), loadPeople(), loadReels()]);
    setRefreshing(false);
  }, [loadExplore, loadTrendingPosts, loadSponsoredBiz, loadArticles, loadTrendingArticles, loadPeople, reshuffleAll]);

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
  const displayTrending = useMemo(() => shuffle(trendingPosts).slice(0, 3),    [trendingPosts,   trendingDisplayKey]); // eslint-disable-line

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
  const popularThisWeek = useMemo(() => shuffle(trendingArticles).slice(0, 3), [trendingArticles, shuffleKey]); // eslint-disable-line

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
      <LinearGradient
        colors={[BRAND, '#0A5A62']}
        style={[ss.header, { paddingTop: top + 6 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={ss.headerInner}>
          {/* Hamburger — opens DrawerNavigation */}
          <TouchableOpacity
            style={ss.iconBtn}
            activeOpacity={0.85}
            onPress={() => setDrawerVisible(true)}
          >
            <Ionicons name="menu-outline" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={ss.headerRight}>
            {/* Notifications */}
            <TouchableOpacity
              style={ss.iconBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name={notificationCount > 0 ? 'notifications' : 'notifications-outline'} size={20} color="#fff" />
              {notificationCount > 0 && (
                <View style={ss.badge}>
                  <Text style={ss.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Search */}
            <TouchableOpacity
              style={ss.iconBtn}
              activeOpacity={0.85}
              onPress={() => goSearchScreen('')}
            >
              <Ionicons name="search-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ════════════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT
          ════════════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={ss.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
      >
        {/* ── 1. HERO ── */}
        <View style={ss.hero}>
          <View style={ss.heroPills}>
            <View style={ss.livePill}>
              <View style={ss.liveDot} />
              <Text style={ss.liveText}>HAFRIK · DISCOVER</Text>
            </View>
            {counts?.communities != null && (
              <View style={ss.countPill}>
                <Ionicons name="people-outline" size={12} color={ACCENT} />
                <Text style={ss.countText}>{counts.communities} Communities</Text>
              </View>
            )}
            {counts?.events != null && (
              <View style={ss.countPill}>
                <Ionicons name="calendar-outline" size={12} color={ACCENT} />
                <Text style={ss.countText}>{counts.events} Events</Text>
              </View>
            )}
          </View>

          <Text style={ss.heroTitle}>Find people, ideas,{'\n'}and opportunities.</Text>
          <Text style={ss.heroSub}>
            Search communities, businesses, jobs, events, guides and marketplace.
          </Text>

          <View style={ss.heroSearch}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.75)" />
            <TextInput
              value={heroQuery}
              onChangeText={setHeroQuery}
              placeholder="Search anything on Hafrik…"
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={ss.heroInput}
              returnKeyType="search"
              onSubmitEditing={handleHeroSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={ACCENT}
            />
            <TouchableOpacity activeOpacity={0.85} onPress={handleHeroSubmit}>
              <Ionicons name="arrow-forward-circle" size={28} color={ACCENT} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── QUICK LINKS ─── */}
        <StaticShortcutRow />

        {/* ─── BODY ─── */}
        <View style={ss.body}>

          {/* ─── 1. TRENDING NOW ─── */}
          {trendingPosts.length > 0 && (
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
                <TouchableOpacity activeOpacity={0.8} onPress={() => setTrendingDisplayKey((k) => k + 1)} style={ss.shuffleBtn}>
                  <Ionicons name="shuffle" size={18} color={BRAND} />
                </TouchableOpacity>
              </View>
              <Text style={ss.sectionSubtitle}>What the community is talking about</Text>
              <View style={{ gap: 10 }}>
                {displayTrending.map((post, i) => (
                  <TrendingPostCard
                    key={post.id ?? post.post_id ?? `tp-${i}`}
                    item={post}
                    onPress={() => navigation.navigate('PostDetail', { postId: post.id ?? post.post_id })}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={ss.viewMoreBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('TrendingOnHafrik')}
              >
                <Ionicons name="flame-outline" size={14} color={ACCENT} />
                <Text style={ss.viewMoreText}>View All Trending Posts</Text>
                <Ionicons name="arrow-forward" size={14} color={ACCENT} />
              </TouchableOpacity>
            </View>
          )}

          {/* ─── 2. FEATURED BUSINESS ─── */}
          <FeaturedBusinessSection navigation={navigation} token={token} />

          {/* ─── 3. HOT TOPICS ─── */}
          <View style={ss.section}>
            <View style={ss.hotHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={ss.hotTitle}>🔥 Hot Topics</Text>
                <View style={ss.hotBadge}><Text style={ss.hotBadgeTxt}>{hotTopics.length}</Text></View>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={reshuffleAll} style={ss.shuffleBtn}>
                <Ionicons name="shuffle" size={18} color={BRAND} />
              </TouchableOpacity>
            </View>
            <Text style={ss.hotSub}>Tap any tag to dive into trending conversations</Text>
            <View style={ss.hotTopicsWrap}>
              {hotTopics.map((t, i) => {
                const palettes = [
                  { bg: BRAND,                   text: '#fff',    border: BRAND },
                  { bg: ACCENT,                  text: DARK,      border: ACCENT },
                  { bg: 'rgba(232,93,4,0.10)',   text: '#C04A00', border: '#E85D04' },
                  { bg: 'rgba(114,9,183,0.10)',  text: '#6200AA', border: '#7209B7' },
                  { bg: 'rgba(0,119,182,0.10)',  text: '#005A8F', border: '#0077B6' },
                  { bg: 'rgba(19,194,150,0.12)', text: '#0A7C60', border: ACCENT },
                ];
                const pal = palettes[i % palettes.length];
                return (
                  <TouchableOpacity
                    key={`${t}-${i}`}
                    onPress={() => {
                      try { setSearchQuery?.(t); } catch {}
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

          {/* ─── 4. PEOPLE YOU MAY KNOW ─── */}
          {Array.isArray(people) && (people.length > 0 || peopleLoading) && (
            <View style={ss.section}>
              <SectionHeader
                title="People You May Know"
                onSeeAll={() => navigation.navigate('SearchScreen', { initialQuery: '' })}
              />
              {peopleLoading && people.length === 0 ? (
                <View style={ss.sectionLoader}><ActivityIndicator size="small" color={BRAND} /></View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                  {people.map((p, i) => (
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
          )}

          {/* ─── 5. SUGGESTED COMMUNITIES ─── */}
          {hotCommunities.length > 0 && (
            <View style={ss.section}>
              <SectionHeader title="Suggested Communities" onSeeAll={() => navigation.navigate('GroupScreen', { initialTab: 0 })} />
              <View style={{ gap: 10, marginTop: 4 }}>
                {hotCommunities.map((g, i) => {
                  const cover  = g.cover ?? g.banner ?? g.image ?? null;
                  const avatar = g.avatar ?? g.image ?? null;
                  const name   = decodeHtml(g.title ?? g.name ?? 'Community');
                  const members = (g.members_count ?? g.members ?? 0).toLocaleString();
                  return (
                    <TouchableOpacity
                      key={g.id ?? i}
                      style={ss.communityRow}
                      activeOpacity={0.88}
                      onPress={() => navigation.navigate('GroupDetails', { groupId: g.id })}
                    >
                      {/* Avatar */}
                      {isRealImage(avatar)
                        ? <Image source={{ uri: avatar }} style={ss.communityRowAvatar} resizeMode="cover" />
                        : <LinearGradient colors={[BRAND, '#1a5c63']} style={[ss.communityRowAvatar, { alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="people" size={20} color="#fff" />
                          </LinearGradient>
                      }
                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={ss.communityRowName}>{name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Ionicons name="people-outline" size={12} color={MUTED} />
                          <Text style={ss.communityRowSub}>{members} members</Text>
                        </View>
                        {!!(g.description ?? g.bio ?? g.summary) && (
                          <Text numberOfLines={2} style={ss.communityRowDesc}>
                            {(g.description ?? g.bio ?? g.summary ?? '').trim()}
                          </Text>
                        )}
                      </View>
                      {/* Join button */}
                      <View style={ss.communityRowJoin}>
                        <Text style={ss.communityRowJoinTxt}>Join</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── REELS PREVIEW ─── */}
          {(reels.length > 0 || reelsLoading) && (
            <View style={ss.section}>
              <View style={ss.sectionHeader}>
                <View style={ss.sectionTitleRow}>
                  <View style={ss.sectionAccent} />
                  <Text style={ss.sectionTitle}>🎬 Reels</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Reels')}
                  activeOpacity={0.8}
                  style={ss.seeAllBtn}
                >
                  <Text style={ss.seeAllText}>See all</Text>
                  <Ionicons name="chevron-forward" size={14} color={ACCENT} />
                </TouchableOpacity>
              </View>
              <Text style={ss.sectionSubtitle}>Short videos from your community</Text>

              {reelsLoading && reels.length === 0 ? (
                <View style={ss.sectionLoader}>
                  <ActivityIndicator size="small" color={BRAND} />
                </View>
              ) : (
                <>
                  {/* 3-column grid */}
                  <View style={ss.reelGrid}>
                    {reels.slice(0, 6).map((r, i) => (
                      <ReelGridCard
                        key={r.id ?? `reel-${i}`}
                        item={r}
                        onPress={() => {
                          navigation.navigate('PostDetail', { postId: r.id ?? r.reel_id ?? r.post_id });
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={ss.viewMoreBtn}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Reels')}
                  >
                    <Ionicons name="play-circle-outline" size={14} color={ACCENT} />
                    <Text style={ss.viewMoreText}>View All Reels</Text>
                    <Ionicons name="arrow-forward" size={14} color={ACCENT} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ─── 6. QUICK ACCESS — Hashtag categories ─── */}
          <QuickAccessSection navigation={navigation} shuffleKey={shuffleKey} />

          {/* ─── 7. VISA CTA ─── */}
          <VisaCTA onPress={() => navigation.navigate('SearchScreen', { initialQuery: 'visa help support', initialTab: 'pages' })} />

          {/* ─── 8. (removed – Trending Businesses) ─── */}

          {/* ─── 9. POPULAR THIS WEEK ─── */}
          {popularThisWeek.length > 0 && (
            <View style={ss.section}>
              <SectionHeader title="🌟 Popular This Week" onSeeAll={() => navigation.navigate('ArticlesScreen')} />
              <View style={{ gap: 10 }}>
                {popularThisWeek.map((a, i) => (
                  <ExploreArticleCard
                    key={a.id ?? a.post_id ?? i}
                    item={a}
                    onPress={() => navigation.navigate('ArticleDetails', { postId: a.post_id ?? a.id })}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ─── 10. HAFRIK EXCHANGE CTA ─── */}
          <HafrikExchangeCTA onPress={() => navigation.navigate('SearchScreen', { initialQuery: 'HafrikExchange', initialTab: 'pages' })} />

          {/* ─── 11. GUIDES & TIPS — FINAL SECTION, paginated + ads ─── */}
          {(articleItems.length > 0 || articleLoading) && (
            <View style={[ss.section, { marginBottom: 28 }]}>
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
                        <Ionicons name="book-outline" size={14} color={ACCENT} />
                        <Text style={ss.viewMoreText}>Load More Guides</Text>
                        <Ionicons name="chevron-down" size={14} color={ACCENT} />
                      </>
                  }
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

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

      {/* FAB — compose new post */}
      <TouchableOpacity
        style={ss.fab}
        activeOpacity={0.88}
        onPress={() => openComposer()}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PostComposerModal />
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
    backgroundColor: 'rgba(255,50,50,0.1)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,50,50,0.2)',
  },
  trendingBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E53935',
    letterSpacing: 1,
  },

  // ── Section subtitle ─────────────────────────────────────────────────────
  sectionSubtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: -6,
    marginBottom: 12,
  },

  // ── View More button ─────────────────────────────────────────────────────
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: `${ACCENT}12`,
    borderWidth: 1,
    borderColor: `${ACCENT}22`,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },

  // ── Reel grid ─────────────────────────────────────────────────────────────
  reelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: REEL_GAP,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },

  // ── Fixed header ─────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 12,
  },
  headerInner:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: BRAND,
  },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '900' },
  countryDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: BRAND, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 22,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden',
  },
  heroPills:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(255,255,255,0.85)' },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  countText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34 },
  heroSub:   { marginTop: 8, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.65)' },
  heroSearch: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14, height: 52,
  },
  heroInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 0 },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: { paddingTop: 14, paddingHorizontal: 14 },

  // ── Generic section ────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:   { width: 4, height: 18, borderRadius: 3, backgroundColor: ACCENT },
  sectionTitle:    { fontSize: 16, fontWeight: '900', color: DARK },
  seeAllBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText:      { fontSize: 12, fontWeight: '800', color: ACCENT },
  sectionLoader:   { paddingVertical: 24, alignItems: 'center' },

  // ── Hot topics ────────────────────────────────────────────────────────────
  hotHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hotTitle:      { fontSize: 16, fontWeight: '900', color: DARK },
  hotBadge:      { backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  hotBadgeTxt:   { fontSize: 10, fontWeight: '900', color: '#fff' },
  shuffleBtn:    { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(12,63,68,0.06)', alignItems: 'center', justifyContent: 'center' },
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
  proCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)', top: -40, right: -20 },
  proCircle2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, right: 60 },
  proLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  proCrown:   { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(244,165,53,0.18)', alignItems: 'center', justifyContent: 'center' },
  proTitle:   { fontSize: 14, fontWeight: '900', color: '#fff' },
  proSub:     { fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 },
  proBtn:     { backgroundColor: '#F4A535', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  proBtnText: { fontSize: 12, fontWeight: '900', color: BRAND },

  // ── Hafrik Exchange CTA ───────────────────────────────────────────────────
  exWrap: { marginTop: 12 },
  exCard: {
    borderRadius: 20, padding: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  },
  exCircle1: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(19,194,150,0.07)', top: -60, right: -40 },
  exCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -30, left: 60 },
  exIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(19,194,150,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  exContent:  { marginBottom: 18 },
  exTopRow:   { marginBottom: 8 },
  exPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(19,194,150,0.18)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  exPillText: { fontSize: 9, fontWeight: '900', color: ACCENT, letterSpacing: 1.2 },
  exTitle:    { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 26 },
  exSub:      { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6, lineHeight: 19 },
  exBtnWrap:  {},
  exBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 13, alignSelf: 'flex-start',
  },
  exBtnText: { fontSize: 14, fontWeight: '900', color: BRAND },

  // ── Ads ───────────────────────────────────────────────────────────────────
  adWrap: { marginTop: 12 },
  adCard: { borderRadius: 18, overflow: 'hidden', position: 'relative' },
  adImg:  { width: '100%', height: 130, alignItems: 'center', justifyContent: 'center' },
  adFallbackText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  adLabel: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  adLabelText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  adDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  adDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(12,63,68,0.2)' },
  adDotActive: { backgroundColor: ACCENT, width: 18 },

  // ── People ────────────────────────────────────────────────────────────────
  personCard: {
    width: 120, alignItems: 'center', backgroundColor: 'rgba(240,244,244,0.9)',
    borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  personAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(12,63,68,0.08)', marginBottom: 8 },
  personName:   { fontSize: 12, fontWeight: '800', color: DARK, textAlign: 'center' },
  personSub:    { fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 2 },
  followBtn:        { marginTop: 10, backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  followBtnText:    { color: '#fff', fontSize: 11, fontWeight: '800' },
  followingBtn:     { backgroundColor: 'rgba(19,194,150,0.12)', borderWidth: 1, borderColor: ACCENT },
  followingBtnText: { color: ACCENT },

  // ── Mini cards ────────────────────────────────────────────────────────────
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 16, backgroundColor: 'rgba(245,247,247,0.8)', borderWidth: 1, borderColor: BORDER,
  },
  miniAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(12,63,68,0.08)' },
  imgFallback:{ alignItems: 'center', justifyContent: 'center' },
  miniTitle:  { fontSize: 14, fontWeight: '900', color: DARK },
  miniSub:    { marginTop: 2, fontSize: 12, color: MUTED },
  badgeChip:  { backgroundColor: 'rgba(19,194,150,0.14)', borderWidth: 1, borderColor: 'rgba(19,194,150,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeChipText: { color: '#0a7a5a', fontSize: 12, fontWeight: '900' },

  

  // ── 2-column marketplace grid ─────────────────────────────────────────────
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  gridCard: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  gridImgWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F6F7',
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
    backgroundColor: 'rgba(19,194,150,0.92)',
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  gridStockOut: {
    backgroundColor: 'rgba(232,93,74,0.92)',
  },

  gridStockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  gridStockTxt: {
    color: '#fff',
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
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  gridPhotoTxt: {
    color: '#fff',
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
    color: '#fff',
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
    backgroundColor: '#E5E7EB',
  },

  gridSellerName: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
    flexShrink: 1,
  },

  gridTypeBadge: {
    backgroundColor: '#374151',
    borderRadius: 100,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  gridTypeBadgePage: {
    backgroundColor: BRAND,
  },

  gridTypeTxt: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },

  
  // ── Article cards (vertical list) ─────────────────────────────────────────
  articleCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  articleImg: { width: 90, height: 90, backgroundColor: 'rgba(12,63,68,0.06)' },
  articleBody: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  articleCatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(19,194,150,0.12)',
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
    width: 230, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  eventImg:   { width: '100%', height: 120, backgroundColor: 'rgba(12,63,68,0.06)' },
  eventTitle: { fontSize: 13.5, fontWeight: '900', color: DARK },
  eventMeta:  { marginTop: 4, fontSize: 11.5, color: MUTED },

  // ── Sponsored ─────────────────────────────────────────────────────────────
  sponsoredHeader:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  sponsoredTitle:   { fontSize: 10, color: MUTED, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  sponsoredCard:    { borderRadius: 14, overflow: 'hidden' },
  sponsoredInner:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sponsoredIconWrap:{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(19,194,150,0.12)', alignItems: 'center', justifyContent: 'center' },
  sponsoredCTA:     { fontSize: 13, fontWeight: '800', color: DARK },
  sponsoredSub:     { fontSize: 11, color: MUTED, marginTop: 2 },
  sponsoredBtn:     { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  sponsoredBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // ── Country modal ─────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 10, maxHeight: '70%',
  },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 12 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle:    { fontSize: 17, fontWeight: '900', color: DARK },
  countryRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  countryRowActive: { backgroundColor: 'rgba(19,194,150,0.05)' },
  countryName:   { fontSize: 15, color: DARK },

  emptyText: { marginTop: 6, color: MUTED, fontSize: 12 },

  // ── Trending article card (horizontal) ────────────────────────────────────
  trendCard: {
    width: 200, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  trendImg:   { width: '100%', height: 110, backgroundColor: 'rgba(12,63,68,0.06)' },
  trendBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  trendBadgeText: { fontSize: 9, fontWeight: '800', color: ACCENT },
  trendBody:  { padding: 10 },
  trendTitle: { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18 },
  trendMeta:  { marginTop: 5, fontSize: 10, color: MUTED },

  // ── Community list row ─────────────────────────────────────────────────────
  communityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
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
  communityRowJoinTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

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
  visaCircle1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', top: -50, right: -30 },
  visaCircle2: { position: 'absolute', width: 90,  height: 90,  borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -30, left: 50 },
  visaLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  visaIconWrap:{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  visaTitle:   { fontSize: 14, fontWeight: '900', color: '#fff' },
  visaSub:     { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  visaBtn:     { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  visaBtnText: { fontSize: 11, fontWeight: '900', color: '#2D1B69' },

  // ── Visa modal ────────────────────────────────────────────────────────────
  visaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  visaModalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  visaModalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20 },
  visaModalIconWrap: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: 'rgba(12,63,68,0.08)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14,
  },
  visaModalTitle: { fontSize: 20, fontWeight: '900', color: DARK, textAlign: 'center' },
  visaModalBody:  { marginTop: 8, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },

  visaContactCard: {
    marginTop: 18, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', backgroundColor: '#FAFCFC',
  },
  visaContactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  visaContactIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(12,63,68,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  visaContactLabel: { fontSize: 10, color: MUTED, fontWeight: '600' },
  visaContactValue: { fontSize: 14, fontWeight: '800', color: DARK, marginTop: 1 },
  visaCopyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(12,63,68,0.08)',
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
  visaCallBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  visaCloseBtn: {
    marginTop: 10, paddingVertical: 13, alignItems: 'center',
  },
  visaCloseBtnText: { color: MUTED, fontSize: 14, fontWeight: '700' },
  // ── Trending post card ────────────────────────────────────────────────────
  tpCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tpThumb: { width: 80, height: 80, backgroundColor: 'rgba(12,63,68,0.06)' },
  tpBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  tpBadgeText: { fontSize: 8, fontWeight: '800', color: ACCENT },
  tpBody:     { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
  tpUserRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tpAvatar:   { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(12,63,68,0.08)' },
  tpUsername: { fontSize: 11, fontWeight: '700', color: MUTED },
  tpTitle:    { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18 },
  tpStats:    { flexDirection: 'row', gap: 12 },
  tpStat:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tpStatText: { fontSize: 11, color: MUTED },

  // ── Featured business horizontal card ────────────────────────────────────
  fbCard:     { width: 240, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  fbAvatar:   { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(12,63,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  fbBody:     { flex: 1, gap: 2 },
  fbNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fbName:     { fontSize: 13, fontWeight: '900', color: DARK, flex: 1 },
  fbCat:      { fontSize: 11, color: ACCENT, fontWeight: '600' },
  fbDesc:     { fontSize: 11, color: MUTED, lineHeight: 15 },
  fbFollowers:{ fontSize: 10, color: MUTED, marginTop: 2 },

  // ── Quick Access chips ────────────────────────────────────────────────────
  qaChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(12,63,68,0.06)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(12,63,68,0.08)' },
  qaChipLabel: { fontSize: 12, fontWeight: '700', color: DARK },
  // Enhanced Quick Access
  qaSection:       { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  qaGroupCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(12,63,68,0.07)', shadowColor: '#0C3F44', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  qaGroupHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  qaGroupIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(12,63,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  qaGroupTitle:    { fontSize: 13, fontWeight: '800', color: BRAND, flex: 1 },
  qaGroupSub:      { fontSize: 10, fontWeight: '600', color: MUTED, letterSpacing: 0.3 },
  // Place chips (horizontal scroll)
  qaPlaceChip:     { alignItems: 'center', gap: 5, backgroundColor: 'rgba(12,63,68,0.05)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(12,63,68,0.09)', minWidth: 72 },
  qaPlaceIcon:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(12,63,68,0.07)', alignItems: 'center', justifyContent: 'center' },
  qaPlaceLabel:    { fontSize: 10, fontWeight: '700', color: BRAND, textAlign: 'center', maxWidth: 72 },
  // Topic chips (wrap)
  qaTopicChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(19,194,150,0.08)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(19,194,150,0.18)' },
  qaTopicLabel:    { fontSize: 12, fontWeight: '700', color: BRAND },

  // ── Sponsored biz (horizontal scroll cards) ───────────────────────────────
  sponsoredChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(122,145,152,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sponsoredChipText: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  sponsBizCard: { width: 200, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  sponsBizImg:  { width: '100%', height: 100, backgroundColor: 'rgba(12,63,68,0.06)' },
  sponsBizBody: { padding: 10 },
  sponsBizName: { fontSize: 13, fontWeight: '900', color: DARK },
  sponsBizSub:  { fontSize: 11, color: MUTED, marginTop: 2 },
  sponsBizBtn:  { marginHorizontal: 10, marginBottom: 10, backgroundColor: BRAND, borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  sponsBizBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },


});

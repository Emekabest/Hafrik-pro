// src/pages/pages_/ExploreScreen.jsx
// Explore hub — ordered sections: Communities → Business → Articles → Events → Jobs
import React, {
  useEffect, useState, useCallback, useRef, memo,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, ScrollView, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Banner from '../home/banner';
import StaticShortcutRow from '../home/quicklinks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../api/apiClient';
import { toggleGroupMembership } from '../groups/services/groupApi';
import { toggleFollowBusiness } from './Businessapi';
import { Colors } from '../../theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background;
const CARD   = Colors.white;
const BORDER = Colors.border;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const decodeHtml = (t = '') =>
  String(t)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('blank_profile') && !url.includes('default-avatar');

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return String(d); }
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = memo(({ title, onSeeAll }) => (
  <View style={s.secHeader}>
    <View style={s.secTitleRow}>
      <View style={s.secAccent} />
      <Text style={s.secTitle}>{title}</Text>
    </View>
    <TouchableOpacity onPress={onSeeAll} activeOpacity={0.8} style={s.seeAllBtn}>
      <Text style={s.seeAllTxt}>See all</Text>
      <Ionicons name="chevron-forward" size={13} color={ACCENT} />
    </TouchableOpacity>
  </View>
));

// ─── Community Card ───────────────────────────────────────────────────────────
const CommunityCard = memo(({ item, onPress }) => {
  const [isMember,    setIsMember]    = useState(!!(item.is_member || item.is_joined));
  const [memberCount, setMemberCount] = useState(Number(item.total_members ?? item.members ?? 0));
  const [loading,     setLoading]     = useState(false);
  const ref = useRef({ isMember, loading });
  ref.current = { isMember, loading };

  const avatar  = item.avatar ?? item.image ?? null;
  const name    = decodeHtml(item.title ?? item.name ?? '');

  const handleJoin = useCallback(async (e) => {
    e.stopPropagation?.();
    const { isMember: was, loading: busy } = ref.current;
    if (busy) return;
    setLoading(true);
    setIsMember(!was);
    setMemberCount(c => was ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await toggleGroupMembership(item.id, was ? 'leave' : 'join');
      const d   = res?.data ?? res;
      if (d?.is_joined   != null) setIsMember(!!d.is_joined);
      if (d?.members     != null) setMemberCount(Number(d.members) || 0);
    } catch {
      setIsMember(was);
      setMemberCount(c => was ? c + 1 : Math.max(0, c - 1));
    }
    setLoading(false);
  }, [item.id]);

  return (
    <TouchableOpacity style={s.comCard} onPress={onPress} activeOpacity={0.88}>
      {isRealImage(avatar) ? (
        <Image source={{ uri: avatar }} style={s.comAvatar} resizeMode="cover" />
      ) : (
        <View style={[s.comAvatar, s.avatarFb]}>
          <Ionicons name="people-outline" size={22} color={BRAND} />
        </View>
      )}
      <Text style={s.comName} numberOfLines={2}>{name || 'Community'}</Text>
      <View style={s.comMeta}>
        <Ionicons name="people-outline" size={11} color={MUTED} />
        <Text style={s.comMetaTxt}>{fmtCount(memberCount)} members</Text>
      </View>
      <TouchableOpacity
        style={[s.joinBtn, isMember && s.joinedBtn]}
        onPress={handleJoin}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator size="small" color={isMember ? MUTED : WHITE} />
          : <Text style={[s.joinBtnTxt, isMember && s.joinedBtnTxt]}>{isMember ? 'Joined' : 'Join'}</Text>
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─── Business Card ────────────────────────────────────────────────────────────
const BusinessCard = memo(({ item, onPress }) => {
  const [isFollowing, setIsFollowing] = useState(!!(item.is_liked || item.is_following));
  const [likeCount,   setLikeCount]   = useState(Number(item.likes ?? item.followers ?? item.followers_count ?? 0));
  const [loading,     setLoading]     = useState(false);
  const ref = useRef({ isFollowing, loading });
  ref.current = { isFollowing, loading };

  const avatar = item.avatar ?? null;
  const name   = decodeHtml(item.title ?? item.name ?? '');

  const handleFollow = useCallback(async (e) => {
    e.stopPropagation?.();
    const { isFollowing: was, loading: busy } = ref.current;
    if (busy) return;
    setLoading(true);
    setIsFollowing(!was);
    setLikeCount(c => was ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await toggleFollowBusiness(item.id, was ? 'unlike' : 'like');
      const d   = res?.data ?? res;
      if (d?.is_liked     != null) setIsFollowing(!!d.is_liked);
      else if (d?.is_following != null) setIsFollowing(!!d.is_following);
      const newCount = d?.likes ?? d?.followers;
      if (newCount != null) setLikeCount(Number(newCount) || 0);
    } catch {
      setIsFollowing(was);
      setLikeCount(c => was ? c + 1 : Math.max(0, c - 1));
    }
    setLoading(false);
  }, [item.id]);

  return (
    <TouchableOpacity style={s.bizCard} onPress={onPress} activeOpacity={0.88}>
      {isRealImage(avatar) ? (
        <Image source={{ uri: avatar }} style={s.bizAvatar} resizeMode="cover" />
      ) : (
        <View style={[s.bizAvatar, s.avatarFb]}>
          <Ionicons name="business-outline" size={22} color={BRAND} />
        </View>
      )}
      <Text style={s.bizName} numberOfLines={2}>{name || 'Business'}</Text>
      <View style={s.bizMeta}>
        <Ionicons name="heart-outline" size={11} color={MUTED} />
        <Text style={s.bizMetaTxt}>{fmtCount(likeCount)} followers</Text>
      </View>
      <TouchableOpacity
        style={[s.joinBtn, isFollowing && s.joinedBtn]}
        onPress={handleFollow}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator size="small" color={isFollowing ? MUTED : WHITE} />
          : <Text style={[s.joinBtnTxt, isFollowing && s.joinedBtnTxt]}>{isFollowing ? 'Following' : 'Follow'}</Text>
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─── Article Card ─────────────────────────────────────────────────────────────
const ArticleCard = memo(({ item, onPress }) => {
  const cover  = item.image ?? null;
  const title  = decodeHtml(item.title ?? '');
  const author = item.author?.name ?? item.author?.username ?? item.category_name ?? '';

  return (
    <TouchableOpacity style={s.artCard} onPress={onPress} activeOpacity={0.88}>
      {isRealImage(cover) ? (
        <Image source={{ uri: cover }} style={s.artCover} resizeMode="cover" />
      ) : (
        <View style={[s.artCover, s.artCoverFb]}>
          <Ionicons name="newspaper-outline" size={26} color={BRAND + '66'} />
        </View>
      )}
      <View style={s.artBody}>
        <Text style={s.artTitle} numberOfLines={3}>{title}</Text>
        {!!author && <Text style={s.artAuthor} numberOfLines={1}>{author}</Text>}
      </View>
    </TouchableOpacity>
  );
});

// ─── Event Card ───────────────────────────────────────────────────────────────
const EventCard = memo(({ item, onPress }) => {
  const banner = item.banner ?? item.cover ?? item.image ?? null;
  const title  = decodeHtml(item.title ?? item.name ?? '');
  const date   = fmtDate(item.date ?? item.start_date ?? item.event_date ?? '');

  return (
    <TouchableOpacity style={s.evtCard} onPress={onPress} activeOpacity={0.88}>
      {isRealImage(banner) ? (
        <Image source={{ uri: banner }} style={s.evtBanner} resizeMode="cover" />
      ) : (
        <View style={[s.evtBanner, s.evtBannerFb]}>
          <Ionicons name="calendar-outline" size={26} color={BRAND + '66'} />
        </View>
      )}
      <View style={s.evtBody}>
        <Text style={s.evtTitle} numberOfLines={2}>{title || 'Event'}</Text>
        {!!date && (
          <View style={s.evtDateRow}>
            <Ionicons name="calendar-outline" size={11} color={ACCENT} />
            <Text style={s.evtDate}>{date}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Job Card ─────────────────────────────────────────────────────────────────
const JobCard = memo(({ item, onPress }) => {
  const title    = decodeHtml(item.title ?? '');
  const company  = decodeHtml(item.company ?? item.company_name ?? item.employer ?? '');
  const location = decodeHtml(item.location ?? '');

  return (
    <TouchableOpacity style={s.jobCard} onPress={onPress} activeOpacity={0.88}>
      <View style={s.jobIcon}>
        <Ionicons name="briefcase-outline" size={20} color={BRAND} />
      </View>
      <Text style={s.jobTitle} numberOfLines={2}>{title || 'Job Listing'}</Text>
      {!!company  && <Text style={s.jobCompany}  numberOfLines={1}>{company}</Text>}
      {!!location && (
        <View style={s.jobLocRow}>
          <Ionicons name="location-outline" size={11} color={MUTED} />
          <Text style={s.jobLoc} numberOfLines={1}>{location}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section = ({ title, onSeeAll, data, loading, renderItem, keyExtractor, emptyText }) => {
  if (loading) {
    return (
      <View style={s.section}>
        <SectionHeader title={title} onSeeAll={onSeeAll} />
        <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
      </View>
    );
  }
  if (!data.length) return null; // hide empty sections

  return (
    <View style={s.section}>
      <SectionHeader title={title} onSeeAll={onSeeAll} />
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={s.hList}
        getItemLayout={(_, i) => ({ length: 150, offset: 150 * i, index: i })}
      />
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();

  const [communities, setCommunities] = useState([]);
  const [businesses,  setBusinesses]  = useState([]);
  const [articles,    setArticles]    = useState([]);
  const [events,      setEvents]      = useState([]);
  const [jobs,        setJobs]        = useState([]);

  const [loadingCom, setLoadingCom] = useState(true);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [loadingArt, setLoadingArt] = useState(true);
  const [loadingEvt, setLoadingEvt] = useState(true);
  const [loadingJob, setLoadingJob] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    // All 5 sections fire in parallel — no dependency between them
    const [comRes, bizRes, artRes, evtRes, jobRes] = await Promise.allSettled([
      apiClient.get('/communities/list.php', { params: { suggested: 1, limit: 10 } }),
      apiClient.get('/business/list.php',    { params: { suggested: 1, limit: 10 } }),
      apiClient.get('/articles/list.php',    { params: { page: 1, limit: 10 } }),
      apiClient.get('/events/list.php',      { params: { upcoming: 1, limit: 10 } }),
      apiClient.get('/jobs/list.php',        { params: { limit: 10 } }),
    ]);

    // Communities
    if (comRes.status === 'fulfilled') {
      const d = comRes.value.data;
      const items = Array.isArray(d?.data?.data) ? d.data.data
        : Array.isArray(d?.data) ? d.data : [];
      setCommunities(items.slice(0, 10));
    }
    setLoadingCom(false);

    // Business
    if (bizRes.status === 'fulfilled') {
      const d = bizRes.value.data;
      const items = Array.isArray(d?.data?.data) ? d.data.data
        : Array.isArray(d?.data) ? d.data : [];
      setBusinesses(items.slice(0, 10));
    }
    setLoadingBiz(false);

    // Articles
    if (artRes.status === 'fulfilled') {
      const d = artRes.value.data;
      const items = Array.isArray(d?.data) ? d.data
        : Array.isArray(d) ? d : [];
      setArticles(items.slice(0, 10));
    }
    setLoadingArt(false);

    // Events
    if (evtRes.status === 'fulfilled') {
      const d = evtRes.value.data;
      const items = Array.isArray(d?.data) ? d.data
        : Array.isArray(d) ? d : [];
      setEvents(items.slice(0, 10));
    }
    setLoadingEvt(false);

    // Jobs
    if (jobRes.status === 'fulfilled') {
      const d = jobRes.value.data;
      const items = Array.isArray(d?.data?.data) ? d.data.data
        : Array.isArray(d?.data) ? d.data
        : Array.isArray(d) ? d : [];
      setJobs(items.slice(0, 10));
    }
    setLoadingJob(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingCom(true); setLoadingBiz(true); setLoadingArt(true);
    setLoadingEvt(true); setLoadingJob(true);
    setCommunities([]); setBusinesses([]); setArticles([]); setEvents([]); setJobs([]);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  return (
    <View style={[s.root, { paddingTop: top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <Text style={s.headerTitle}>Explore</Text>
        <TouchableOpacity
          style={s.searchBtn}
          onPress={() => navigation.navigate('SearchScreen')}
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* Quick links */}
        <StaticShortcutRow />

        {/* Banner slider (includes HafrikTV slide) */}
        <Banner />

        {/* 1. Communities */}
        <Section
          title="Communities"
          onSeeAll={() => navigation.navigate('GroupScreen')}
          data={communities}
          loading={loadingCom}
          keyExtractor={(item) => `com-${item.id}`}
          renderItem={({ item }) => (
            <CommunityCard
              item={item}
              onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
            />
          )}
        />

        {/* 2. Business */}
        <Section
          title="Business"
          onSeeAll={() => navigation.navigate('BusinessPages')}
          data={businesses}
          loading={loadingBiz}
          keyExtractor={(item) => `biz-${item.id}`}
          renderItem={({ item }) => (
            <BusinessCard
              item={item}
              onPress={() => navigation.navigate('BusinessDetails', { pageId: item.id })}
            />
          )}
        />

        {/* 3. Articles */}
        <Section
          title="Articles"
          onSeeAll={() => navigation.navigate('ArticlesScreen')}
          data={articles}
          loading={loadingArt}
          keyExtractor={(item) => `art-${item.id ?? item.post_id}`}
          renderItem={({ item }) => (
            <ArticleCard
              item={item}
              onPress={() => navigation.navigate('ArticleDetails', { postId: item.post_id ?? item.id })}
            />
          )}
        />

        {/* 4. Events */}
        <Section
          title="Events"
          onSeeAll={() => navigation.navigate('EventsScreen')}
          data={events}
          loading={loadingEvt}
          keyExtractor={(item) => `evt-${item.id}`}
          renderItem={({ item }) => (
            <EventCard
              item={item}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
        />

        {/* 5. Jobs */}
        <Section
          title="Jobs"
          onSeeAll={() => navigation.navigate('JobsScreen')}
          data={jobs}
          loading={loadingJob}
          keyExtractor={(item) => `job-${item.id}`}
          renderItem={({ item }) => (
            <JobCard
              item={item}
              onPress={() => navigation.navigate('JobsScreen')}
            />
          )}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_W = 150;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 100 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    gap: 10,
  },
  headerAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: ACCENT },
  headerTitle:  { flex: 1, fontSize: 22, fontWeight: '900', color: DARK },
  searchBtn:    {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Section ──
  section:     { marginTop: 20 },
  secHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  secTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secAccent:   { width: 3, height: 16, borderRadius: 2, backgroundColor: ACCENT },
  secTitle:    { fontSize: 16, fontWeight: '800', color: DARK },
  seeAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllTxt:   { fontSize: 13, fontWeight: '700', color: ACCENT },
  hList:       { paddingHorizontal: 16, gap: 12 },

  // ── Join / Follow shared button ──
  joinBtn: {
    marginTop: 'auto', backgroundColor: BRAND,
    paddingVertical: 6, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 30,
  },
  joinedBtn:    { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER },
  joinBtnTxt:   { fontSize: 12, fontWeight: '800', color: WHITE },
  joinedBtnTxt: { color: MUTED },

  // ── Avatar fallback ──
  avatarFb: { backgroundColor: BRAND + '18', alignItems: 'center', justifyContent: 'center' },

  // ── Community card ──
  comCard: {
    width: CARD_W, backgroundColor: CARD, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  comAvatar:  { width: 52, height: 52, borderRadius: 14, marginBottom: 10, backgroundColor: BORDER },
  comName:    { fontSize: 13, fontWeight: '800', color: DARK, marginBottom: 4, lineHeight: 17 },
  comMeta:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  comMetaTxt: { fontSize: 11, color: MUTED },

  // ── Business card ──
  bizCard: {
    width: CARD_W, backgroundColor: CARD, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  bizAvatar:  { width: 52, height: 52, borderRadius: 14, marginBottom: 10, backgroundColor: BORDER },
  bizName:    { fontSize: 13, fontWeight: '800', color: DARK, marginBottom: 4, lineHeight: 17 },
  bizMeta:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  bizMetaTxt: { fontSize: 11, color: MUTED },

  // ── Article card ──
  artCard: {
    width: 180, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  artCover:   { width: '100%', height: 100 },
  artCoverFb: { backgroundColor: BRAND + '12', alignItems: 'center', justifyContent: 'center' },
  artBody:    { padding: 10 },
  artTitle:   { fontSize: 12, fontWeight: '700', color: DARK, lineHeight: 17, marginBottom: 4 },
  artAuthor:  { fontSize: 11, color: ACCENT, fontWeight: '600' },

  // ── Event card ──
  evtCard: {
    width: 200, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  evtBanner:   { width: '100%', height: 110 },
  evtBannerFb: { backgroundColor: BRAND + '12', alignItems: 'center', justifyContent: 'center' },
  evtBody:     { padding: 10 },
  evtTitle:    { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18, marginBottom: 6 },
  evtDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evtDate:     { fontSize: 11, color: ACCENT, fontWeight: '600' },

  // ── Job card ──
  jobCard: {
    width: 180, backgroundColor: CARD, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: BORDER,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  jobIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: BRAND + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  jobTitle:   { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18, marginBottom: 4 },
  jobCompany: { fontSize: 12, color: ACCENT, fontWeight: '600', marginBottom: 6 },
  jobLocRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  jobLoc:     { fontSize: 11, color: MUTED },
});

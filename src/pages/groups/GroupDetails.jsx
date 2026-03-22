import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  ActivityIndicator, Dimensions, Animated, Alert,
  ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';

import FeedCard from '../home/feeds/feedcard';
import GroupMedia from './GroupMedia';
import { Colors } from '../../theme/colors';
import apiClient from '../../api/apiClient';
import {
  getGroupDetails, getGroupFeed, getGroupMembers,
  toggleGroupMembership,
} from './services/groupApi';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const { width: W } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

const TAB_W = W / 4;

// ── Ad banner ─────────────────────────────────────────────────────────────────
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
        <Text style={adst.adSub}>Reach thousands across Africa.</Text>
        <View style={adst.cta}>
          <Text style={adst.ctaTxt}>Learn More</Text>
          <Ionicons name="arrow-forward" size={12} color={ACCENT} />
        </View>
      </View>
    </View>
  </View>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const decodeHtml = (t = '') =>
  String(t)
    .replace(/&amp;/g,   '&').replace(/&lt;/g,    '<').replace(/&gt;/g,   '>')
    .replace(/&quot;/g,  '"').replace(/&#39;/g,   "'").replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&rsquo;/g, "'").replace(/&lsquo;/g,"'")
    .replace(/&ndash;/g, '–').replace(/&hellip;/g,'…').replace(/&amp;amp;/g,'&');

const cleanText = (t = '') =>
  decodeHtml(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const isRealImg = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');


// ── Member row ────────────────────────────────────────────────────────────────
const MemberRow = ({ item, index, onPress }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: Math.min(index * 30, 300),
      useNativeDriver: true, tension: 80, friction: 10,
    }).start();
  }, []);

  const name    = cleanText(item.full_name ?? item.username ?? 'Member');
  const avatar  = item.avatar ?? null;
  const role    = item.role ?? item.type ?? '';
  const isAdmin = role === 'admin' || role === 'owner';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72}>
      <Animated.View style={[
        ms.row,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}>
        {isRealImg(avatar) ? (
          <Image source={{ uri: avatar }} style={ms.avatar} />
        ) : (
          <LinearGradient colors={[BRAND, Colors.tealWaveAlt]} style={[ms.avatar, ms.avatarFb]}>
            <Ionicons name="person" size={18} color={Colors.white} />
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={ms.name} numberOfLines={1}>{name}</Text>
          {!!cleanText(item.bio ?? '') && (
            <Text style={ms.bio} numberOfLines={1}>{cleanText(item.bio)}</Text>
          )}
        </View>
        {isAdmin && (
          <View style={ms.rolePill}>
            <Text style={ms.roleTxt}>{role.toUpperCase()}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={withOpacity(MUTED, 0.5)} style={{ marginLeft: 4 }} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Compose prompt (top of posts tab) ────────────────────────────────────────
const ComposePrompt = ({ group, onOpen }) => (
  <TouchableOpacity style={cpr.row} activeOpacity={0.85} onPress={onOpen}>
    <LinearGradient colors={[BRAND, Colors.tealNavy]} style={cpr.avatar}>
      <Ionicons name="person" size={14} color={Colors.white} />
    </LinearGradient>
    <View style={cpr.input}>
      <Text style={cpr.placeholder}>
        Share something with {cleanText(group?.title ?? 'this group')}…
      </Text>
    </View>
    <Ionicons name="send" size={16} color={ACCENT} />
  </TouchableOpacity>
);

// ── About section (tab 3) ─────────────────────────────────────────────────────
const AboutSection = ({ group }) => {
  const rows = [
    { icon: 'information-circle-outline', label: 'About',    value: cleanText(group?.about ?? '') },
    { icon: 'lock-closed-outline',        label: 'Privacy',  value: (() => { const p = (group?.privacy ?? group?.type ?? ''); return p ? p.charAt(0).toUpperCase() + p.slice(1) : null; })() },
    { icon: 'grid-outline',               label: 'Category', value: cleanText(group?.category ?? '') || null },
    { icon: 'location-outline',           label: 'Location', value: cleanText(group?.location ?? '') || null },
    { icon: 'link-outline',               label: 'Website',  value: group?.website ?? null },
    { icon: 'calendar-outline',           label: 'Created',  value: group?.created_at ? String(group.created_at).split(' ')[0] : null },
  ].filter((r) => !!r.value);

  if (rows.length === 0) {
    return (
      <View style={abt.emptyWrap}>
        <Ionicons name="information-circle-outline" size={36} color={MUTED} />
        <Text style={abt.emptyTxt}>No additional info yet</Text>
      </View>
    );
  }

  return (
    <View style={abt.wrap}>
      {rows.map(({ icon, label, value }) => (
        <View key={label} style={abt.row}>
          <View style={abt.iconBox}>
            <Ionicons name={icon} size={18} color={BRAND} />
          </View>
          <View style={abt.col}>
            <Text style={abt.label}>{label}</Text>
            <Text style={abt.value}>{value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ── GroupDetails main ─────────────────────────────────────────────────────────
export default function GroupDetails({ route }) {
  const { groupId, openCompose: autoCompose } = route.params ?? {};
  const navigation    = useNavigation();
  const { top }       = useSafeAreaInsets();
  const { token }     = useAuth();
  const openComposer       = useStore((s) => s.openComposer);
  const refreshSignal      = useStore((s) => s.refreshSignal);
  const lastCreatedPost    = useStore((s) => s.lastCreatedPost);
  const clearLastCreatedPost = useStore((s) => s.clearLastCreatedPost);

  const normaliseList = (res) => {
    const d = res?.data;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d))       return d;
    return [];
  };

  const [group,           setGroup]           = useState(null);
  const [posts,           setPosts]           = useState([]);
  const [members,         setMembers]         = useState([]);
  const [activeTab,       setActiveTab]       = useState(0);
  const [isMember,        setIsMember]        = useState(false);
  const [joining,         setJoining]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [feedPage,        setFeedPage]        = useState(1);
  const [feedHasMore,     setFeedHasMore]     = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [membersPage,     setMembersPage]     = useState(1);
  const [membersHasMore,  setMembersHasMore]  = useState(true);

  const indX       = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scrollY    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (autoCompose && isMember) openComposer({
      locked: true,
      target_type: 'group',
      target_id: group?.id ?? groupId,
      title: group?.title,
      avatar: group?.avatar,
    });
  }, [autoCompose, isMember]);

  // Refresh feed whenever a post is published from the global composer
  const prevRefreshSignal = useRef(0);
  useEffect(() => {
    if (refreshSignal > 0 && refreshSignal !== prevRefreshSignal.current) {
      prevRefreshSignal.current = refreshSignal;
      loadData();
    }
  }, [refreshSignal]);

  // Optimistic prepend when a new post is created for this group
  useEffect(() => {
    if (!lastCreatedPost) return;
    const { post, target_type, target_id } = lastCreatedPost;
    if (target_type === 'group' && String(target_id) === String(groupId)) {
      setPosts(prev => [post, ...prev.filter(p => p.id !== post.id)]);
      setActiveTab(0); // switch to Posts tab
    }
    clearLastCreatedPost();
  }, [lastCreatedPost]);

  const loadData = async () => {
    const [gRes, fRes, mRes] = await Promise.all([
      getGroupDetails(groupId),
      getGroupFeed(groupId, 1, 20),
      getGroupMembers(groupId, 1, 50),
    ]);
    if (gRes?.status === 'success') {
      // API shape: { status, data: { group: { ... } } }
      const d = gRes.data?.group ?? gRes.data;
      setGroup(d);
      setIsMember(d?.is_joined === true || d?.is_joined === 1 || d?.is_member === true || d?.is_member === 1);
    }
    if (fRes?.status === 'success') {
      const data = normaliseList(fRes);
      setPosts(data);
      setFeedPage(1);
      setFeedHasMore(data.length === 20);
    }
    if (mRes?.status === 'success') {
      const data = normaliseList(mRes);
      setMembers(data);
      setMembersPage(1);
      setMembersHasMore(data.length === 50);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadMoreFeed = useCallback(async () => {
    if (feedLoadingMore || !feedHasMore) return;
    setFeedLoadingMore(true);
    const nextPage = feedPage + 1;
    try {
      const res = await getGroupFeed(groupId, nextPage, 20);
      if (res?.status === 'success') {
        const data = normaliseList(res);
        if (data.length > 0) {
          setPosts((prev) => [...prev, ...data]);
          setFeedPage(nextPage);
          setFeedHasMore(data.length === 20);
        } else {
          setFeedHasMore(false);
        }
      }
    } catch { /* ignore */ }
    finally { setFeedLoadingMore(false); }
  }, [feedLoadingMore, feedHasMore, feedPage, groupId, token]);

  const loadMoreMembers = useCallback(async () => {
    if (!membersHasMore) return;
    const nextPage = membersPage + 1;
    try {
      const res = await getGroupMembers(groupId, nextPage, 50);
      if (res?.status === 'success') {
        const data = normaliseList(res);
        if (data.length > 0) {
          setMembers((prev) => [...prev, ...data]);
          setMembersPage(nextPage);
          setMembersHasMore(data.length === 50);
        } else {
          setMembersHasMore(false);
        }
      }
    } catch { /* ignore */ }
  }, [membersHasMore, membersPage, groupId, token]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const switchTab = (i) => {
    setActiveTab(i);
    Animated.spring(indX, {
      toValue: i * TAB_W, useNativeDriver: true, tension: 120, friction: 9,
    }).start();
  };

  const handleJoinLeave = async () => {
    if (joining) return;
    setJoining(true);
    const was = isMember;
    // Optimistic update
    setIsMember(!was);
    setGroup((g) => g ? { ...g, members: Math.max(0, (Number(g.members) || 0) + (was ? -1 : 1)) } : g);
    try {
      const res = await toggleGroupMembership(groupId, was ? 'leave' : 'join');
      // Reconcile with server response: { group_id, is_joined, members }
      const d = res?.data ?? res;
      if (d?.is_joined !== undefined) setIsMember(!!d.is_joined);
      if (d?.members   !== undefined) setGroup((g) => g ? { ...g, members: Number(d.members) || 0 } : g);
    } catch {
      Alert.alert('Error', 'Could not update membership.');
      setIsMember(was);
      setGroup((g) => g ? { ...g, members: Math.max(0, (Number(g.members) || 0) + (was ? 1 : -1)) } : g);
    } finally {
      setJoining(false);
    }
  };

  const openGroupComposer = useCallback(() => {
    openComposer({
      locked:      true,
      target_type: 'group',
      target_id:   group?.id ?? groupId,
      title:       group?.title,
      avatar:      group?.avatar,
    });
  }, [openComposer, group, groupId]);

  const coverTranslate = scrollY.interpolate({
    inputRange: [0, 180], outputRange: [0, -60], extrapolate: 'clamp',
  });

  const aboutText = cleanText(group?.about ?? '');
  const title     = cleanText(group?.title ?? '');
  const isPrivate = (group?.privacy ?? group?.type ?? '') === 'private';

  // ── List header component ─────────────────────────────────────────────────
  const ListHeader = (
    <>
      {/* ── Hero: full cover with group name + stats overlaid at bottom ── */}
      <View style={ds.hero}>
        <Animated.View style={[ds.coverAnimWrap, { transform: [{ translateY: coverTranslate }] }]}>
          {isRealImg(group?.cover) ? (
            <ExpoImage source={{ uri: group.cover }} style={ds.cover} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[BRAND, Colors.tealNavyAlt, Colors.tealNavyStrong, ACCENT + '70']}
              style={ds.cover}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
          )}
          <LinearGradient
            colors={[withOpacity(Colors.deepSlateAlt, 0.05), withOpacity(Colors.deepSlateAlt, 0.55), withOpacity(Colors.deepSlateStrong, 0.94)]}
            style={ds.heroGrad}
          />
        </Animated.View>

        {/* Group name, category, stats at bottom of cover */}
        <View style={ds.heroBottom}>
          <View style={ds.heroTitleRow}>
            <Text style={ds.heroTitle} numberOfLines={2}>{title || 'Community'}</Text>
            {isPrivate && (
              <Ionicons name="lock-closed" size={16} color={withOpacity(Colors.white, 0.65)} style={{ marginLeft: 8, marginTop: 3 }} />
            )}
          </View>
          <View style={ds.heroMeta}>
            {!!cleanText(group?.category ?? '') && (
              <View style={ds.heroCatChip}>
                <Text style={ds.heroCatTxt}>{cleanText(group.category)}</Text>
              </View>
            )}
            <Ionicons name="people" size={13} color={withOpacity(Colors.white, 0.75)} />
            <Text style={ds.heroMetaTxt}>{fmtCount(group?.members ?? 0)} members</Text>
            <Text style={ds.heroDot}>·</Text>
            <Text style={ds.heroMetaTxt}>{fmtCount(group?.posts_count ?? posts.length)} posts</Text>
            {isMember && (
              <View style={ds.memberPill}>
                <Ionicons name="checkmark-circle" size={12} color={ACCENT} />
                <Text style={ds.memberPillTxt}>Member</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Info strip: avatar + about + join ── */}
      <View style={ds.infoStrip}>
        <View style={ds.avatarWrap}>
          {isRealImg(group?.avatar) ? (
            <Image source={{ uri: group.avatar }} style={ds.avatar} />
          ) : (
            <LinearGradient colors={[BRAND, Colors.tealWaveAlt]} style={[ds.avatar, ds.avatarFb]}>
              <Ionicons name="people" size={28} color={Colors.white} />
            </LinearGradient>
          )}
        </View>
        <View style={ds.stripRight}>
          {!!aboutText && (
            <Text style={ds.stripAbout} numberOfLines={2}>{aboutText}</Text>
          )}
          <TouchableOpacity
            style={[ds.joinBtn, isMember && ds.leaveBtn]}
            onPress={handleJoinLeave}
            disabled={joining}
            activeOpacity={0.85}
          >
            {joining
              ? <ActivityIndicator size="small" color={isMember ? BRAND : Colors.white} />
              : (
                <>
                  <Ionicons
                    name={isMember ? 'exit-outline' : 'people-outline'}
                    size={15} color={isMember ? BRAND : Colors.white}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[ds.joinTxt, isMember && ds.leaveTxt]}>
                    {isMember ? 'Leave Community' : 'Join Community'}
                  </Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={ds.tabBar}>
        {['FEED', 'MEDIA', 'MEMBERS', 'ABOUT'].map((t, i) => (
          <TouchableOpacity key={t} style={ds.tabBtn} onPress={() => switchTab(i)} activeOpacity={0.8}>
            <Text style={[ds.tabTxt, activeTab === i && ds.tabTxtOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[ds.tabInd, { transform: [{ translateX: indX }] }]} />
      </View>

      {/* Compose prompt — members only, feed tab */}
      {isMember && activeTab === 0 && (
        <ComposePrompt group={group} onOpen={openGroupComposer} />
      )}
    </>
  );

  const [visiblePostId, setVisiblePostId] = useState(null);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab !== 0) setVisiblePostId(null);
  }, [activeTab]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (activeTabRef.current !== 0) {
      setVisiblePostId(null);
      return;
    }

    const nextVisibleId = viewableItems.find((entry) => entry?.isViewable && entry?.item?.id)?.item?.id ?? null;
    setVisiblePostId((prev) => (prev === nextVisibleId ? prev : nextVisibleId));
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    waitForInteraction: false,
  });

  // Inject ad every 5 posts in the feed
  const processedPosts = useMemo(() => {
    const result = [];
    posts.forEach((post, i) => {
      result.push(post);
      if ((i + 1) % 5 === 0 && i + 1 < posts.length) {
        result.push({ _isAd: true, id: `ad-${i}` });
      }
    });
    return result;
  }, [posts]);

  const renderItem = useCallback(({ item, index }) => {
    if (activeTab === 0) {
      if (item._isAd) return <AdBanner />;
      return <FeedCard feed={item} isVisible={visiblePostId === item?.id} />;
    }
    if (activeTab === 2) return (
      <MemberRow
        item={item}
        index={index}
        onPress={() => navigation.navigate('UserProfile', {
          userId: item.id ?? item.user_id,
          username: item.username ?? '',
        })}
      />
    );
    return null;
  }, [activeTab, visiblePostId, navigation]);

  const listData = activeTab === 0 ? processedPosts : members;

  if (loading) {
    return (
      <View style={ds.loaderWrap}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[BRAND, Colors.tealNavy]} style={ds.loaderGrad}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={ds.loaderTxt}>Loading community…</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={ds.root}>
      <StatusBar barStyle="light-content" />

      {/* Floating back + compose buttons */}
      <Animated.View
        style={[ds.floatRow, { top: top + 10, opacity: headerAnim, transform: [{ scale: headerAnim }] }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={ds.floatBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        {isMember && (
          <TouchableOpacity style={[ds.floatBtn, ds.floatBtnRight]} onPress={openGroupComposer} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={Colors.white} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* MEDIA → GroupMedia (self-scrolling, drives parallax via onScroll prop)  */}
      {/* ABOUT → ScrollView with info fields                                       */}
      {/* FEED + MEMBERS → shared Animated.FlatList                                 */}
      {activeTab === 1 ? (
        <GroupMedia
          groupId={groupId}
          token={token}
          listHeaderComponent={ListHeader}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        />
      ) : activeTab === 3 ? (
        <Animated.ScrollView
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          {ListHeader}
          <AboutSection group={group} />
        </Animated.ScrollView>
      ) : (
        <Animated.FlatList
          data={listData}
          keyExtractor={(item, i) => item._isAd ? item.id : String(item.id ?? i)}
          renderItem={renderItem}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          extraData={visiblePostId}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={ds.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={activeTab === 0 ? loadMoreFeed : loadMoreMembers}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            (activeTab === 0 && feedLoadingMore)
              ? <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 16 }} />
              : null
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={ds.emptyWrap}>
              <LinearGradient colors={[ACCENT + '22', BRAND + '11']} style={ds.emptyCircle}>
                <Ionicons
                  name={activeTab === 2 ? 'people-outline' : 'document-text-outline'}
                  size={36} color={MUTED}
                />
              </LinearGradient>
              <Text style={ds.emptyTxt}>{activeTab === 2 ? 'No members found' : 'No posts yet'}</Text>
              {isMember && activeTab === 0 && (
                <TouchableOpacity style={ds.emptyPostBtn} onPress={openGroupComposer}>
                  <Text style={ds.emptyPostBtnTxt}>Be the first to post</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ds = StyleSheet.create({
  root:       { flex: 1, backgroundColor: CREAM },
  loaderWrap: { flex: 1 },
  loaderGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderTxt:  { color: Colors.white, fontSize: 14, fontWeight: '600' },

  // ── Hero ──
  hero:         { height: 260, overflow: 'hidden', position: 'relative' },
  coverAnimWrap:{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  cover:        { width: '100%', height: 320 },
  heroGrad:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 20,
  },
  heroTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  heroTitle:    { fontSize: 24, fontWeight: '900', color: Colors.white, lineHeight: 30, flex: 1 },
  heroMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  heroCatChip: {
    backgroundColor: withOpacity(Colors.tealAccent, 0.28), borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: withOpacity(Colors.tealAccent, 0.5),
  },
  heroCatTxt:  { fontSize: 10, fontWeight: '800', color: ACCENT },
  heroMetaTxt: { fontSize: 12, color: withOpacity(Colors.white, 0.82), fontWeight: '600' },
  heroDot:     { fontSize: 15, color: withOpacity(Colors.white, 0.35), lineHeight: 18 },
  memberPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: withOpacity(Colors.tealAccent, 0.22), borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: withOpacity(Colors.tealAccent, 0.5),
  },
  memberPillTxt: { fontSize: 10, fontWeight: '800', color: ACCENT },

  // ── Info strip ──
  infoStrip: {
    backgroundColor: Colors.white,
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingTop: 6, paddingHorizontal: 14, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 20,
    overflow: 'hidden', borderWidth: 4, borderColor: Colors.white,
    marginTop: -36,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  avatar:     { width: '100%', height: '100%' },
  avatarFb:   { alignItems: 'center', justifyContent: 'center' },
  stripRight: { flex: 1, paddingTop: 4, gap: 8 },
  stripAbout: { fontSize: 13, color: Colors.slateDeep, lineHeight: 19 },

  // ── Floating back/compose buttons ──
  floatRow: {
    position: 'absolute', left: 14, right: 14, zIndex: 50,
    flexDirection: 'row', alignItems: 'center',
  },
  floatBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: withOpacity(Colors.primaryDark, 0.65),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withOpacity(Colors.white, 0.18),
  },
  floatBtnRight: { marginLeft: 'auto' },

  // ── Join / Leave ──
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND, borderRadius: 100, paddingVertical: 10,
  },
  leaveBtn: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: BRAND },
  joinTxt:  { fontSize: 13, fontWeight: '800', color: Colors.white },
  leaveTxt: { color: BRAND },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: BORDER, position: 'relative',
  },
  tabBtn:  { width: TAB_W, alignItems: 'center', paddingVertical: 13 },
  tabTxt:  { fontSize: 10.5, fontWeight: '700', color: MUTED, letterSpacing: 0.8 },
  tabTxtOn:{ color: BRAND },
  tabInd: {
    position: 'absolute', bottom: 0, width: TAB_W, height: 3,
    backgroundColor: ACCENT, borderRadius: 2,
  },

  listContent: { paddingBottom: 120 },

  emptyWrap:       { alignItems: 'center', paddingTop: 56, paddingHorizontal: 24, gap: 12 },
  emptyCircle:     { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  emptyTxt:        { fontSize: 15, fontWeight: '700', color: DARK },
  emptyPostBtn:    { backgroundColor: BRAND, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  emptyPostBtnTxt: { fontSize: 13, fontWeight: '800', color: Colors.white },
});

const cpr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, padding: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 2,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, height: 40, backgroundColor: CREAM, borderRadius: 20,
    paddingHorizontal: 14, justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  placeholder: { fontSize: 13, color: MUTED },
});

const cs = StyleSheet.create({
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: withOpacity(Colors.black, 0.45),
  },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 34, minHeight: 340,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 40, height: 5, backgroundColor: withOpacity(Colors.primaryDark, 0.15),
    borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle:      { flex: 1, fontSize: 15, fontWeight: '800', color: DARK },
  postBtn:         { backgroundColor: BRAND, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100 },
  postBtnDisabled: { opacity: 0.4 },
  postBtnTxt:      { color: Colors.white, fontSize: 13, fontWeight: '800' },
  textArea: {
    minHeight: 120, paddingHorizontal: 20, paddingTop: 14,
    fontSize: 15, color: DARK, lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  mediaAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER,
  },
  mediaActionTxt: { fontSize: 12, fontWeight: '700', color: BRAND },
});

const ms = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  avatar:   { width: 46, height: 46, borderRadius: 14 },
  avatarFb: { alignItems: 'center', justifyContent: 'center' },
  name:     { fontSize: 14, fontWeight: '700', color: DARK },
  bio:      { fontSize: 12, color: MUTED, marginTop: 2 },
  rolePill: {
    backgroundColor: ACCENT + '22', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roleTxt: { fontSize: 9, fontWeight: '900', color: Colors.successStrong, letterSpacing: 0.5 },
});

const abt = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    marginHorizontal: 0,
    paddingVertical: 8,
    paddingBottom: 100,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  col:   { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 3, letterSpacing: 0.4 },
  value: { fontSize: 13.5, color: DARK, lineHeight: 20 },
  emptyWrap: { alignItems: 'center', paddingTop: 56, gap: 12 },
  emptyTxt:  { fontSize: 14, fontWeight: '700', color: MUTED },
});

const adst = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white, marginHorizontal: 0, borderRadius: 0,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: withOpacity(Colors.primaryDark, 0.07),
    shadowColor: DARK, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    marginVertical: 2,
  },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingTop: 10, marginBottom: 6 },
  sponsorTxt: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  body:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  imgBox:     { width: 72, height: 72, borderRadius: 14, backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center' },
  text:       { flex: 1 },
  adTitle:    { fontSize: 14, fontWeight: '800', color: DARK, lineHeight: 19, marginBottom: 3 },
  adSub:      { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 7 },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaTxt:     { fontSize: 12, fontWeight: '800', color: ACCENT },
});

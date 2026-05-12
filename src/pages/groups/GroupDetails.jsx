import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import FeedCard from '../home/feeds/feedcard';
import CommentModal from '../home/feeds/comments/commentmodal';
import GroupMedia from './GroupMedia';
import { Colors } from '../../theme/colors';
import {
  getGroupDetails,
  getGroupFeed,
  getGroupMembers,
  toggleGroupMembership,
} from './services/groupApi';

const withOpacity = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const { width: W } = Dimensions.get('window');

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F8F8';
const CARD = Colors.white;
const DARK = Colors.deepSlate ?? Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = withOpacity(Colors.primaryDark, 0.1);
const WHITE = Colors.white;
const BLACK = Colors.black;
const GOLD = '#F2A900';
const GREEN = '#18A957';
const RED = '#E5484D';
const HERO_H = 278;
const AVATAR = 92;

const TABS = [
  { key: 'feed', label: 'Feed', icon: 'albums-outline' },
  { key: 'media', label: 'Media', icon: 'images-outline' },
  { key: 'members', label: 'Members', icon: 'people-outline' },
  { key: 'about', label: 'About', icon: 'information-circle-outline' },
];

const decodeHtml = (t = '') =>
  String(t)
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const cleanText = (t = '') =>
  decodeHtml(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const isRealImg = (url) =>
  typeof url === 'string' &&
  url.trim().length > 6 &&
  !url.includes('default-avatar') &&
  !url.includes('blank_profile');

const normaliseList = (res) => {
  const d = res?.data;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d)) return d;
  return [];
};

const InfoChip = ({ icon, label, tone = ACCENT }) => (
  <View style={[styles.infoChip, { backgroundColor: withOpacity(tone, 0.1), borderColor: withOpacity(tone, 0.24) }]}>
    <Ionicons name={icon} size={12} color={tone} />
    <Text style={[styles.infoChipText, { color: tone }]} numberOfLines={1}>{label}</Text>
  </View>
);

const Metric = ({ value, label }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const SectionTitle = ({ icon, title }) => (
  <View style={styles.sectionTitleRow}>
    <View style={styles.sectionTitleIcon}>
      <Ionicons name={icon} size={15} color={ACCENT} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const MemberRow = ({ item, index, onPress }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: Math.min(index * 28, 280),
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [anim, index]);

  const name = cleanText(item?.full_name ?? item?.username ?? 'Member');
  const username = cleanText(item?.username ?? '');
  const avatar = item?.avatar ?? item?.profile_picture ?? null;
  const role = cleanText(item?.role ?? item?.type ?? '');
  const isAdmin = ['admin', 'owner', 'moderator'].includes(role.toLowerCase());

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
      <Animated.View
        style={[
          styles.memberRow,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          },
        ]}
      >
        {isRealImg(avatar) ? (
          <ExpoImage source={{ uri: avatar }} style={styles.memberAvatar} contentFit="cover" />
        ) : (
          <LinearGradient colors={[BRAND, ACCENT]} style={[styles.memberAvatar, styles.memberFallback]}>
            <Ionicons name="person" size={18} color={WHITE} />
          </LinearGradient>
        )}
        <View style={styles.memberText}>
          <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
          {!!username && <Text style={styles.memberUsername} numberOfLines={1}>@{username}</Text>}
        </View>
        {isAdmin && (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{role || 'Admin'}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={withOpacity(MUTED, 0.6)} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const AdBanner = () => (
  <View style={styles.adCard}>
    <View style={styles.adBadge}>
      <Ionicons name="megaphone-outline" size={11} color={MUTED} />
      <Text style={styles.adBadgeText}>Sponsored</Text>
    </View>
    <View style={styles.adBody}>
      <LinearGradient colors={[withOpacity(ACCENT, 0.18), withOpacity(BRAND, 0.08)]} style={styles.adIcon}>
        <Ionicons name="storefront-outline" size={24} color={ACCENT} />
      </LinearGradient>
      <View style={styles.adCopy}>
        <Text style={styles.adTitle} numberOfLines={1}>Grow your business with Hafrik</Text>
        <Text style={styles.adSub} numberOfLines={2}>Reach people inside trusted communities.</Text>
      </View>
      <Ionicons name="arrow-forward-circle" size={24} color={ACCENT} />
    </View>
  </View>
);

const ComposePrompt = ({ group, onOpen }) => (
  <TouchableOpacity style={styles.composeCard} activeOpacity={0.84} onPress={onOpen}>
    {isRealImg(group?.avatar) ? (
      <ExpoImage source={{ uri: group.avatar }} style={styles.composeAvatar} contentFit="cover" />
    ) : (
      <LinearGradient colors={[BRAND, ACCENT]} style={styles.composeAvatar}>
        <Ionicons name="people" size={16} color={WHITE} />
      </LinearGradient>
    )}
    <View style={styles.composeTextWrap}>
      <Text style={styles.composeTitle}>Post to {cleanText(group?.title) || 'this community'}</Text>
      <Text style={styles.composeSub}>Share a question, update, photo or reel</Text>
    </View>
    <View style={styles.composePlus}>
      <Ionicons name="add" size={18} color={WHITE} />
    </View>
  </TouchableOpacity>
);

const AboutSection = ({ group }) => {
  const about = cleanText(group?.about ?? group?.description ?? '');
  const rows = [
    { icon: 'lock-closed-outline', title: 'Privacy', value: cleanText(group?.privacy ?? group?.type ?? '') },
    { icon: 'grid-outline', title: 'Category', value: cleanText(group?.category ?? '') },
    { icon: 'location-outline', title: 'Location', value: cleanText(group?.location ?? group?.city ?? '') },
    { icon: 'link-outline', title: 'Website', value: cleanText(group?.website ?? '') },
    { icon: 'calendar-outline', title: 'Created', value: group?.created_at ? String(group.created_at).split(' ')[0] : '' },
  ].filter((row) => row.value);

  return (
    <View style={styles.aboutWrap}>
      {!!about && (
        <View style={styles.infoCard}>
          <SectionTitle icon="document-text-outline" title="About this community" />
          <Text style={styles.aboutText}>{about}</Text>
        </View>
      )}

      {rows.length > 0 ? (
        <View style={styles.infoCard}>
          <SectionTitle icon="sparkles-outline" title="Community details" />
          {rows.map((row) => (
            <View key={row.title} style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name={row.icon} size={16} color={ACCENT} />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailTitle}>{row.title}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : !about ? (
        <View style={styles.emptyPanel}>
          <Ionicons name="information-circle-outline" size={42} color={BORDER} />
          <Text style={styles.emptyTitle}>No community info yet</Text>
          <Text style={styles.emptySub}>Details about this community will appear here.</Text>
        </View>
      ) : null}
    </View>
  );
};

export default function GroupDetails({ route }) {
  const { groupId, openCompose: autoCompose } = route.params ?? {};
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  const { token } = useAuth();
  const openComposer = useStore((s) => s.openComposer);
  const refreshSignal = useStore((s) => s.refreshSignal);
  const lastCreatedPost = useStore((s) => s.lastCreatedPost);
  const clearLastCreatedPost = useStore((s) => s.clearLastCreatedPost);

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersHasMore, setMembersHasMore] = useState(true);
  const [visiblePostId, setVisiblePostId] = useState(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const prevRefreshSignal = useRef(0);
  const activeTabRef = useRef(activeTab);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70, waitForInteraction: false });

  const title = cleanText(group?.title ?? group?.name ?? 'Community');
  const about = cleanText(group?.about ?? group?.description ?? '');
  const category = cleanText(group?.category ?? '');
  const privacy = cleanText(group?.privacy ?? group?.type ?? '');
  const isPrivate = privacy.toLowerCase() === 'private';
  const memberCount = Number(group?.members ?? group?.members_count ?? group?.total_members ?? 0);
  const postCount = Number(group?.posts_count ?? group?.posts ?? posts.length);
  const cover = group?.cover ?? group?.cover_image ?? group?.image;
  const avatar = group?.avatar ?? group?.icon ?? group?.image;

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 92, HERO_H - 32],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const coverScale = scrollY.interpolate({
    inputRange: [-90, 0],
    outputRange: [1.18, 1],
    extrapolate: 'clamp',
  });

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [gRes, fRes, mRes] = await Promise.all([
        getGroupDetails(groupId),
        getGroupFeed(groupId, 1, 20),
        getGroupMembers(groupId, 1, 50),
      ]);

      if (gRes?.status === 'success') {
        const data = gRes.data?.group ?? gRes.data;
        setGroup(data);
        setIsMember(
          data?.is_joined === true ||
          data?.is_joined === 1 ||
          data?.is_member === true ||
          data?.is_member === 1,
        );
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
    } catch (error) {
      console.log('GROUP DETAILS LOAD ERROR:', error?.response?.data || error?.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab !== 'feed') setVisiblePostId(null);
  }, [activeTab]);

  useEffect(() => {
    if (refreshSignal > 0 && refreshSignal !== prevRefreshSignal.current) {
      prevRefreshSignal.current = refreshSignal;
      loadData();
    }
  }, [refreshSignal, loadData]);

  useEffect(() => {
    if (!lastCreatedPost) return;
    const { post, target_type, target_id } = lastCreatedPost;
    if (target_type === 'group' && String(target_id) === String(groupId)) {
      setPosts((prev) => [post, ...prev.filter((p) => String(p.id) !== String(post.id))]);
      setActiveTab('feed');
      setGroup((g) => g ? { ...g, posts_count: Number(g.posts_count ?? g.posts ?? 0) + 1 } : g);
    }
    clearLastCreatedPost();
  }, [lastCreatedPost, groupId, clearLastCreatedPost]);

  const openGroupComposer = useCallback(() => {
    openComposer({
      locked: true,
      target_type: 'group',
      target_id: group?.id ?? groupId,
      title: group?.title,
      avatar: group?.avatar,
    });
  }, [openComposer, group, groupId]);

  useEffect(() => {
    if (autoCompose && isMember) openGroupComposer();
  }, [autoCompose, isMember, openGroupComposer]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleJoinLeave = useCallback(async () => {
    if (joining) return;
    setJoining(true);
    const was = isMember;
    setIsMember(!was);
    setGroup((g) => g ? { ...g, members: Math.max(0, Number(g.members ?? g.members_count ?? 0) + (was ? -1 : 1)) } : g);
    try {
      const res = await toggleGroupMembership(groupId, was ? 'leave' : 'join');
      const data = res?.data ?? res;
      if (data?.is_joined !== undefined) setIsMember(!!data.is_joined);
      if (data?.members !== undefined) setGroup((g) => g ? { ...g, members: Number(data.members) || 0 } : g);
    } catch (error) {
      console.log('GROUP JOIN ERROR:', error?.response?.data || error?.message || error);
      Alert.alert('Error', 'Could not update membership.');
      setIsMember(was);
      setGroup((g) => g ? { ...g, members: Math.max(0, Number(g.members ?? g.members_count ?? 0) + (was ? 1 : -1)) } : g);
    } finally {
      setJoining(false);
    }
  }, [joining, isMember, groupId]);

  const loadMoreFeed = useCallback(async () => {
    if (feedLoadingMore || !feedHasMore) return;
    setFeedLoadingMore(true);
    const nextPage = feedPage + 1;
    try {
      const res = await getGroupFeed(groupId, nextPage, 20);
      if (res?.status === 'success') {
        const data = normaliseList(res);
        setPosts((prev) => data.length ? [...prev, ...data] : prev);
        setFeedPage(nextPage);
        setFeedHasMore(data.length === 20);
      }
    } catch (error) {
      console.log('GROUP FEED MORE ERROR:', error?.response?.data || error?.message || error);
      setFeedHasMore(false);
    } finally {
      setFeedLoadingMore(false);
    }
  }, [feedLoadingMore, feedHasMore, feedPage, groupId]);

  const loadMoreMembers = useCallback(async () => {
    if (!membersHasMore) return;
    const nextPage = membersPage + 1;
    try {
      const res = await getGroupMembers(groupId, nextPage, 50);
      if (res?.status === 'success') {
        const data = normaliseList(res);
        setMembers((prev) => data.length ? [...prev, ...data] : prev);
        setMembersPage(nextPage);
        setMembersHasMore(data.length === 50);
      }
    } catch (error) {
      console.log('GROUP MEMBERS MORE ERROR:', error?.response?.data || error?.message || error);
      setMembersHasMore(false);
    }
  }, [membersHasMore, membersPage, groupId]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (activeTabRef.current !== 'feed') {
      setVisiblePostId(null);
      return;
    }
    const nextVisibleId = viewableItems.find((entry) => entry?.isViewable && entry?.item?.id)?.item?.id ?? null;
    setVisiblePostId((prev) => (prev === nextVisibleId ? prev : nextVisibleId));
  });

  const processedPosts = useMemo(() => {
    const result = [];
    posts.forEach((post, index) => {
      result.push(post);
      if ((index + 1) % 5 === 0 && index + 1 < posts.length) {
        result.push({ _isAd: true, id: `community-ad-${index}` });
      }
    });
    return result;
  }, [posts]);

  const renderItem = useCallback(({ item, index }) => {
    if (activeTab === 'feed') {
      if (item?._isAd) return <AdBanner />;
      return <FeedCard feed={item} isVisible={visiblePostId === item?.id} hideCommunityContext />;
    }

    if (activeTab === 'members') {
      return (
        <MemberRow
          item={item}
          index={index}
          onPress={() => navigation.navigate('UserProfile', {
            userId: item.id ?? item.user_id,
            username: item.username ?? '',
          })}
        />
      );
    }

    return null;
  }, [activeTab, visiblePostId, navigation]);

  const ListHeader = useMemo(() => (
    <View>
      <View style={styles.heroWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: coverScale }] }]}>
          {isRealImg(cover) ? (
            <ExpoImage source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <LinearGradient
              colors={[BRAND, '#0B4548', '#12696E', ACCENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
        </Animated.View>
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.78)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroBottom}>
          <View style={styles.heroBadge}>
            <Ionicons name={isPrivate ? 'lock-closed-outline' : 'earth-outline'} size={13} color={WHITE} />
            <Text style={styles.heroBadgeText}>{isPrivate ? 'Private Community' : 'Open Community'}</Text>
          </View>
          {!!category && <Text style={styles.heroCategory} numberOfLines={1}>{category}</Text>}
        </View>
      </View>

      <View style={styles.profileShell}>
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            {isRealImg(avatar) ? (
              <ExpoImage source={{ uri: avatar }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <LinearGradient colors={[BRAND, ACCENT]} style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="people" size={32} color={WHITE} />
              </LinearGradient>
            )}
            {isMember && (
              <View style={styles.memberDot}>
                <Ionicons name="checkmark-circle" size={23} color={GREEN} />
              </View>
            )}
          </View>

          <View style={styles.identityText}>
            <View style={styles.titleRow}>
              <Text style={styles.groupTitle} numberOfLines={2}>{title}</Text>
              {isPrivate && <Ionicons name="lock-closed" size={17} color={MUTED} style={{ marginTop: 4 }} />}
            </View>
            {!!about && <Text style={styles.groupAbout} numberOfLines={2}>{about}</Text>}
            <View style={styles.badgeRow}>
              {isMember && <InfoChip icon="checkmark-circle" label="Member" tone={GREEN} />}
              {!!category && <InfoChip icon="grid-outline" label={category} />}
              {isPrivate && <InfoChip icon="lock-closed-outline" label="Private" tone={GOLD} />}
            </View>
          </View>
        </View>

        <View style={styles.metricsCard}>
          <Metric value={fmtCount(memberCount)} label="Members" />
          <View style={styles.metricDivider} />
          <Metric value={fmtCount(postCount)} label="Posts" />
          <View style={styles.metricDivider} />
          <Metric value={isPrivate ? 'Private' : 'Open'} label="Access" />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.mainAction} onPress={handleJoinLeave} activeOpacity={0.88} disabled={joining}>
            <View style={[styles.mainActionFill, isMember && styles.leaveActionFill]}>
              {joining ? (
                <ActivityIndicator size="small" color={isMember ? BRAND : WHITE} />
              ) : (
                <>
                  <Ionicons name={isMember ? 'exit-outline' : 'people-outline'} size={18} color={isMember ? BRAND : WHITE} />
                  <Text style={[styles.mainActionText, isMember && styles.leaveActionText]}>
                    {isMember ? 'Leave Community' : 'Join Community'}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {isMember && (
            <TouchableOpacity style={styles.secondaryAction} onPress={openGroupComposer} activeOpacity={0.84}>
              <Ionicons name="create-outline" size={17} color={BRAND} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('GroupMembers', { groupId, groupTitle: title })}
            activeOpacity={0.84}
          >
            <Ionicons name="people-outline" size={17} color={BRAND} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsCard}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.78}
            >
              <Ionicons name={tab.icon} size={15} color={active ? WHITE : MUTED} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isMember && activeTab === 'feed' && <ComposePrompt group={group} onOpen={openGroupComposer} />}
    </View>
  ), [
    coverScale,
    cover,
    isPrivate,
    category,
    avatar,
    isMember,
    title,
    about,
    memberCount,
    postCount,
    handleJoinLeave,
    joining,
    openGroupComposer,
    navigation,
    groupId,
    activeTab,
    group,
  ]);

  const listData = activeTab === 'feed' ? processedPosts : activeTab === 'members' ? members : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.stickyHeader, { paddingTop: top + 8, opacity: headerOpacity }]}>
        <Text style={styles.stickyTitle} numberOfLines={1}>{title}</Text>
      </Animated.View>

      <TouchableOpacity style={[styles.navBack, { top: top + 10 }]} onPress={() => navigation.goBack()} activeOpacity={0.86}>
        <Ionicons name="arrow-back" size={19} color={WHITE} />
      </TouchableOpacity>

      {isMember && (
        <TouchableOpacity style={[styles.navCompose, { top: top + 10 }]} onPress={openGroupComposer} activeOpacity={0.86}>
          <Ionicons name="create-outline" size={18} color={WHITE} />
        </TouchableOpacity>
      )}

      {activeTab === 'media' ? (
        <GroupMedia
          groupId={groupId}
          token={token}
          listHeaderComponent={ListHeader}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        />
      ) : activeTab === 'about' ? (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        >
          {ListHeader}
          <AboutSection group={group} />
        </Animated.ScrollView>
      ) : (
        <Animated.FlatList
          data={listData}
          keyExtractor={(item, index) => item?._isAd ? item.id : `group-${activeTab}-${item?.id ?? item?.user_id ?? index}-${index}`}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={
            activeTab === 'feed' && feedLoadingMore ? (
              <ActivityIndicator color={ACCENT} style={styles.footerLoader} />
            ) : null
          }
          ListEmptyComponent={
            !refreshing && !loading ? (
              <View style={styles.emptyPanel}>
                <Ionicons name={activeTab === 'members' ? 'people-outline' : 'newspaper-outline'} size={42} color={BORDER} />
                <Text style={styles.emptyTitle}>{activeTab === 'members' ? 'No members found' : 'No posts yet'}</Text>
                <Text style={styles.emptySub}>
                  {activeTab === 'members'
                    ? 'Members of this community will appear here.'
                    : 'Community updates will appear here.'}
                </Text>
                {isMember && activeTab === 'feed' && (
                  <TouchableOpacity style={styles.emptyButton} onPress={openGroupComposer} activeOpacity={0.84}>
                    <Text style={styles.emptyButtonText}>Be the first to post</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={activeTab === 'feed' ? loadMoreFeed : loadMoreMembers}
          onEndReachedThreshold={0.35}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          extraData={visiblePostId}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
        />
      )}
      <CommentModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 120 },

  loaderWrap: { flex: 1 },
  loaderGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loaderText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'ReadexPro-Bold',
  },

  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: BRAND,
    paddingHorizontal: 68,
    paddingBottom: 12,
    alignItems: 'center',
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  stickyTitle: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  navBack: {
    position: 'absolute',
    left: 14,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  navCompose: {
    position: 'absolute',
    right: 14,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  heroWrap: {
    width: W,
    height: HERO_H,
    overflow: 'hidden',
    backgroundColor: BRAND,
  },
  heroBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 58,
    gap: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  heroCategory: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'ReadexPro-Medium',
  },

  profileShell: {
    marginTop: -44,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  identityCard: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 9,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    position: 'relative',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 28,
    backgroundColor: BORDER,
    borderWidth: 3,
    borderColor: WHITE,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  groupTitle: {
    flex: 1,
    color: DARK,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.4,
    fontFamily: 'ReadexPro-Bold',
  },
  groupAbout: {
    color: MUTED,
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'ReadexPro-Regular',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
    maxWidth: 150,
  },

  metricsCard: {
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricValue: {
    color: DARK,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  metricLabel: {
    color: MUTED,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  metricDivider: { width: 1, height: 30, backgroundColor: BORDER },

  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  mainAction: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  mainActionFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 24,
    backgroundColor: BRAND,
  },
  leaveActionFill: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  mainActionText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  leaveActionText: { color: BRAND },
  secondaryAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 6,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: BRAND,
  },
  tabText: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  tabTextActive: { color: WHITE },

  composeCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: BORDER,
  },
  composeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeTextWrap: { flex: 1 },
  composeTitle: {
    color: DARK,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  composeSub: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'ReadexPro-Regular',
  },
  composePlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberRow: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: BORDER,
  },
  memberFallback: { alignItems: 'center', justifyContent: 'center' },
  memberText: { flex: 1 },
  memberName: {
    color: DARK,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  memberUsername: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'ReadexPro-Regular',
  },
  rolePill: {
    backgroundColor: withOpacity(ACCENT, 0.14),
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  roleText: {
    color: BRAND,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontFamily: 'ReadexPro-Bold',
  },

  aboutWrap: {
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 12,
  },
  infoCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  sectionTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: withOpacity(ACCENT, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: DARK,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  aboutText: {
    color: DARK,
    fontSize: 14,
    lineHeight: 23,
    fontFamily: 'ReadexPro-Regular',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: withOpacity(ACCENT, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1 },
  detailTitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'ReadexPro-Bold',
  },
  detailValue: {
    color: DARK,
    fontSize: 13,
    marginTop: 3,
    fontFamily: 'ReadexPro-Regular',
  },

  adCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  adBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 9,
  },
  adBadgeText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontFamily: 'ReadexPro-Bold',
  },
  adBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adCopy: { flex: 1 },
  adTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  adSub: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
    fontFamily: 'ReadexPro-Regular',
  },

  emptyPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: CARD,
    borderRadius: 24,
    paddingVertical: 42,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyTitle: {
    color: DARK,
    marginTop: 12,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  emptySub: {
    color: MUTED,
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'ReadexPro-Regular',
  },
  emptyButton: {
    marginTop: 14,
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  footerLoader: { paddingVertical: 22 },
});

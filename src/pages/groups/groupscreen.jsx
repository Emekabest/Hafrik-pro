import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Image, ActivityIndicator,
  Alert, ScrollView, StatusBar, Modal, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

// ─── API imports ─────────────────────────────────────────────────────────────
import { getGroups, getCategories, joinGroup, leaveGroup } from './services/groupApi';
import PostFeedController from '../../controllers/postfeedcontroller';
import CreateModal from './CreateModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND          = Colors.primaryDark;
const ACCENT         = Colors.primary;
const CREAM          = Colors.background;
const MUTED          = Colors.secondaryText;
const DARK           = Colors.black;
const BORDER         = BRAND + '14';
const CARD           = Colors.white;
const WHITE          = Colors.white;
const BLACK          = Colors.black;
const FEATURE_GOLD   = Colors.gradientOrange?.[0] ?? '#f59e0b';
const COVER_TINT     = ACCENT + 'CC';
const SCRIM_STRONG   = BLACK + 'C7';
const SCRIM_MEDIUM   = BLACK + '8C';
const ON_DARK_80     = WHITE + 'CC';
const ON_DARK_85     = WHITE + 'D9';
const ON_DARK_55     = WHITE + '8C';
const ON_DARK_40     = WHITE + '66';
const ON_DARK_15     = WHITE + '26';
const ON_DARK_14     = WHITE + '24';
const ON_DARK_10     = WHITE + '1A';
const ON_DARK_04     = WHITE + '0A';
const ACCENT_SOFT_09 = ACCENT + '17';
const ACCENT_SOFT_22 = ACCENT + '38';
const ACCENT_SOFT_26 = ACCENT + '42';
const ACCENT_SOFT_50 = ACCENT + '80';
const BRAND_SOFT_07  = BRAND + '12';
const TEXT_ACCENT    = BRAND;
const TEXT_SUBDUED   = Colors.grey;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const decodeHtml = (text = '') =>
  String(text)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—').replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'");

const cleanText = (text = '') =>
  decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');

// ─── Group Post Modal ─────────────────────────────────────────────────────────
const GroupPostModal = ({ visible, group, onClose, onPosted }) => {
  const { token, user } = useAuth();
  const navigation      = useNavigation();
  const { bottom }      = useSafeAreaInsets();
  const inputRef        = useRef(null);
  const [text, setText]       = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (visible) {
      setText('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const result = await PostFeedController(
        { type: 'text', text: text.trim(), target_type: 'group', target_id: group?.id },
        token
      );
      if (result?.status === 'success') {
        onPosted?.();
      } else {
        Alert.alert('Error', result?.message || 'Could not post. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const goToProfile = () => {
    if (!user?.id) return;
    onClose();
    setTimeout(() => {
      navigation.navigate('UserProfile', { userId: user.id, username: user.username ?? '' });
    }, 250);
  };

  const avatar    = group?.avatar ?? null;
  const groupName = group?.title ? cleanText(group.title) : 'Group';
  const category  = cleanText(group?.category ?? '');
  const canPost   = text.trim().length > 0;

  const userInitials = (
    (user?.first_name?.[0] ?? user?.full_name?.[0] ?? user?.username?.[0] ?? '?').toUpperCase()
  );
  const userAvatar = user?.avatar ?? user?.profile_picture ?? null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={pm.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={pm.sheet}
          >
            {/* ── Handle ── */}
            <View style={pm.handle} />

            {/* ── Group context header ── */}
            <View style={pm.groupHeader}>
              {isRealImage(avatar) ? (
                <Image source={{ uri: avatar }} style={pm.groupAvatar} resizeMode="cover" />
              ) : (
                <View style={[pm.groupAvatar, pm.groupAvatarFb]}>
                  <Ionicons name="people" size={16} color={WHITE} />
                </View>
              )}
              <View style={pm.groupInfo}>
                <Text style={pm.groupName} numberOfLines={1}>{groupName}</Text>
                {!!category && <Text style={pm.groupCat} numberOfLines={1}>{category}</Text>}
              </View>
              <View style={pm.membersOnlyBadge}>
                <Ionicons name="lock-closed" size={10} color={ACCENT} />
                <Text style={pm.membersOnlyTxt}>Members only</Text>
              </View>
            </View>

            <View style={pm.divider} />

            {/* ── Composer row ── */}
            <View style={pm.composerRow}>
              <TouchableOpacity onPress={goToProfile} activeOpacity={0.8}>
                {isRealImage(userAvatar) ? (
                  <Image source={{ uri: userAvatar }} style={pm.userAvatar} resizeMode="cover" />
                ) : (
                  <View style={pm.userAvatar}>
                    <Text style={pm.userInitials}>{userInitials}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={pm.inputWrap}>
                <Text style={pm.postingAs} numberOfLines={1}>
                  {user?.full_name ?? user?.first_name ?? user?.username ?? 'You'}
                </Text>
                <TextInput
                  ref={inputRef}
                  style={pm.input}
                  placeholder={`Share something with ${groupName}…`}
                  placeholderTextColor={MUTED + 'AA'}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={1000}
                  autoCapitalize="sentences"
                  autoCorrect
                  textAlignVertical="top"
                />
              </View>
            </View>

            {text.length > 800 && (
              <Text style={pm.charCount}>{1000 - text.length} remaining</Text>
            )}

            {/* ── Footer ── */}
            <View style={[pm.footer, { paddingBottom: bottom + 12 }]}>
              <TouchableOpacity style={pm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={pm.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pm.postBtn, !canPost && pm.postBtnDisabled]}
                onPress={handlePost}
                disabled={!canPost || posting}
                activeOpacity={0.85}
              >
                {posting
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : (
                    <>
                      <Ionicons name="send" size={14} color={WHITE} />
                      <Text style={pm.postTxt}>Post</Text>
                    </>
                  )
                }
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Group Post Modal Styles ──────────────────────────────────────────────────
const pm = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: BLACK + '60',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, paddingHorizontal: 16,
    minHeight: 320,
    shadowColor: BLACK, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: MUTED + '55', alignSelf: 'center', marginBottom: 14,
  },
  groupHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  groupAvatar:     { width: 40, height: 40, borderRadius: 12 },
  groupAvatarFb:   { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  groupInfo:       { flex: 1 },
  groupName:       { fontSize: 14, fontWeight: '800', color: DARK },
  groupCat:        { fontSize: 11, color: MUTED, marginTop: 1 },
  membersOnlyBadge:{
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT + '14', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: ACCENT + '30',
  },
  membersOnlyTxt:  { fontSize: 10, fontWeight: '700', color: ACCENT },
  divider:         { height: 1, backgroundColor: BRAND + '14', marginBottom: 14 },
  composerRow:     { flexDirection: 'row', gap: 12, minHeight: 120, marginBottom: 8 },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  userInitials:    { fontSize: 13, fontWeight: '900', color: WHITE },
  inputWrap:       { flex: 1 },
  postingAs:       { fontSize: 12, fontWeight: '800', color: DARK, marginBottom: 4 },
  input: {
    flex: 1, fontSize: 15, color: DARK, lineHeight: 22,
    minHeight: 90,
  },
  charCount:       { fontSize: 11, color: MUTED, textAlign: 'right', marginBottom: 8 },
  footer:          { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: BRAND + '14' },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 100, borderWidth: 1.5, borderColor: BRAND + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelTxt:       { fontSize: 14, fontWeight: '700', color: MUTED },
  postBtn: {
    flex: 2, height: 46, borderRadius: 100, backgroundColor: BRAND,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  postBtnDisabled: { backgroundColor: MUTED + '55' },
  postTxt:         { fontSize: 14, fontWeight: '800', color: WHITE },
});

// ─── Community Card ───────────────────────────────────────────────────────────
const CommunityCard = ({ group, onOpen, onPostInGroup }) => {
  const { token } = useAuth();
  const [joining,     setJoining]     = useState(false);
  const [isMember,    setIsMember]    = useState(group.is_joined === true || group.is_joined === 1 || group._isMember === true);
  const [memberCount, setMemberCount] = useState(group.members_count ?? group.members ?? 0);

  useEffect(() => {
    setIsMember(group.is_joined === true || group.is_joined === 1 || group._isMember === true);
    setMemberCount(group.members_count ?? group.members ?? 0);
  }, [group.is_joined, group._isMember, group.members_count, group.members]);

  const handleJoinLeave = async () => {
    if (joining) return;
    setJoining(true);
    const was = isMember;
    try {
      if (was) { await leaveGroup(group.id, token); setIsMember(false); setMemberCount((c) => Math.max(0, c - 1)); }
      else     { await joinGroup(group.id, token);  setIsMember(true);  setMemberCount((c) => c + 1); }
    } catch {
      Alert.alert('Error', 'Could not update membership. Please try again.');
      setIsMember(was);
    } finally {
      setJoining(false);
    }
  };

  const title    = cleanText(group.title ?? '');
  const about    = cleanText(group.about ?? '');
  const category = cleanText(group.category ?? '');
  const cover    = group.cover ?? group.banner ?? null;
  const avatar   = group.avatar ?? null;
  const promoted = !!group.is_promoted;
  const private_ = group.privacy === 'private' || group.type === 'private';

  return (
    <View style={cc.card}>
      {/* ── Cover ── */}
      <TouchableOpacity style={cc.coverWrap} activeOpacity={0.92} onPress={() => onOpen?.(group)}>
        {isRealImage(cover) ? (
          <Image source={{ uri: cover }} style={cc.cover} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[BRAND, ACCENT, COVER_TINT]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={cc.cover}
          >
            <View style={cc.coverFallbackIcon}>
              <Ionicons name="people-outline" size={36} color={WHITE + '55'} />
            </View>
          </LinearGradient>
        )}

        {/* Gradient fade for text legibility */}
        <LinearGradient
          colors={['transparent', SCRIM_STRONG]}
          style={cc.coverFade}
        />

        {/* Top badges */}
        <View style={cc.topBadges}>
          {promoted && (
            <View style={cc.featBadge}>
              <Ionicons name="star" size={9} color={FEATURE_GOLD} />
              <Text style={cc.featTxt}>Featured</Text>
            </View>
          )}
          {private_ && (
            <View style={cc.privBadge}>
              <Ionicons name="lock-closed" size={10} color={WHITE} />
            </View>
          )}
        </View>

        {/* Name + member count */}
        <View style={cc.coverBottom}>
          <Text style={cc.coverTitle} numberOfLines={1}>{title || 'Community'}</Text>
          <View style={cc.coverMeta}>
            <Ionicons name="people" size={12} color={ON_DARK_80} />
            <Text style={cc.coverMetaTxt}>{fmtCount(memberCount)} members</Text>
            {isMember && (
              <View style={cc.joinedPill}>
                <Ionicons name="checkmark-circle" size={11} color={ACCENT} />
                <Text style={cc.joinedTxt}>Joined</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Body ── */}
      <View style={cc.body}>
        <View style={cc.bodyTop}>
          <View style={cc.avatarWrap}>
            {isRealImage(avatar) ? (
              <Image source={{ uri: avatar }} style={cc.avatar} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[BRAND, ACCENT]} style={[cc.avatar, cc.avatarFb]}>
                <Ionicons name="people" size={18} color={WHITE} />
              </LinearGradient>
            )}
          </View>
          {!!category && (
            <View style={cc.catChip}>
              <Text style={cc.catTxt}>{category}</Text>
            </View>
          )}
        </View>
        {!!about && (
          <View style={cc.aboutWrap}>
            <Text style={cc.aboutLabel}>About</Text>
            <Text style={cc.about} numberOfLines={3}>{about}</Text>
          </View>
        )}
      </View>

      {/* ── Footer ── */}
      <View style={cc.footer}>
        {isMember ? (
          <TouchableOpacity style={cc.postBtn} activeOpacity={0.8} onPress={() => onPostInGroup?.(group)}>
            <Ionicons name="create-outline" size={13} color={ACCENT} />
            <Text style={cc.postTxt}>Post in group</Text>
          </TouchableOpacity>
        ) : (
          <View style={cc.hintRow}>
            <Ionicons name="chatbubbles-outline" size={13} color={MUTED} />
            <Text style={cc.hintTxt}>{private_ ? 'Private group' : 'Open community'}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[cc.joinBtn, isMember && cc.leaveBtn]}
          onPress={handleJoinLeave}
          disabled={joining}
          activeOpacity={0.85}
        >
          {joining
            ? <ActivityIndicator size="small" color={isMember ? BRAND : WHITE} />
            : <Text style={[cc.joinTxt, isMember && cc.leaveTxt]}>{isMember ? 'Leave' : 'Join Group'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Community Card Styles ────────────────────────────────────────────────────
const cc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20, overflow: 'hidden',
    marginHorizontal: 14,
    borderWidth: 1, borderColor: BRAND_SOFT_07,
    shadowColor: BLACK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  coverWrap:         { height: 140, position: 'relative', overflow: 'hidden' },
  cover:             { width: '100%', height: '100%' },
  coverFallbackIcon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  coverFade:         { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  topBadges:  { position: 'absolute', top: 10, left: 12, flexDirection: 'row', gap: 6, alignItems: 'center' },
  featBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BLACK + '85', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  featTxt:    { fontSize: 9, fontWeight: '900', color: FEATURE_GOLD, letterSpacing: 0.3 },
  privBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: SCRIM_MEDIUM, alignItems: 'center', justifyContent: 'center',
  },
  coverBottom:  { position: 'absolute', bottom: 0, left: 14, right: 14, paddingBottom: 12 },
  coverTitle:   { fontSize: 16, fontWeight: '900', color: WHITE, marginBottom: 5, textShadowColor: BLACK + '80', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  coverMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverMetaTxt: { fontSize: 11, color: ON_DARK_85, fontWeight: '600' },
  joinedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT_SOFT_26, borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: ACCENT_SOFT_50,
  },
  joinedTxt:  { fontSize: 10, fontWeight: '800', color: ACCENT },
  body:       { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  bodyTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 13, overflow: 'hidden',
    borderWidth: 3, borderColor: WHITE, marginTop: -26,
    shadowColor: BLACK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
  },
  avatar:   { width: '100%', height: '100%' },
  avatarFb: { alignItems: 'center', justifyContent: 'center' },
  catChip:  { backgroundColor: ACCENT + '18', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  catTxt:   { fontSize: 10, fontWeight: '800', color: TEXT_ACCENT },
  aboutWrap:  { backgroundColor: BRAND + '07', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 2 },
  aboutLabel: { fontSize: 9, fontWeight: '800', color: ACCENT, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  about:    { fontSize: 13, color: TEXT_SUBDUED, lineHeight: 20 },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: BRAND_SOFT_07, gap: 10,
  },
  postBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ACCENT_SOFT_09, borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: ACCENT_SOFT_22,
  },
  postTxt:  { fontSize: 12, fontWeight: '700', color: ACCENT },
  hintRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintTxt:  { fontSize: 12, color: MUTED },
  joinBtn:  { backgroundColor: BRAND, borderRadius: 100, paddingHorizontal: 20, paddingVertical: 9, alignItems: 'center', minWidth: 95 },
  leaveBtn: { backgroundColor: WHITE, borderWidth: 1.5, borderColor: BRAND },
  joinTxt:  { fontSize: 12, fontWeight: '900', color: WHITE },
  leaveTxt: { color: BRAND },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CommunitiesScreen = () => {
  const navigation      = useNavigation();
  const { top }         = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc }  = useTheme();

  const [showCreate,    setShowCreate]    = useState(false);
  const [groups,        setGroups]        = useState([]);
  const [groupsLoad,    setGroupsLoad]    = useState(true);
  const [groupsPage,    setGroupsPage]    = useState(1);
  const [groupsMore,    setGroupsMore]    = useState(true);
  const [groupFilter,   setGroupFilter]   = useState('All');
  const [categories,    setCategories]    = useState([]);
  const [search,        setSearch]        = useState('');
  const [refreshing,    setRefreshing]    = useState(false);
  const [postModalGroup, setPostModalGroup] = useState(null);

  const loadGroups = useCallback(async (page = 1, replace = false) => {
    try {
      setGroupsLoad(true);
      const res = await getGroups(page, 15, {}, token);
      if (res?.status === 'success') {
        const items = res.data?.data ?? res.data ?? [];
        setGroups((p) => (replace ? items : [...p, ...items]));
        setGroupsMore(items.length >= 15);
        setGroupsPage(page);
      }
    } catch (e) {
      console.log('[Communities] loadGroups error:', e);
    } finally {
      setGroupsLoad(false);
    }
  }, [token]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategories(token);
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
        setCategories(parents.sort((a, b) => (Number(b.group_count) || 0) - (Number(a.group_count) || 0)));
      }
    } catch (e) {
      console.log('[Communities] loadCategories error:', e);
    }
  }, [token]);

  useEffect(() => {
    loadGroups(1, true);
    loadCategories();
  }, []); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups(1, true);
    setRefreshing(false);
  }, [loadGroups]);

  const filteredGroups = useMemo(() => {
    let r = groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((g) =>
        cleanText(g.title ?? '').toLowerCase().includes(q) ||
        cleanText(g.about ?? '').toLowerCase().includes(q) ||
        cleanText(g.category ?? '').toLowerCase().includes(q)
      );
    }
    if (groupFilter === 'My Groups') {
      r = r.filter((g) => g.is_joined === true || g.is_joined === 1 || g._isMember === true);
    } else if (groupFilter !== 'All') {
      r = r.filter((g) => cleanText(g.category ?? '').toLowerCase() === groupFilter.toLowerCase());
    }
    return [...r].sort((a, b) => (b.is_promoted ? 1 : 0) - (a.is_promoted ? 1 : 0));
  }, [groups, search, groupFilter]);

  const handlePostInGroup = useCallback((group) => {
    setPostModalGroup(group);
  }, []);

  const joinedCount = useMemo(
    () => groups.filter((g) => g.is_joined === true || g.is_joined === 1 || g._isMember).length,
    [groups]
  );

  const renderGroup = useCallback(
    ({ item }) => (
      <CommunityCard
        group={item}
        onOpen={(g) => navigation.navigate('GroupDetails', { groupId: g.id })}
        onPostInGroup={handlePostInGroup}
      />
    ),
    [navigation, handlePostInGroup]
  );

  // Filter chips: All + My Groups + category names
  const filterChips = useMemo(() => {
    const catNames = categories.map((c) => cleanText(c.name ?? c.category_name ?? '')).filter(Boolean);
    return ['All', 'My Groups', ...catNames];
  }, [categories]);

  return (
    <View style={[gs.root, { backgroundColor: tc.background ?? CREAM }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Slim fixed header ── */}
      <View style={[gs.header, { paddingTop: top + 8 }]}>
        <View style={gs.headerTop}>
          <TouchableOpacity style={gs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={gs.headerLogoWrap} pointerEvents="none">
            <Image source={require('../../assl.js/Layer 3.png')} style={gs.headerLogo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={gs.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={WHITE} />
            <Text style={gs.createBtnTxt}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGroup}
        contentContainerStyle={gs.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => { if (groupsMore && !groupsLoad) loadGroups(groupsPage + 1); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {/* ── Hero ── */}
            <View style={gs.heroBlock}>
              <View style={gs.heroPills}>
                <View style={gs.heroLivePill}>
                  <View style={gs.heroLiveDot} />
                  <Text style={gs.heroLiveText}>COMMUNITIES</Text>
                </View>
                {joinedCount > 0 && (
                  <View style={gs.heroCountPill}>
                    <Ionicons name="checkmark-circle" size={10} color={WHITE + 'BF'} />
                    <Text style={gs.heroCountText}>{fmtCount(joinedCount)} Joined</Text>
                  </View>
                )}
              </View>

              <Text style={gs.heroTitle}>Connect & Grow{'\n'}Together.</Text>
              <Text style={gs.heroSub}>
                Discover communities, meet like-minded people, and be part of conversations that matter.
              </Text>

              <View style={gs.heroStats}>
                <View style={gs.heroStatItem}>
                  <Text style={gs.heroStatNum}>{fmtCount(groups.length)}</Text>
                  <Text style={gs.heroStatLabel}>Groups</Text>
                </View>
                <View style={gs.heroStatDivider} />
                <View style={gs.heroStatItem}>
                  <Text style={gs.heroStatNum}>{fmtCount(joinedCount)}</Text>
                  <Text style={gs.heroStatLabel}>Joined</Text>
                </View>
                <View style={gs.heroStatDivider} />
                <View style={gs.heroStatItem}>
                  <Text style={gs.heroStatNum}>{fmtCount(categories.length)}</Text>
                  <Text style={gs.heroStatLabel}>Categories</Text>
                </View>
              </View>

              {/* Search */}
              <View style={gs.heroSearch}>
                <Ionicons name="search-outline" size={16} color={ON_DARK_55} style={{ marginRight: 8 }} />
                <TextInput
                  style={gs.searchInput}
                  placeholder="Search communities…"
                  placeholderTextColor={ON_DARK_40}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={ON_DARK_55} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Filter chips ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={gs.filterRow}
              keyboardShouldPersistTaps="handled"
            >
              {filterChips.map((chip, idx) => {
                const on = groupFilter === chip;
                return (
                  <TouchableOpacity
                    key={`chip-${chip}-${idx}`}
                    style={[gs.filterChip, on && gs.filterChipOn]}
                    onPress={() => setGroupFilter(chip)}
                    activeOpacity={0.75}
                  >
                    {chip === 'My Groups' && (
                      <Ionicons name={on ? 'people' : 'people-outline'} size={12} color={on ? WHITE : MUTED} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[gs.filterChipTxt, on && gs.filterChipTxtOn]}>{chip}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Section label ── */}
            <View style={gs.sectionBar}>
              <View style={gs.sectionAccent} />
              <Text style={gs.sectionBarText}>
                {groupFilter === 'All' ? 'ALL COMMUNITIES' : groupFilter.toUpperCase()}
              </Text>
              {filteredGroups.length > 0 && (
                <Text style={gs.sectionCount}>{filteredGroups.length}</Text>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          groupsLoad ? (
            <View style={gs.emptyWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : (
            <View style={gs.emptyWrap}>
              <View style={gs.emptyCircle}>
                <Ionicons name="people-outline" size={36} color={MUTED} />
              </View>
              <Text style={gs.emptyTitle}>No communities found</Text>
              <Text style={gs.emptySub}>Try adjusting your search or filters</Text>
            </View>
          )
        }
        ListFooterComponent={
          groupsLoad && groups.length > 0
            ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
            : null
        }
      />

      <CreateModal
        visible={showCreate}
        type="community"
        navigation={navigation}
        token={token}
        user={user}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadGroups(1, true)}
      />

      <GroupPostModal
        visible={postModalGroup !== null}
        group={postModalGroup}
        onClose={() => setPostModalGroup(null)}
        onPosted={() => {
          setPostModalGroup(null);
          Alert.alert('Posted!', 'Your post has been shared with the group.');
        }}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // ── Slim header ──
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
  createBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  createBtnTxt: { fontSize: 12, fontWeight: '800', color: WHITE },

  listContent: { paddingBottom: 100, gap: 14 },

  // ── Hero ──
  heroBlock: {
    backgroundColor: BRAND,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
    overflow: 'hidden', marginBottom: 4,
  },
  heroPills:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  heroLivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ON_DARK_10, borderWidth: 1, borderColor: ON_DARK_15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroLiveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  heroLiveText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: WHITE + 'BF' },
  heroCountPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ON_DARK_10, borderWidth: 1, borderColor: ON_DARK_15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroCountText:{ fontSize: 11, fontWeight: '700', color: WHITE + 'BF' },
  heroTitle:    { fontSize: 28, fontWeight: '900', color: WHITE, lineHeight: 34 },
  heroSub:      { marginTop: 8, fontSize: 13, lineHeight: 19, color: WHITE + 'A6' },
  heroStats: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18,
    backgroundColor: WHITE + '12', borderRadius: 14,
    borderWidth: 1, borderColor: WHITE + '1A',
    paddingVertical: 13, paddingHorizontal: 16,
  },
  heroStatItem:   { flex: 1, alignItems: 'center' },
  heroStatNum:    { fontSize: 18, fontWeight: '900', color: WHITE },
  heroStatLabel:  { fontSize: 10, color: WHITE + '88', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatDivider:{ width: 1, height: 30, backgroundColor: WHITE + '22' },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ON_DARK_10, borderRadius: 100,
    borderWidth: 1, borderColor: ON_DARK_15,
    paddingHorizontal: 14, height: 44, marginTop: 16,
  },
  searchInput: { flex: 1, color: WHITE, fontSize: 13 },

  // ── Filter chips ──
  filterRow:       { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip:      { height: 32, paddingHorizontal: 14, borderRadius: 100, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  filterChipOn:    { backgroundColor: BRAND, borderColor: BRAND },
  filterChipTxt:   { fontSize: 12, fontWeight: '600', color: MUTED },
  filterChipTxtOn: { color: WHITE },

  // ── Section label ──
  sectionBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  sectionAccent:  { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  sectionBarText: { fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.5, flex: 1 },
  sectionCount:   { fontSize: 11, fontWeight: '700', color: ACCENT },

  // ── Card (margin so hero is edge-to-edge) ──
  cardWrap: { marginHorizontal: 14 },

  // ── Empty ──
  emptyWrap:   { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT + '18' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
});

export default CommunitiesScreen;

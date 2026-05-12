// SearchCards — all card components for search results.
// Each SkeletonCard owns its own Animated.Value (not created in a loop).
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme';

const PRIMARY = Colors.primaryDark;
const ACCENT  = Colors.primary;
const GREEN   = Colors.primary;
const DARK    = Colors.black;
const WHITE   = Colors.white;
const BORDER  = Colors.border;
const MUTED   = Colors.secondaryText;
const SURFACE = Colors.surfaceTint;
const cleanQuery = (value = '') => String(value || '').replace(/^#+/, '').trim();

// ── ResultsLabel ─────────────────────────────────────────────────────────────
export const ResultsLabel = React.memo(({ count, query }) => (
  <View style={styles.resultsRow}>
    <View style={styles.resultsDot} />
    <Text style={styles.resultsText}>
      <Text style={styles.resultsCount}>{count}</Text>
      {' result'}{count !== 1 ? 's' : ''} for{' '}
      <Text style={styles.resultsQuery}>"{cleanQuery(query)}"</Text>
    </Text>
  </View>
));

// ── SectionHeader ─────────────────────────────────────────────────────────────
export const SectionHeader = React.memo(({ title, count }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionBar} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {count > 0 && (
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    )}
  </View>
));

// ── PersonCard ────────────────────────────────────────────────────────────────
export const PersonCard = React.memo(({ item, onPress, isFollowed, onFollowToggle }) => (
  <TouchableOpacity style={styles.personCard} activeOpacity={0.75} onPress={onPress}>
    <View style={styles.avatarWrap}>
      {item.thumbnail ? (
        <ExpoImage
          source={{ uri: item.thumbnail }}
          style={styles.personAvatar}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.personAvatar, styles.avatarFallback]}>
          <Ionicons name="person" size={22} color={PRIMARY} />
        </View>
      )}
      <View style={styles.onlineDot} />
    </View>

    <View style={styles.personBody}>
      <View style={styles.nameRow}>
        <Text style={styles.personName} numberOfLines={1}>{item.title}</Text>
        {item.verified ? (
          <Ionicons name="checkmark-circle" size={14} color={ACCENT} style={{ marginLeft: 4 }} />
        ) : null}
      </View>
      {item.subtitle ? (
        <Text style={styles.personSub} numberOfLines={1}>{item.subtitle}</Text>
      ) : null}
    </View>

    <TouchableOpacity
      style={[styles.followPill, isFollowed && styles.followPillFollowing]}
      activeOpacity={0.8}
      onPress={() => onFollowToggle && onFollowToggle(item)}
    >
      <Text style={[styles.followPillText, isFollowed && styles.followPillTextFollowing]}>
        {isFollowed ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
));

// ── PostCard ──────────────────────────────────────────────────────────────────
export const PostCard = React.memo(({ item, onPress }) => {
  const isReel = item.is_video === 1 || item.is_video === '1' || item.is_video === true;
  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.75} onPress={onPress}>
      {item.thumbnail ? (
        <ExpoImage
          source={{ uri: item.thumbnail }}
          style={styles.postThumb}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <LinearGradient colors={[PRIMARY, Colors.primary]} style={styles.postThumb}>
          <Ionicons name="document-text" size={22} color={WHITE} />
        </LinearGradient>
      )}
      {isReel && (
        <View style={styles.reelBadge}>
          <Ionicons name="play" size={9} color={WHITE} />
          <Text style={styles.reelBadgeText}>Reel</Text>
        </View>
      )}
      <View style={styles.postBody}>
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.postSub} numberOfLines={1}>{item.subtitle}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ── PageCard ──────────────────────────────────────────────────────────────────
export const PageCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.entityCard} activeOpacity={0.75} onPress={onPress}>
    {item.thumbnail ? (
      <ExpoImage
        source={{ uri: item.thumbnail }}
        style={styles.entityAvatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
      <View style={[styles.entityAvatar, styles.entityAvatarPage]}>
        <Ionicons name="business" size={22} color={PRIMARY} />
      </View>
    )}
    <View style={styles.entityBody}>
      <View style={styles.nameRow}>
        <Text style={styles.entityName} numberOfLines={1}>{item.title}</Text>
        {item.verified ? (
          <Ionicons name="checkmark-circle" size={13} color={ACCENT} style={{ marginLeft: 4 }} />
        ) : null}
      </View>
      {item.subtitle ? (
        <Text style={styles.entitySub} numberOfLines={1}>{item.subtitle}</Text>
      ) : null}
    </View>
    <View style={[styles.entityChevron, { backgroundColor: `${PRIMARY}15` }]}>
      <Ionicons name="chevron-forward" size={15} color={PRIMARY} />
    </View>
  </TouchableOpacity>
));

// ── GroupCard ─────────────────────────────────────────────────────────────────
export const GroupCard = React.memo(({ item, onPress, isJoined, onJoinToggle }) => (
  <TouchableOpacity style={styles.entityCard} activeOpacity={0.75} onPress={onPress}>
    {item.thumbnail ? (
      <ExpoImage
        source={{ uri: item.thumbnail }}
        style={[styles.entityAvatar, styles.entityAvatarGroup]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
      <View style={[styles.entityAvatar, styles.entityAvatarGroup, styles.entityAvatarGroupFallback]}>
        <Ionicons name="people" size={22} color={GREEN} />
      </View>
    )}
    <View style={styles.entityBody}>
      <Text style={styles.entityName} numberOfLines={1}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={styles.entitySub} numberOfLines={1}>{item.subtitle}</Text>
      ) : null}
    </View>
    <TouchableOpacity
      style={[styles.joinPill, isJoined && styles.joinPillJoined]}
      activeOpacity={0.8}
      onPress={() => onJoinToggle && onJoinToggle(item)}
    >
      <Text style={[styles.joinPillText, isJoined && styles.joinPillTextJoined]}>
        {isJoined ? 'Joined' : 'Join'}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
));

// ── EventCard ─────────────────────────────────────────────────────────────────
export const EventCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.eventCard} activeOpacity={0.75} onPress={onPress}>
    {item.thumbnail ? (
      <ExpoImage
        source={{ uri: item.thumbnail }}
        style={styles.eventThumb}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
      <LinearGradient colors={[Colors.warning + 'CC', Colors.warning]} style={styles.eventThumb}>
        <Ionicons name="calendar" size={28} color={WHITE} />
      </LinearGradient>
    )}
    <View style={styles.eventBody}>
      <View style={styles.eventTypePill}>
        <Text style={styles.eventTypeText}>Event</Text>
      </View>
      <Text style={styles.eventName} numberOfLines={2}>{item.title}</Text>
      {item.subtitle ? (
        <View style={styles.eventMeta}>
          <Ionicons name="location-outline" size={11} color={MUTED} />
          <Text style={styles.eventSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
      ) : null}
    </View>
  </TouchableOpacity>
));

// ── ArticleCard ───────────────────────────────────────────────────────────────
export const ArticleCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity style={styles.articleCard} activeOpacity={0.75} onPress={onPress}>
    {item.thumbnail ? (
      <ExpoImage
        source={{ uri: item.thumbnail }}
        style={styles.articleThumb}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
      <LinearGradient colors={[ACCENT + 'CC', GREEN]} style={styles.articleThumb}>
        <Ionicons name="newspaper" size={26} color={WHITE} />
      </LinearGradient>
    )}
    <View style={styles.articleBody}>
      <View style={styles.articleTypePill}>
        <Ionicons name="newspaper-outline" size={10} color={PRIMARY} style={{ marginRight: 3 }} />
        <Text style={styles.articleTypeText}>Article</Text>
      </View>
      <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={styles.articleSub} numberOfLines={1}>{item.subtitle}</Text>
      ) : null}
    </View>
    <View style={styles.articleChevron}>
      <Ionicons name="chevron-forward" size={15} color={BORDER} />
    </View>
  </TouchableOpacity>
));

// ── ShowMoreButton ────────────────────────────────────────────────────────────
export const ShowMoreButton = React.memo(({ label, count, onPress }) => (
  <TouchableOpacity style={styles.showMoreBtn} activeOpacity={0.8} onPress={onPress}>
    <Text style={styles.showMoreText}>
      See all{count > 0 ? ` ${count}` : ''} {label}
    </Text>
    <Ionicons name="arrow-forward-circle-outline" size={17} color={ACCENT} />
  </TouchableOpacity>
));

// ── SkeletonCard ──────────────────────────────────────────────────────────────
export const SkeletonCard = React.memo(() => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '38%', marginTop: 9 }]} />
      </View>
      <View style={styles.skeletonPill} />
    </Animated.View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Results label
  resultsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  resultsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  resultsText: { fontSize: 13, color: MUTED, fontFamily: AppDetails.fontFamily.inter.regular },
  resultsCount: { color: PRIMARY, fontFamily: AppDetails.fontFamily.inter.semiBold },
  resultsQuery: { color: DARK, fontFamily: AppDetails.fontFamily.inter.semiBold },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, marginBottom: 10,
  },
  sectionBar: {
    width: 4, height: 18, borderRadius: 2,
    backgroundColor: ACCENT, marginRight: 10,
  },
  sectionTitle: {
    flex: 1, fontSize: 12,
    fontFamily: AppDetails.fontFamily.redex.bold,
    color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: PRIMARY + '14',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11, color: PRIMARY,
    fontFamily: AppDetails.fontFamily.inter.semiBold,
  },

  // Person card
  personCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 18,
    padding: 12, marginBottom: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: PRIMARY + '0D',
  },
  avatarWrap: { position: 'relative' },
  personAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: BORDER,
  },
  avatarFallback: {
    backgroundColor: PRIMARY + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: ACCENT,
    borderWidth: 2, borderColor: WHITE,
  },
  personBody: { flex: 1, marginLeft: 12, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  personName: {
    fontSize: 15, fontFamily: AppDetails.fontFamily.inter.semiBold,
    color: DARK, flexShrink: 1,
  },
  personSub: {
    fontSize: 12, color: MUTED,
    fontFamily: AppDetails.fontFamily.inter.regular, marginTop: 2,
  },
  followPill: {
    backgroundColor: PRIMARY, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  followPillFollowing: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: PRIMARY,
  },
  followPillText: {
    color: WHITE, fontSize: 12,
    fontFamily: AppDetails.fontFamily.inter.semiBold,
  },
  followPillTextFollowing: { color: PRIMARY },

  // Post card
  postCard: {
    flexDirection: 'row', backgroundColor: WHITE, borderRadius: 18,
    overflow: 'hidden', marginBottom: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: PRIMARY + '0D',
  },
  postThumb: {
    width: 76, height: 88, alignItems: 'center',
    justifyContent: 'center', backgroundColor: BORDER,
  },
  reelBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DARK + '8C', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2, gap: 3,
  },
  reelBadgeText: {
    color: WHITE, fontSize: 9,
    fontFamily: AppDetails.fontFamily.inter.semiBold,
  },
  postBody: { flex: 1, padding: 12, justifyContent: 'center' },
  postTitle: {
    fontSize: 14, fontFamily: AppDetails.fontFamily.inter.semiBold,
    color: DARK, lineHeight: 20,
  },
  postSub: {
    fontSize: 12, color: MUTED,
    fontFamily: AppDetails.fontFamily.inter.regular, marginTop: 4,
  },

  // Entity card (Page + Group share this base)
  entityCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 18, padding: 12, marginBottom: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: PRIMARY + '0D',
  },
  entityAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: BORDER },
  entityAvatarPage: {
    backgroundColor: PRIMARY + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  entityAvatarGroup: { borderRadius: 26 },
  entityAvatarGroupFallback: {
    backgroundColor: GREEN + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  entityBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  entityName: {
    fontSize: 15, fontFamily: AppDetails.fontFamily.inter.semiBold,
    color: DARK, marginBottom: 3,
  },
  entitySub: {
    fontSize: 12, color: MUTED,
    fontFamily: AppDetails.fontFamily.inter.regular, flexShrink: 1,
  },
  entityChevron: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  joinPill: {
    backgroundColor: GREEN, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  joinPillJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: GREEN,
  },
  joinPillText: {
    color: WHITE, fontSize: 12,
    fontFamily: AppDetails.fontFamily.inter.semiBold,
  },
  joinPillTextJoined: { color: GREEN },

  // Event card
  eventCard: {
    flexDirection: 'row', backgroundColor: WHITE, borderRadius: 18,
    overflow: 'hidden', marginBottom: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: PRIMARY + '0D',
  },
  eventThumb: {
    width: 80, height: 90, alignItems: 'center',
    justifyContent: 'center', backgroundColor: BORDER,
  },
  eventBody: { flex: 1, padding: 12 },
  eventTypePill: {
    alignSelf: 'flex-start', backgroundColor: Colors.warning + '14',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6,
  },
  eventTypeText: {
    fontSize: 11, fontFamily: AppDetails.fontFamily.inter.semiBold, color: Colors.warning,
  },
  eventName: {
    fontSize: 14, fontFamily: AppDetails.fontFamily.inter.semiBold,
    color: DARK, lineHeight: 20,
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  eventSub: {
    fontSize: 12, color: MUTED,
    fontFamily: AppDetails.fontFamily.inter.regular, marginLeft: 3, flexShrink: 1,
  },

  // Article card
  articleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 18,
    overflow: 'hidden', marginBottom: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: PRIMARY + '0D',
  },
  articleThumb: {
    width: 80, height: 90, alignItems: 'center',
    justifyContent: 'center', backgroundColor: BORDER,
  },
  articleBody: { flex: 1, padding: 12, justifyContent: 'center' },
  articleTypePill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', backgroundColor: ACCENT + '14',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, marginBottom: 6,
  },
  articleTypeText: {
    fontSize: 11, fontFamily: AppDetails.fontFamily.inter.semiBold, color: PRIMARY,
  },
  articleTitle: {
    fontSize: 14, fontFamily: AppDetails.fontFamily.inter.semiBold,
    color: DARK, lineHeight: 20,
  },
  articleSub: {
    fontSize: 12, color: MUTED,
    fontFamily: AppDetails.fontFamily.inter.regular, marginTop: 4,
  },
  articleChevron: {
    paddingRight: 12, alignSelf: 'center',
  },

  // Show More button
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHITE, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 18,
    marginTop: 4, marginBottom: 6,
    borderWidth: 1.5, borderColor: ACCENT + '59',
    gap: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  showMoreText: {
    fontSize: 13, color: ACCENT,
    fontFamily: AppDetails.fontFamily.inter.semiBold,
  },

  // Skeleton
  skeletonCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 18, padding: 14, marginBottom: 8,
    shadowColor: DARK, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  skeletonAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: SURFACE },
  skeletonBody: { flex: 1, marginLeft: 12 },
  skeletonLine: { height: 13, borderRadius: 7, backgroundColor: SURFACE },
  skeletonPill: {
    width: 60, height: 30, borderRadius: 15,
    backgroundColor: SURFACE, marginLeft: 8,
  },
});

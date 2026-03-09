import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import React, { memo, useMemo, useCallback, useState } from "react";
import AppDetails from "../../../helpers/appdetails";
import EngagementBar from "./feedcardproperties/engagementbar.jsx";
import { Image as ExpoImage } from "expo-image";
import FeedMediaRenderer from "./FeedMediaRenderer.jsx";
import CleanText from "../../../helpers/cleantext.js";
import UserDetails from "./feedcardproperties/userdetails.jsx";
import { parseLinkFromText } from "../../../helpers/linkparser.js";
import ShareModal from "./share.jsx";
import ReactionsModal from "./feedcardproperties/ReactionsModal.jsx";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from '../../../AuthContext';
import { Colors } from '../../../theme/colors';
import LinkPreview from '../../../components/LinkPreview';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = Colors.primary;
const BRAND       = Colors.primaryDark;
const TEXT_BODY   = Colors.textBodyIndigo;
const TEXT_MUTED  = Colors.mutedBlueGrayAlt;
const BG_CARD     = Colors.white;
const BORDER      = Colors.borderLight;
const AVATAR_RING = Colors.infoSurfaceSoft;

const MAX_FEED_TEXT_LENGTH = 200;
const DEFAULT_AVATAR = "https://img.freepik.com/free-vector/modern-question-mark-template-idea-message-vector_1017-47932.jpg";
const ANONYMOUS_AVATAR = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

// ─── Privacy icon mapping ─────────────────────────────────────────────────────
const PRIVACY_ICONS = {
  public:   'globe-outline',
  friends:  'people-outline',
  only_me:  'lock-closed-outline',
  custom:   'lock-closed-outline',
};

// ─── Reaction emoji mapping ───────────────────────────────────────────────────
const REACTION_EMOJIS = {
  like: '👍', love: '❤️', laugh: '😂', haha: '😂',
  wow:  '😮', sad:  '😢', angry: '😡', support: '🤝', yay: '🎉',
};

/**
 * ✅ NEW RULE:
 * Use feed.user.entity from API ("user" | "page" | "group")
 * NOT feed.context.type (context is for where it was posted, not who owns it)
 */
const getOwnerRoute = (feedUser) => {
  const entity = (feedUser?.entity || "user").toLowerCase();
  const id = Number(feedUser?.id || 0);

  if (!id) return null;

  if (entity === "page") {
    return { screen: "BusinessDetails", params: { pageId: id } };
  }

  if (entity === "group") {
    return { screen: "GroupDetails", params: { groupId: id } };
  }

  // default user
  return { screen: "UserProfile", params: { userId: id, username: feedUser?.username ?? "" } };
};

// ─── FeedCard ─────────────────────────────────────────────────────────────────
const FeedCard = ({ feed, isVisible, onPostPress }) => {
  const navigation       = useNavigation();
  const { token }        = useAuth();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const [adultRevealed, setAdultRevealed] = useState(false);

  // ── Anonymous check ───────────────────────────────────────────────────────
  const isAnonymous = !!feed?.is_anonymous;

  // ── User ──────────────────────────────────────────────────────────────────
  const user = useMemo(() => {
    if (isAnonymous) {
      return {
        id: 0,
        avatar: ANONYMOUS_AVATAR,
        username: 'anonymous',
        full_name: 'Anonymous',
        verified: false,
        entity: 'user',
      };
    }

    const fUser = feed?.user;

    if (!fUser) {
      return {
        id: 0,
        avatar: DEFAULT_AVATAR,
        username: "anonymous",
        full_name: "Anonymous",
        verified: false,
        entity: "user",
      };
    }

    return {
      ...fUser,
      entity: (fUser.entity || "user").toLowerCase(),
      avatar: fUser.avatar?.length > 0 ? fUser.avatar : DEFAULT_AVATAR,
      full_name: fUser.full_name || [fUser.first_name, fUser.last_name].filter(Boolean).join(' ') || fUser.username || "Unknown",
      username: fUser.username || "Unknown",
      verified: !!fUser.verified,
    };
  }, [feed?.user, isAnonymous]);

  const postContext = useMemo(() => {
    // 1️⃣ Dedicated page object
    const page = feed?.page;
    if (page) {
      const pageId = Number(page?.id ?? page?.page_id ?? feed?.page_id ?? 0);
      const pageTitle = page?.title || page?.name || page?.page_title || page?.page_name || null;
      if (pageId > 0 && pageTitle) {
        return {
          type: 'page',
          label: 'Posted via',
          id: pageId,
          title: pageTitle,
          avatar: page?.avatar || page?.logo || page?.image || null,
        };
      }
    }

    // 2️⃣ Fallback: user.entity === "page" means the poster IS the page
    const fUser = feed?.user;
    if (fUser && (fUser.entity || '').toLowerCase() === 'page') {
      const pageId = Number(fUser.id ?? feed?.page_id ?? 0);
      // Build title from page-specific fields first, skip any "Deleted User" values
      const notDeleted = (v) => v && !/deleted/i.test(v);
      const pageTitle = [fUser.page_title, fUser.page_name, fUser.name, fUser.title,
                         feed?.page_title, feed?.page_name]
                         .find(notDeleted)
                      || (notDeleted(fUser.full_name) ? fUser.full_name : null)
                      || (notDeleted(fUser.username) ? fUser.username : null);
      const pageAvatar = fUser.avatar || fUser.logo || fUser.image || null;
      if (pageId > 0 && pageTitle) {
        return {
          type: 'page',
          label: 'Posted via',
          id: pageId,
          title: pageTitle,
          avatar: pageAvatar,
        };
      }
      const fallbackId = Number(feed?.page_id ?? fUser.id ?? 0);
      if (fallbackId > 0) {
        return {
          type: 'page',
          label: 'Posted via',
          id: fallbackId,
          title: pageTitle || 'Page',
          avatar: pageAvatar,
        };
      }
    }

    const group = feed?.group;
    if (group) {
      const groupId = Number(group?.id ?? group?.group_id ?? feed?.group_id ?? 0);
      const groupTitle = group?.title || group?.name || group?.group_title || group?.group_name || null;
      if (groupId > 0 && groupTitle) {
        return {
          type: 'group',
          label: 'Posted in',
          id: groupId,
          title: groupTitle,
          avatar: group?.avatar || group?.image || group?.photo || null,
        };
      }
    }

    return null;
  }, [feed?.page, feed?.group, feed?.page_id, feed?.group_id, feed?.user]);

  // ── Text + hashtag extraction ──────────────────────────────────────────────
  const { displayText, showSeeMore, allTags, extractedUrl } = useMemo(() => {
    const apiTags = feed?.hashtags || [];
    let extractedUrl = null;

    if (!feed?.text) return { displayText: "", showSeeMore: false, allTags: apiTags, extractedUrl: null };

    // Always parse and strip URL from text so the LinkPreview card replaces it
    const parsed = parseLinkFromText(feed.text);
    let text = parsed.text;
    extractedUrl = parsed.url;

    // Pull out #hashtag tokens from the raw text
    const extracted = (text.match(/#\w+/g) || []).map(t => t.slice(1));

    // Strip hashtags from the caption
    const stripped = text.replace(/#\w+/g, '').replace(/\s{2,}/g, ' ').trim();
    const cleaned  = CleanText(stripped);

    // Merge API hashtags + extracted (case-insensitive dedup)
    const seen = new Set();
    const allTags = [...apiTags, ...extracted].filter(tag => {
      const t = (tag || '').toLowerCase();
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });

    if (cleaned.length > MAX_FEED_TEXT_LENGTH) {
      return {
        displayText: `${cleaned.substring(0, MAX_FEED_TEXT_LENGTH)}...`,
        showSeeMore: true,
        allTags,
        extractedUrl,
      };
    }
    return { displayText: cleaned, showSeeMore: false, allTags, extractedUrl };
  }, [feed?.text, feed?.type, feed?.hashtags]);

  // ── Has media? ────────────────────────────────────────────────────────────
  const hasMedia = useMemo(() => {
    if (feed?.media && feed.media.length > 0) return true;

    if ([
      'shared', 'product', 'article', 'poll', 'event_cover', 'job',
      'link', 'media', 'video', 'reel', 'photos',
      'profile_picture', 'profile_cover', 'page_picture', 'page_cover',
      'group_picture', 'group_cover'
    ].includes(feed?.type)) {
      return true;
    }

    if (feed?.shared_post) return true;
    return false;
  }, [feed?.media, feed?.type, feed?.shared_post]);

  const isTextOnly = useMemo(() => {
    return (feed?.type === 'text' || feed?.type === '' || feed?.type === 'post') && !hasMedia;
  }, [feed?.type, hasMedia]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const isReel = feed?.type === 'reel' || (
    feed?.media?.length === 1 &&
    feed.media[0]?.video_url &&
    !feed.media[0]?.url &&
    feed?.type === 'video'
  );

  const handleMoveToCommentScreen = useCallback(() => {
    // Reels ALWAYS open the full-screen Reels2 viewer, regardless of onPostPress
    if (isReel) {
      navigation.navigate('Reels2', {
        initialReels: [feed],
        startIndex: 0,
        initialReelId: feed?.id,
      });
      return;
    }
    if (onPostPress) {
      onPostPress(feed?.id);
      return;
    }
    if (feed?.type === 'article') {
      navigation.navigate('ArticleDetails', { postId: feed?.id, title: feed?.payload?.title });
      return;
    }
    navigation.navigate('PostDetail', { postId: feed?.id });
  }, [feed?.id, feed?.type, feed?.payload?.title, navigation, onPostPress, isReel, feed]);

  const handleOwnerPress = useCallback(() => {
    const route = getOwnerRoute(user);
    if (!route) return;
    navigation.navigate(route.screen, route.params);
  }, [user, navigation]);

  const handlePostContextPress = useCallback(() => {
    if (!postContext) return;
    if (postContext.type === 'page') {
      navigation.navigate('BusinessDetails', { pageId: postContext.id });
      return;
    }
    if (postContext.type === 'group') {
      navigation.navigate('GroupDetails', { groupId: postContext.id });
    }
  }, [navigation, postContext]);

  // For page posts: show page identity instead of personal author
  const isPagePost = postContext?.type === 'page';
  const displayAvatar = isPagePost && postContext.avatar ? postContext.avatar : user?.avatar;
  const avatarTapHandler = isPagePost ? handlePostContextPress : handleOwnerPress;

  // Build the user object passed to UserDetails — swap name for page posts
  const displayUser = useMemo(() => {
    if (isPagePost) {
      return {
        ...user,
        full_name: postContext.title || user.full_name,
        avatar: postContext.avatar || user.avatar,
        // Keep verified only if the page entity is verified; hide personal badge
        verified: false,
      };
    }
    return user;
  }, [user, isPagePost, postContext?.title, postContext?.avatar]);

  // ── Colored pattern post ──────────────────────────────────────────────────
  const coloredPattern = feed?.colored_pattern;
  const isColoredPost = !!coloredPattern && isTextOnly;

  // ── Feeling / Action text ─────────────────────────────────────────────────
  const feelingText = useMemo(() => {
    if (!feed?.feeling_action || !feed?.feeling_value) return null;
    return `is ${feed.feeling_action} ${feed.feeling_value}`;
  }, [feed?.feeling_action, feed?.feeling_value]);

  // ── Boosted / Sponsored ───────────────────────────────────────────────────
  const isBoosted = !!feed?.boosted;

  // ── Adult content ─────────────────────────────────────────────────────────
  const isAdult = !!feed?.for_adult && !adultRevealed;

  // ── Reactions summary (top 3 emojis + total) ──────────────────────────────
  const reactionsSummary = useMemo(() => {
    const reactions = feed?.reactions;
    if (!reactions || typeof reactions !== 'object') return null;
    const entries = Object.entries(reactions)
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    if (entries.length === 0) return null;
    const top3 = entries.slice(0, 3).map(([type]) => REACTION_EMOJIS[type] || '👍');
    const total = entries.reduce((sum, [, c]) => sum + Number(c), 0);
    return { emojis: top3, total };
  }, [feed?.reactions]);

  // ── Privacy icon ──────────────────────────────────────────────────────────
  const privacyIcon = PRIVACY_ICONS[feed?.privacy] || PRIVACY_ICONS.public;

  // ── Comments disabled ─────────────────────────────────────────────────────
  const commentsDisabled = !!feed?.comments_disabled;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Left column: avatar + thread line */}
      <View style={styles.leftCol}>
        <TouchableOpacity
          onPress={isAnonymous ? undefined : avatarTapHandler}
          activeOpacity={isAnonymous ? 1 : 0.75}
          style={styles.avatarWrapper}
        >
          <View style={styles.avatarRing} />
          <ExpoImage
            source={{ uri: displayAvatar }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        <View style={styles.threadLine} />
      </View>

      {/* Right column */}
      <View style={styles.rightCol}>
        {/* ── Boosted / Sponsored label ── */}
        {isBoosted && (
          <View style={styles.boostedBadge}>
            <Ionicons name="megaphone-outline" size={11} color={ACCENT} />
            <Text style={styles.boostedText}>Sponsored</Text>
          </View>
        )}

        {/* ✅ Tap author area = open correct screen (user/page/group) */}
        <UserDetails
          feed={{ ...feed, user: displayUser }}
          source="feedcard"
          onOwnerPress={isAnonymous ? undefined : (isPagePost ? handlePostContextPress : handleOwnerPress)}
          postContext={postContext}
          onPostContextPress={handlePostContextPress}
          feelingText={feelingText}
          privacyIcon={privacyIcon}
          isBoosted={isBoosted}
        />

        {/* ── Adult content blur overlay ── */}
        {isAdult ? (
          <TouchableOpacity
            style={styles.adultOverlay}
            activeOpacity={0.85}
            onPress={() => setAdultRevealed(true)}
          >
            <Ionicons name="eye-off-outline" size={24} color={Colors.white} />
            <Text style={styles.adultText}>Sensitive content</Text>
            <Text style={styles.adultSubText}>Tap to reveal</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* ── Colored pattern text post ── */}
            {isColoredPost ? (
              <TouchableOpacity
                onPress={handleMoveToCommentScreen}
                activeOpacity={0.85}
                style={styles.coloredPostWrapper}
              >
                <LinearGradient
                  colors={
                    Array.isArray(coloredPattern?.colors) && coloredPattern.colors.length >= 2
                      ? coloredPattern.colors
                      : [BRAND, ACCENT]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coloredPostGradient}
                >
                  <Text style={styles.coloredPostText}>{displayText}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                {/* ── Caption ── */}
                {displayText ? (
                  <TouchableOpacity
                    onPress={handleMoveToCommentScreen}
                    activeOpacity={0.85}
                    style={styles.textSection}
                  >
                    <Text style={[styles.postText, isTextOnly && styles.postTextLarge]}>
                      {displayText}
                      {showSeeMore ? <Text style={styles.seeMore}> see more</Text> : null}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            {/* ── Link Preview (YouTube / Spotify / generic OG card) ── */}
            {extractedUrl && !hasMedia ? (
              <LinkPreview url={extractedUrl} />
            ) : null}

            {/* ── Media ── */}
            {hasMedia ? (
              feed?.type === 'reel' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleMoveToCommentScreen}
                  style={styles.reelMediaWrapper}
                >
                  <FeedMediaRenderer feed={feed} isVisible={isVisible} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleMoveToCommentScreen}
                  style={styles.mediaWrapper}
                >
                  <FeedMediaRenderer feed={feed} isVisible={isVisible} />
                </TouchableOpacity>
              )
            ) : null}
          </>
        )}

        {/* ── Hashtags ── */}
        {allTags.length > 0 ? (
          <View style={styles.hashtagContainer}>
            {allTags.map((tag, idx) => (
              <TouchableOpacity
                key={`${tag}-${idx}`}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SearchScreen', { initialTab: 'all', initialQuery: tag })}
              >
                <Text style={styles.hashtag}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* ── Reactions summary (tap to open reactions modal) ── */}
        {reactionsSummary && (
          <TouchableOpacity
            style={styles.reactionsRow}
            onPress={() => setReactionsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.reactionsEmojis}>
              {reactionsSummary.emojis.map((emoji, i) => (
                <Text key={i} style={styles.reactionEmoji}>{emoji}</Text>
              ))}
            </View>
            <Text style={styles.reactionsCount}>
              {reactionsSummary.total.toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}

        {/* Views + privacy */}
        <View style={styles.metaRow}>
          <Ionicons name="eye-outline" size={13} color={TEXT_MUTED} />
          <Text style={styles.metaText}>{feed?.views ?? 0}</Text>
          <Ionicons name={privacyIcon} size={11} color={TEXT_MUTED} style={{ marginLeft: 10 }} />
        </View>

        {/* Engagement */}
        <EngagementBar
          feedId={feed?.id}
          initialLiked={!!(feed?.is_liked || feed?.my_reaction || feed?.user_reaction)}
          initialLikeCount={feed?.likes_count ?? feed?.reactions?.total ?? feed?.total_reactions ?? feed?.reaction_count ?? feed?.reactions_count ?? 0}
          commentsCount={feed?.comments_count ?? 0}
          sharesCount={feed?.shares_count ?? 0}
          myReaction={feed?.my_reaction ?? feed?.user_reaction ?? null}
          reactions={feed?.reactions}
          isSaved={!!feed?.is_saved}
          commentsDisabled={commentsDisabled}
          onOpenShare={() => setShareModalVisible(true)}
          onCommentPress={commentsDisabled ? undefined : handleMoveToCommentScreen}
          onReactionsPress={() => setReactionsModalVisible(true)}
        />
      </View>

      {/* Share */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        feed={feed}
      />

      {/* Reactions Modal */}
      <ReactionsModal
        visible={reactionsModalVisible}
        postId={feed?.id}
        token={token}
        reactions={feed?.reactions}
        onClose={() => setReactionsModalVisible(false)}
      />

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 16,
    flexDirection: "row",
    backgroundColor: BG_CARD,
  },

  leftCol: {
    alignItems: "center",
    marginRight: 12,
    width: 44,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: AVATAR_RING,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  threadLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: BORDER,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 1,
  },

  rightCol: {
    flex: 1,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  textSection: {
    paddingTop: 6,
    paddingBottom: 2,
  },
  postText: {
    fontSize: 14.5,
    color: TEXT_BODY,
    lineHeight: 22,
    fontFamily: AppDetails.fontFamily?.body,
    letterSpacing: 0.1,
  },
  seeMore: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 13.5,
  },
  mediaWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
  },

  // Compact portrait reel card in feed (Threads-style)
  reelMediaWrapper: {
    width: '72%',
    alignSelf: 'flex-start',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: Colors.black,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginLeft: 4,
    fontFamily: AppDetails.fontFamily?.body,
    letterSpacing: 0.2,
  },

  postTextLarge: {
    fontSize: 16,
    lineHeight: 26,
  },

  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  hashtag: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Boosted / Sponsored ────────────────────────────────────────────────────
  boostedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  boostedText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.2,
  },

  // ── Colored pattern post ───────────────────────────────────────────────────
  coloredPostWrapper: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  coloredPostGradient: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coloredPostText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Adult content overlay ──────────────────────────────────────────────────
  adultOverlay: {
    marginTop: 8,
    backgroundColor: Colors.neutral900 ?? '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 6,
  },
  adultText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  adultSubText: {
    fontSize: 12,
    color: Colors.white + '80',
  },

  // ── Reactions summary ──────────────────────────────────────────────────────
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  reactionsEmojis: {
    flexDirection: 'row',
    gap: 1,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionsCount: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
});

// ✅ memo includes entity so routing label changes still update card
export default memo(FeedCard, (prev, next) => {
  return (
    prev.feed.id                 === next.feed.id                 &&
    prev.feed.likes_count        === next.feed.likes_count        &&
    prev.feed.comments_count     === next.feed.comments_count     &&
    prev.feed.is_liked           === next.feed.is_liked           &&
    prev.feed.is_saved           === next.feed.is_saved           &&
    prev.feed.my_reaction        === next.feed.my_reaction        &&
    prev.feed.is_anonymous       === next.feed.is_anonymous       &&
    prev.feed.for_adult          === next.feed.for_adult          &&
    prev.feed.boosted            === next.feed.boosted            &&
    prev.feed.user?.entity       === next.feed.user?.entity       &&
    prev.feed.user?.id           === next.feed.user?.id           &&
    prev.feed.group_id           === next.feed.group_id           &&
    prev.feed.page_id            === next.feed.page_id            &&
    prev.feed.group?.id          === next.feed.group?.id          &&
    prev.feed.group?.title       === next.feed.group?.title       &&
    prev.feed.group?.avatar      === next.feed.group?.avatar      &&
    prev.feed.page?.id           === next.feed.page?.id           &&
    prev.feed.page?.title        === next.feed.page?.title        &&
    prev.feed.page?.avatar       === next.feed.page?.avatar       &&
    prev.isVisible               === next.isVisible               &&
    prev.onPostPress             === next.onPostPress             &&
    JSON.stringify(prev.feed.reactions) === JSON.stringify(next.feed.reactions)
  );
});
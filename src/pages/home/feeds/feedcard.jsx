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
import { useNavigation } from "@react-navigation/native";
import { Colors } from '../../../theme/colors';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = Colors.primary;
const TEXT_BODY   = Colors.textBodyIndigo;
const TEXT_MUTED  = Colors.mutedBlueGrayAlt;
const BG_CARD     = Colors.white;
const BORDER      = Colors.borderLight;
const AVATAR_RING = Colors.infoSurfaceSoft;

const MAX_FEED_TEXT_LENGTH = 200;
const DEFAULT_AVATAR = "https://img.freepik.com/free-vector/modern-question-mark-template-idea-message-vector_1017-47932.jpg";

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
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // ── User ──────────────────────────────────────────────────────────────────
  const user = useMemo(() => {
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
      full_name: fUser.full_name || fUser.username || "Unknown",
      username: fUser.username || "Unknown",
      verified: !!fUser.verified,
    };
  }, [feed?.user]);

  const postContext = useMemo(() => {
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
  }, [feed?.page, feed?.group, feed?.page_id, feed?.group_id]);

  // ── Text + hashtag extraction ──────────────────────────────────────────────
  const { displayText, showSeeMore, allTags } = useMemo(() => {
    const apiTags = feed?.hashtags || [];

    if (!feed?.text) return { displayText: "", showSeeMore: false, allTags: apiTags };

    let text = feed.text;
    if (feed.type === "media" || feed.type === "link") {
      const parsed = parseLinkFromText(feed.text);
      text = parsed.text;
    }

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
      };
    }
    return { displayText: cleaned, showSeeMore: false, allTags };
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
  const handleMoveToCommentScreen = useCallback(() => {
    if (onPostPress) {
      onPostPress(feed?.id);
      return;
    }
    if (feed?.type === 'article') {
      navigation.navigate('ArticleDetails', { postId: feed?.id, title: feed?.payload?.title });
      return;
    }
    navigation.navigate('PostDetail', { postId: feed?.id });
  }, [feed?.id, feed?.type, feed?.payload?.title, navigation, onPostPress]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Left column: avatar + thread line */}
      <View style={styles.leftCol}>
        <TouchableOpacity
          onPress={handleOwnerPress}
          activeOpacity={0.75}
          style={styles.avatarWrapper}
        >
          <View style={styles.avatarRing} />
          <ExpoImage
            source={{ uri: user?.avatar }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        <View style={styles.threadLine} />
      </View>

      {/* Right column */}
      <View style={styles.rightCol}>
        {/* ✅ Tap author area = open correct screen (user/page/group) */}
        <UserDetails
          feed={{ ...feed, user }}
          source="feedcard"
          onOwnerPress={handleOwnerPress}
          postContext={postContext}
          onPostContextPress={handlePostContextPress}
        />

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

        {/* ── Media ── */}
        {hasMedia ? (
          feed?.type === 'reel' ? (
            // Reel: plain View so tapping the video (play/pause/mute) never opens the post.
            // User can still open the post by tapping the caption, username or engagement bar.
            <View style={styles.reelMediaWrapper}>
              <FeedMediaRenderer feed={feed} isVisible={isVisible} />
            </View>
          ) : (
            // Other media: tap anywhere (outside the control buttons) opens the post.
            // Inner control buttons intercept their own touches and don't bubble up.
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleMoveToCommentScreen}
              style={styles.mediaWrapper}
            >
              <FeedMediaRenderer feed={feed} isVisible={isVisible} />
            </TouchableOpacity>
          )
        ) : null}

        {/* ── Hashtags ── */}
        {allTags.length > 0 ? (
          <View style={styles.hashtagContainer}>
            {allTags.map((tag, idx) => (
              <TouchableOpacity
                key={`${tag}-${idx}`}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SearchScreen', { initialTab: 'posts', initialQuery: tag })}
              >
                <Text style={styles.hashtag}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Views */}
        <View style={styles.metaRow}>
          <Ionicons name="eye-outline" size={13} color={TEXT_MUTED} />
          <Text style={styles.metaText}>{feed?.views ?? 0}</Text>
        </View>

        {/* Engagement */}
        <EngagementBar
          feedId={feed?.id}
          initialLiked={!!feed?.is_liked}
          initialLikeCount={feed?.likes_count ?? 0}
          commentsCount={feed?.comments_count ?? 0}
          onOpenShare={() => setShareModalVisible(true)}
          onCommentPress={handleMoveToCommentScreen}
        />
      </View>

      {/* Share */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        feed={feed}
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
});

// ✅ memo includes entity so routing label changes still update card
export default memo(FeedCard, (prev, next) => {
  return (
    prev.feed.id                 === next.feed.id                 &&
    prev.feed.likes_count        === next.feed.likes_count        &&
    prev.feed.comments_count     === next.feed.comments_count     &&
    prev.feed.is_liked           === next.feed.is_liked           &&
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
    prev.onPostPress             === next.onPostPress
  );
});
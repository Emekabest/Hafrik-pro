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
import PostContent from "./feedcardproperties/postcontent.jsx";
import CleanText from "../../../helpers/cleantext.js";
import UserDetails from "./feedcardproperties/userdetails.jsx";
import { parseLinkFromText } from "../../../helpers/linkparser.js";
import VideoManager from "../../../helpers/videomanager.js";
import { useGlobalVideoPlayer } from "../../../helpers/GlobalVideoPlayerContext";
import useStore from "../../../repository/store";
import ShareModal from "./share.jsx";
import ImageViewModal from "../../../pages/imageviewmodal.jsx";
import { useNavigation } from "@react-navigation/native";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = '#13C296';
const TEXT_BODY   = '#1A1A2E';
const TEXT_MUTED  = '#8A9BA8';
const BG_CARD     = '#FFFFFF';
const BORDER      = '#EEF3F3';
const AVATAR_RING = '#E0F2F0';

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
  const globalPlayer     = useGlobalVideoPlayer();
  const openCommentModal = useStore(state => state.openCommentModal);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage,     setSelectedImage]     = useState(null);

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

  // ── Text ──────────────────────────────────────────────────────────────────
  const { displayText, showSeeMore } = useMemo(() => {
    if (!feed?.text) return { displayText: "", showSeeMore: false };

    let text = feed.text;
    if (feed.type === "media" || feed.type === "link") {
      const parsed = parseLinkFromText(feed.text);
      text = parsed.text;
    }

    const cleaned = CleanText(text);
    if (cleaned.length > MAX_FEED_TEXT_LENGTH) {
      return {
        displayText: `${cleaned.substring(0, MAX_FEED_TEXT_LENGTH)}...`,
        showSeeMore: true,
      };
    }
    return { displayText: cleaned, showSeeMore: false };
  }, [feed?.text, feed?.type]);

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
    // Always open the full Post Detail screen
    navigation.navigate('PostDetail', { postId: feed?.id });
  }, [feed?.id, navigation, onPostPress]);

  const handleOwnerPress = useCallback(() => {
    const route = getOwnerRoute(user);
    if (!route) return;
    navigation.navigate(route.screen, route.params);
  }, [user, navigation]);

  const handleImagePress = useCallback((url) => {
    if (!url) return;
    setSelectedImage(url);
    setImageModalVisible(true);
  }, []);

  const handleReelPress = useCallback(() => {
    navigation.navigate('Reels', { initialReelId: String(feed?.id) });
  }, [feed?.id, navigation]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Left column: avatar + thread line */}
      <View style={styles.leftCol}>
        {/* ✅ Tap avatar = view image */}
        <TouchableOpacity
          onPress={() => handleImagePress(user?.avatar)}
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
        <TouchableOpacity onPress={handleOwnerPress} activeOpacity={0.75}>
          <UserDetails feed={{ ...feed, user }} source="feedcard" />
        </TouchableOpacity>

        {/* Post text */}
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

        {/* Hashtags */}
        {feed?.hashtags?.length > 0 ? (
          <View style={styles.hashtagContainer}>
            {feed.hashtags.map((tag, idx) => (
              <TouchableOpacity key={`${tag}-${idx}`} activeOpacity={0.7}>
                <Text style={styles.hashtag}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Media */}
        {hasMedia ? (
          feed?.type === 'reel' ? (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={handleReelPress}
              style={styles.mediaWrapper}
            >
              <PostContent
                feed={feed}
                onImagePress={handleImagePress}
                isVisible={isVisible}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.mediaWrapper}>
              <PostContent
                feed={feed}
                onImagePress={handleImagePress}
                isVisible={isVisible}
              />
            </View>
          )
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

      {/* Image viewer */}
      <ImageViewModal
        isVisible={imageModalVisible}
        onClose={() => setImageModalVisible(false)}
        imageUrl={selectedImage}
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
    prev.isVisible               === next.isVisible               &&
    prev.onPostPress             === next.onPostPress
  );
});
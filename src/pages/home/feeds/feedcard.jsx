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

// ─── FeedCard ─────────────────────────────────────────────────────────────────
const FeedCard = ({ feed, isVisible }) => {
  const navigation       = useNavigation();
  const globalPlayer     = useGlobalVideoPlayer();
  const openCommentModal = useStore(state => state.openCommentModal);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage,     setSelectedImage]     = useState(null);

  // ── User ──────────────────────────────────────────────────────────────────
  const user = useMemo(() => {
    if (!feed?.user) {
      return {
        id: 0,
        avatar: DEFAULT_AVATAR,
        username: "anonymous",
        full_name: "Anonymous",
        verified: false,
      };
    }
    return {
      ...feed.user,
      avatar: feed.user.avatar?.length > 0 ? feed.user.avatar : DEFAULT_AVATAR,
    };
  }, [feed?.user]);

  // ── Text ──────────────────────────────────────────────────────────────────
  const { displayText, showSeeMore } = useMemo(() => {
    if (!feed.text) return { displayText: "", showSeeMore: false };

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
  }, [feed.text, feed.type]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMoveToCommentScreen = useCallback(() => {
    const isVideo = feed.type === "video" || feed.type === "reel";
    if (isVideo) {
      VideoManager.storeCurrentPlayingVideo();
      if (globalPlayer && globalPlayer.feedId === feed.id) {
        globalPlayer.transferTo("comments");
      }
    }
    openCommentModal(feed.id, null);
  }, [feed.id, feed.type, globalPlayer, openCommentModal]);

  const handleProfilePress = useCallback(() => {
    if (!user?.id) return;
    navigation.navigate("Profile", { user_id: user.id });
  }, [user?.id, navigation]);

  const handleImagePress = useCallback((url) => {
    if (url) {
      setSelectedImage(url);
      setImageModalVisible(true);
    }
  }, []);

  const handleReelPress = useCallback(() => {
    navigation.navigate('Reels', { initialReelId: String(feed.id) });
  }, [feed.id, navigation]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Left column: avatar + thread line */}
      <View style={styles.leftCol}>
        <TouchableOpacity
          onPress={handleProfilePress}
          activeOpacity={0.75}
          style={styles.avatarWrapper}
        >
          <View style={styles.avatarRing} />
          <ExpoImage
            source={{ uri: user.avatar }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
        <View style={styles.threadLine} />
      </View>

      {/* Right column */}
      <View style={styles.rightCol}>

        {/* Author */}
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.75}>
          <UserDetails feed={{ ...feed, user }} source="feedcard" />
        </TouchableOpacity>

        {/* Post text */}
        {displayText ? (
          <TouchableOpacity
            onPress={handleMoveToCommentScreen}
            activeOpacity={0.85}
            style={styles.textSection}
          >
            <Text style={styles.postText}>
              {displayText}
              {showSeeMore && (
                <Text style={styles.seeMore}> see more</Text>
              )}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Media — reels navigate to Reels screen; everything else renders inline */}
        {feed.type === 'reel' ? (
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
        )}

        {/* Views */}
        <View style={styles.metaRow}>
          <Ionicons name="eye-outline" size={13} color={TEXT_MUTED} />
          <Text style={styles.metaText}>{feed.views ?? 0}</Text>
        </View>

        {/* Engagement */}
        <EngagementBar
          feedId={feed.id}
          initialLiked={feed.is_liked}
          initialLikeCount={feed.likes_count}
          commentsCount={feed.comments_count}
          onOpenShare={() => setShareModalVisible(true)}
          onCommentPress={handleMoveToCommentScreen}
        />
      </View>

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        feed={feed}
      />

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
});

// ✅ memo now includes isVisible so video pauses correctly
export default memo(FeedCard, (prev, next) => {
  return (
    prev.feed.id             === next.feed.id             &&
    prev.feed.likes_count    === next.feed.likes_count    &&
    prev.feed.comments_count === next.feed.comments_count &&
    prev.feed.is_liked       === next.feed.is_liked       &&
    prev.isVisible           === next.isVisible
  );
});

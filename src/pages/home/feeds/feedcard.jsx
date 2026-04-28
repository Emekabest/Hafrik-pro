import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import React, { memo, useMemo, useCallback, useState, useRef } from "react";
import AppDetails from "../../../helpers/appdetails";
import EngagementBar from "./feedcardproperties/engagementbar.jsx";
import { Image as ExpoImage } from "expo-image";
import FeedMediaRenderer from "./FeedMediaRenderer.jsx";
import CleanText from "../../../helpers/cleantext.js";
import UserDetails from "./feedcardproperties/userdetails.jsx";
import { parseLinkFromText } from "../../../helpers/linkparser.js";
import ShareModal from "./share.jsx";
import SaveAsImageModal from "./SaveAsImageModal.jsx";
import ReactionsModal from "./feedcardproperties/ReactionsModal.jsx";
import RepostModal from "./feedcardproperties/RepostModal.jsx";
import SaveCollectionsModal from "./feedcardproperties/SaveCollectionsModal.jsx";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from '../../../AuthContext';
import { Colors } from '../../../theme/colors';
import useStore from '../../../repository/store';
import { editPost, deletePost } from '../../../api/feedApi';
import { Alert } from 'react-native';
import ToggleFeedController from '../../../controllers/tooglefeedcontroller';
import { useDoubleTap } from '../../reels/useDoubleTap';
import LinkPreview from '../../../components/LinkPreview';
import { LinearGradient } from 'expo-linear-gradient';

// Sum all reaction types as total likes
const totalLikes = (reactions, fallback = 0) => {
  if (reactions && typeof reactions === 'object') {
    const sum = Object.entries(reactions)
      .filter(([k]) => k !== 'total')
      .reduce((acc, [, v]) => acc + Number(v || 0), 0);
    if (sum > 0) return sum;
    if (typeof reactions.total === 'number') return reactions.total;
  }
  return Number(fallback) || 0;
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = Colors.primary;
const BRAND       = Colors.primaryDark;
const TEXT_BODY   = Colors.textBodyIndigo;
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
  const { token, user: authUser } = useAuth();
  const [shareModalVisible,          setShareModalVisible]          = useState(false);
  const [saveImageModalVisible,      setSaveImageModalVisible]      = useState(false);
  const [reactionsModalVisible,      setReactionsModalVisible]      = useState(false);
  const [repostModalVisible,         setRepostModalVisible]         = useState(false);
  const [saveCollectionsModalVisible, setSaveCollectionsModalVisible] = useState(false);
  const [adultRevealed, setAdultRevealed] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDraftText,    setEditDraftText]    = useState('');
  const [editSaving,       setEditSaving]       = useState(false);
  const [editError,        setEditError]        = useState('');

  // ── Double-tap heart animation ─────────────────────────────────────────────
  const heartScaleAnim   = useRef(new Animated.Value(0)).current;
  const heartOpacityAnim = useRef(new Animated.Value(0)).current;

  // ── Anonymous check ───────────────────────────────────────────────────────
  const isAnonymous = !!feed?.is_anonymous;

  // ── Ownership check ───────────────────────────────────────────────────────
  const isOwner = !isAnonymous && !!authUser?.id && String(feed?.user?.id) === String(authUser?.id);

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

    if (!feed?.text) {
      // For link-type posts with no text body, still grab the URL
      const fallbackUrl = feed?.url || feed?.link_url || feed?.payload?.url || null;
      return { displayText: "", showSeeMore: false, allTags: apiTags, extractedUrl: fallbackUrl };
    }

    // Always parse and strip URL from text so the LinkPreview card replaces it
    const parsed = parseLinkFromText(feed.text);
    let text = parsed.text;
    extractedUrl = parsed.url;

    // For link-type posts fall back to feed.url if text had no URL
    if (!extractedUrl) {
      extractedUrl = feed?.url || feed?.link_url || feed?.payload?.url || null;
    }

    // Keep hashtags inline in the text — just clean and truncate
    const cleaned = CleanText(text.trim());

    // Pills row: only API hashtags NOT already visible inline in text
    const inlineSet = new Set((text.match(/#\w+/g) || []).map(t => t.slice(1).toLowerCase()));
    const allTags = apiTags.filter(tag => !inlineSet.has((tag || '').toLowerCase()));

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
      'media', 'video', 'reel', 'photos',
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

  // ── Edit post ─────────────────────────────────────────────────────────────
  const handleEditOpen = useCallback(() => {
    setEditDraftText(feed?.text ?? '');
    setEditError('');
    setEditModalVisible(true);
  }, [feed?.text]);

  const handleEditSave = useCallback(async () => {
    const trimmed = editDraftText.trim();
    if (!trimmed) { setEditError('Post text cannot be empty.'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      await editPost(feed?.id, trimmed, token);
      // Optimistic update — patch text in global store without reload
      const { feeds: storeFeeds, updateFeedById } = useStore.getState();
      const current = storeFeeds.feedsById[feed?.id];
      if (current) updateFeedById(feed.id, { ...current, text: trimmed });
      setEditModalVisible(false);
    } catch (err) {
      setEditError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }, [editDraftText, feed?.id, token]);

  // ── Delete post ───────────────────────────────────────────────────────────
  const handleDeletePost = useCallback(() => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(feed?.id, token);
              useStore.getState().removeFeedById(feed?.id);
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not delete post. Please try again.');
            }
          },
        },
      ]
    );
  }, [feed?.id, token]);

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
    // Shared article → open the original article in ArticleDetails
    if (feed?.type === 'shared' && feed?.shared_post?.type === 'article') {
      const orig = feed.shared_post;
      navigation.navigate('ArticleDetails', { postId: orig.id, title: orig.payload?.title ?? orig.title });
      return;
    }
    navigation.navigate('PostDetail', { postId: feed?.id });
  }, [feed?.id, feed?.type, feed?.payload?.title, feed?.shared_post, navigation, onPostPress, isReel, feed]);

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

  // ── Double-tap like ───────────────────────────────────────────────────────
  const triggerHeartAnimation = useCallback(() => {
    heartScaleAnim.setValue(0.4);
    heartOpacityAnim.setValue(1);
    Animated.parallel([
      Animated.spring(heartScaleAnim, { toValue: 1.3, friction: 4, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(heartScaleAnim,   { toValue: 1.7, duration: 250, useNativeDriver: true }),
        Animated.timing(heartOpacityAnim, { toValue: 0,   duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [heartScaleAnim, heartOpacityAnim]);

  const handleDoubleTapLike = useCallback(async () => {
    triggerHeartAnimation();
    // Only add like, never remove on double-tap (Instagram behaviour)
    if (feed?.is_liked || feed?.my_reaction) return;
    try {
      await ToggleFeedController(feed.id, token, 'like');
      const { feeds: storeFeeds, updateFeedById } = useStore.getState();
      const current = storeFeeds.feedsById[feed.id];
      if (current) {
        const updReactions = { ...(current.reactions || {}), like: Number(current.reactions?.like || 0) + 1 };
        updateFeedById(feed.id, {
          ...current,
          is_liked: true,
          my_reaction: 'like',
          likes_count: Number(current.likes_count || 0) + 1,
          reactions: updReactions,
        });
      }
    } catch {}
  }, [feed?.id, feed?.is_liked, feed?.my_reaction, token, triggerHeartAnimation]);

  const mediaTapHandler = useDoubleTap(handleDoubleTapLike, handleMoveToCommentScreen);

  // ── Follow author ─────────────────────────────────────────────────────────
  const handleFollow = useCallback(async () => {
    const userId = feed?.user?.id;
    if (!userId || (feed?.user?.entity || 'user').toLowerCase() !== 'user') return;
    // Optimistic toggle
    const { feeds: storeFeeds, updateFeedById } = useStore.getState();
    const current = storeFeeds.feedsById[feed.id];
    if (current) {
      const nowFollowing = !current.user?.is_following;
      updateFeedById(feed.id, {
        ...current,
        user: { ...current.user, is_following: nowFollowing },
      });
    }
    try {
      const res = await fetch('https://hafrik.com/api/v1/users/follow.php', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok && current) {
        // Rollback
        useStore.getState().updateFeedById(feed.id, current);
      }
    } catch {
      if (current) useStore.getState().updateFeedById(feed.id, current);
    }
  }, [feed?.user?.id, feed?.user?.entity, feed?.id, token]);

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
          onFollow={isAnonymous ? undefined : handleFollow}
          onEdit={handleEditOpen}
          onDelete={handleDeletePost}
          isOwner={isOwner}
        />

        {/* ── Group / Community creation card ── */}
        {feed?.type === 'group' && (() => {
          const groupId    = feed?.group_id ?? feed?.group?.id ?? null;
          const groupName  = feed?.group?.name ?? feed?.group?.title ?? feed?.group_name ?? 'a community';
          const handlePress = () => groupId && navigation.navigate('GroupDetails', { groupId });
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePress}
              style={styles.groupCreationCard}
            >
              <View style={styles.groupCreationIconWrap}>
                <Ionicons name="people" size={22} color={ACCENT} />
              </View>
              <View style={styles.groupCreationBody}>
                <Text style={styles.groupCreationLabel}>Created a new community</Text>
                <Text style={styles.groupCreationName} numberOfLines={1}>{groupName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.neutral430 ?? '#999'} />
            </TouchableOpacity>
          );
        })()}

        {/* ── Adult content blur overlay + regular content (skip for group creation) ── */}
        {feed?.type !== 'group' && (isAdult ? (
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
                      {displayText.split(/(#\w+)/g).map((part, i) =>
                        /^#\w+$/.test(part) ? (
                          <Text
                            key={i}
                            style={styles.inlineHashtag}
                            onPress={() => navigation.navigate('SearchScreen', { initialQuery: part, initialTab: 2 })}
                          >
                            {part}
                          </Text>
                        ) : (
                          <Text key={i}>{part}</Text>
                        )
                      )}
                      {showSeeMore ? <Text style={styles.seeMore}> see more</Text> : null}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            {/* ── Link Preview (YouTube / Spotify / Vimeo / SoundCloud / generic OG card) ── */}
            {extractedUrl && (!hasMedia || feed?.type === 'link') ? (
              <LinkPreview url={extractedUrl} />
            ) : null}

            {/* ── Media (double-tap to like) ── */}
            {hasMedia ? (
              feed?.type === 'reel' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={mediaTapHandler}
                  style={styles.reelMediaWrapper}
                >
                  <FeedMediaRenderer feed={feed} isVisible={isVisible} />
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.heartOverlay, { opacity: heartOpacityAnim, transform: [{ scale: heartScaleAnim }] }]}
                  >
                    <Ionicons name="heart" size={80} color="rgba(255,255,255,0.9)" />
                  </Animated.View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={mediaTapHandler}
                  style={styles.mediaWrapper}
                >
                  <FeedMediaRenderer feed={feed} isVisible={isVisible} />
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.heartOverlay, { opacity: heartOpacityAnim, transform: [{ scale: heartScaleAnim }] }]}
                  >
                    <Ionicons name="heart" size={80} color="rgba(255,255,255,0.9)" />
                  </Animated.View>
                </TouchableOpacity>
              )
            ) : null}
          </>
        ))}

        {/* ── Hashtags ── */}
        {allTags.length > 0 ? (
          <View style={styles.hashtagContainer}>
            {allTags.map((tag, idx) => (
              <TouchableOpacity
                key={`${tag}-${idx}`}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SearchScreen', { initialQuery: `#${tag}`, initialTab: 2 })}
              >
                <Text style={styles.hashtag}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Engagement (summary row + actions — all inside EngagementBar) */}
        <EngagementBar
          feedId={feed?.id}
          initialLiked={!!(feed?.is_liked || feed?.my_reaction || feed?.user_reaction)}
          initialLikeCount={totalLikes(feed?.reactions, feed?.likes_count)}
          commentsCount={feed?.comments_count ?? 0}
          sharesCount={feed?.shares_count ?? 0}
          myReaction={feed?.my_reaction ?? feed?.user_reaction ?? null}
          reactions={feed?.reactions}
          isSaved={!!feed?.is_saved}
          commentsDisabled={commentsDisabled}
          viewsCount={feed?.views ?? 0}
          onOpenShare={() => setShareModalVisible(true)}
          onCommentPress={commentsDisabled ? undefined : handleMoveToCommentScreen}
          onReactionsPress={() => setReactionsModalVisible(true)}
          onRepost={() => setRepostModalVisible(true)}
          onCollectionSave={() => setSaveCollectionsModalVisible(true)}
        />
      </View>

      {/* Share */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        feed={feed}
        onSaveAsImage={() => setSaveImageModalVisible(true)}
      />

      {/* Save as Image */}
      <SaveAsImageModal
        visible={saveImageModalVisible}
        onClose={() => setSaveImageModalVisible(false)}
        feed={feed}
      />

      {/* Reactions Modal */}
      <ReactionsModal
        visible={reactionsModalVisible}
        postId={feed?.id}
        token={token}
        reactions={feed?.reactions}
        onClose={() => setReactionsModalVisible(false)}
        currentUserId={user?.id}
      />

      {/* Repost Modal */}
      <RepostModal
        visible={repostModalVisible}
        postId={feed?.id}
        onClose={() => setRepostModalVisible(false)}
        onRepostWithComment={() => { setRepostModalVisible(false); setShareModalVisible(true); }}
      />

      {/* ── Edit Post Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={editStyles.overlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={editStyles.sheet}>
                {/* Handle bar */}
                <View style={editStyles.handle} />

                {/* Header */}
                <View style={editStyles.header}>
                  <Text style={editStyles.title}>Edit Post</Text>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={22} color={Colors.neutral700} />
                  </TouchableOpacity>
                </View>

                {/* Text input */}
                <TextInput
                  style={editStyles.input}
                  value={editDraftText}
                  onChangeText={setEditDraftText}
                  multiline
                  autoFocus
                  placeholder="What's on your mind?"
                  placeholderTextColor={Colors.secondaryText}
                  textAlignVertical="top"
                />

                {/* Error */}
                {!!editError && (
                  <Text style={editStyles.errorText}>{editError}</Text>
                )}

                {/* Actions */}
                <View style={editStyles.actions}>
                  <TouchableOpacity
                    style={editStyles.cancelBtn}
                    onPress={() => setEditModalVisible(false)}
                    activeOpacity={0.75}
                  >
                    <Text style={editStyles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[editStyles.saveBtn, editSaving && editStyles.saveBtnDisabled]}
                    onPress={handleEditSave}
                    activeOpacity={0.85}
                    disabled={editSaving}
                  >
                    {editSaving
                      ? <ActivityIndicator size="small" color={Colors.white} />
                      : <Text style={editStyles.saveText}>Save</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Save to Collections Modal */}
      <SaveCollectionsModal
        visible={saveCollectionsModalVisible}
        postId={feed?.id}
        isSaved={!!feed?.is_saved}
        onClose={() => setSaveCollectionsModalVisible(false)}
        onSaved={(val) => {
          const { feeds: storeFeeds, updateFeedById } = useStore.getState();
          const current = storeFeeds.feedsById[feed?.id];
          if (current) updateFeedById(feed.id, { ...current, is_saved: val });
        }}
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

  // Double-tap heart overlay
  heartOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  inlineHashtag: {
    color: ACCENT,
    fontWeight: '700',
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

  // ── Group creation card ────────────────────────────────────────────────────
  groupCreationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: Colors.white,
    gap: 10,
  },
  groupCreationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCreationBody: {
    flex: 1,
  },
  groupCreationLabel: {
    fontSize: 12,
    color: Colors.secondaryText ?? '#888',
    fontFamily: AppDetails.fontFamily?.body,
  },
  groupCreationName: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    fontFamily: AppDetails.fontFamily?.heading,
    marginTop: 2,
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

});

// ─── Edit Post Modal styles ───────────────────────────────────────────────────
const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.neutral200 ?? '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.black,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  input: {
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1.5,
    borderColor: Colors.borderLight ?? '#E8E8E8',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.black,
    fontFamily: AppDetails.fontFamily?.body,
    backgroundColor: Colors.surfaceTint ?? '#F8F8FC',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error ?? '#E53935',
    marginBottom: 10,
    fontFamily: AppDetails.fontFamily?.body,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight ?? '#E0E0E0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral700 ?? '#444',
    fontFamily: AppDetails.fontFamily?.body,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: AppDetails.fontFamily?.body,
  },
});

// ✅ memo includes entity so routing label changes still update card
export default memo(FeedCard, (prev, next) => {
  return (
    prev.feed.id                 === next.feed.id                 &&
    prev.feed.text               === next.feed.text               &&
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
    prev.feed.user?.is_following === next.feed.user?.is_following &&
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
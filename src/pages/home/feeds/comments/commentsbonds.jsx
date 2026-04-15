import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ActivityIndicator, StyleSheet,
  TouchableOpacity, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GetCommentsController, LikeCommentController, DeleteCommentController, GetRepliesController } from '../../../../controllers/commentscontroller';
import CalculateElapsedTime from '../../../../helpers/calculateelapsedtime';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BASE   = 'https://hafrik.com';
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;

// ------------------------------------------------------------------
// Single comment card (exported so CommentScreen can use it in its FlatList)
// ------------------------------------------------------------------
export const CommentItem = React.memo(({ comment, token, onReply }) => {
  const navigation = useNavigation();
  const [liked,     setLiked]     = useState(!!comment.is_liked);
  const [likeCount, setLikeCount] = useState(Number(comment.likes_count ?? comment.like_count ?? comment.likes ?? 0));
  const [showReplies, setShowReplies] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const scale = useState(new Animated.Value(1))[0];

  const handleUserPress = useCallback(() => {
    if (!comment.user?.id) return;
    navigation.navigate('UserProfile', {
      userId: comment.user.id,
      username: comment.user.username ?? '',
    });
  }, [comment.user, navigation]);

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleLike = useCallback(async () => {
    pulse();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await LikeCommentController(comment.id, token);
      if (res.status === 200 && res.data) {
        // Sync with server truth
        if (typeof res.data.is_liked !== 'undefined') setLiked(!!res.data.is_liked);
        if (typeof res.data.likes !== 'undefined') setLikeCount(Number(res.data.likes));
      }
    } catch {
      // Roll back
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }, [liked, comment.id, token]);

  const handleDelete = useCallback(() => {
    if (!comment.is_mine) return;
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const res = await DeleteCommentController(comment.id, token);
            if (res.status === 200) {
              setDeleted(true);
            }
          } catch { /* silent */ }
        },
      },
    ]);
  }, [comment.id, comment.is_mine, token]);

  const [replies, setReplies] = useState(Array.isArray(comment.replies) ? comment.replies : []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const replyCount = Number(comment.reply_count ?? replies.length);
  const hasReplies = replyCount > 0;
  const fetchedRepliesRef = React.useRef(false);

  // If deleted, don't render
  if (deleted) return null;

  return (
    <TouchableOpacity
      style={cs.card}
      activeOpacity={1}
      onLongPress={comment.is_mine ? handleDelete : undefined}
      delayLongPress={500}
    >
      {/* Avatar — tap to view profile */}
      <TouchableOpacity onPress={handleUserPress} activeOpacity={0.8}>
        <Image
          source={{ uri: comment.user?.avatar }}
          style={cs.avatar}
        />
      </TouchableOpacity>

      {/* Right content */}
      <View style={cs.cardBody}>
        {/* Name bubble — tap to view profile */}
        <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7} style={cs.nameBubble}>
          <Text style={cs.nameText} numberOfLines={1}>
            {comment.user?.full_name || comment.user?.username || 'User'}
          </Text>
          <Text style={cs.timeText}>{CalculateElapsedTime(comment.created)}</Text>
        </TouchableOpacity>

        {/* Comment text */}
        <Text style={cs.commentText}>{comment.text}</Text>

        {/* Actions row */}
        <View style={cs.actionsRow}>
          {/* Like */}
          <TouchableOpacity style={cs.actionBtn} onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={16}
                color={liked ? Colors.coralStrong : MUTED}
              />
            </Animated.View>
            {likeCount > 0 && <Text style={[cs.actionCount, liked && { color: Colors.coralStrong }]}>{likeCount}</Text>}
          </TouchableOpacity>

          {/* Reply */}
          <TouchableOpacity
            style={cs.actionBtn}
            onPress={() => onReply?.(comment.id, comment.user?.full_name || comment.user?.username || 'User')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={15} color={MUTED} />
            <Text style={cs.actionLabel}>Reply</Text>
          </TouchableOpacity>

          {/* Toggle replies */}
          {hasReplies && (
            <TouchableOpacity
              style={cs.actionBtn}
              onPress={async () => {
                const next = !showReplies;
                setShowReplies(next);
                // Fetch replies from API on first expand if we don't have them yet
                if (next && replies.length === 0 && !fetchedRepliesRef.current) {
                  fetchedRepliesRef.current = true;
                  setLoadingReplies(true);
                  try {
                    const res = await GetRepliesController(comment.id, token);
                    if (Array.isArray(res?.data) && res.data.length > 0) {
                      setReplies(res.data);
                    }
                  } catch { /* silent */ }
                  setLoadingReplies(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={showReplies ? 'chevron-up' : 'chevron-down'} size={14} color={ACCENT} />
              <Text style={[cs.actionLabel, { color: ACCENT }]}>
                {showReplies ? 'Hide' : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inline reply thread */}
        {showReplies && loadingReplies && (
          <View style={{ paddingVertical: 10, paddingLeft: 4 }}>
            <ActivityIndicator size="small" color={ACCENT} />
          </View>
        )}
        {showReplies && !loadingReplies && replies.map((r, i) => (
          <View key={r.id ?? `reply-${i}`} style={cs.replyRow}>
            <Image source={{ uri: r.user?.avatar }} style={cs.replyAvatar} />
            <View style={{ flex: 1 }}>
              <View style={cs.replyNameRow}>
                <Text style={cs.replyName}>{r.user?.full_name || r.user?.username}</Text>
                <Text style={cs.timeText}>{CalculateElapsedTime(r.created)}</Text>
              </View>
              <Text style={cs.replyText}>{r.text ?? r.reply}</Text>
            </View>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
});

// ------------------------------------------------------------------
// List of comments
// ------------------------------------------------------------------
const CommentBonds = ({ postId, token, onReply }) => {
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await GetCommentsController(postId, token);
        if (!mounted) return;
        setComments(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (mounted) setComments([]);
      }
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [postId, token]);

  if (loading) {
    return (
      <View style={cs.loaderWrap}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  if (!comments.length) {
    return (
      <View style={cs.emptyWrap}>
        <Ionicons name="chatbubbles-outline" size={40} color={Colors.borderCool} />
        <Text style={cs.emptyTitle}>No comments yet</Text>
        <Text style={cs.emptySub}>Be the first to share your thoughts!</Text>
      </View>
    );
  }

  return (
    <View>
      {comments.map((c, i) => (
        <CommentItem key={c.id ?? `temp-${i}`} comment={c} token={token} onReply={onReply} />
      ))}
    </View>
  );
};

const cs = StyleSheet.create({
  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.borderLightAlt, marginRight: 10, marginTop: 2,
  },
  cardBody: { flex: 1 },

  nameBubble: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  nameText: { fontSize: 13.5, fontWeight: '800', color: DARK, flexShrink: 1 },
  timeText: { fontSize: 11.5, color: MUTED },

  commentText: { fontSize: 14.5, color: Colors.textStrongDeep, lineHeight: 21, marginBottom: 8 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, color: MUTED, fontWeight: '600' },
  actionLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },

  // Replies
  replyRow: {
    flexDirection: 'row', marginTop: 10, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: withOpacity(Colors.black, 0.05),
    paddingLeft: 4,
  },
  replyAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.borderLightAlt, marginRight: 10,
  },
  replyNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
  replyName: { fontSize: 12.5, fontWeight: '700', color: DARK },
  replyText: { fontSize: 13.5, color: Colors.textBodyMuted, lineHeight: 19 },

  // States
  loaderWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyWrap:  { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.mutedBlueGraySoft },
  emptySub:   { fontSize: 13, color: Colors.mutedBlueGraySofter },
});

export default CommentBonds;

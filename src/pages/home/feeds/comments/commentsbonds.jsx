import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ActivityIndicator, StyleSheet,
  TouchableOpacity, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { GetCommentsController } from '../../../../controllers/commentscontroller';
import CalculateElapsedTime from '../../../../helpers/calculateelapsedtime';

const BASE   = 'https://hafrik.com';
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';

// ------------------------------------------------------------------
// Single comment card
// ------------------------------------------------------------------
const CommentItem = React.memo(({ comment, token, onReply }) => {
  const navigation = useNavigation();
  const [liked,     setLiked]     = useState(!!comment.is_liked);
  const [likeCount, setLikeCount] = useState(Number(comment.likes_count ?? comment.like_count ?? 0));
  const [showReplies, setShowReplies] = useState(false);
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
      await axios.post(
        `${BASE}/api/v1/feed/like_comment.php`,
        { comment_id: comment.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // Roll back
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }, [liked, comment.id, token]);

  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  const hasReplies = replies.length > 0;

  return (
    <View style={cs.card}>
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
                color={liked ? '#E8485A' : MUTED}
              />
            </Animated.View>
            {likeCount > 0 && <Text style={[cs.actionCount, liked && { color: '#E8485A' }]}>{likeCount}</Text>}
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
            <TouchableOpacity style={cs.actionBtn} onPress={() => setShowReplies((v) => !v)} activeOpacity={0.7}>
              <Ionicons name={showReplies ? 'chevron-up' : 'chevron-down'} size={14} color={ACCENT} />
              <Text style={[cs.actionLabel, { color: ACCENT }]}>
                {showReplies ? 'Hide' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inline reply thread */}
        {showReplies && replies.map((r, i) => (
          <View key={r.id ?? i} style={cs.replyRow}>
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
    </View>
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
        <Ionicons name="chatbubbles-outline" size={40} color="#d8e0e2" />
        <Text style={cs.emptyTitle}>No comments yet</Text>
        <Text style={cs.emptySub}>Be the first to share your thoughts!</Text>
      </View>
    );
  }

  return (
    <View>
      {comments.map((c, i) => (
        <CommentItem key={c.id ?? i} comment={c} token={token} onReply={onReply} />
      ))}
    </View>
  );
};

const cs = StyleSheet.create({
  // Card
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dde6e8', marginRight: 12, marginTop: 2,
    borderWidth: 1.5, borderColor: 'rgba(12,63,68,0.12)',
  },
  cardBody: { flex: 1 },

  nameBubble: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  nameText: { fontSize: 13.5, fontWeight: '800', color: DARK, flexShrink: 1 },
  timeText: { fontSize: 11.5, color: MUTED },

  commentText: { fontSize: 14.5, color: '#1a2527', lineHeight: 21, marginBottom: 8 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, color: MUTED, fontWeight: '600' },
  actionLabel: { fontSize: 12, color: MUTED, fontWeight: '600' },

  // Replies
  replyRow: {
    flexDirection: 'row', marginTop: 10, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)',
    paddingLeft: 4,
  },
  replyAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#dde6e8', marginRight: 10,
  },
  replyNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
  replyName: { fontSize: 12.5, fontWeight: '700', color: DARK },
  replyText: { fontSize: 13.5, color: '#2a3d40', lineHeight: 19 },

  // States
  loaderWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyWrap:  { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#9bb0b4' },
  emptySub:   { fontSize: 13, color: '#b8c9cc' },
});

export default CommentBonds;

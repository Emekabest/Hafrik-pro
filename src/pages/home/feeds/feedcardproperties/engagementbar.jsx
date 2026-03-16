import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../assl.js/svg/svg';
import { useAuth } from '../../../../AuthContext';
import ToggleFeedController from '../../../../controllers/tooglefeedcontroller';
import ToggleSaveController from '../../../../controllers/tooglesavecontroller';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';
import ReactionPicker, { REACTION_EMOJI_MAP } from './ReactionPicker';

const REACTION_EMOJIS = {
  like: '👍', love: '❤️', laugh: '😂', haha: '😂',
  wow: '😮', sad: '😢', angry: '😡', support: '🤝', yay: '🎉',
};

const EngagementBar = ({
  feedId,
  initialLiked,
  initialLikeCount,
  commentsCount,
  sharesCount = 0,
  isSaved: initialSaved = false,
  commentsDisabled = false,
  myReaction: initialMyReaction = null,
  reactions: initialReactions = null,
  viewsCount = 0,
  onOpenShare,
  onCommentPress,
  onReactionsPress,
  onRepost,
  onCollectionSave,
}) => {
  const { token } = useAuth();

  // ── Local state ──────────────────────────────────────────────────────────
  const [isReacted, setIsReacted]   = useState(Boolean(initialLiked));
  const [myReaction, setMyReaction] = useState(initialMyReaction || (initialLiked ? 'like' : null));
  const [likeCount, setLikeCount]   = useState(Number(initialLikeCount) || 0);
  const [saved, setSaved]           = useState(Boolean(initialSaved));
  const [pickerVisible, setPickerVisible] = useState(false);

  // Sync when props change (FlatList recycling / data refresh)
  useEffect(() => {
    setIsReacted(Boolean(initialLiked));
    setMyReaction(initialMyReaction || (initialLiked ? 'like' : null));
    setLikeCount(Number(initialLikeCount) || 0);
  }, [feedId, initialLiked, initialLikeCount, initialMyReaction]);

  useEffect(() => {
    setSaved(Boolean(initialSaved));
  }, [feedId, initialSaved]);

  useEffect(() => {
    setPickerVisible(false);
  }, [feedId]);

  // ── Reactions summary (top 3 emojis + total) ─────────────────────────────
  const reactionsSummary = useMemo(() => {
    const reactions = initialReactions;
    if (!reactions || typeof reactions !== 'object') return null;
    const entries = Object.entries(reactions)
      .filter(([k, count]) => k !== 'total' && Number(count) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    if (entries.length === 0) return null;
    const top3 = entries.slice(0, 3).map(([type]) => REACTION_EMOJIS[type] || '👍');
    const total = entries.reduce((sum, [, c]) => sum + Number(c), 0);
    return { emojis: top3, total };
  }, [initialReactions]);

  // ── Reaction API ─────────────────────────────────────────────────────────
  const sendReaction = useCallback(async (reactionType) => {
    const prevReacted  = isReacted;
    const prevReaction = myReaction;
    const prevCount    = likeCount;

    const isRemoving = prevReaction === reactionType;
    const newReacted  = !isRemoving;
    const newReaction = isRemoving ? null : reactionType;
    const newCount    = isRemoving
      ? Math.max(0, prevCount - 1)
      : (prevReacted ? prevCount : prevCount + 1);

    // Optimistic UI
    setIsReacted(newReacted);
    setMyReaction(newReaction);
    setLikeCount(newCount);
    setPickerVisible(false);

    // Optimistic store update — also patch reactions object so the summary row updates
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[feedId];
    if (currentFeed) {
      const updatedReactions = { ...(currentFeed.reactions || {}) };
      if (isRemoving) {
        updatedReactions[reactionType] = Math.max(0, Number(updatedReactions[reactionType] || 0) - 1);
      } else {
        if (prevReaction && prevReaction !== reactionType) {
          updatedReactions[prevReaction] = Math.max(0, Number(updatedReactions[prevReaction] || 0) - 1);
        }
        if (!prevReacted) {
          updatedReactions[reactionType] = Number(updatedReactions[reactionType] || 0) + 1;
        }
      }
      updateFeedById(feedId, {
        ...currentFeed,
        is_liked: newReacted,
        my_reaction: newReaction,
        likes_count: newCount,
        reactions: updatedReactions,
      });
    }

    try {
      const response = await ToggleFeedController(feedId, token, reactionType);
      if (response.status === 200 && response.data) {
        const raw = response.data;
        const d = raw.data && (
          raw.data.is_reacted !== undefined ||
          raw.data.my_reaction !== undefined ||
          raw.data.user_reaction !== undefined
        ) ? raw.data : raw;

        const serverReacted   = !!(d.is_reacted || d.my_reaction || d.user_reaction);
        const serverReaction  = d.my_reaction || d.user_reaction || null;
        const serverReactions = d.reactions || null;

        let serverTotal = newCount;
        if (serverReactions && typeof serverReactions === 'object') {
          serverTotal = Object.entries(serverReactions)
            .filter(([k]) => k !== 'total')
            .reduce((a, [, b]) => a + Number(b || 0), 0);
          if (serverTotal === 0 && typeof serverReactions.total === 'number') {
            serverTotal = serverReactions.total;
          }
        }

        setIsReacted(serverReacted);
        setMyReaction(serverReaction);
        setLikeCount(serverTotal);

        if (currentFeed) {
          const { updateFeedById: upd } = useStore.getState();
          upd(feedId, {
            ...useStore.getState().feeds.feedsById[feedId],
            is_liked: serverReacted,
            my_reaction: serverReaction,
            likes_count: serverTotal,
            reactions: serverReactions || currentFeed.reactions,
          });
        }
      } else {
        // Rollback
        setIsReacted(prevReacted);
        setMyReaction(prevReaction);
        setLikeCount(prevCount);
        if (currentFeed) updateFeedById(feedId, currentFeed);
      }
    } catch {
      setIsReacted(prevReacted);
      setMyReaction(prevReaction);
      setLikeCount(prevCount);
      if (currentFeed) {
        const { updateFeedById: upd } = useStore.getState();
        upd(feedId, currentFeed);
      }
    }
  }, [isReacted, myReaction, likeCount, feedId, token]);

  const handleTap       = useCallback(() => setPickerVisible(v => !v), []);
  const handleLongPress = useCallback(() => setPickerVisible(true), []);
  const handlePickerSelect = useCallback((type) => sendReaction(type), [sendReaction]);

  // ── Save (fallback when onCollectionSave not provided) ───────────────────
  const handleSave = useCallback(async () => {
    const prev    = saved;
    const newSaved = !prev;
    setSaved(newSaved);

    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[feedId];
    if (currentFeed) {
      updateFeedById(feedId, { ...currentFeed, is_saved: newSaved });
    }

    try {
      const response = await ToggleSaveController(feedId, token);
      if (response.status === 200 && response.data) {
        const raw = response.data;
        const sData = raw.data && raw.data.is_saved !== undefined ? raw.data : raw;
        const serverSaved = !!sData.is_saved;
        setSaved(serverSaved);
        if (currentFeed) {
          const { updateFeedById: upd } = useStore.getState();
          upd(feedId, { ...useStore.getState().feeds.feedsById[feedId], is_saved: serverSaved });
        }
      } else {
        setSaved(prev);
        if (currentFeed) updateFeedById(feedId, currentFeed);
      }
    } catch {
      setSaved(prev);
      if (currentFeed) {
        const { updateFeedById: upd } = useStore.getState();
        upd(feedId, currentFeed);
      }
    }
  }, [saved, feedId, token]);

  // ── Derived display ──────────────────────────────────────────────────────
  const reactionEmoji = myReaction ? REACTION_EMOJI_MAP[myReaction] : null;
  const likeColor     = isReacted ? (Colors.like ?? '#e74c3c') : (Colors.neutral600 ?? Colors.neutral700);
  const likeLabel     = myReaction
    ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1)
    : (isReacted ? 'Liked' : 'Like');

  return (
    <View style={styles.wrapper}>
      {/* Reaction picker popup */}
      <ReactionPicker
        visible={pickerVisible}
        currentReaction={myReaction}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
      />

      {/* ── Summary row: reactions left, views right ── */}
      <View style={styles.summaryRow}>
        {reactionsSummary ? (
          <TouchableOpacity
            style={styles.reactionsSummary}
            onPress={onReactionsPress}
            activeOpacity={0.7}
          >
            <View style={styles.emojiRow}>
              {reactionsSummary.emojis.map((e, i) => (
                <Text key={i} style={styles.reactionEmoji}>{e}</Text>
              ))}
            </View>
            <Text style={styles.reactionsCount}>
              {reactionsSummary.total.toLocaleString()}
            </Text>
          </TouchableOpacity>
        ) : <View />}

        <View style={styles.viewsRow}>
          <Ionicons name="eye-outline" size={13} color={Colors.neutral500} />
          <Text style={styles.viewsText}>{Number(viewsCount ?? 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* ── Action row: Like | Comment | Repost | Save | Share ── */}
      <View style={styles.actionRow}>
        {/* Like / React */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleTap}
          onLongPress={handleLongPress}
          delayLongPress={350}
          activeOpacity={0.7}
        >
          {reactionEmoji ? (
            <Text style={styles.reactionEmojiIcon}>{reactionEmoji}</Text>
          ) : (
            <Ionicons
              name={isReacted ? 'heart' : 'heart-outline'}
              size={22}
              color={likeColor}
            />
          )}
          <Text style={[styles.actionLabel, isReacted && { color: likeColor }]}>
            {likeLabel}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        {!commentsDisabled && (
          <TouchableOpacity style={styles.actionItem} onPress={onCommentPress} activeOpacity={0.7}>
            <SvgIcon name="comment" width={20} height={20} color={Colors.neutral700} />
            <Text style={styles.actionLabel}>Comment</Text>
          </TouchableOpacity>
        )}

        {/* Repost */}
        <TouchableOpacity style={styles.actionItem} onPress={onRepost} activeOpacity={0.7}>
          <Ionicons name="repeat-outline" size={22} color={Colors.neutral700} />
          <Text style={styles.actionLabel}>Repost</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onCollectionSave ?? handleSave}
          activeOpacity={0.7}
        >
          <SvgIcon
            name="favourite"
            width={20}
            height={20}
            color={saved ? Colors.primary : Colors.neutral700}
          />
          <Text style={[styles.actionLabel, saved && { color: Colors.primary }]}>Save</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionItem} onPress={onOpenShare} activeOpacity={0.7}>
          <SvgIcon name="share" width={20} height={20} color={Colors.neutral700} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginTop: 6,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reactionsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reactionEmoji: { fontSize: 14 },
  reactionsCount: {
    fontSize: 13,
    color: Colors.neutral600 ?? Colors.neutral700,
    fontWeight: '600',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 12,
    color: Colors.neutral500,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight ?? Colors.neutral200,
    paddingTop: 8,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.neutral600 ?? Colors.neutral700,
    fontWeight: '500',
  },
  reactionEmojiIcon: { fontSize: 20 },
});

export default memo(EngagementBar, (prev, next) => {
  return (
    prev.feedId           === next.feedId           &&
    prev.initialLiked     === next.initialLiked     &&
    prev.initialLikeCount === next.initialLikeCount &&
    prev.commentsCount    === next.commentsCount    &&
    prev.sharesCount      === next.sharesCount      &&
    prev.isSaved          === next.isSaved          &&
    prev.commentsDisabled === next.commentsDisabled &&
    prev.myReaction       === next.myReaction       &&
    prev.viewsCount       === next.viewsCount       &&
    JSON.stringify(prev.reactions) === JSON.stringify(next.reactions)
  );
});

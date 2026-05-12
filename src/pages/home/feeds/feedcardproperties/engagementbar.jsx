import React, { memo, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../assl.js/svg/svg';
import { useAuth } from '../../../../AuthContext';
import ToggleFeedController from '../../../../controllers/tooglefeedcontroller';
import ToggleSaveController from '../../../../controllers/tooglesavecontroller';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

const EngagementBar = ({
  feedId,
  initialLiked,
  initialLikeCount,
  commentsCount,
  sharesCount = 0,
  isSaved: initialSaved = false,
  commentsDisabled = false,
  myReaction: initialMyReaction = null,
  viewsCount = 0,
  onOpenShare,
  onCommentPress,
  onReactionsPress,
  onRepost,
  onCollectionSave,
  onAskAI,
}) => {
  const { token } = useAuth();

  const [isLiked,    setIsLiked]    = useState(Boolean(initialLiked));
  const [likeCount,  setLikeCount]  = useState(Number(initialLikeCount) || 0);
  const [saved,      setSaved]      = useState(Boolean(initialSaved));

  // Sync when FlatList recycles / data refreshes
  useEffect(() => {
    setIsLiked(Boolean(initialLiked));
    setLikeCount(Number(initialLikeCount) || 0);
  }, [feedId, initialLiked, initialLikeCount]);

  useEffect(() => {
    setSaved(Boolean(initialSaved));
  }, [feedId, initialSaved]);

  // ── Like (toggle) ─────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    const wasLiked   = isLiked;
    const prevCount  = likeCount;
    const newLiked   = !wasLiked;
    const newCount   = newLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic UI
    setIsLiked(newLiked);
    setLikeCount(newCount);

    // Optimistic store update
    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[feedId];
    if (currentFeed) {
      updateFeedById(feedId, {
        ...currentFeed,
        is_liked:    newLiked,
        my_reaction: newLiked ? 'like' : null,
        likes_count: newCount,
      });
    }

    try {
      const response = await ToggleFeedController(feedId, token, 'like');
      if (response.status === 200 && response.data) {
        const raw = response.data;
        const d = raw.data && raw.data.is_reacted !== undefined ? raw.data : raw;

        const serverLiked = !!(d.is_reacted || d.my_reaction || d.user_reaction);
        let   serverCount = newCount;

        if (typeof d.likes_count === 'number') serverCount = d.likes_count;
        else if (d.reactions && typeof d.reactions === 'object') {
          const tot = Object.entries(d.reactions)
            .filter(([k]) => k !== 'total')
            .reduce((a, [, b]) => a + Number(b || 0), 0);
          if (tot > 0) serverCount = tot;
          else if (typeof d.reactions.total === 'number') serverCount = d.reactions.total;
        }

        setIsLiked(serverLiked);
        setLikeCount(serverCount);

        if (currentFeed) {
          useStore.getState().updateFeedById(feedId, {
            ...useStore.getState().feeds.feedsById[feedId],
            is_liked:    serverLiked,
            my_reaction: serverLiked ? 'like' : null,
            likes_count: serverCount,
          });
        }
      } else {
        // Rollback
        setIsLiked(wasLiked);
        setLikeCount(prevCount);
        if (currentFeed) updateFeedById(feedId, currentFeed);
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount(prevCount);
      if (currentFeed) {
        useStore.getState().updateFeedById(feedId, currentFeed);
      }
    }
  }, [isLiked, likeCount, feedId, token]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const prev     = saved;
    const newSaved = !prev;
    setSaved(newSaved);

    const { feeds, updateFeedById } = useStore.getState();
    const currentFeed = feeds.feedsById[feedId];
    if (currentFeed) updateFeedById(feedId, { ...currentFeed, is_saved: newSaved });

    try {
      const response = await ToggleSaveController(feedId, token);
      if (response.status === 200 && response.data) {
        const raw   = response.data;
        const sData = raw.data?.is_saved !== undefined ? raw.data : raw;
        const serverSaved = !!sData.is_saved;
        setSaved(serverSaved);
        if (currentFeed) {
          useStore.getState().updateFeedById(feedId, {
            ...useStore.getState().feeds.feedsById[feedId],
            is_saved: serverSaved,
          });
        }
      } else {
        setSaved(prev);
        if (currentFeed) updateFeedById(feedId, currentFeed);
      }
    } catch {
      setSaved(prev);
      if (currentFeed) useStore.getState().updateFeedById(feedId, currentFeed);
    }
  }, [saved, feedId, token]);

  const likeColor = isLiked ? (Colors.like ?? '#e74c3c') : (Colors.neutral600 ?? Colors.neutral700);

  return (
    <View style={styles.wrapper}>

      {/* ── Summary row: like count left, views right ── */}
      <View style={styles.summaryRow}>
        {likeCount > 0 ? (
          <TouchableOpacity style={styles.likeCountRow} onPress={onReactionsPress} activeOpacity={0.7}>
            <Ionicons name="heart" size={13} color={Colors.like ?? '#e74c3c'} />
            <Text style={styles.likeCountText}>{likeCount.toLocaleString()}</Text>
          </TouchableOpacity>
        ) : <View />}

        <View style={styles.summaryRight}>
          {viewsCount > 0 && (
            <View style={styles.viewsRow}>
              <Ionicons name="eye-outline" size={13} color={Colors.neutral500} />
              <Text style={styles.viewsText}>{Number(viewsCount).toLocaleString()}</Text>
            </View>
          )}

          {!!onAskAI && (
            <TouchableOpacity style={styles.askAiPill} activeOpacity={0.82} onPress={onAskAI}>
              <Ionicons name="sparkles-outline" size={12} color={Colors.primaryDark} />
              <Text style={styles.askAiText}>Ask AI</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Action row: Like | Comment | Repost | Save | Share ── */}
      <View style={styles.actionRow}>

        {/* Like */}
        <TouchableOpacity style={styles.actionItem} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={likeColor}
          />
          <Text style={[styles.actionLabel, isLiked && { color: likeColor }]}>
            {isLiked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        {!commentsDisabled && (
          <TouchableOpacity style={styles.actionItem} onPress={onCommentPress} activeOpacity={0.7}>
            <SvgIcon name="comment" width={17} height={17} color={Colors.neutral700} />
            <Text style={styles.actionLabel}>
              {Number(commentsCount) > 0 ? Number(commentsCount).toLocaleString() : 'Comment'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Repost */}
        <TouchableOpacity style={styles.actionItem} onPress={onRepost} activeOpacity={0.7}>
          <Ionicons name="repeat-outline" size={18} color={Colors.neutral700} />
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
            width={17}
            height={17}
            color={saved ? Colors.primary : Colors.neutral700}
          />
          <Text style={[styles.actionLabel, saved && { color: Colors.primary }]}>Save</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionItem} onPress={onOpenShare} activeOpacity={0.7}>
          <SvgIcon name="share" width={17} height={17} color={Colors.neutral700} />
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

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  likeCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCountText: {
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
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  askAiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.primaryDark + '0D',
    borderWidth: 1,
    borderColor: Colors.primaryDark + '18',
  },
  askAiText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },

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
});

export default memo(EngagementBar, (prev, next) => (
  prev.feedId           === next.feedId           &&
  prev.initialLiked     === next.initialLiked     &&
  prev.initialLikeCount === next.initialLikeCount &&
  prev.commentsCount    === next.commentsCount    &&
  prev.sharesCount      === next.sharesCount      &&
  prev.isSaved          === next.isSaved          &&
  prev.commentsDisabled === next.commentsDisabled &&
  prev.viewsCount       === next.viewsCount &&
  prev.onAskAI          === next.onAskAI
));

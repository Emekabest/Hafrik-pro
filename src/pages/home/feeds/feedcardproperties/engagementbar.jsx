import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../assl.js/svg/svg';
import { useAuth } from '../../../../AuthContext';
import ToggleFeedController from '../../../../controllers/tooglefeedcontroller';
import ToggleSaveController from '../../../../controllers/tooglesavecontroller';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';
import ReactionPicker, { REACTION_EMOJI_MAP } from './ReactionPicker';


const EngagementBar = ({
    feedId, initialLiked, initialLikeCount, commentsCount,
    sharesCount = 0, isSaved: initialSaved = false, commentsDisabled = false,
    myReaction: initialMyReaction = null,
    reactions: initialReactions = null,
    onOpenShare, onCommentPress, onReactionsPress,
}) => {
    const { token } = useAuth();

    // Reaction state
    const [isReacted, setIsReacted] = useState(Boolean(initialLiked));
    const [myReaction, setMyReaction] = useState(initialMyReaction || (initialLiked ? 'like' : null));
    const [likeCount, setLikeCount] = useState(Number(initialLikeCount) || 0);
    const [saved, setSaved] = useState(Boolean(initialSaved));
    const [pickerVisible, setPickerVisible] = useState(false);
    const longPressTimer = useRef(null);

    // Sync state when props change (e.g., FlatList recycling or data refresh)
    useEffect(() => {
        setIsReacted(Boolean(initialLiked));
        setMyReaction(initialMyReaction || (initialLiked ? 'like' : null));
        setLikeCount(Number(initialLikeCount) || 0);
    }, [feedId, initialLiked, initialLikeCount, initialMyReaction]);

    useEffect(() => {
        setSaved(Boolean(initialSaved));
    }, [feedId, initialSaved]);

    // Close picker whenever feedId recycles
    useEffect(() => {
        setPickerVisible(false);
    }, [feedId]);

    /**
     * Send a reaction to the API and update local + store state.
     * If the user taps the same reaction they already have, it removes it (toggle).
     */
    const sendReaction = useCallback(async (reactionType) => {
        const prevReacted = isReacted;
        const prevReaction = myReaction;
        const prevCount = likeCount;

        // If tapping the same reaction → remove it
        const isRemoving = prevReaction === reactionType;
        const newReacted = !isRemoving;
        const newReaction = isRemoving ? null : reactionType;
        const newCount = isRemoving ? Math.max(0, prevCount - 1) : (prevReacted ? prevCount : prevCount + 1);

        // Optimistic update
        setIsReacted(newReacted);
        setMyReaction(newReaction);
        setLikeCount(newCount);
        setPickerVisible(false);

        // Update store
        const { feeds, updateFeedById } = useStore.getState();
        const currentFeed = feeds.feedsById[feedId];
        if (currentFeed) {
            updateFeedById(feedId, {
                ...currentFeed,
                is_liked: newReacted,
                my_reaction: newReaction,
                likes_count: newCount,
            });
        }

        try {
            const response = await ToggleFeedController(feedId, token, reactionType);
            if (response.status === 200 && response.data) {
                // Handle both flat and nested API shapes
                const raw = response.data;
                const d = raw.data && (raw.data.is_reacted !== undefined || raw.data.my_reaction !== undefined || raw.data.user_reaction !== undefined) ? raw.data : raw;
                // Sync with server truth (support both my_reaction and user_reaction field names)
                const serverReacted = !!(d.is_reacted || d.my_reaction || d.user_reaction);
                const serverReaction = d.my_reaction || d.user_reaction || null;
                const serverReactions = d.reactions || null;

                // Compute total from reactions object if available (exclude 'total' key)
                let serverTotal = newCount;
                if (serverReactions && typeof serverReactions === 'object') {
                    serverTotal = Object.entries(serverReactions)
                        .filter(([k]) => k !== 'total')
                        .reduce((a, [, b]) => a + Number(b || 0), 0);
                    // Fall back to explicit total field if individual counts aren't present
                    if (serverTotal === 0 && typeof serverReactions.total === 'number') {
                        serverTotal = serverReactions.total;
                    }
                }

                setIsReacted(serverReacted);
                setMyReaction(serverReaction);
                setLikeCount(serverTotal);

                if (currentFeed) {
                    const { updateFeedById } = useStore.getState();
                    updateFeedById(feedId, {
                        ...useStore.getState().feeds.feedsById[feedId],
                        is_liked: serverReacted,
                        my_reaction: serverReaction,
                        likes_count: serverTotal,
                        reactions: serverReactions || currentFeed.reactions,
                    });
                }
            } else {
                // Rollback on non-200
                setIsReacted(prevReacted);
                setMyReaction(prevReaction);
                setLikeCount(prevCount);
                if (currentFeed) {
                    updateFeedById(feedId, currentFeed);
                }
            }
        } catch {
            // Rollback on error
            setIsReacted(prevReacted);
            setMyReaction(prevReaction);
            setLikeCount(prevCount);
            if (currentFeed) {
                const { updateFeedById } = useStore.getState();
                updateFeedById(feedId, currentFeed);
            }
        }
    }, [isReacted, myReaction, likeCount, feedId, token]);

    /** Tap = open / close the reaction picker so users see all options */
    const handleTap = useCallback(() => {
        setPickerVisible(v => !v);
    }, []);

    /** Long press = also open reaction picker (fallback) */
    const handleLongPress = useCallback(() => {
        setPickerVisible(true);
    }, []);

    /** Reaction selected from picker */
    const handlePickerSelect = useCallback((reactionType) => {
        sendReaction(reactionType);
    }, [sendReaction]);

    const handleSave = useCallback(async () => {
        const prev = saved;
        const newSaved = !prev;
        setSaved(newSaved);

        // Update store optimistically
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
                    const { updateFeedById } = useStore.getState();
                    updateFeedById(feedId, {
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
            if (currentFeed) {
                const { updateFeedById } = useStore.getState();
                updateFeedById(feedId, currentFeed);
            }
        }
    }, [saved, feedId, token]);

    // Determine what to show on the like button
    const reactionEmoji = myReaction ? REACTION_EMOJI_MAP[myReaction] : null;
    const showFilledHeart = isReacted && !reactionEmoji;

    return (
    <View style={styles.wrapper}>
        {/* Reaction picker floats above */}
        <ReactionPicker
            visible={pickerVisible}
            currentReaction={myReaction}
            onSelect={handlePickerSelect}
            onClose={() => setPickerVisible(false)}
        />

        <View style={styles.container}>
            {/* Like / React button */}
            <TouchableOpacity
                style={styles.item}
                onPress={handleTap}
                onLongPress={handleLongPress}
                delayLongPress={350}
                activeOpacity={0.7}
            >
                {reactionEmoji ? (
                    <Text style={styles.reactionEmoji}>{reactionEmoji}</Text>
                ) : (
                    <Ionicons
                        name={isReacted ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isReacted ? Colors.like ?? '#e74c3c' : Colors.neutral700}
                    />
                )}
                <Text style={[styles.count, isReacted && { color: Colors.primary }]}>{likeCount}</Text>
            </TouchableOpacity>

            {/* Comment */}
            {!commentsDisabled && (
              <TouchableOpacity style={styles.item} onPress={onCommentPress}>
                  <SvgIcon name="comment" width={20} height={20} color={Colors.neutral700} />
                  <Text style={styles.count}>{commentsCount}</Text>
              </TouchableOpacity>
            )}

            {/* Share */}
            <TouchableOpacity style={styles.item} onPress={onOpenShare}>
                <SvgIcon name="share" width={20} height={20} color={Colors.neutral700} />
                {sharesCount > 0 && <Text style={styles.count}>{sharesCount}</Text>}
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity style={styles.item} onPress={handleSave}>
                <SvgIcon name="favourite" width={20} height={20} color={saved ? Colors.primary : Colors.neutral700} />
            </TouchableOpacity>
        </View>
    </View>
    );
};



const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 10,
  },
  item: {
    height: 30,
    width: '20%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    fontSize: 13,
    color: Colors.neutral700,
    marginLeft: 6,
  },
  reactionEmoji: {
    fontSize: 20,
  },
});


export default memo(EngagementBar, (prev, next) => {
    return (
        prev.feedId === next.feedId &&
        prev.initialLiked === next.initialLiked &&
        prev.initialLikeCount === next.initialLikeCount &&
        prev.commentsCount === next.commentsCount &&
        prev.sharesCount === next.sharesCount &&
        prev.isSaved === next.isSaved &&
        prev.commentsDisabled === next.commentsDisabled &&
        prev.myReaction === next.myReaction &&
        JSON.stringify(prev.reactions) === JSON.stringify(next.reactions)
    );
});

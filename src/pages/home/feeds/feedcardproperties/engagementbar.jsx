import React, { memo, useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../assl.js/svg/svg';
import { useAuth } from '../../../../AuthContext';
import ToggleFeedController from '../../../../controllers/tooglefeedcontroller';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';


const EngagementBar = ({ feedId, initialLiked, initialLikeCount, commentsCount, onOpenShare, onCommentPress }) => {
    const { token } = useAuth();

    
    // Use local state only - don't subscribe to store changes during render
    const [liked, setLiked] = useState(Boolean(initialLiked));
    const [likeCount, setLikeCount] = useState(Number(initialLikeCount) || 0);

    // Sync state when props change (e.g., FlatList recycling or data refresh)
    useEffect(() => {
        setLiked(Boolean(initialLiked));
        setLikeCount(Number(initialLikeCount) || 0);
    }, [feedId, initialLiked, initialLikeCount]);


        const handleLike = useCallback(async () => {
        const prevLiked = liked;
        const prevCount = likeCount;
        const newLiked = !prevLiked;
        const newCount = newLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

        
        // optimistic update
        setLiked(newLiked);
        setLikeCount(newCount);

        // Update store (get fresh reference)
        const { feeds, updateFeedById } = useStore.getState();
        const currentFeed = feeds.feedsById[feedId];
        if (currentFeed) {
            updateFeedById(feedId, { ...currentFeed, is_liked: newLiked, likes_count: newCount });
        }

        try {
            const response = await ToggleFeedController(feedId, token);
            if (response.status !== 200) {
                // rollback on failure
                setLiked(prevLiked);
                setLikeCount(prevCount);
                if (currentFeed) {
                    updateFeedById(feedId, currentFeed);
                }
            }
        } catch(error) {
            // revert on error
            setLiked(prevLiked);
            setLikeCount(prevCount);
            if (currentFeed) {
                const { updateFeedById } = useStore.getState();
                updateFeedById(feedId, currentFeed);
            }
        }
    }, [liked, likeCount, feedId, token]);






    return (
    <View style={styles.container}>
        <TouchableOpacity style={styles.item} onPress={handleLike}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? Colors.like : Colors.neutral700} />
            <Text style={styles.count}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={onCommentPress}>
            <SvgIcon name="comment" width={20} height={20} color={Colors.neutral700} />
            <Text style={styles.count}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={onOpenShare}>
            <SvgIcon name="share" width={20} height={20} color={Colors.neutral700} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
            <SvgIcon name="favourite" width={20} height={20} color={Colors.neutral700} />
        </TouchableOpacity>
    </View>
    );
};



const styles = StyleSheet.create({
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
});


export default memo(EngagementBar, (prev, next) => {
    return (
        prev.feedId === next.feedId &&
        prev.initialLiked === next.initialLiked &&
        prev.initialLikeCount === next.initialLikeCount &&
        prev.commentsCount === next.commentsCount
    );
});

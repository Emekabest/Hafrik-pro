import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../assl.js/svg/svg';
import { useAuth } from '../../../../AuthContext';
import ToggleFeedController from '../../../../controllers/tooglefeedcontroller';
import useStore from '../../../../repository/store';

const CommentEngagementBar = ({ feedId, initialLiked, initialLikeCount, commentsCount, 
    onCommentPress = () => {},
    onSharePress = () => {},
    onFavoritePress = () => {}
}) => {



  const { token } = useAuth();
  const updateFeedById_store = useStore(state => state.updateFeedById);

  const [liked, setLiked] = useState(Boolean(initialLiked));
  const [likeCount, setLikeCount] = useState(Number(initialLikeCount) || 0);

  useEffect(() => {
    setLiked(Boolean(initialLiked));
    setLikeCount(Number(initialLikeCount) || 0);
  }, [initialLiked, initialLikeCount]);


  
  const handleLike = async () => {
    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !prevLiked;
    const newCount = newLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Read current feed from store
    const feedsById = useStore.getState().feeds.feedsById;
    const currentFeed = feedsById[feedId];

    // Optimistic local update
    setLiked(newLiked);
    setLikeCount(newCount);

    // Optimistic store update (if feed exists in normalized store)
    if (currentFeed) {
      const updatedFeed = { ...currentFeed, is_liked: newLiked, likes_count: newCount };
      updateFeedById_store(feedId, updatedFeed);
    }

    try {
      const response = await ToggleFeedController(feedId, token);
      if (response.status !== 200) {
        // Rollback on failure
        setLiked(prevLiked);
        setLikeCount(prevCount);
        if (currentFeed) {
          updateFeedById_store(feedId, currentFeed);
        }
      }
    } catch (error) {
      // Rollback on error
      setLiked(prevLiked);
      setLikeCount(prevCount);
      if (currentFeed) {
        updateFeedById_store(feedId, currentFeed);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.item} onPress={handleLike}>
        <Ionicons 
          name={liked ? 'heart' : 'heart-outline'} 
          size={23} 
          color={liked ? '#dc1e1eff' : '#333'} 
        />
        <Text style={styles.count}>{likeCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={onCommentPress}>
        <SvgIcon name="comment" width={20} height={20} color="#333" />
        <Text style={styles.count}>{commentsCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={onSharePress}>
        <SvgIcon name="share" width={20} height={20} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={onFavoritePress}>
        <SvgIcon name="favourite" width={20} height={20} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 15,
    width: '90%',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    marginLeft: 5,
    fontSize: 13,
    color: '#333',
  },
});

export default CommentEngagementBar;
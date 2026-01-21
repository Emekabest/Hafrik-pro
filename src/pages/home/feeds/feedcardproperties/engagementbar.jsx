import React, { memo, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../assl.js/svg/svg';
import { useAuth } from '../../../../AuthContext';
import ToggleFeedController from '../../../../controllers/tooglefeedcontroller';
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';



const EngagementBar = ({ feedId, initialLiked = false, initialLikeCount = 0, commentsCount = 0, onOpenShare = () => {}, onCommentPress = () => {} }) => {
  const { token } = useAuth();
  // store sync removed — EngagementBar now manages local UI only

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount || 0);


  useEffect(() => {
    const loadInteraction = async () => {
      try {
        if (!token) return;
        const res = await getUserPostInteractionController(feedId, token);
        if (res && res.data) {
          const likedState = !!res.data.liked;
          setLiked(likedState);
        }
      } catch (e) {}
    };
    loadInteraction();
  }, [feedId, token]);

  
  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : Math.max(0, c - 1));
    try {
      const res = await ToggleFeedController(feedId, token);
      // server toggled successfully — UI already updated locally
      if (!(res && res.status === 200)) {
        // if server did not succeed, rollback will occur in catch
      }
    } catch (e) {
      // rollback on error
      setLiked(l => !l);
      setLikeCount(c => (liked ? Math.max(0, c - 1) : c + 1));
    }
  };




  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.item]} onPress={handleLike}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#ff4444' : '#333'} />
        <Text style={styles.count}>{likeCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.item]} onPress={onCommentPress}>
        <SvgIcon name="comment" width={20} height={20} color="#333" />
        <Text style={styles.count}>{commentsCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.item]} onPress={onOpenShare}>
        <SvgIcon name="share" width={20} height={20} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.item]}>
        <SvgIcon name="favourite" width={20} height={20} color="#333" />
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
    color: '#333',
    marginLeft: 6,
  },
});





const handleMemomize = (prevProps, nextProps) => {
  const p = prevProps;
  const n = nextProps;

  if (p.feedId !== n.feedId) return false;
  if (p.initialLiked !== n.initialLiked) return false;
  if ((p.initialLikeCount || 0) !== (n.initialLikeCount || 0)) return false;
  if ((p.commentsCount || 0) !== (n.commentsCount || 0)) return false;

  return true;
};
export default memo(EngagementBar, handleMemomize);

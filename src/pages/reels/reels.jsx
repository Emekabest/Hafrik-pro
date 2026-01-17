import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Animated,
  Alert,
  Share,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons, AntDesign, FontAwesome, Feather } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../AuthContext';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://hafrik.com/api/v1/reels';

/* =========================
   VIDEO PLAYER
========================= */
const VideoPlayer = ({ source, poster, isActive, isMuted, onDoubleTap }) => {
  const videoRef = useRef(null);
  const lastTap = useRef(0);
  const [paused, setPaused] = useState(!isActive);

  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTap?.();
    } else {
      setPaused(p => !p);
    }
    lastTap.current = now;
  };

  return (
    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handlePress}>
      <Video
        ref={videoRef}
        source={{ uri: source }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        shouldPlay={!paused}
        isLooping
        isMuted={isMuted}
        posterSource={poster ? { uri: poster } : undefined}
        usePoster={!!poster}
      />


      {paused && (
        <View style={styles.playOverlay}>
          <Ionicons name="play" size={64} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};

/* =========================
   COMMENTS MODAL
========================= */
const CommentsModal = ({ visible, onClose, reelId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const loadComments = async () => {
    if (!reelId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/get_comments.php?post_id=${reelId}`);
      const json = await res.json();
      setComments(json?.data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  
  
  const submitComment = async () => {
    if (!currentUser?.id || !text.trim()) return;

    const form = new FormData();
    form.append('post_id', reelId);
    form.append('user_id', currentUser.id);
    form.append('comment', text.trim());

    await fetch(`${API_BASE}/comment.php`, { method: 'POST', body: form });

    setText('');
    loadComments();
  };



  useEffect(() => {
    if (visible) loadComments();
  }, [visible]);




  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="close" size={22} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(i, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <Image source={{ uri: item.user?.avatar }} style={styles.commentAvatar} />
                    <View>
                      <Text style={styles.commentUser}>{item.user?.name || 'User'}</Text>
                      <Text>{item.comment}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Add a comment..."
                style={styles.commentInput}
              />

              <TouchableOpacity onPress={submitComment}>
                <Text style={styles.postBtn}>Post</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

/* =========================
   SINGLE REEL ITEM
========================= */
const ReelItem = ({ reel, isActive, isMuted, toggleMute, user }) => {
  const navigation = useNavigation();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(reel.likes || 0);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;

  const caption = reel.text?.trim() || null;

  const like = async () => {
    if (!user?.id) return Alert.alert('Login required');

    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    const form = new FormData();
    form.append('post_id', reel.id);
    form.append('user_id', user.id);

    await fetch(`${API_BASE}/like.php`, { method: 'POST', body: form });
    setLiked(true);
    setLikes(l => l + 1);
  };

  return (
    <View style={styles.reel}>
      <VideoPlayer
        source={reel.media.video_url}
        poster={reel.media.thumbnail}
        isActive={isActive}
        isMuted={isMuted}
        onDoubleTap={like}
      />

      <Animated.View style={[styles.heart, { opacity: heartAnim }]}>
        <AntDesign name="heart" size={90} color="#ff2442" />
      </Animated.View>

      <TouchableOpacity style={styles.muteBtn} onPress={toggleMute}>
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.left}>
        <View style={styles.userRow}>
          <Image source={{ uri: reel.user.avatar }} style={styles.avatar} />
          <Text style={styles.username}>@{reel.user.name}</Text>
          {reel.user.verified && (
            <Ionicons name="checkmark-circle" size={14} color="#4a80f0" />
          )}
          {user?.id !== reel.user.id && (
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>

        {caption && (
          <Text style={styles.caption}>
            {expanded ? caption : caption.slice(0, 80)}
            {caption.length > 80 && (
              <Text style={styles.readMore} onPress={() => setExpanded(e => !e)}>
                {expanded ? '  show less' : '... read more'}
              </Text>
            )}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.actionBtn} onPress={like}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={30}
            color={liked ? '#ff2442' : 'white'}
          />
          <Text style={styles.count}>{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
          <FontAwesome name="comment-o" size={26} color="white" />
          <Text style={styles.count}>{reel.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setSaved(s => !s)}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={26} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            Share.share({
              message: `Check this out on Hafrik 👇\nhttps://hafrik.com/posts/${reel.id}`,
            })
          }
        >
          <Feather name="send" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        reelId={reel.id}
        currentUser={user}
      />
    </View>
  );
};

/* =========================
   MAIN REELS SCREEN
========================= */
export default function Reels() {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [reels, setReels] = useState([]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/list.php?page=1&limit=10`)
      .then(r => r.json())
      .then(j => setReels(j.data?.data || []));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>

      <FlatList
        data={reels}
        keyExtractor={i => i.id.toString()}
        renderItem={({ item, index: i }) => (
          <ReelItem
            reel={item}
            isActive={isFocused && i === index}
            isMuted={muted}
            toggleMute={() => setMuted(m => !m)}
            user={user}
          />
        )}
        pagingEnabled
        snapToInterval={height}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems[0]) setIndex(viewableItems[0].index);
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  reel: { width, height },
  playOverlay: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    opacity: 0.9,
  },
  muteBtn: {
    position: 'absolute',
    right: 15,
    bottom: 150,
  },
  left: {
    position: 'absolute',
    left: 15,
    bottom: 90,
    right: 120,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  username: { color: 'white', fontWeight: 'bold', marginRight: 6 },
  caption: { color: 'white', fontSize: 14 },
  readMore: { color: '#ccc', fontSize: 13 },
  followBtn: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  followText: { color: 'white', fontSize: 12, fontWeight: '600' },
  right: {
    position: 'absolute',
    right: 15,
    bottom: 90,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: 18,
  },
  count: { color: 'white', marginTop: 4 },
  heart: {
    position: 'absolute',
    top: '45%',
    left: '45%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    height: '70%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  commentRow: { flexDirection: 'row', padding: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  commentUser: { fontWeight: 'bold' },
  commentInputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  commentInput: { flex: 1, padding: 10 },
  postBtn: { color: '#0C3F44', fontWeight: 'bold', padding: 10 },
});
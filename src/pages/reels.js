import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Animated,
  SafeAreaView,
  Alert,
  Share,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Easing
} from 'react-native';
import Video from 'react-native-video';
import { AntDesign, FontAwesome, Feather, Ionicons, MaterialCommunityIcons, MaterialIcons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import moment from 'moment';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../AuthContext';

const { width, height } = Dimensions.get('window');

// API Base URL
const API_BASE_URL = 'https://hafrik.com/api/v1/reels';

// Responsive hook for width/height/VIDEO_HEIGHT
function useResponsiveDimensions() {
  const [window, setWindow] = useState(Dimensions.get('window'));
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => setWindow(window));
    return () => subscription?.remove();
  }, []);
  const width = window.width;
  const height = window.height;
  const VIDEO_ASPECT_RATIO = 9 / 16;
  const VIDEO_HEIGHT = height; // Full screen height
  return { width, height, VIDEO_HEIGHT };
}

const VideoPlayer = ({
  source,
  poster,
  isActive,
  isMuted = true,
  onDoubleTap = () => { }, // Add this prop for double tap
}) => {
  const { width, VIDEO_HEIGHT } = useResponsiveDimensions();
  const videoRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isPaused, setIsPaused] = useState(!isActive);
  const [videoAspectRatio, setVideoAspectRatio] = useState(9 / 16);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeout = useRef(null);
  const lastTap = useRef(0); // Track last tap for double tap detection

  useEffect(() => {
    setIsPaused(!isActive);
    if (!isActive) {
      setProgress(0);
      setShowControls(false);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    }
  }, [isActive]);

  // Toggle pause/play function
  const togglePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleLoadStart = () => {
    setIsBuffering(true);
    setIsLoading(true);
  };

  const handleLoad = (data) => {
    setIsBuffering(false);
    setIsLoading(false);
    setHasError(false);
    if (data.naturalSize.width && data.naturalSize.height) {
      setVideoAspectRatio(data.naturalSize.width / data.naturalSize.height);
    }
    setDuration(data.duration);
  };

  const handleError = () => {
    setIsBuffering(false);
    setIsLoading(false);
    setHasError(true);
  };

  const handleBuffer = ({ isBuffering: buffering }) => {
    setIsBuffering(buffering);
    if (buffering) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  };

  const handleProgress = (data) => {
    setProgress(data.currentTime / duration);
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
      // Double tap detected - trigger like
      onDoubleTap();
      lastTap.current = 0;
    } else {
      // Single tap - show controls and toggle play/pause
      togglePlayPause();
      setShowControls(true);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    lastTap.current = now;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (hasError) {
    return (
      <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
        <Image
          source={{ uri: poster }}
          style={[styles.videoPoster, { width: '100%', height: '100%' }]}
          resizeMode="cover"
        />
        <View style={styles.videoErrorOverlay}>
          <Text style={styles.videoErrorText}>Couldn't load video</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.videoContainer, { height: VIDEO_HEIGHT }]}>
      <Video
        ref={videoRef}
        source={source}
        style={[styles.video, { width: '100%', height: '100%' }]}
        resizeMode="cover"
        paused={isPaused}
        muted={isMuted}
        repeat={true}
        controls={false}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        onBuffer={handleBuffer}
        onProgress={handleProgress}
        bufferConfig={{
          minBufferMs: 15000,
          maxBufferMs: 30000,
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000
        }}
        progressUpdateInterval={250}
      />

      {/* Loading Overlay */}
      {(isLoading || isBuffering) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Single touchable overlay that handles both single and double taps */}
      <TouchableOpacity
        style={styles.videoControlOverlay}
        activeOpacity={1}
        onPress={handlePress}
      />

      {/* Play/Pause Button Overlay */}
      {showControls && (
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={togglePlayPause}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPaused ? "play-circle" : "pause-circle"}
            size={60}
            color="rgba(255, 255, 255, 0.8)"
          />
        </TouchableOpacity>
      )}

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: `${progress * 100}%`,
              }
            ]}
          />
        </View>

        {/* Time indicators */}
        {showControls && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(progress * duration)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const CommentsModal = ({ visible, onClose, reelId, onCommentAdded, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

 const fetchComments = async () => {
  if (!reelId) return;

  setLoading(true);
  try {
    // Remove Authorization header
    const response = await fetch(`https://hafrik.com/api/v1/reels/get_comments.php?post_id=${reelId}`);
    
    const data = await response.json();
    console.log('Get Comments response:', data);

    if (data.status === 'success') {
      let commentsData = [];
      
      if (data.data && data.data.comments && Array.isArray(data.data.comments)) {
        commentsData = data.data.comments;
      } else if (data.data && Array.isArray(data.data)) {
        commentsData = data.data;
      } else if (data.comments && Array.isArray(data.comments)) {
        commentsData = data.comments;
      } else if (data.data && data.data.data && Array.isArray(data.data.data)) {
        commentsData = data.data.data;
      }
      
      setComments(commentsData);
    } else {
      setComments([]);
      console.log('Comments fetch failed:', data.message);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    setComments([]);
  } finally {
    setLoading(false);
  }
};
 const submitComment = async () => {
  if (!newComment.trim() || !reelId) {
    Alert.alert('Error', 'Please enter a comment');
    return;
  }

  if (!currentUser || !currentUser.id) {
    Alert.alert('Login Required', 'Please login to comment');
    return;
  }

  console.log('=== SUBMIT COMMENT DEBUG ===');
  console.log('reelId:', reelId);
  console.log('currentUser.id:', currentUser?.id);
  console.log('comment text:', newComment); // This should show the actual comment
  console.log('submitting state:', submitting);

  setSubmitting(true);

  try {
    // Use FormData instead of JSON
    const formData = new FormData();
    formData.append('post_id', reelId);
    formData.append('user_id', currentUser.id);
    formData.append('comment', newComment.trim());

    console.log('Making API call to comment.php with FormData...');

    const response = await fetch('https://hafrik.com/api/v1/reels/comment.php', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header for FormData - let the browser set it
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from server');
    }

    if (data.status === 'success') {
      console.log('Comment posted successfully!');
      
      // Clear the form
      setNewComment('');
      console.log('Form cleared - newComment should be empty');
      
      // Refresh comments
      fetchComments();
      
      // Notify parent
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      Alert.alert('Success', 'Comment added successfully!');
    } else {
      console.log('API returned error:', data.message);
      Alert.alert('Error', data.message || 'Failed to add comment');
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
    Alert.alert('Error', 'Failed to add comment. Please check your connection.');
  } finally {
    console.log('Setting submitting to false');
    setSubmitting(false);
  }
};


  useEffect(() => {
    if (visible && reelId) {
      fetchComments();
    }
  }, [visible, reelId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.commentsModalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.commentsModalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.commentsModalContainer}>
          <SafeAreaView style={styles.commentsModalContent}>
            {/* Drag Handle */}
            <View style={styles.commentsDragHandle} />

            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <AntDesign name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.commentsLoadingText}>Loading comments...</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id?.toString() || item.comment_id?.toString() || Math.random().toString()}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image
                      source={{ uri: item.user?.avatar || 'https://via.placeholder.com/40' }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUsername}>
                        {item.user?.username || item.user?.name || 'user'}
                      </Text>
                      <Text style={styles.commentText}>{item.comment || item.text}</Text>
                      <Text style={styles.commentTime}>
                        {item.created_at ? moment(item.created_at).fromNow() : 'Just now'}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.commentsEmpty}>
                    <Text style={styles.commentsEmptyText}>No comments yet</Text>
                    <Text style={styles.commentsEmptySubtext}>Be the first to comment!</Text>
                  </View>
                }
              />
            )}

            {/* Comment Input with User Avatar */}
            <View style={styles.commentInputContainer}>
              {currentUser && (
                <Image
                  source={{ uri: currentUser.avatar || 'https://via.placeholder.com/40' }}
                  style={styles.commentInputAvatar}
                />
              )}
              <TextInput
                style={styles.commentInput}
                placeholder={currentUser ? "Add a comment..." : "Please login to comment"}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                placeholderTextColor="#999"
                editable={!!currentUser}
              />
              <TouchableOpacity
                style={[
                  styles.commentSubmitButton,
                  (!newComment.trim() || submitting || !currentUser) && styles.commentSubmitButtonDisabled
                ]}
                onPress={submitComment}
                disabled={!newComment.trim() || submitting || !currentUser}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.commentSubmitText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const ReelItem = React.memo(({
  reel = {},
  index,
  isActive,
  onPress = () => { },
  onLike = () => { },
  isLiked = false,
  isMuted,
  toggleMute = () => { },
  user = null // This should come from useAuth()
}) => {
  const { width, height, VIDEO_HEIGHT } = useResponsiveDimensions();
  const [showDescription, setShowDescription] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes || 0);
  const [commentCount, setCommentCount] = useState(reel.comment_count || reel.comments_count || 0);
  const [isLikedState, setIsLikedState] = useState(isLiked);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  // Map API data to component structure
  const videoSource = reel.media?.video_url ? { uri: reel.media.video_url } : null;
  const poster = reel.media?.thumbnail;
  const caption = reel.text || reel.caption || '';
  const owner = {
    _id: reel.user?.id?.toString() || reel.user_id?.toString() || 'unknown',
    username: reel.user?.username || reel.user?.name || 'unknown',
    name: reel.user?.name || reel.user?.username || 'Unknown User',
    avatar: reel.user?.avatar || reel.user?.profile_picture || 'https://via.placeholder.com/40',
    verified: reel.user?.verified || false
  };

  // Initialize isLikedState from prop
  useEffect(() => {
    setIsLikedState(isLiked);
  }, [isLiked]);

  // Debug: Log user state when it changes
  useEffect(() => {
    console.log('🔍 ReelItem user state:', {
      hasUser: !!user,
      userId: user?.id,
      username: user?.username,
      reelId: reel.id
    });
  }, [user, reel.id]);

  // Fetch comment count when reel data changes
  useEffect(() => {
    if (reel.id) {
      fetchCommentCount();
    }
  }, [reel.id]);

  const fetchCommentCount = async () => {
    try {
      const response = await fetch(`https://hafrik.com/api/v1/reels/get_comments.php?post_id=${reel.id}`);
      const data = await response.json();
      console.log('Comment count response:', data);

      if (data.status === 'success') {
        // Extract comment count from the response
        if (data.data && data.data.total_comments !== undefined) {
          setCommentCount(data.data.total_comments);
        } else if (data.total_comments !== undefined) {
          setCommentCount(data.total_comments);
        } else if (data.data && Array.isArray(data.data)) {
          setCommentCount(data.data.length);
        } else if (data.data && data.data.data && Array.isArray(data.data.data)) {
          setCommentCount(data.data.data.length);
        } else if (Array.isArray(data.comments)) {
          setCommentCount(data.comments.length);
        } else if (data.data && data.data.comments && Array.isArray(data.data.comments)) {
          setCommentCount(data.data.comments.length);
        }
      }
    } catch (error) {
      console.error('Error fetching comment count:', error);
    }
  };

  const handleCommentsModalClose = () => {
    setShowCommentsModal(false);
    // Refresh comment count when modal closes (after potential new comments)
    fetchCommentCount();
  };

const handleDoubleTap = useCallback(() => {
  console.log('👆 DOUBLE TAP DETECTED');
  console.log('Current isLikedState:', isLikedState);
  console.log('User check:', {
    hasUser: !!user,
    userId: user?.id,
    username: user?.username
  });
  
  // Always show animation for feedback
  Animated.sequence([
    Animated.timing(heartAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.timing(heartAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
      delay: 200
    })
  ]).start();
  
  setShowLikeAnimation(true);
  setTimeout(() => setShowLikeAnimation(false), 1000);
  
  // Check user login
  if (!user || !user.id) {
    console.log('⚠️ User not logged in, showing alert');
    Alert.alert(
      'Login Required',
      'Please login to like reels',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Login', 
          onPress: () => navigation.navigate('Login') 
        }
      ]
    );
    return;
  }
  
  // Only call handleLike if user is logged in
  if (!isLikedState) {
    console.log('✅ User is logged in, calling handleLike');
    handleLike();
  } else {
    console.log('ℹ️ Already liked, doing nothing');
  }
}, [isLikedState, user]);

  const handleLike = async () => {
    console.log('🟢 HANDLE LIKE CALLED:', {
      userExists: !!user,
      userId: user?.id,
      username: user?.username,
      reelId: reel.id
    });
    
    if (!user || !user.id) {
      console.log('❌ User not logged in, cannot like');
      Alert.alert('Login Required', 'Please login to like reels');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('post_id', reel.id);
      formData.append('user_id', user.id);

      console.log('📤 Sending like request to API:', {
        post_id: reel.id,
        user_id: user.id,
        endpoint: `${API_BASE_URL}/like.php`
      });

      const response = await fetch(`${API_BASE_URL}/like.php`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Like API response status:', response.status);

      const responseText = await response.text();
      console.log('📥 Like API raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📥 Like API parsed response:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (data.status === 'success') {
        console.log('✅ Like successful:', data.message);
        
        // Update local state
        setIsLikedState(true);
        setLikeCount(prev => prev + 1);
        
        // Notify parent component
        if (onLike) {
          onLike(reel.id, true);
        }
        
        // Optional: Show success message
        // Alert.alert('Success', 'Reel liked!');
      } else {
        console.log('❌ Like API returned error:', data.message);
        Alert.alert('Error', data.message || 'Failed to like reel');
      }
    } catch (error) {
      console.error('❌ Error in handleLike:', error);
      Alert.alert('Error', 'Failed to like reel. Please check your connection.');
    }
  };

  const handleUnlike = async () => {
    console.log('🔴 HANDLE UNLIKE CALLED:', {
      userExists: !!user,
      userId: user?.id,
      reelId: reel.id
    });
    
    if (!user || !user.id) {
      Alert.alert('Login Required', 'Please login to unlike reels');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('post_id', reel.id);
      formData.append('user_id', user.id);

      console.log('📤 Sending unlike request:', {
        post_id: reel.id,
        user_id: user.id
      });

      const response = await fetch(`${API_BASE_URL}/unlike.php`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('📥 Unlike API response:', data);

      if (data.status === 'success') {
        // Update local state
        setIsLikedState(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        
        // Notify parent component
        if (onLike) {
          onLike(reel.id, false);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to unlike reel');
      }
    } catch (error) {
      console.error('❌ Error unliking reel:', error);
      Alert.alert('Error', 'Failed to unlike reel');
    }
  };

  

  const handleSave = async () => {
    if (!user || !user.id) {
      Alert.alert('Login Required', 'Please login to save reels');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('post_id', reel.id);
      formData.append('user_id', user.id);

      const response = await fetch(`${API_BASE_URL}/save.php`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        setIsSaved(!isSaved);
      } else {
        Alert.alert('Error', data.message || 'Failed to save reel');
      }
    } catch (error) {
      console.error('Error saving reel:', error);
      Alert.alert('Error', 'Failed to save reel');
    }
  };

  const handleShare = async () => {
    try {
      const formData = new FormData();
      formData.append('post_id', reel.id);
      formData.append('user_id', user?.id || '');

      const response = await fetch(`${API_BASE_URL}/share.php`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.status === 'success') {
        await Share.share({
          message: `Check out this reel by ${owner.name} on Hafrik!`,
          url: reel.media?.video_url
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to share reel');
      }
    } catch (error) {
      console.error('Error sharing reel:', error);
      Alert.alert('Error', 'Failed to share reel');
    }
  };

  const handleFollow = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to follow users');
      return;
    }
    setIsFollowing(!isFollowing);
  };

  // Add this function to handle like/unlike toggle
  const handleLikeToggle = () => {
    console.log('🔘 LIKE BUTTON CLICKED:', {
      isLikedState,
      hasUser: !!user,
      userId: user?.id
    });
    
    if (!user || !user.id) {
      Alert.alert('Login Required', 'Please login to like reels');
      return;
    }
    
    if (isLikedState) {
      handleUnlike();
    } else {
      handleLike();
    }
  };

  const truncatedCaption = caption?.length > 150
    ? caption.substring(0, 150) + '...'
    : caption;

  return (
    <View style={[styles.reelContainer, { width, height }]}>
      {/* Video Player - Full Screen */}
      <View style={[styles.videoWrapper, { height: VIDEO_HEIGHT }]}>
        <VideoPlayer
          source={videoSource}
          poster={poster}
          isActive={isActive}
          isMuted={isMuted}
          onDoubleTap={handleDoubleTap}
        />

        {/* Mute Button */}
        <TouchableOpacity
          style={styles.muteButton}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Like Animation */}
      <Animated.View
        style={[
          styles.heartAnimation,
          {
            opacity: heartAnim,
            transform: [
              {
                scale: heartAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.2, 1]
                })
              }
            ]
          }
        ]}
      >
        <AntDesign name="heart" size={100} color="#ff2442" />
      </Animated.View>

      {/* User Info and Caption - Left Side */}
      <View style={styles.leftContent}>
        {/* User Info */}
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('ProfileScreen', { profileId: owner._id })}
        >
          <Image
            source={{ uri: owner.avatar }}
            style={styles.userAvatar}
          />
          <Text style={styles.username}>@{owner.username}</Text>
          {owner.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#4a80f0" style={styles.verifiedBadge} />
          )}
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            {showDescription ? caption : truncatedCaption}
          </Text>
          {caption?.length > 150 && (
            <TouchableOpacity onPress={() => setShowDescription(!showDescription)}>
              <Text style={styles.showMoreText}>
                {showDescription ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sound Track */}
        <View style={styles.soundTrack}>
          <Ionicons name="musical-notes" size={16} color="white" />
          <Text style={styles.soundTrackText}>Original Sound</Text>
        </View>
      </View>

      {/* Right Actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLikeToggle}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLikedState ? "heart" : "heart-outline"}
            size={32}
            color={isLikedState ? "#ff2442" : "white"}
          />
          <Text style={styles.actionCount}>{likeCount.toLocaleString()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCommentsModal(true)}
          activeOpacity={0.7}
        >
          <FontAwesome name="comment-o" size={28} color="white" />
          <Text style={styles.actionCount}>{commentCount.toLocaleString()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={28}
            color={isSaved ? "#FFD700" : "white"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Feather name="send" size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={28} color="white" />
        </TouchableOpacity>

        {/* Music Disc Animation */}
        <View style={styles.musicDisc}>
          <Image
            source={{ uri: owner.avatar }}
            style={styles.discImage}
          />
          <View style={styles.discPlayIndicator} />
        </View>
      </View>

      {/* Comments Modal */}
      <CommentsModal
        visible={showCommentsModal}
        onClose={handleCommentsModalClose}
        reelId={reel.id}
        onCommentAdded={fetchCommentCount}
        currentUser={user} // Pass the user from useAuth()
      />
    </View>
  );
});

const Reels = ({ route }) => {
  const navigation = useNavigation();
  const routeParams = route?.params || {};
  
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Use auth context properly
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  
  const flatListRef = useRef(null);
  const isFocused = useIsFocused();


  const testLikeAPI = async () => {
  console.log('🧪 TESTING LIKE API ENDPOINT');
  
  // Test 1: Check if endpoint exists
  try {
    console.log('1. Testing endpoint existence...');
    const testResponse = await fetch(`${API_BASE_URL}/like.php`, {
      method: 'HEAD' // Just check if it exists
    });
    console.log('✅ Endpoint exists, status:', testResponse.status);
  } catch (error) {
    console.log('❌ Endpoint might not exist:', error.message);
  }
  
  // Test 2: Try a simple POST
  if (user && user.id) {
    console.log('2. Testing POST request...');
    const formData = new FormData();
    formData.append('test', 'test');
    
    try {
      const response = await fetch(`${API_BASE_URL}/like.php`, {
        method: 'POST',
        body: formData,
      });
      const text = await response.text();
      console.log('✅ POST works, response:', text.substring(0, 100));
    } catch (error) {
      console.log('❌ POST failed:', error.message);
    }
  }
  
  // Test 3: Check what endpoint feeds.js uses
  console.log('3. IMPORTANT: Check what endpoint feeds.js uses!');
  console.log('   Look in your feeds.js for "like.php"');
  console.log('   It might be a different path like:');
  console.log('   - /api/v1/feed/like.php');
  console.log('   - /api/v1/posts/like.php');
  console.log('   - /api/v1/feeds/like.php');
};

// Call this somewhere to test
// testLikeAPI();

  // Debug: Log auth state
  useEffect(() => {
    console.log('🔍 Reels Component - Auth State:', {
      user: user ? `User exists (id: ${user?.id})` : 'No user',
      isAuthenticated,
      authLoading,
      tokenExists: !!token
    });
  }, [user, isAuthenticated, authLoading]);

  // Get navigation parameters
  const initialReelId = routeParams.initialReelId;
  const initialIndex = routeParams.initialIndex || 0;
  const passedReelsData = routeParams.reelsData || [];

  // Function to check if user is logged in
  const isUserLoggedIn = () => {
    const loggedIn = user && user.id && isAuthenticated;
    console.log('🔍 isUserLoggedIn check:', {
      loggedIn,
      hasUser: !!user,
      userId: user?.id,
      isAuthenticated
    });
    return loggedIn;
  };

  // Function to scroll to specific reel
  const scrollToReel = (reelId, reelsArray) => {
    if (!reelId || !reelsArray || reelsArray.length === 0 || !flatListRef.current) {
      console.log('❌ Cannot scroll to reel:', {
        hasReelId: !!reelId,
        hasReelsArray: !!reelsArray,
        reelsArrayLength: reelsArray?.length,
        hasFlatListRef: !!flatListRef.current
      });
      return;
    }
    
    const index = reelsArray.findIndex(reel => reel.id === reelId);
    if (index !== -1) {
      console.log('📜 Scrolling to reel at index:', index, 'ID:', reelId);
      
      setTimeout(() => {
        flatListRef.current.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.5
        });
        setCurrentPlayingIndex(index);
      }, 300);
    } else {
      console.log('❌ Reel not found in array:', reelId);
    }
  };

  // Function to scroll to specific index
  const scrollToIndex = (index) => {
    if (index >= 0 && flatListRef.current) {
      console.log('📜 Scrolling to index:', index);
      
      setTimeout(() => {
        flatListRef.current.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.5
        });
        setCurrentPlayingIndex(index);
      }, 300);
    }
  };

  const fetchReels = async (pageNum = 1, isRefresh = false) => {
    try {
      console.log('📡 Fetching reels page:', pageNum, 'isRefresh:', isRefresh);
      setLoading(true);

      // If we have passed reels data (from HomePage), use it first
      if (isRefresh && passedReelsData.length > 0) {
        console.log('📦 Using passed reels data:', passedReelsData.length);
        setReels(passedReelsData);
        setHasMore(passedReelsData.length >= 10);
        
        // Scroll to the specific reel or index
        if (initialReelId) {
          setTimeout(() => {
            scrollToReel(initialReelId, passedReelsData);
          }, 100);
        } else if (initialIndex > 0) {
          setTimeout(() => {
            scrollToIndex(initialIndex);
          }, 100);
        }
        
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch(`https://hafrik.com/api/v1/reels/list.php?page=${pageNum}&limit=10`);
      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('📡 Raw API Response length:', responseText.length);

      let reelsData = [];

      try {
        // Parse the JSON response
        const data = JSON.parse(responseText);
        console.log('📡 Parsed API Data structure:', {
          status: data.status,
          hasData: !!data.data,
          dataType: typeof data.data,
          isArray: Array.isArray(data.data)
        });

        if (data.status === 'success' && data.data && data.data.data) {
          reelsData = data.data.data;
          console.log('✅ Extracted reels:', reelsData.length);
          
          // Debug first reel structure
          if (reelsData.length > 0) {
            console.log('🔍 First reel structure:', {
              id: reelsData[0].id,
              likes: reelsData[0].likes,
              views: reelsData[0].views,
              user: reelsData[0].user,
              hasMedia: !!reelsData[0].media
            });
          }
        } else if (data.status === 'success' && Array.isArray(data.data)) {
          reelsData = data.data;
          console.log('✅ Extracted reels from array:', reelsData.length);
        } else {
          console.log('⚠️ Unexpected API structure:', data);
          reelsData = [];
        }
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (Array.isArray(reelsData) && reelsData.length > 0) {
        if (isRefresh) {
          setReels(reelsData);
          
          // Scroll to the specific reel after setting reels
          if (initialReelId) {
            setTimeout(() => {
              scrollToReel(initialReelId, reelsData);
            }, 100);
          } else if (initialIndex > 0) {
            setTimeout(() => {
              scrollToIndex(initialIndex);
            }, 100);
          }
        } else {
          setReels(prev => [...prev, ...reelsData]);
        }

        if (reelsData.length < 10) {
          setHasMore(false);
          console.log('📭 No more reels to load');
        }
      } else {
        if (isRefresh) {
          setReels([]);
        }
        setHasMore(false);

        if (isRefresh && reelsData.length === 0) {
          Alert.alert('No Reels', 'No reels found. Be the first to create one!');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching reels:', error);

      let errorMessage = 'Failed to load reels. Please try again.';
      if (error.message.includes('JSON')) {
        errorMessage = 'Server response format error. Please try again later.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      Alert.alert('Error', errorMessage);

      if (isRefresh) {
        setReels([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('✅ Fetch reels completed');
    }
  };

  // Scroll to reel when reels are loaded
  useEffect(() => {
    if (reels.length > 0 && initialReelId && !loading) {
      console.log('🎯 Attempting to scroll to initial reel:', initialReelId);
      scrollToReel(initialReelId, reels);
    }
  }, [reels, initialReelId, loading]);

  // Initial data fetch
  useEffect(() => {
    console.log('🚀 Initializing Reels component');
    fetchReels(1, true);

      
    // Test the API when component mounts (remove after testing)
    console.log('🧪 Running API tests...');
    testLikeAPI();
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing reels');
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchReels(1, true);
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      console.log('⬇️ Loading more reels, page:', page + 1);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage, false);
    }
  }, [loading, hasMore, refreshing, page]);

  const handleLike = async () => {
  console.log('=== REELS LIKE DEBUG START ===');
  console.log('User object:', user);
  console.log('User ID field options:', {
    id: user?.id,
    user_id: user?.user_id,
    userId: user?.userId,
    uid: user?.uid
  });
  console.log('Reel ID:', reel.id);
  console.log('Token exists:', !!token);
  console.log('API Base URL:', API_BASE_URL);
  console.log('=== REELS LIKE DEBUG END ===');
  
  if (!user || !user.id) {
    console.log('❌ User check failed - no user or no user.id');
    Alert.alert('Login Required', 'Please login to like reels');
    return;
  }

  try {
    // Method 1: Try FormData (current method)
    console.log('🔄 Method 1: Trying FormData...');
    const formData = new FormData();
    formData.append('post_id', reel.id);
    formData.append('user_id', user.id);
    
    const response1 = await fetch(`${API_BASE_URL}/like.php`, {
      method: 'POST',
      body: formData,
    });
    
    console.log('FormData response status:', response1.status);
    const responseText1 = await response1.text();
    console.log('FormData response text:', responseText1);
    
    // Method 2: Try JSON
    console.log('🔄 Method 2: Trying JSON...');
    const response2 = await fetch(`${API_BASE_URL}/like.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_id: reel.id,
        user_id: user.id
      })
    });
    
    console.log('JSON response status:', response2.status);
    const responseText2 = await response2.text();
    console.log('JSON response text:', responseText2);
    
    // Parse whichever worked
    let data;
    try {
      data = JSON.parse(responseText1 || responseText2);
    } catch (parseError) {
      console.error('Failed to parse JSON from both methods');
      throw new Error('Invalid server response');
    }
    
    console.log('Parsed response:', data);
    
    if (data.status === 'success') {
      setIsLikedState(true);
      setLikeCount(prev => prev + 1);
      if (onLike) onLike(reel.id, true);
    } else {
      Alert.alert('Error', data.message || 'Failed to like reel');
    }
  } catch (error) {
    console.error('❌ All like methods failed:', error);
    Alert.alert('Error', 'Failed to like reel. Please check your connection.');
  }
};

  const hasLiked = useCallback((reel = {}) => {
    const liked = reel.isLiked || false;
    console.log('🔍 Checking if reel is liked:', {
      reelId: reel.id,
      isLiked: liked,
      likesCount: reel.likes
    });
    return liked;
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const firstVisibleItem = viewableItems[0];
      if (firstVisibleItem.isViewable && firstVisibleItem.index !== currentPlayingIndex) {
        console.log('🎬 Changing playing index to:', firstVisibleItem.index);
        setCurrentPlayingIndex(firstVisibleItem.index);
      }
    }
  }).current;

  // Handle scroll to index failures
  const onScrollToIndexFailed = (info) => {
    console.log('❌ Scroll to index failed:', info);
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.5
      });
    });
  };

  const renderItem = ({ item, index }) => {
    console.log('🎨 Rendering reel item:', {
      index,
      reelId: item.id,
      isActive: isFocused && currentPlayingIndex === index
    });
    
    return (
      <ReelItem
        reel={item}
        index={index}
        isActive={isFocused && currentPlayingIndex === index}
        onPress={(idx) => setCurrentPlayingIndex(idx === currentPlayingIndex ? -1 : idx)}
        onLike={handleLike}
        isLiked={hasLiked(item)}
        isMuted={isMuted}
        toggleMute={() => setIsMuted(!isMuted)}
        user={user}
      />
    );
  };

  const renderFooter = () => {
    if (!hasMore) {
      console.log('📭 No footer - no more reels');
      return null;
    }

    console.log('⬇️ Showing loading footer');
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.footerText}>Loading more reels...</Text>
      </View>
    );
  };

  if (loading && reels.length === 0) {
    console.log('⏳ Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Reels...</Text>
      </View>
    );
  }

  console.log('🎬 Rendering main Reels component:', {
    reelsCount: reels.length,
    currentPlayingIndex,
    isMuted,
    isFocused
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" translucent={true} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reels</Text>
        <TouchableOpacity style={styles.cameraButton}>
          <Ionicons name="camera-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="normal"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={onScrollToIndexFailed}
        initialScrollIndex={initialIndex > 0 ? initialIndex : 0}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          waitForInteraction: false,
          minimumViewTime: 300
        }}
        pagingEnabled
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        disableIntervalMomentum={true}
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  flatListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'black',
  },
  footerText: {
    color: 'white',
    fontSize: 14,
    marginTop: 10,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 100,

  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -30,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 30,
  },
  cameraButton: {
    padding: 5,
  },
  reelContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoWrapper: {
    width: '100%',
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPoster: {
    width: '100%',
    height: '100%',
  },
  videoControlOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  muteButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 30,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
    zIndex: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 3,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  videoErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  videoErrorText: {
    color: 'white',
    fontSize: 16,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 0,
    paddingBottom: 10,
  },
  progressBarBackground: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0C3F44',
    borderRadius: 1.5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  heartAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    zIndex: 100,
  },
  leftContent: {
    position: 'absolute',
    bottom: 80,
    left: 15,
    right: 100,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    marginRight: 5,
  },
  verifiedBadge: {
    marginRight: 10,
  },
  followButton: {
    backgroundColor: '#0C3F44',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  followingButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: 'white',
  },
  captionContainer: {
    marginBottom: 10,
  },
  captionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
  },
  showMoreText: {
    color: '#4a80f0',
    fontSize: 13,
    marginTop: 5,
    fontWeight: '600',
  },
  soundTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundTrackText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 5,
  },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: 80,
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionCount: {
    color: 'white',
    fontSize: 13,
    marginTop: 5,
    fontWeight: '600',
  },
  musicDisc: {
    marginTop: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  discImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  discPlayIndicator: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ff2442',
    right: -2,
    top: '50%',
    marginTop: -2,
  },
  giftButton: {
    marginTop: 10,
  },
  giftButtonInner: {
    padding: 8,
  }, commentsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentsModalBackdrop: {
    flex: 1,
  },
  commentsModalContainer: {
    height: height * 0.7, // 70% of screen height
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  commentsModalContent: {
    flex: 1,
  },
  commentsDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  // Update the existing comments styles to work with the new layout
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  commentsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsLoadingText: {
    marginTop: 10,
    color: '#666',
  },
  commentsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  commentsEmptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  commentsEmptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
    backgroundColor: 'white',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  commentSubmitButton: {
    backgroundColor: '#0C3F44',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentSubmitText: {
    color: 'white',
    fontWeight: 'bold',
  },
  giftModalContent: {
    alignItems: 'center',
    padding: 20,
  },
  giftModalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  giftModalSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  giftModalButton: {
    backgroundColor: '#ff2442',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  giftModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Reels;
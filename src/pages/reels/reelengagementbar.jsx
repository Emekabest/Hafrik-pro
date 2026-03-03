import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { addComment, fetchComments, shareReel, toggleSave } from './reelsApi';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const ACCENT = Colors.primary;
const SHEET_BG = Colors.deepSlate;

const CommentItem = ({ item }) => (
  <View style={styles.commentRow}>
    <ExpoImage
      source={{ uri: item.user?.avatar }}
      style={styles.commentAvatar}
      contentFit="cover"
    />
    <View style={styles.commentBody}>
      <Text style={styles.commentUsername}>{item.user?.username ?? 'User'}</Text>
      <Text style={styles.commentText}>{item.text}</Text>
      {item.time ? <Text style={styles.commentTime}>{item.time}</Text> : null}
    </View>
  </View>
);

const ReelEngagementBar = ({
  postId,
  userId,
  token,
  liked,
  likesCount,
  onLikePress,
  commentCount: initialCommentCount,
  isSavedInitial = false,
}) => {
  const [saved, setSaved] = useState(isSavedInitial);
  const [commentCount, setCommentCount] = useState(initialCommentCount ?? 0);
  const [modalVisible, setModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = useCallback(async () => {
    const prev = saved;
    setSaved(s => !s);
    try {
      await toggleSave(postId, token);
    } catch {
      setSaved(prev);
    }
  }, [saved, postId, token]);

  const openComments = useCallback(async () => {
    setModalVisible(true);
    setLoadingComments(true);
    try {
      const data = await fetchComments(postId);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  const handleSubmitComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await addComment(postId, text, token);
      setCommentText('');
      setCommentCount(c => c + 1);
      const data = await fetchComments(postId);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  }, [commentText, postId, token, submitting]);

  const handleShare = useCallback(async () => {
    try {
      await shareReel(postId, userId, token);
      await Share.share({ message: 'Check out this reel on Hafrik!' });
    } catch {
      // silent
    }
  }, [postId, userId, token]);

  return (
    <>
      <View style={styles.container}>
        {/* Like */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={onLikePress}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={30}
            color={liked ? Colors.warningPink : Colors.white}
            style={liked ? styles.likedGlow : undefined}
          />
          <Text style={styles.count}>{likesCount ?? 0}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={28} color={Colors.white} />
          <Text style={styles.count}>{commentCount}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={handleSave}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={saved ? ACCENT : Colors.white}
          />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity activeOpacity={0.7} style={styles.item} onPress={handleShare}>
          <Ionicons name="paper-plane-outline" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Comments Bottom Sheet */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Comments</Text>

          {loadingComments ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 28 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <CommentItem item={item} />}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              }
            />
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment…"
              placeholderTextColor={Colors.mutedBlueGray}
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleSubmitComment}
              multiline
            />
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.sendBtn, submitting && { opacity: 0.5 }]}
              onPress={handleSubmitComment}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="send" size={16} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 8,
  },
  item: {
    alignItems: 'center',
    marginVertical: 13,
  },
  count: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: withOpacity(Colors.black, 0.75),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  likedGlow: {
    shadowColor: Colors.warningPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: withOpacity(Colors.black, 0.5),
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '62%',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.blueGreenMuted,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetTitle: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.blueGreenDark,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blueGreenDeep,
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentUsername: {
    color: Colors.white,
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    marginBottom: 2,
  },
  commentText: {
    color: Colors.mist,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  commentTime: {
    color: Colors.mutedBlueGray,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    marginTop: 3,
  },
  emptyText: {
    color: Colors.mutedBlueGray,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 28,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.blueGreenDark,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.white,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReelEngagementBar;

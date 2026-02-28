import React, { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Platform, Keyboard, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AddCommentController } from '../../../../controllers/commentscontroller';

const BASE   = 'https://hafrik.com';
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const MUTED  = '#7A9198';

/**
 * AddComment
 * Props:
 *  - user         : current user object (needs .avatar)
 *  - feedId       : post ID for normal comments
 *  - token        : auth token
 *  - replyingTo   : { commentId, username } | null — set externally
 *  - onCancelReply: callback to clear replyingTo in parent
 *  - onPosted     : callback fired after successful post / reply
 */
const AddComment = forwardRef(({ user, feedId, token, replyingTo, onCancelReply, onPosted }, ref) => {
  const [commentText,    setCommentText]    = useState('');
  const [posting,        setPosting]        = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }), []);

  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e) => setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardHeight(0);
    const sSub = Keyboard.addListener(showEv, onShow);
    const hSub = Keyboard.addListener(hideEv, onHide);
    return () => { sSub.remove(); hSub.remove(); };
  }, []);

  // Auto-focus when reply mode is activated
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  const handlePost = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || posting) return;
    Keyboard.dismiss();
    setPosting(true);
    setCommentText('');

    try {
      if (replyingTo) {
        // Post a reply to a comment
        await axios.post(
          `${BASE}/api/v1/feed/add_comment_reply.php`,
          { comment_id: replyingTo.commentId, reply: trimmed },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Post a top-level comment
        const res = await AddCommentController(feedId, trimmed, token);
        if (res && res.status !== 200) {
          Alert.alert('Error', 'Failed to post comment. Please try again.');
          setPosting(false);
          return;
        }
      }
      onPosted?.();
      onCancelReply?.();
    } catch {
      Alert.alert('Error', 'Failed to post. Please try again.');
    }
    setPosting(false);
  };

  const canSend = commentText.trim().length > 0;

  return (
    <View style={[cs.wrapper, { bottom: keyboardHeight }]}>
      {/* Reply banner */}
      {!!replyingTo && (
        <View style={cs.replyBanner}>
          <Ionicons name="return-down-forward-outline" size={14} color={ACCENT} />
          <Text style={cs.replyBannerTxt} numberOfLines={1}>
            Replying to <Text style={{ fontWeight: '800' }}>@{replyingTo.username}</Text>
          </Text>
          <TouchableOpacity onPress={onCancelReply} style={cs.replyClose} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <Ionicons name="close" size={16} color={MUTED} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={cs.inputRow}>
        <Image source={{ uri: user?.avatar }} style={cs.avatar} />

        <View style={cs.inputBox}>
          <TextInput
            ref={inputRef}
            value={commentText}
            onChangeText={setCommentText}
            placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : 'Write a comment…'}
            placeholderTextColor="#a0b4b8"
            multiline
            style={cs.input}
            returnKeyType="send"
            onSubmitEditing={handlePost}
          />
        </View>

        <TouchableOpacity
          style={[cs.sendBtn, canSend && cs.sendBtnActive]}
          onPress={handlePost}
          disabled={!canSend || posting}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={16} color={canSend ? '#fff' : MUTED} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const cs = StyleSheet.create({
  wrapper: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 8,
  },

  // Reply banner
  replyBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(19,194,150,0.08)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(19,194,150,0.2)',
    gap: 6,
  },
  replyBannerTxt: { flex: 1, fontSize: 12.5, color: BRAND },
  replyClose: { padding: 2 },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    gap: 10,
  },
  avatar: {
    width: 33, height: 33, borderRadius: 17,
    backgroundColor: '#dde6e8',
    borderWidth: 1.5, borderColor: 'rgba(12,63,68,0.12)',
    marginBottom: 2,
  },
  inputBox: {
    flex: 1, minHeight: 38, maxHeight: 100,
    backgroundColor: CREAM, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(12,63,68,0.12)',
    paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center',
  },
  input: { fontSize: 14.5, color: '#1a2527', lineHeight: 20 },

  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dde6e8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 1,
  },
  sendBtnActive: { backgroundColor: ACCENT },
});

export default AddComment;

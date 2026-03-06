import React, { forwardRef, useState, useEffect, useRef, useImperativeHandle } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AddCommentController, AddReplyController } from '../../../../controllers/commentscontroller';
import { Colors } from '../../../../theme/colors';
import { Spacing } from '../../../../theme/spacing';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const BASE   = 'https://hafrik.com';
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const MUTED  = Colors.secondaryText;

/**
 * AddComment
 * Props:
 *  - user         : current user object (needs .avatar)
 *  - feedId       : post ID for normal comments
 *  - token        : auth token
 *  - replyingTo   : { commentId, username } | null — set externally
 *  - onCancelReply: callback to clear replyingTo in parent
 *  - onPosted     : callback fired after successful post / reply
 *
 * NOTE: This component is no longer position:absolute. It sits at the bottom
 * of a KeyboardAvoidingView in commentscreen.jsx, so keyboard handling is
 * done correctly by the parent KAV — no manual keyboard tracking needed.
 */
const AddComment = forwardRef(({ user, feedId, token, replyingTo, onCancelReply, onPosted }, ref) => {
  const { bottom } = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [posting,     setPosting]     = useState(false);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }), []);

  // Auto-focus when reply mode is activated
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  const handlePost = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || posting) return;
    // Clear input immediately so it feels instant
    setCommentText('');
    setPosting(true);

    try {
      if (replyingTo) {
        const res = await AddReplyController(feedId, replyingTo.commentId, trimmed, token);
        if (res && res.status !== 200) {
          setCommentText(trimmed);
          Alert.alert('Error', 'Failed to post reply. Please try again.');
          setPosting(false);
          return;
        }
      } else {
        const res = await AddCommentController(feedId, trimmed, token);
        if (res && res.status !== 200) {
          // Restore text so user can retry
          setCommentText(trimmed);
          Alert.alert('Error', 'Failed to post comment. Please try again.');
          setPosting(false);
          return;
        }
      }
      onPosted?.();
      onCancelReply?.();
    } catch {
      // Restore text so user can retry
      setCommentText(trimmed);
      Alert.alert('Error', 'Failed to post. Please try again.');
    }
    setPosting(false);
  };

  const canSend = commentText.trim().length > 0;

  // bottom safe area: use inset on devices with a home bar, minimum 8px padding
  const safeBottom = Math.max(bottom, 8);

  return (
    <View style={[cs.wrapper, { paddingBottom: safeBottom }]}>
      {/* Reply banner */}
      {!!replyingTo && (
        <View style={cs.replyBanner}>
          <Ionicons name="return-down-forward-outline" size={14} color={ACCENT} />
          <Text style={cs.replyBannerTxt} numberOfLines={1}>
            Replying to <Text style={{ fontWeight: '800' }}>@{replyingTo.username}</Text>
          </Text>
          <TouchableOpacity
            onPress={onCancelReply}
            style={cs.replyClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
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
            placeholderTextColor={Colors.mutedBlueGrayPlaceholder}
            multiline
            blurOnSubmit={false}
            style={cs.input}
            scrollEnabled
          />
        </View>

        <TouchableOpacity
          style={[cs.sendBtn, canSend && cs.sendBtnActive]}
          onPress={handlePost}
          disabled={!canSend || posting}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={16} color={canSend ? Colors.white : MUTED} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const cs = StyleSheet.create({
  // In-flow wrapper (no longer absolute)
  wrapper: {
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: withOpacity(Colors.black, 0.08),
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },

  // Reply banner
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(Colors.tealAccent, 0.08),
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: withOpacity(Colors.tealAccent, 0.2),
    gap: 6,
  },
  replyBannerTxt: { flex: 1, fontSize: 12.5, color: BRAND },
  replyClose:     { padding: 2 },

  // Input row — 16px horizontal padding, vertically centered
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm + 4, // 12px between elements
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.borderLightAlt,
    borderWidth: 1.5,
    borderColor: withOpacity(Colors.primaryDark, 0.12),
  },
  inputBox: {
    flex: 1,
    minHeight: 38, maxHeight: 100,
    backgroundColor: CREAM,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: withOpacity(Colors.primaryDark, 0.12),
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  input: { fontSize: 14.5, color: Colors.textStrongDeep, lineHeight: 20 },

  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.borderLightAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: ACCENT },
});

export default AddComment;

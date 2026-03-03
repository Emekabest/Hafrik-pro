import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    Dimensions,
    ActivityIndicator,
    ScrollView,
    TextInput,
    Image,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommentMainPostContent from './commentpost/commentmainpostcontent';
import { useAuth } from '../../../../AuthContext';
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';
import { AddCommentController } from '../../../../controllers/commentscontroller';
import CommentBonds from './commentsbonds';
import useStore from '../../../../repository/store';
import { useGlobalVideoPlayer } from '../../../../helpers/GlobalVideoPlayerContext';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND = Colors.primaryDark;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OriginalPostMemo = React.memo(CommentMainPostContent);

const CommentModal = () => {
    const { user, token } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [posting, setPosting] = useState(false);

    const commentModal    = useStore(state => state.commentModal);
    const closeCommentModal = useStore(state => state.closeCommentModal);
    const globalPlayer    = useGlobalVideoPlayer();

    const { isVisible, feedId } = commentModal;
    const loadedFeedIdRef = useRef(null);

    // ── Fetch post when modal opens ──────────────────────────────────────────
    useEffect(() => {
        if (!isVisible || !feedId || !token) return;
        if (loadedFeedIdRef.current === feedId && post) return;

        const getData = async () => {
            setLoading(true);
            try {
                const response = await getUserPostInteractionController(feedId, token);
                if (response.status === 200) {
                    setPost(response.data);
                    loadedFeedIdRef.current = feedId;
                }
            } catch {}
            setLoading(false);
        };

        getData();
    }, [isVisible, feedId, token]);

    // ── Reset when closed ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isVisible) {
            const timer = setTimeout(() => {
                setPost(null);
                setLoading(true);
                setCommentText('');
                loadedFeedIdRef.current = null;
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleClose = useCallback(() => {
        if (globalPlayer && globalPlayer.feedId === feedId) {
            globalPlayer.transferTo('feeds');
        }
        closeCommentModal();
    }, [closeCommentModal, globalPlayer, feedId]);

    const handlePost = useCallback(async () => {
        const text = commentText.trim();
        if (!text || posting) return;
        setPosting(true);
        setCommentText('');
        try {
            await AddCommentController(feedId, text, token);
        } catch {}
        setPosting(false);
    }, [commentText, posting, feedId, token]);

    const headerElement = useMemo(
        () => <OriginalPostMemo post={post} isLeaving={false} />,
        [post],
    );

    if (!isVisible && !post) return null;

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            {/* Dimmed backdrop — tap to dismiss */}
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                {/* Bottom sheet */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.sheet}
                >
                    {/* Drag handle */}
                    <View style={styles.handleRow}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Comments</Text>
                        <TouchableOpacity
                            onPress={handleClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={22} color={Colors.black} />
                        </TouchableOpacity>
                    </View>

                    {/* Scrollable content */}
                    <View style={styles.content}>
                        {loading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color={BRAND} />
                            </View>
                        ) : (
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {headerElement}
                                {feedId && (
                                    <CommentBonds postId={feedId} token={token} />
                                )}
                            </ScrollView>
                        )}
                    </View>

                    {/* Fixed input bar */}
                    {feedId && (
                        <View style={styles.inputBar}>
                            {user?.avatar ? (
                                <Image
                                    source={{ uri: user.avatar }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback]}>
                                    <Ionicons name="person-outline" size={16} color={BRAND} />
                                </View>
                            )}
                            <TextInput
                                style={styles.input}
                                placeholder="Write a comment…"
                                placeholderTextColor={Colors.neutral300}
                                value={commentText}
                                onChangeText={setCommentText}
                                multiline
                                returnKeyType="send"
                                onSubmitEditing={handlePost}
                                blurOnSubmit={false}
                            />
                            <TouchableOpacity
                                onPress={handlePost}
                                disabled={!commentText.trim() || posting}
                                style={styles.sendBtn}
                            >
                                <Ionicons
                                    name="send"
                                    size={20}
                                    color={commentText.trim() ? BRAND : Colors.neutral250}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: withOpacity(Colors.black, 0.45),
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.85,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },

    // ── Drag handle ──────────────────────────────────────────────────────────
    handleRow: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.neutral200,
    },

    // ── Header ───────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.neutral175,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.black,
    },

    // ── Scrollable content ───────────────────────────────────────────────────
    content: {
        flex: 1,
    },
    loadingBox: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 48,
    },
    scrollContent: {
        paddingBottom: 20,
    },

    // ── Input bar ────────────────────────────────────────────────────────────
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.neutral180,
        backgroundColor: Colors.white,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarFallback: {
        backgroundColor: withOpacity(Colors.primaryDark, 0.08),
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: Colors.black,
        maxHeight: 100,
        paddingTop: 6,
        paddingBottom: 6,
    },
    sendBtn: {
        paddingHorizontal: 4,
        justifyContent: 'center',
    },
});

export default CommentModal;

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
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CommentMainPostContent from './commentpost/commentmainpostcontent';
import { useAuth } from '../../../../AuthContext';
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';
import { AddCommentController, AddReplyController } from '../../../../controllers/commentscontroller';
import CommentBonds from './commentsbonds';
import useStore from '../../../../repository/store';
import { useGlobalVideoPlayer } from '../../../../helpers/GlobalVideoPlayerContext';
import { Colors } from '../../../../theme/colors';
import apiClient from '../../../../api/apiClient';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F9F9';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OriginalPostMemo = React.memo(CommentMainPostContent);
const REPLY_ANGLES = [
    'ask a curious follow-up question',
    'agree warmly and add one small thought',
    'sound excited and supportive',
    'ask for more details',
    'make it practical and helpful',
    'respond like a real friend on Hafrik',
    'keep it thoughtful but casual',
    'show interest without sounding generic',
];

const FALLBACK_COMMENTS = [
    'This is really helpful, thanks for sharing.',
    'Interesting point. Can you share more about this?',
    'This makes sense. I would like to learn more.',
    'Good one. This could help a lot of people here.',
    'I like this perspective. Please share more details.',
    'This is useful information for the community.',
    'Nice update. What happened next?',
    'That is a good point, thanks for explaining.',
];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
const looksGenericReply = (text = '') =>
    /^(this is (really )?(helpful|interesting|great|nice)|thanks for sharing|good (one|point)|i like this)$/i
        .test(String(text).trim());

const CommentModal = () => {
    const { user, token } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [posting, setPosting] = useState(false);
    const [aiSuggesting, setAiSuggesting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [latestComment, setLatestComment] = useState(null);
    const inputRef = useRef(null);

    const commentModal    = useStore(state => state.commentModal);
    const closeCommentModal = useStore(state => state.closeCommentModal);
    const globalPlayer    = useGlobalVideoPlayer();

    const { isVisible, feedId, initialText } = commentModal;
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

    useEffect(() => {
        if (!isVisible || !initialText) return;
        setCommentText(String(initialText));
        const timer = setTimeout(() => inputRef.current?.focus(), 250);
        return () => clearTimeout(timer);
    }, [initialText, isVisible]);

    // ── Reset when closed ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isVisible) {
            const timer = setTimeout(() => {
                setPost(null);
                setLoading(true);
                setCommentText('');
                setAiSuggesting(false);
                setReplyingTo(null);
                setLatestComment(null);
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
            if (replyingTo) {
                await AddReplyController(feedId, replyingTo.commentId, text, token);
            } else {
                await AddCommentController(feedId, text, token);
                // Show the new comment immediately (optimistic)
                setLatestComment({
                    id: `temp-${Date.now()}`,
                    text,
                    user: {
                        id:        user?.id,
                        full_name: user?.full_name ?? user?.name ?? '',
                        username:  user?.username ?? '',
                        avatar:    user?.avatar ?? '',
                    },
                    created:      new Date().toISOString(),
                    likes_count:  0,
                    is_liked:     false,
                    is_mine:      true,
                    reply_count:  0,
                });
            }
            // Sync comment count to store
            const { feeds, updateFeedById } = useStore.getState();
            const currentFeed = feeds.feedsById[feedId];
            if (currentFeed) {
                updateFeedById(feedId, {
                    ...currentFeed,
                    comments_count: (Number(currentFeed.comments_count) || 0) + 1,
                });
            }
            setReplyingTo(null);
        } catch {}
        setPosting(false);
    }, [commentText, posting, feedId, token, replyingTo, user]);

    const handleReply = useCallback((commentId, username) => {
        setReplyingTo({ commentId, username });
        inputRef.current?.focus();
    }, []);

    const handleCancelReply = useCallback(() => setReplyingTo(null), []);

    const handleAISuggestReply = useCallback(async () => {
        if (!feedId || aiSuggesting) return;

        setAiSuggesting(true);
        try {
            const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const angle = pickRandom(REPLY_ANGLES);
            const postText = String(post?.text ?? post?.payload?.text ?? post?.payload?.title ?? '').trim();
            const author = post?.user?.full_name ?? post?.user?.username ?? 'the author';
            const prompt = replyingTo
                ? `Read the Hafrik post and suggest ONE fresh short reply to @${replyingTo.username}. The reply must directly fit the post, use this angle: ${angle}. Keep it under 20 words. Do not repeat common generic replies. Seed: ${seed}.`
                : `Read the Hafrik post and suggest ONE fresh short comment that directly fits the post. Use this angle: ${angle}. Keep it under 20 words. Do not repeat common generic replies. Seed: ${seed}.`;

            const response = await apiClient.post('/ai/chat.php', {
                mode: 'Reply Assistant',
                context_type: 'post',
                context_id: feedId,
                context_data: {
                    post_id: feedId,
                    type: post?.type ?? null,
                    text: postText,
                    title: post?.payload?.title ?? '',
                    author,
                    username: post?.user?.username ?? '',
                    comments_count: post?.comments_count ?? 0,
                    likes_count: post?.likes_count ?? 0,
                    replying_to: replyingTo?.username ?? null,
                    variation_seed: seed,
                    reply_angle: angle,
                },
                messages: [{
                    role: 'user',
                    content: `${prompt}\n\nPost author: ${author}\nPost text: ${postText || 'No text, use the post type/media context.'}`,
                }],
                response_style: 'short_reply',
            }, { timeout: 45000 });

            const reply = response?.data?.reply
                ?? response?.data?.data?.reply
                ?? response?.data?.message
                ?? '';

            const cleaned = String(reply)
                .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
                .replace(/\s*\n+\s*/g, ' ')
                .trim();

            const finalText = cleaned && !looksGenericReply(cleaned)
                ? cleaned
                : pickRandom(FALLBACK_COMMENTS.filter((item) => item !== commentText.trim()) || FALLBACK_COMMENTS);

            if (finalText) {
                setCommentText(finalText.slice(0, 220));
                setTimeout(() => inputRef.current?.focus(), 80);
            }
        } catch (error) {
            Alert.alert(
                'AI suggestion failed',
                error?.response?.data?.message ?? 'Please try again.'
            );
        } finally {
            setAiSuggesting(false);
        }
    }, [aiSuggesting, feedId, post, replyingTo]);

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
                    <LinearGradient
                        colors={['#FFFFFF', BG]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.sheetTop}
                    >
                        <View style={styles.handleRow}>
                            <View style={styles.handle} />
                        </View>

                        <View style={styles.header}>
                            <View style={styles.titleBadge}>
                                <Ionicons name="chatbubble-ellipses" size={16} color={BRAND} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>Comments</Text>
                                <Text style={styles.subtitle}>Join the conversation</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={handleClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={19} color={BRAND} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

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
                                <View style={styles.postPreviewWrap}>{headerElement}</View>
                                {feedId && (
                                    <CommentBonds postId={feedId} token={token} onReply={handleReply} newComment={latestComment} />
                                )}
                            </ScrollView>
                        )}
                    </View>

                    {/* Fixed input bar */}
                    {feedId && (
                        <View style={styles.inputBar}>
                            {/* Reply banner */}
                            {!!replyingTo && (
                                <View style={styles.replyBanner}>
                                    <Ionicons name="return-down-forward-outline" size={14} color={BRAND} />
                                    <Text style={styles.replyBannerText} numberOfLines={1}>
                                        Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.username}</Text>
                                    </Text>
                                    <TouchableOpacity onPress={handleCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="close-circle" size={18} color={Colors.neutral400} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <View style={styles.composerTopRow}>
                                <TouchableOpacity
                                    style={styles.aiSuggestBtn}
                                    activeOpacity={0.82}
                                    onPress={handleAISuggestReply}
                                    disabled={aiSuggesting || posting || loading}
                                >
                                    {aiSuggesting ? (
                                        <ActivityIndicator size="small" color={BRAND} />
                                    ) : (
                                        <Ionicons name="sparkles-outline" size={14} color={BRAND} />
                                    )}
                                    <Text style={styles.aiSuggestText}>
                                        {replyingTo ? 'AI reply' : 'AI comment'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputShell}>
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
                                    ref={inputRef}
                                    style={styles.input}
                                    placeholder={replyingTo ? `Reply to ${replyingTo.username}…` : 'Write a comment…'}
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
                                    style={[styles.sendBtn, (!commentText.trim() || posting) && styles.sendBtnDisabled]}
                                >
                                    {posting ? (
                                        <ActivityIndicator size="small" color={Colors.white} />
                                    ) : (
                                        <Ionicons name="arrow-up" size={18} color={Colors.white} />
                                    )}
                                </TouchableOpacity>
                            </View>
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
        backgroundColor: withOpacity(Colors.black, 0.55),
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.9,
        backgroundColor: BG,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.14,
        shadowRadius: 22,
        elevation: 18,
    },
    sheetTop: {
        borderBottomWidth: 1,
        borderBottomColor: withOpacity(Colors.primaryDark, 0.08),
    },

    // ── Drag handle ──────────────────────────────────────────────────────────
    handleRow: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 8,
    },
    handle: {
        width: 42,
        height: 5,
        borderRadius: 999,
        backgroundColor: withOpacity(Colors.primaryDark, 0.16),
    },

    // ── Header ───────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    titleBadge: {
        width: 40,
        height: 40,
        borderRadius: 16,
        backgroundColor: withOpacity(Colors.primaryDark, 0.08),
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: BRAND,
        letterSpacing: -0.25,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.secondaryText,
        marginTop: 1,
    },
    closeBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: withOpacity(Colors.primaryDark, 0.08),
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Scrollable content ───────────────────────────────────────────────────
    content: {
        flex: 1,
    },
    loadingBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 48,
    },
    scrollContent: {
        paddingBottom: 18,
        paddingTop: 12,
    },
    postPreviewWrap: {
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: withOpacity(Colors.primaryDark, 0.08),
    },

    // ── Input bar ────────────────────────────────────────────────────────────
    inputBar: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        borderTopWidth: 1,
        borderTopColor: withOpacity(Colors.primaryDark, 0.08),
        backgroundColor: Colors.white,
    },
    replyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: withOpacity(Colors.primaryDark, 0.06),
        borderWidth: 1,
        borderColor: withOpacity(Colors.primaryDark, 0.1),
    },
    replyBannerText: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: '700',
        color: Colors.secondaryText,
    },
    composerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    aiSuggestBtn: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withOpacity(Colors.primaryDark, 0.14),
        backgroundColor: withOpacity(ACCENT, 0.1),
    },
    aiSuggestText: {
        fontSize: 12,
        fontWeight: '900',
        color: BRAND,
    },
    inputShell: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 9,
        padding: 8,
        borderRadius: 24,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: withOpacity(Colors.primaryDark, 0.1),
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        marginBottom: 2,
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
        minHeight: 36,
        paddingTop: 8,
        paddingBottom: 7,
        lineHeight: 20,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND,
    },
    sendBtnDisabled: {
        opacity: 0.38,
    },
});

export default CommentModal;

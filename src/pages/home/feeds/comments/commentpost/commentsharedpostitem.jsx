import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import CommentVideoItem from './commentvideoitem';
import PollContent from '../../feedcardproperties/pollcontent';
import CommentProductItem from './commentproductitem';
import CalculateElapsedTime from '../../../../../helpers/calculateelapsedtime';
import CleanText from '../../../../../helpers/cleantext';
import AppDetails from '../../../../../helpers/appdetails';
import { Colors } from '../../../../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
// Full card width minus the outer horizontal margin (15px each side)
const CARD_INNER_W = SCREEN_W - 30;
// Portrait image: 4:5 ratio, capped at 400
const MEDIA_HEIGHT = Math.min(Math.round(CARD_INNER_W * 1.05), 400);

const ACCENT      = Colors.primary;
const BORDER      = Colors.borderLightAlt ?? Colors.neutral200;
const BG_SHARED   = Colors.surfaceCoolAlt ?? Colors.neutral100 ?? '#F6F7FA';
const TEXT_BODY   = Colors.textBodyIndigo ?? Colors.black;
const TEXT_MUTED  = Colors.mutedBlueGrayAlt ?? Colors.neutral430 ?? '#8A96A3';
const AVATAR_RING = Colors.infoSurfaceSoft ?? Colors.neutral200;

const withOpacity = (hex, opacity) => {
    const normalized = (hex || '').replace('#', '');
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
    return `#${normalized}${alpha}`;
};

const getPostNavigation = (navigation, post) => {
    if (!post || !post.id) return;
    if (post.type === 'article' && post.payload && post.payload.article_id) {
        navigation.navigate('ArticleDetails', { postId: post.id, articleId: post.payload.article_id, title: post.payload.title });
        return;
    }
    if (post.type === 'reel') {
        navigation.navigate('Reels2', { initialReels: [post], startIndex: 0, initialReelId: post.id });
        return;
    }
    navigation.navigate('PostDetail', { postId: post.id });
};

const CommentSharedPostItem = ({ post, isLeaving, parentFeedId }) => {
    const navigation = useNavigation();
    const [isExpanded, setIsExpanded] = useState(false);
    if (!post) return null;
    const avatar    = post.user?.avatar ?? 'https://hafrik.com/default-avatar.png';
    const fullName  = post.user?.full_name || [post.user?.first_name, post.user?.last_name].filter(Boolean).join(' ') || 'Unknown';
    const username  = post.user?.username ?? '';
    const timestamp = CalculateElapsedTime(post.created);
    const cleanedText    = useMemo(() => (post.text ? CleanText(post.text) : null), [post.text]);
    const isLongPostText = useMemo(() => cleanedText && cleanedText.length > 120, [cleanedText]);
    const displayText    = useMemo(() => {
        if (!cleanedText) return null;
        if (isLongPostText && !isExpanded) return `${cleanedText.substring(0, 120)}…`;
        return cleanedText;
    }, [cleanedText, isLongPostText, isExpanded]);
    const toggleExpanded = useCallback(() => setIsExpanded(p => !p), []);
    const handleSharedPress = useCallback(() => {
        getPostNavigation(navigation, post);
    }, [navigation, post]);
    const handleOriginalPress = useCallback((e) => {
        e.stopPropagation();
        getPostNavigation(navigation, post.shared_post);
    }, [navigation, post.shared_post]);
    const isVideo   = post.type === 'video' || post.type === 'reel';
    const mediaItem = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;
    // Article cover
    const isArticle = post.type === 'article' && post.payload;
    const articleCover = isArticle ? (post.payload.image || (Array.isArray(post.media) && post.media[0]?.url)) : null;
    // Prevent deep nesting
    if (post.shared_post?.shared_post) return null;
    return (
        <View style={styles.container}>
            {/* ── "Shared post" label ── */}
            <View style={styles.sharedLabel}>
                <Ionicons name="repeat-outline" size={13} color={ACCENT} />
                <Text style={styles.sharedLabelText}>Shared post</Text>
            </View>
            {/* ── Author row ── */}
            <View style={styles.authorRow}>
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarRing} />
                    <ExpoImage
                        source={{ uri: avatar }}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                </View>
                <View style={styles.authorInfo}>
                    <Text style={styles.fullName} numberOfLines={1}>{fullName}</Text>
                    {!!username && (
                        <Text style={styles.username} numberOfLines={1}>@{username}</Text>
                    )}
                    <Text style={styles.timestamp}>{timestamp}</Text>
                </View>
            </View>
            {/* ── Caption ── */}
            {displayText ? (
                <Text style={styles.postText}>
                    {displayText}
                    {isLongPostText && (
                        <Text onPress={toggleExpanded} style={styles.seeMore}>
                            {isExpanded ? '  See less' : '  See more'}
                        </Text>
                    )}
                </Text>
            ) : null}
            {/* ── Content variants ── */}
            {isArticle ? (
                <TouchableOpacity activeOpacity={0.88} onPress={handleSharedPress} style={{marginTop: 10}}>
                    {articleCover && (
                        <ExpoImage
                            source={{ uri: articleCover }}
                            style={[styles.mediaImage, { height: MEDIA_HEIGHT }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    )}
                    <View style={{paddingVertical: 8}}>
                        <Text style={{fontWeight: 'bold', fontSize: 15}} numberOfLines={2}>{post.payload.title}</Text>
                        {post.payload.snippet && <Text style={{color: '#555', marginTop: 2}} numberOfLines={3}>{post.payload.snippet}</Text>}
                    </View>
                </TouchableOpacity>
            ) : post.type === 'poll' ? (
                <TouchableOpacity activeOpacity={0.88} onPress={handleSharedPress} style={{marginTop: 10}}>
                    <View style={styles.pollBadge}>
                        <Ionicons name="stats-chart-outline" size={13} color={TEXT_MUTED} />
                        <Text style={styles.pollBadgeText}>Poll</Text>
                    </View>
                </TouchableOpacity>
            ) : post.type === 'product' ? (
                <TouchableOpacity activeOpacity={0.88} onPress={handleSharedPress} style={{marginTop: 10}}>
                    <CommentProductItem post={post} />
                </TouchableOpacity>
            ) : mediaItem ? (
                <TouchableOpacity activeOpacity={0.88} onPress={handleSharedPress} style={{marginTop: 10}}>
                    {isVideo ? (
                        <CommentVideoItem
                            videoUrl={mediaItem.video_url}
                            thumbnail={mediaItem.thumbnail}
                            isLeaving={isLeaving}
                            feedId={parentFeedId}
                            isReel={post.type === 'reel'}
                        />
                    ) : (
                        <ExpoImage
                            source={{ uri: mediaItem.url || mediaItem.thumbnail }}
                            style={[styles.mediaImage, { height: MEDIA_HEIGHT }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    )}
                </TouchableOpacity>
            ) : null}
            {/* ── Original post preview ── */}
            {post.shared_post && (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleOriginalPress}
                    style={styles.originalPostPreview}
                >
                    <Text style={styles.originalLabel}>Original post</Text>
                    {post.shared_post.type === 'article' && post.shared_post.payload && (
                        <>
                            <ExpoImage
                                source={{ uri: post.shared_post.payload?.image }}
                                style={styles.articleImage}
                                contentFit="cover"
                            />
                            <Text style={styles.articleTitle} numberOfLines={2}>
                                {post.shared_post.payload?.title}
                            </Text>
                            <Text style={styles.articleSnippet} numberOfLines={2}>
                                {post.shared_post.payload?.snippet}
                            </Text>
                        </>
                    )}
                    {post.shared_post.type !== 'article' && (
                        <CommentSharedPostItem
                            post={post.shared_post}
                            isLeaving={isLeaving}
                            parentFeedId={post.id}
                        />
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: BG_SHARED,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        overflow: 'hidden',
        padding: 12,
        gap: 10,
        marginTop: 10,
    },

    // ── Shared label ──────────────────────────────────────────────────────────
    sharedLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sharedLabelText: {
        fontSize: 11,
        fontWeight: '600',
        color: ACCENT,
        fontFamily: AppDetails.fontFamily?.body,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },

    // ── Author row ────────────────────────────────────────────────────────────
    authorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    avatarWrapper: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    avatarRing: {
        position: 'absolute',
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: AVATAR_RING,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    authorInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    fullName: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT_BODY,
        fontFamily: AppDetails.fontFamily?.heading,
    },
    username: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontFamily: AppDetails.fontFamily?.bodyItalic,
        marginTop: 1,
    },
    timestamp: {
        fontSize: 11,
        color: TEXT_MUTED,
        fontFamily: AppDetails.fontFamily?.body,
        marginTop: 2,
    },

    // ── Caption ───────────────────────────────────────────────────────────────
    postText: {
        fontSize: 13.5,
        color: TEXT_BODY,
        lineHeight: 20,
        fontFamily: AppDetails.fontFamily?.body,
        letterSpacing: 0.1,
    },
    seeMore: {
        color: ACCENT,
        fontWeight: '700',
        fontSize: 13,
    },

    // ── Poll badge ────────────────────────────────────────────────────────────
    pollBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: withOpacity(ACCENT, 0.08),
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    pollBadgeText: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '600',
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Media image ───────────────────────────────────────────────────────────
    mediaImage: {
        width: '100%',
        borderRadius: 10,
        backgroundColor: Colors.neutral150 ?? Colors.neutral200,
    },
    originalPostPreview: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 10,
        backgroundColor: Colors.white,
    },
    originalLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: TEXT_MUTED,
        marginBottom: 6,
    },
    articleImage: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        marginBottom: 8,
    },
    articleTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_BODY,
        marginBottom: 4,
    },
    articleSnippet: {
        fontSize: 12,
        color: TEXT_MUTED,
        lineHeight: 16,
    },
});

export default CommentSharedPostItem;

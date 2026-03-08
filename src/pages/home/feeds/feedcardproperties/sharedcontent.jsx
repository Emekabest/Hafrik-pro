import React, { memo, useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import AppDetails from '../../../../helpers/appdetails.js';
import CleanText from '../../../../helpers/cleantext.js';
import UserDetails from './userdetails.jsx';
import Videocontent from './videocontent.jsx';
import ProductContent from './productcontent.jsx';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT       = Colors.primary;
const BORDER       = Colors.borderLightAlt;
const BG_SHARED    = Colors.surfaceCoolAlt;
const TEXT_BODY    = Colors.textBodyIndigo;
const TEXT_MUTED   = Colors.mutedBlueGrayAlt;
const AVATAR_RING  = Colors.infoSurfaceSoft;

const withOpacity = (hex, opacity) => {
    const normalized = (hex || '').replace('#', '');
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
    return `#${normalized}${alpha}`;
};

// ─── SharedContent ─────────────────────────────────────────────────────────────
const SharedContent = ({ post = {}, parentFeedId, containerWidth, isVisible = false }) => {
    const openCommentModal = useStore(state => state.openCommentModal);
    const tabletMode       = useStore(state => state.tabletMode);
    const storeFeedWidth   = useStore(state => state.feedWidth);

    const effectiveContainerWidth = containerWidth > 0
        ? containerWidth
        : (tabletMode && storeFeedWidth > 0 ? storeFeedWidth : 0);

    const leftOffset  = effectiveContainerWidth > 0 ? 20 + ((effectiveContainerWidth - 20) * 0.13) + 5 : 0;
    const rightOffset = 15;
    const imageWidth  = effectiveContainerWidth > 0
        ? effectiveContainerWidth - leftOffset - rightOffset - 2  // -2 for border
        : undefined;

    const safePost    = post || {};
    const mediaArray  = Array.isArray(safePost.media) ? safePost.media : [];
    const mediaItem   = mediaArray.length > 0 ? mediaArray[0] : null;
    const isVideo     = safePost.type === 'video' || safePost.type === 'reel';

    const [hasError, setHasError]   = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const cleanedText    = useMemo(() => (post.text ? CleanText(post.text) : null), [post.text]);
    const isLongPostText = useMemo(() => cleanedText && cleanedText.length > 100, [cleanedText]);

    const displayText = useMemo(() => {
        if (!cleanedText) return null;
        if (isLongPostText && !isExpanded) return `${cleanedText.substring(0, 100)}...`;
        return cleanedText;
    }, [cleanedText, isLongPostText, isExpanded]);

    const handlePress = useCallback(() => {
        openCommentModal(parentFeedId);
    }, [openCommentModal, parentFeedId]);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const handleRetry = useCallback(() => {
        setHasError(false);
    }, []);

    // ── Computed image dimensions ─────────────────────────────────────────────
    // Use full available width; height is 4:5 portrait ratio (capped at 400)
    const mediaImgWidth  = imageWidth || 280;
    const mediaImgHeight = Math.min(Math.round(mediaImgWidth * 1.05), 400);

    return (
        <View style={styles.container}>

            {/* ── "Shared post" label ── */}
            <View style={styles.sharedLabel}>
                <Ionicons name="repeat-outline" size={13} color={ACCENT} />
                <Text style={styles.sharedLabelText}>Shared post</Text>
            </View>

            {/* ── Author row ── */}
            <View style={styles.header}>
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarRing} />
                    <ExpoImage
                        source={{ uri: post.user?.avatar }}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                </View>
                <View style={styles.userDetailsWrapper}>
                    <UserDetails feed={post} fullNameFontSize={13} />
                </View>
            </View>

            {/* ── Caption ── */}
            {displayText ? (
                <Text style={styles.postText}>
                    {displayText}
                    {isLongPostText && (
                        <Text onPress={toggleExpanded} style={styles.seeMoreText}>
                            {isExpanded ? '  See less' : '  See more'}
                        </Text>
                    )}
                </Text>
            ) : null}

            {/* ── Content variants ── */}
            {post.type === 'poll' ? (
                <View style={styles.pollBadge}>
                    <Ionicons name="stats-chart-outline" size={13} color={TEXT_MUTED} />
                    <Text style={styles.pollBadgeText}>Poll</Text>
                </View>

            ) : post.type === 'product' ? (
                <ProductContent
                    feed={post}
                    leftOffset={leftOffset}
                    rightOffset={rightOffset}
                    imageWidth={imageWidth}
                    containerWidth={effectiveContainerWidth}
                />

            ) : post.type === 'article' && post.payload ? (
                <TouchableOpacity
                    onPress={() => openCommentModal(post.id)}
                    activeOpacity={0.8}
                    style={styles.articleCard}
                >
                    {post.payload.cover && (
                        <ExpoImage
                            source={{ uri: post.payload.cover }}
                            style={styles.articleCover}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    )}
                    <View style={styles.articleMeta}>
                        <Text style={styles.articleTitle} numberOfLines={2}>
                            {post.payload.title}
                        </Text>
                        <View style={styles.articleReadRow}>
                            <Text style={styles.articleReadText}>Read article</Text>
                            <Ionicons name="arrow-forward" size={12} color={ACCENT} style={{ marginLeft: 4 }} />
                        </View>
                    </View>
                </TouchableOpacity>

            ) : mediaItem ? (
                hasError ? (
                    <View style={[styles.mediaBox, { width: mediaImgWidth, height: mediaImgHeight }]}>
                        <Ionicons name="alert-circle-outline" size={28} color={Colors.white} />
                        <Text style={styles.errorText}>Something went wrong</Text>
                        <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                            <Text style={styles.retryText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableWithoutFeedback onPress={handlePress}>
                        <View style={[styles.mediaBox, { width: mediaImgWidth, height: mediaImgHeight }]}>
                            {isVideo ? (
                                <Videocontent feedId={parentFeedId} media={post.media} isVisible={isVisible} />
                            ) : mediaItem.url ? (
                                <ExpoImage
                                    source={{ uri: mediaItem.url }}
                                    style={StyleSheet.absoluteFill}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                            ) : null}
                        </View>
                    </TouchableWithoutFeedback>
                )
            ) : null}

        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        backgroundColor: BG_SHARED,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        overflow: 'hidden',
        padding: 12,
        gap: 10,
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

    // ── Author header ─────────────────────────────────────────────────────────
    header: {
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
    userDetailsWrapper: {
        flex: 1,
    },

    // ── Caption ───────────────────────────────────────────────────────────────
    postText: {
        fontSize: 13.5,
        color: TEXT_BODY,
        lineHeight: 20,
        fontFamily: AppDetails.fontFamily?.body,
        letterSpacing: 0.1,
    },
    seeMoreText: {
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

    // ── Article card ──────────────────────────────────────────────────────────
    articleCard: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: BORDER,
    },
    articleCover: {
        width: '100%',
        height: 150,
        backgroundColor: Colors.neutral150,
    },
    articleMeta: {
        padding: 10,
    },
    articleTitle: {
        fontWeight: '700',
        fontSize: 14,
        color: TEXT_BODY,
        lineHeight: 20,
        fontFamily: AppDetails.fontFamily?.heading,
    },
    articleReadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    articleReadText: {
        fontSize: 12,
        color: ACCENT,
        fontWeight: '600',
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Media box ─────────────────────────────────────────────────────────────
    mediaBox: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: Colors.neutral800,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },

    // ── Error state ───────────────────────────────────────────────────────────
    errorText: {
        color: Colors.white,
        fontSize: 13,
        marginTop: 8,
        fontFamily: AppDetails.fontFamily?.body,
    },
    retryBtn: {
        marginTop: 12,
        paddingVertical: 7,
        paddingHorizontal: 18,
        backgroundColor: Colors.neutral700,
        borderRadius: 20,
    },
    retryText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: AppDetails.fontFamily?.body,
    },
});

export default memo(SharedContent, (prev, next) => {
    return (
        prev.post.id             === next.post.id             &&
        prev.parentFeedId        === next.parentFeedId        &&
        prev.post.likes_count    === next.post.likes_count    &&
        prev.post.comments_count === next.post.comments_count &&
        prev.isVisible           === next.isVisible
    );
});

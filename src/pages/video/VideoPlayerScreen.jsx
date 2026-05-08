/**
 * VideoPlayerScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Full video player screen for type==="video" posts.
 * - 16:9 landscape player at the top
 * - EngagementBar (same as feed — like, comment, repost, save, share)
 * - Inline comments with reply support
 * - AddComment input at the bottom
 * - Related videos (discover feed) below comments
 * - Fullscreen mode: slides in from the right, rotates to landscape (YouTube-style)
 */

import React, {
    memo, useState, useCallback, useEffect, useRef,
} from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Image,
    KeyboardAvoidingView, Modal, PanResponder, Platform, StatusBar,
    StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import moment from 'moment';
import { useAuth } from '../../AuthContext';
import EngagementBar from '../home/feeds/feedcardproperties/engagementbar';
import { CommentItem } from '../home/feeds/comments/commentsbonds';
import AddComment from '../home/feeds/comments/addcomment';
import ShareModal from '../home/feeds/share';
import RepostModal from '../home/feeds/feedcardproperties/RepostModal';
import { GetCommentsController } from '../../controllers/commentscontroller';
import apiClient from '../../api/apiClient';
import { Colors } from '../../theme/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const VIDEO_H = Math.round(SCREEN_W * 9 / 16);   // 16:9 portrait inline

// In landscape fullscreen the roles flip — height becomes the long axis
const FS_W = Math.max(SCREEN_W, SCREEN_H);  // long side
const FS_H = Math.min(SCREEN_W, SCREEN_H);  // short side

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const BLACK  = Colors.black;
const MUTED  = Colors.grey;
const BG     = '#F4F9F9';
const CARD   = '#FFFFFF';
const BORDER = Colors.borderCool ?? '#DCEAEA';

const totalLikes = (reactions, fallback = 0) => {
    if (reactions && typeof reactions === 'object') {
        const sum = Object.entries(reactions)
            .filter(([k]) => k !== 'total')
            .reduce((acc, [, v]) => acc + Number(v || 0), 0);
        if (sum > 0) return sum;
        if (typeof reactions.total === 'number') return reactions.total;
    }
    return Number(fallback) || 0;
};

const hex2 = (hex, op) => {
    const h = (hex || '').replace('#', '');
    const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
    return `#${h}${a}`;
};

const formatTime = (s = 0) => {
    const sec = Math.floor(s);
    const m   = Math.floor(sec / 60);
    return `${m}:${(sec % 60).toString().padStart(2, '0')}`;
};

const FormattedCaption = memo(({ text, expanded, onHashtagPress }) => {
    const value = String(text ?? '');
    const parts = value.split(/(#\w+)/g);

    return (
        <Text style={styles.postText} numberOfLines={expanded ? undefined : 2}>
            {parts.map((part, index) => {
                if (/^#\w+$/.test(part)) {
                    const tag = part.replace(/^#/, '');
                    return (
                        <Text
                            key={`${part}-${index}`}
                            style={styles.inlineHashtag}
                            onPress={() => onHashtagPress?.(tag)}
                        >
                            {part}
                        </Text>
                    );
                }
                return <Text key={`txt-${index}`}>{part}</Text>;
            })}
        </Text>
    );
});

// ─── VideoPlayer ──────────────────────────────────────────────────────────────
const VideoPlayer = memo(({ videoUrl, thumbnail }) => {
    const [paused,      setPaused]      = useState(false);
    const [muted,       setMuted]       = useState(false);
    const [controlsVis, setControlsVis] = useState(true);
    const [fullscreen,  setFullscreen]  = useState(false);
    const [fsControls,  setFsControls]  = useState(true);

    const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;
    const controlsTimer = useRef(null);
    const fsControlsTimer = useRef(null);

    const player = useVideoPlayer(videoUrl, (p) => {
        if (!p) return;
        p.loop  = false;
        p.muted = false;
        p.play();
    });

    const { status } = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });
    useEvent(player, 'timeUpdate', { currentTime: 0 });

    const isReady     = status === 'readyToPlay';
    const isBuffering = status === 'buffering';
    const currentTime = player?.currentTime ?? 0;
    const totalTime   = player?.duration    ?? 0;
    const progress    = totalTime > 0 ? currentTime / totalTime : 0;

    // Auto-hide inline controls
    const resetControlsTimer = useCallback(() => {
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => setControlsVis(false), 3500);
    }, []);

    useEffect(() => {
        if (controlsVis) resetControlsTimer();
        return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
    }, [controlsVis, resetControlsTimer]);

    // Auto-hide fullscreen controls
    const resetFsControlsTimer = useCallback(() => {
        if (fsControlsTimer.current) clearTimeout(fsControlsTimer.current);
        fsControlsTimer.current = setTimeout(() => setFsControls(false), 4000);
    }, []);

    useEffect(() => {
        if (fsControls) resetFsControlsTimer();
        return () => { if (fsControlsTimer.current) clearTimeout(fsControlsTimer.current); };
    }, [fsControls, resetFsControlsTimer]);

    // ── Playback controls ─────────────────────────────────────────────────────
    const handleTap = useCallback(() => setControlsVis(v => !v), []);
    const handleFsTap = useCallback(() => setFsControls(v => !v), []);

    const handlePlayPause = useCallback(() => {
        if (!player) return;
        paused ? player.play() : player.pause();
        setPaused(v => !v);
        setControlsVis(true);
        setFsControls(true);
    }, [player, paused]);

    const handleMute = useCallback(() => {
        if (!player) return;
        player.muted = !muted;
        setMuted(v => !v);
    }, [player, muted]);

    const handleReplay = useCallback(() => {
        if (!player) return;
        player.seekBy(-player.currentTime);
        player.play();
        setPaused(false);
        setControlsVis(true);
        setFsControls(true);
    }, [player]);

    const handleRewind = useCallback(() => {
        if (!player) return;
        player.seekBy(-10);
        setControlsVis(true);
        setFsControls(true);
    }, [player]);

    const handleForward = useCallback(() => {
        if (!player) return;
        player.seekBy(10);
        setControlsVis(true);
        setFsControls(true);
    }, [player]);

    // Inline seek (based on SCREEN_W)
    const handleSeek = useCallback((e) => {
        if (!player || totalTime === 0) return;
        const ratio = Math.min(Math.max(e.nativeEvent.locationX / SCREEN_W, 0), 1);
        player.seekBy(ratio * totalTime - player.currentTime);
    }, [player, totalTime]);

    // Fullscreen seek (based on FS_W — the landscape long axis)
    const handleFsSeek = useCallback((e) => {
        if (!player || totalTime === 0) return;
        const ratio = Math.min(Math.max(e.nativeEvent.locationX / FS_W, 0), 1);
        player.seekBy(ratio * totalTime - player.currentTime);
    }, [player, totalTime]);

    // ── Fullscreen open / close ───────────────────────────────────────────────
    const openFullscreen = useCallback(() => {
        slideAnim.setValue(SCREEN_W);
        setFullscreen(true);
        setFsControls(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 12,
        }).start();
    }, [slideAnim]);

    const closeFullscreen = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_W,
            duration: 230,
            useNativeDriver: true,
        }).start(() => setFullscreen(false));
    }, [slideAnim]);

    // Keep a ref so the PanResponder (created once) always calls the latest closer
    const closeFullscreenRef = useRef(closeFullscreen);
    useEffect(() => { closeFullscreenRef.current = closeFullscreen; }, [closeFullscreen]);

    // Swipe-right gesture to dismiss fullscreen (mirrors the slide-in animation)
    const fsPanResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dx > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.3,
            onPanResponderMove: (_, gs) => {
                if (gs.dx > 0) slideAnim.setValue(gs.dx);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dx > SCREEN_W * 0.28 || gs.vx > 0.45) {
                    closeFullscreenRef.current();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 70,
                        friction: 12,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
            },
        })
    ).current;

    // ── Inline controls overlay ───────────────────────────────────────────────
    const InlineControls = (
        <View style={styles.controls}>
            {/* Top row: mute + time */}
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.controlPill} onPress={handleMute} activeOpacity={0.82}>
                    <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={17} color={WHITE} />
                </TouchableOpacity>
                <View style={styles.timePill}>
                    <Text style={styles.timeText}>{formatTime(currentTime)} / {formatTime(totalTime)}</Text>
                </View>
            </View>

            {/* Center row: rewind · play/pause · forward */}
            <View style={styles.centerRow}>
                <TouchableOpacity onPress={handleRewind} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <View style={styles.skipBtn}>
                        <Ionicons name="play-back" size={19} color={WHITE} />
                        <Text style={styles.skipLabel}>10s</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause}>
                    <Ionicons name={paused ? 'play' : 'pause'} size={31} color={WHITE} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForward} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <View style={styles.skipBtn}>
                        <Ionicons name="play-forward" size={19} color={WHITE} />
                        <Text style={styles.skipLabel}>10s</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Bottom row: seek bar + fullscreen btn */}
            <View>
                <TouchableOpacity activeOpacity={1} onPress={handleSeek} style={styles.seekHit}>
                    <View style={styles.seekTrack}>
                        <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
                        <View style={[styles.scrubber, { left: `${progress * 100}%` }]} />
                    </View>
                </TouchableOpacity>
                <View style={styles.bottomRow}>
                    <TouchableOpacity style={styles.controlPill} onPress={handleReplay} activeOpacity={0.82}>
                        <Ionicons name="refresh" size={17} color={WHITE} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.expandPill} onPress={openFullscreen} activeOpacity={0.82}>
                        <Ionicons name="phone-landscape-outline" size={16} color={WHITE} />
                        <Text style={styles.expandText}>Wide</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // ── Fullscreen controls overlay (landscape layout) ────────────────────────
    const FullscreenControls = (
        <View style={styles.fsControls}>
            {/* Top row: close + time */}
            <View style={styles.fsTopRow}>
                <TouchableOpacity style={styles.normalPill} onPress={closeFullscreen} activeOpacity={0.86}>
                    <Ionicons name="phone-portrait-outline" size={16} color={WHITE} />
                    <Text style={styles.normalText}>Normal</Text>
                </TouchableOpacity>
                <View style={styles.timePill}>
                    <Text style={styles.timeText}>{formatTime(currentTime)} / {formatTime(totalTime)}</Text>
                </View>
                <TouchableOpacity style={styles.controlPill} onPress={handleMute} activeOpacity={0.82}>
                    <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={19} color={WHITE} />
                </TouchableOpacity>
            </View>

            {/* Center row: rewind · play/pause · forward */}
            <View style={styles.centerRow}>
                <TouchableOpacity onPress={handleRewind} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                    <View style={styles.skipBtn}>
                        <Ionicons name="play-back" size={23} color={WHITE} />
                        <Text style={styles.skipLabel}>10s</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.playBtnLg} onPress={handlePlayPause}>
                    <Ionicons name={paused ? 'play' : 'pause'} size={36} color={WHITE} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForward} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                    <View style={styles.skipBtn}>
                        <Ionicons name="play-forward" size={23} color={WHITE} />
                        <Text style={styles.skipLabel}>10s</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Bottom row: replay + seek bar */}
            <View style={styles.fsBottomRow}>
                <TouchableOpacity style={styles.controlPill} onPress={handleReplay} activeOpacity={0.82}>
                    <Ionicons name="refresh" size={17} color={WHITE} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} onPress={handleFsSeek} style={[styles.seekHit, { flex: 1, marginHorizontal: 10 }]}>
                    <View style={styles.seekTrack}>
                        <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
                        <View style={[styles.scrubber, { left: `${progress * 100}%` }]} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <>
            {/* ── Inline 16:9 video ────────────────────────────────────────── */}
            <TouchableWithoutFeedback onPress={handleTap}>
                <View style={styles.videoBox}>
                    {!isReady && thumbnail ? (
                        <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : null}

                    <VideoView
                        style={StyleSheet.absoluteFillObject}
                        player={player}
                        nativeControls={false}
                        contentFit="contain"
                    />

                    {(!isReady || isBuffering) && (
                        <View style={styles.videoLoadingOverlay}>
                            <View style={styles.videoLoadingCard}>
                                <ActivityIndicator size="small" color={WHITE} />
                                <Text style={styles.videoLoadingText}>
                                    {isBuffering ? 'Buffering video...' : 'Loading video...'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {controlsVis && isReady && InlineControls}

                    {paused && !controlsVis && (
                        <View style={styles.center} pointerEvents="none">
                            <Ionicons name="play-circle" size={64} color={hex2(WHITE, 0.8)} />
                        </View>
                    )}
                </View>
            </TouchableWithoutFeedback>

            {/* ── Fullscreen modal — slides in from right, rotates to landscape ─ */}
            <Modal
                visible={fullscreen}
                transparent
                statusBarTranslucent
                animationType="none"
                onRequestClose={closeFullscreen}
            >
                <View style={styles.fsOuter}>
                    <Animated.View style={[styles.fsSlide, { transform: [{ translateX: slideAnim }] }]} {...fsPanResponder.panHandlers}>
                        {/* Rotation wrapper: swap width↔height so the video fills landscape */}
                        <TouchableWithoutFeedback onPress={handleFsTap}>
                            <View style={styles.fsRotate}>
                                <VideoView
                                    style={{ width: FS_W, height: FS_H }}
                                    player={player}
                                    nativeControls={false}
                                    contentFit="contain"
                                />

                                {(!isReady || isBuffering) && (
                                    <View style={[StyleSheet.absoluteFillObject, styles.center]}>
                                        <View style={styles.videoLoadingCard}>
                                            <ActivityIndicator size="small" color={WHITE} />
                                            <Text style={styles.videoLoadingText}>
                                                {isBuffering ? 'Buffering video...' : 'Loading video...'}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {fsControls && FullscreenControls}

                                {paused && !fsControls && (
                                    <View style={[StyleSheet.absoluteFillObject, styles.center]} pointerEvents="none">
                                        <Ionicons name="play-circle" size={80} color={hex2(WHITE, 0.8)} />
                                    </View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
});

// ─── Related video thumbnail card ─────────────────────────────────────────────
const RelatedCard = memo(({ item, onPress }) => {
    const media     = item?.media?.[0];
    const thumbnail = media?.thumbnail;
    const duration  = item?.video_duration ?? null;
    const title     = item?.text ?? item?.payload?.title ?? '';
    const name      = item?.user?.full_name ?? item?.user?.name ?? '';

    return (
        <TouchableOpacity style={styles.relCard} onPress={() => onPress(item)} activeOpacity={0.8}>
            <View style={styles.relThumb}>
                {thumbnail ? (
                    <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, styles.center, { backgroundColor: BLACK }]}>
                        <Ionicons name="videocam" size={24} color={hex2(WHITE, 0.5)} />
                    </View>
                )}
                <View style={styles.relPlay}>
                    <Ionicons name="play" size={14} color={WHITE} />
                </View>
                {!!duration && (
                    <View style={styles.relDur}>
                        <Text style={styles.relDurText}>{formatTime(duration)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.relInfo}>
                {!!title && <Text style={styles.relTitle} numberOfLines={2}>{title}</Text>}
                {!!name  && <Text style={styles.relName}  numberOfLines={1}>{name}</Text>}
            </View>
        </TouchableOpacity>
    );
});

// ─── VideoPlayerScreen ────────────────────────────────────────────────────────
const VideoPlayerScreen = () => {
    const navigation   = useNavigation();
    const route        = useRoute();
    const { user, token } = useAuth();

    const [feed,             setFeed]             = useState(route.params?.feed ?? null);
    const [comments,         setComments]         = useState([]);
    const [commentsLoading,  setCommentsLoading]  = useState(true);
    const [commentCount,     setCommentCount]     = useState(feed?.comments_count ?? 0);
    const [replyingTo,       setReplyingTo]       = useState(null);
    const [related,          setRelated]          = useState([]);
    const [shareVisible,     setShareVisible]     = useState(false);
    const [repostVisible,    setRepostVisible]    = useState(false);
    const [captionExpanded,  setCaptionExpanded]  = useState(false);

    const addCommentRef = useRef(null);
    const flatListRef   = useRef(null);

    // Keep feed in sync if route params change (navigation.replace)
    useEffect(() => {
        if (route.params?.feed) setFeed(route.params.feed);
    }, [route.params?.feed]);

    const mediaItem = feed?.media?.[0];
    const videoUrl  = mediaItem?.video_url ?? null;
    const thumbnail = mediaItem?.thumbnail ?? null;
    const postUser  = feed?.user ?? {};
    const postText  = feed?.text ?? feed?.payload?.text ?? '';
    const timeAgo   = feed?.created ? moment(feed.created).fromNow() : '';

    // ── Navigate to owner — mirrors feedcard's getOwnerRoute exactly ──────────
    const openOwner = useCallback(() => {
        const entity = String(postUser?.entity ?? 'user').toLowerCase();
        const id     = Number(postUser?.id ?? 0);
        if (!id) return;
        if (entity === 'page') {
            navigation.navigate('BusinessDetails', { pageId: id });
        } else if (entity === 'group') {
            navigation.navigate('GroupDetails', { groupId: id });
        } else {
            navigation.navigate('UserProfile', { userId: id, username: postUser?.username ?? '' });
        }
    }, [navigation, postUser]);

    // ── Fetch comments ─────────────────────────────────────────────────────────
    const loadComments = useCallback(async () => {
        if (!feed?.id) return;
        setCommentsLoading(true);
        try {
            const res = await GetCommentsController(feed.id, token, 1, 30);
            if (res?.status === 200) {
                const list = res.data?.comments ?? res.data?.data ?? res.data ?? [];
                setComments(Array.isArray(list) ? list : []);
                if (typeof res.data?.total_comments === 'number') setCommentCount(res.data.total_comments);
            }
        } catch {}
        setCommentsLoading(false);
    }, [feed?.id, token]);

    // ── Fetch related videos from the global discover feed ────────────────────
    const loadRelated = useCallback(async () => {
        if (!feed?.id) return;
        try {
            const res = await apiClient.get('/feed/list.php', {
                params: { get: 'discover', page: 1, limit: 40 },
            });
            const json = res.data;
            let list;
            if (Array.isArray(json?.data?.data)) {
                list = json.data.data;
            } else if (Array.isArray(json?.data)) {
                list = json.data;
            } else {
                list = [];
            }
            const videos = list.filter(
                f => f?.type === 'video' && !!f?.media?.[0]?.video_url && f?.id !== feed?.id
            );
            setRelated(videos.slice(0, 12));
        } catch {}
    }, [feed?.id]);

    useEffect(() => {
        loadComments();
        loadRelated();
    }, [loadComments, loadRelated]);

    const handleCommentPosted = useCallback(() => {
        setCommentCount(c => c + 1);
        loadComments();
    }, [loadComments]);

    const handleReply = useCallback((commentId, username) => {
        setReplyingTo({ commentId, username });
        addCommentRef.current?.focus();
    }, []);

    const handleRelatedPress = useCallback((item) => {
        navigation.replace('VideoPlayer', { feed: item });
    }, [navigation]);

    const handleHashtagPress = useCallback((tag) => {
        const cleanTag = String(tag ?? '').replace(/^#/, '').trim();
        if (!cleanTag) return;
        navigation.navigate('SearchScreen', { initialQuery: cleanTag, initialTab: 'posts' });
    }, [navigation]);

    if (!videoUrl) return null;

    // ── List header: video + author + engagement bar + comments divider ─────────
    const ListHeader = (
        <View>
            <View style={styles.playerShell}>
                <VideoPlayer videoUrl={videoUrl} thumbnail={thumbnail} />
            </View>

            <View style={styles.detailCard}>
                <View style={styles.detailTopRow}>
                    <TouchableOpacity style={styles.authorRow} onPress={openOwner} activeOpacity={0.75}>
                        {postUser?.avatar ? (
                            <Image source={{ uri: postUser.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Ionicons name="person" size={18} color={ACCENT} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.authorName} numberOfLines={1}>
                                {postUser?.full_name ?? postUser?.name ?? postUser?.username ?? 'Unknown'}
                            </Text>
                            {!!timeAgo && <Text style={styles.timeAgo}>{timeAgo}</Text>}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.videoBadge}>
                        <Ionicons name="videocam-outline" size={13} color={ACCENT} />
                        <Text style={styles.videoBadgeText}>Video</Text>
                    </View>
                </View>

                {!!postText && (
                    <View style={styles.captionWrap}>
                        <FormattedCaption
                            text={postText}
                            expanded={captionExpanded}
                            onHashtagPress={handleHashtagPress}
                        />
                        {String(postText).length > 90 && (
                            <TouchableOpacity
                                style={styles.showMoreBtn}
                                activeOpacity={0.8}
                                onPress={() => setCaptionExpanded(v => !v)}
                            >
                                <Text style={styles.showMoreText}>
                                    {captionExpanded ? 'Show less' : 'Show more'}
                                </Text>
                                <Ionicons
                                    name={captionExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={13}
                                    color={ACCENT}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.engagementWrap}>
                    <EngagementBar
                        feedId={feed?.id}
                        initialLiked={!!(feed?.is_liked || feed?.my_reaction || feed?.user_reaction)}
                        initialLikeCount={totalLikes(feed?.reactions, feed?.likes_count)}
                        commentsCount={commentCount}
                        isSaved={!!feed?.is_saved}
                        myReaction={feed?.my_reaction ?? null}
                        viewsCount={feed?.views ?? feed?.views_count ?? 0}
                        onCommentPress={() => addCommentRef.current?.focus()}
                        onOpenShare={() => setShareVisible(true)}
                        onRepost={() => setRepostVisible(true)}
                        onReactionsPress={() => {}}
                    />
                </View>
            </View>

            <View style={styles.commentsHeader}>
                <View>
                    <Text style={styles.commentsTitle}>Comments</Text>
                    <Text style={styles.commentsSub}>
                        {commentCount > 0 ? `${commentCount} people joined the conversation` : 'Be the first to comment'}
                    </Text>
                </View>
                {commentsLoading && (
                    <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />
                )}
            </View>
        </View>
    );

    // ── List footer: related videos ────────────────────────────────────────────
    const ListFooter = related.length > 0 ? (
        <View style={styles.relSection}>
            <Text style={styles.relHeading}>More videos</Text>
            {related.map(item => (
                <RelatedCard key={String(item.id)} item={item} onPress={handleRelatedPress} />
            ))}
        </View>
    ) : null;

    const ListEmpty = !commentsLoading ? (
        <View style={styles.emptyComments}>
            <Ionicons name="chatbubble-outline" size={28} color={Colors.neutral300} />
            <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
        </View>
    ) : null;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor={BG} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.82}>
                    <Ionicons name="chevron-back" size={26} color={BRAND} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Now Playing</Text>
                    <Text style={styles.headerSub}>Hafrik video</Text>
                </View>
                <TouchableOpacity onPress={() => setShareVisible(true)} style={styles.backBtn} activeOpacity={0.82}>
                    <Ionicons name="paper-plane-outline" size={20} color={BRAND} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={(c, index) => `${c?.id ?? 'comment'}-${index}`}
                    renderItem={({ item }) => (
                        <CommentItem
                            comment={item}
                            token={token}
                            onReply={handleReply}
                        />
                    )}
                    ListHeaderComponent={ListHeader}
                    ListFooterComponent={ListFooter}
                    ListEmptyComponent={ListEmpty}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                />

                {/* Comment input — pinned above keyboard */}
                <AddComment
                    ref={addCommentRef}
                    user={user}
                    feedId={feed?.id}
                    token={token}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    onPosted={handleCommentPosted}
                />
            </KeyboardAvoidingView>

            {/* Share modal */}
            <ShareModal
                visible={shareVisible}
                onClose={() => setShareVisible(false)}
                feed={feed}
            />

            {/* Repost modal */}
            <RepostModal
                visible={repostVisible}
                postId={feed?.id}
                onClose={() => setRepostVisible(false)}
            />
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        backgroundColor: CARD,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER,
    },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '900', color: BRAND, letterSpacing: -0.2 },
    headerSub: { fontSize: 11, fontWeight: '700', color: MUTED, marginTop: 1 },
    listContent: { paddingBottom: 16 },

    // ── Inline video ──
    playerShell: {
        backgroundColor: BLACK,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 8,
    },
    videoBox: { width: SCREEN_W, height: VIDEO_H, backgroundColor: BLACK },
    center:   { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    videoLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: hex2(BLACK, 0.18),
    },
    videoLoadingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: hex2(BLACK, 0.62),
        borderWidth: 1,
        borderColor: hex2(WHITE, 0.16),
    },
    videoLoadingText: {
        color: WHITE,
        fontSize: 12,
        fontWeight: '900',
    },

    controls: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: hex2(BLACK, 0.32),
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    controlPill: {
        minWidth: 38,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hex2(BLACK, 0.42),
        borderWidth: 1,
        borderColor: hex2(WHITE, 0.18),
    },
    timePill: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: hex2(BLACK, 0.42),
        borderWidth: 1,
        borderColor: hex2(WHITE, 0.16),
    },
    timeText: { color: WHITE, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
    centerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 },
    playBtn:   {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: hex2(BLACK, 0.36),
        borderWidth: 1.5, borderColor: hex2(WHITE, 0.7),
        justifyContent: 'center', alignItems: 'center',
    },
    playBtnLg: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: hex2(WHITE, 0.2),
        borderWidth: 2, borderColor: hex2(WHITE, 0.6),
        justifyContent: 'center', alignItems: 'center',
    },
    skipBtn: {
        width: 54,
        height: 48,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        backgroundColor: hex2(BLACK, 0.34),
        borderWidth: 1,
        borderColor: hex2(WHITE, 0.14),
    },
    skipLabel: { color: WHITE, fontSize: 9, fontWeight: '900', letterSpacing: 0.2 },
    seekHit:   { paddingVertical: 8 },
    seekTrack: { height: 4, backgroundColor: hex2(WHITE, 0.35), borderRadius: 999, position: 'relative' },
    seekFill:  { height: '100%', backgroundColor: ACCENT, borderRadius: 2 },
    scrubber: {
        position: 'absolute', top: -5, width: 14, height: 14,
        borderRadius: 7, backgroundColor: WHITE, marginLeft: -7,
        borderWidth: 2,
        borderColor: ACCENT,
    },
    bottomRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 6,
    },
    expandPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 17,
        backgroundColor: hex2(BLACK, 0.42),
        borderWidth: 1,
        borderColor: hex2(WHITE, 0.18),
    },
    expandText: {
        color: WHITE,
        fontSize: 11,
        fontWeight: '900',
    },

    // ── Fullscreen modal ──
    fsOuter: {
        flex: 1,
        backgroundColor: BLACK,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fsSlide: {
        width: SCREEN_W,
        height: SCREEN_H,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BLACK,
    },
    // Rotated container: swap width ↔ height so the landscape video fills the screen
    fsRotate: {
        width: FS_W,
        height: FS_H,
        transform: [{ rotate: '90deg' }],
        overflow: 'hidden',
        position: 'relative',
    },

    // Fullscreen controls (overlaid on the rotated view, so coords are in landscape)
    fsControls: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: hex2(BLACK, 0.42),
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    fsTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    normalPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        height: 38,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: hex2(ACCENT, 0.9),
        borderWidth: 1,
        borderColor: hex2(WHITE, 0.25),
    },
    normalText: {
        color: WHITE,
        fontSize: 12,
        fontWeight: '900',
    },
    fsBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    detailCard: {
        margin: 12,
        padding: 14,
        borderRadius: 26,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
    },
    detailTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    // ── Author row ──
    authorRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar:         { width: 42, height: 42, borderRadius: 21 },
    avatarFallback: { backgroundColor: hex2(ACCENT, 0.12), justifyContent: 'center', alignItems: 'center' },
    authorName:     { fontSize: 14.5, fontWeight: '900', color: BRAND },
    timeAgo:        { fontSize: 12, color: MUTED, marginTop: 1, fontWeight: '700' },
    videoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: hex2(ACCENT, 0.1),
    },
    videoBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: ACCENT,
    },

    // ── Post text ──
    captionWrap: {
        marginTop: 13,
    },
    postText: {
        fontSize: 15,
        color: Colors.neutral800,
        lineHeight: 23,
        fontWeight: '600',
        letterSpacing: -0.05,
    },
    inlineHashtag: {
        color: ACCENT,
        fontWeight: '900',
    },
    showMoreBtn: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 7,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: hex2(ACCENT, 0.1),
    },
    showMoreText: {
        color: ACCENT,
        fontSize: 12,
        fontWeight: '900',
    },

    // ── Engagement ──
    engagementWrap: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: BORDER,
    },

    // ── Comments divider ──
    commentsHeader: {
        marginHorizontal: 12,
        marginTop: 2,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderRadius: 22,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    commentsTitle: { fontSize: 15, fontWeight: '900', color: BRAND },
    commentsSub: { fontSize: 11.5, fontWeight: '700', color: MUTED, marginTop: 2 },

    // ── Empty comments ──
    emptyComments: {
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 12,
        paddingVertical: 34,
        paddingHorizontal: 16,
        borderRadius: 24,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
    },
    emptyText: { fontSize: 13, color: Colors.neutral400, fontWeight: '700' },

    // ── Related videos ──
    relSection: {
        marginHorizontal: 12,
        padding: 12,
        borderRadius: 24,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        marginTop: 12,
    },
    relHeading: { fontSize: 16, fontWeight: '900', color: BRAND, paddingHorizontal: 4, paddingBottom: 10 },
    relCard: {
        flexDirection: 'row', gap: 10,
        paddingVertical: 9,
    },
    relThumb: { width: 132, height: 78, borderRadius: 16, backgroundColor: BLACK, overflow: 'hidden' },
    relPlay:  {
        position: 'absolute', top: 6, left: 6,
        backgroundColor: hex2(BLACK, 0.5), borderRadius: 12, padding: 4,
    },
    relDur:     { position: 'absolute', bottom: 5, right: 6, backgroundColor: hex2(BLACK, 0.6), borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    relDurText: { fontSize: 10, color: WHITE, fontWeight: '600' },
    relInfo:    { flex: 1, justifyContent: 'center', gap: 4 },
    relTitle:   { fontSize: 13.5, fontWeight: '900', color: BRAND, lineHeight: 19 },
    relName:    { fontSize: 12, color: MUTED, fontWeight: '700' },
});

export default VideoPlayerScreen;

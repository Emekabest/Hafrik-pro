import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    TouchableOpacity, 
    Image, 
    Dimensions,
    ActivityIndicator,
    ScrollView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAuth } from "../../../AuthContext";
import AppDetails from "../../../helpers/appdetails";
// comments controllers removed - this screen now shows only the post
import getUserPostInteractionController from '../../../controllers/getuserpostinteractioncontroller';
import ToggleFeedController from "../../../controllers/tooglefeedcontroller";
import CalculateElapsedTime from "../../../helpers/calculateelapsedtime";
// no caching for comment video as requested
import SvgIcon from '../../../assl.js/svg/svg';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;

const CommentVideoItem = ({ videoUrl, thumbnail }) => {
    const isFocused = useIsFocused();
    const [hasError, setHasError] = useState(false);

    // No caching as requested; use URL directly
    const source = videoUrl || null;

    // Create the player (hooks must be called unconditionally)
    const player = useVideoPlayer(source, (p) => {
        if (p && source) {
            try { p.loop = true; } catch (e) { /* ignore */ }
            if (isFocused) {
                try { p.play(); } catch (e) { /* ignore */ }
            }
        }
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status } = useEvent(player, 'statusChange', { status: player?.status ?? {} });

    useEffect(() => {
        return () => {
            try { player?.release(); } catch (e) { /* ignore */ }
        };
    }, [player]);

    if (hasError) {
        return (
            <View style={{ height: MEDIA_HEIGHT, width: MEDIA_WIDTH, borderRadius: 10, overflow: 'hidden', marginTop: 10, backgroundColor: '#202020', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={30} color="#fff" />
                <Text style={{color: '#fff', fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                <TouchableOpacity onPress={() => setHasError(false)} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 20}}>
                    <Text style={{color: '#fff', fontSize: 12}}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isBuffering = status?.isBuffering;
    const isFinished = status?.didJustFinish;

    return (
        <View style={{ height: MEDIA_HEIGHT, width: MEDIA_WIDTH, borderRadius: 10, overflow: 'hidden', marginTop: 10, backgroundColor: '#000' }}>
            {player ? (
                <VideoView
                    style={{ width: '100%', height: '100%' }}
                    player={player}
                    nativeControls={true}
                    contentFit="contain"
                    posterSource={{ uri: thumbnail }}
                    usePoster={false}
                    onError={(e) => { console.log('VideoView error', e); setHasError(true); }}
                />
            ) : (
                <Image source={{ uri: thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            )}

            {(isBuffering && !isPlaying) && (
                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2}]} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {(!isPlaying && !isBuffering) && (
                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 1}]}>
                    <TouchableOpacity 
                        onPress={() => {
                            try {
                                if (!player) return;
                                if (isFinished) player.replay(); else player.play();
                            } catch (e) { console.log('player control error', e); }
                        }}
                        style={{backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, padding: 10}}
                    >
                        <Ionicons name="play" size={30} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const PollContent = ({ post }) => {
    let options = [];

    if (post.payload && Array.isArray(post.payload.options)) {
        options = post.payload.options;
    } else {
        const pollMedia = (post.media && Array.isArray(post.media) && post.media.length > 0) ? post.media[0] : null;
        options = (pollMedia && Array.isArray(pollMedia.options) && pollMedia.options.length > 0) 
            ? pollMedia.options 
            : (Array.isArray(post.options) ? post.options : []);
    }

    const [votedId, setVotedId] = useState(post.user_voted_id || null);
    
    if (!options || options.length === 0) return null;

    const totalVotes = options.reduce((acc, opt) => acc + (opt.votes || 0), 0) + (votedId && !post.user_voted_id ? 1 : 0);

    const handleVote = (id) => {
        if (votedId) return;
        setVotedId(id);
    };

    return (
        <View style={{ marginTop: 5, paddingRight: 5, width: '100%' }}>
            {options.map((option, index) => {
                const isSelected = votedId === option.id;
                const votes = (option.votes || 0) + (isSelected && !post.user_voted_id ? 1 : 0);
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const primaryColor = AppDetails.primaryColor || '#000000';

                return (
                    <View key={option.id || index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity 
                            onPress={() => handleVote(option.id)}
                            disabled={!!votedId}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                height: 45,
                                justifyContent: 'center',
                                borderRadius: 50,
                                borderWidth: 1,
                                borderColor: isSelected ? primaryColor : '#e0e0e0',
                                backgroundColor: '#fff',
                                overflow: 'hidden'
                            }}
                        >
                            {votedId && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    width: `${percentage}%`,
                                    backgroundColor: isSelected ? (primaryColor + '33') : '#f5f5f5', 
                                }} />
                            )}
                            
                            <View style={{ paddingHorizontal: 12 }}>
                                <Text style={{ fontWeight: isSelected ? '600' : '400', color: '#333', fontSize: 14 }}>{option.text}</Text>
                            </View>
                        </TouchableOpacity>
                        {votedId && (
                            <View style={{ 
                                width: 30, 
                                height: 30, 
                                borderRadius: 15, 
                                backgroundColor: '#f0f0f0', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                marginLeft: 8 
                            }}>
                                <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>{votes}</Text>
                            </View>
                        )}
                    </View>
                )
            })}
            <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 2 }}>
                <Text style={{ color: '#787878ff', fontSize: 12 }}>{totalVotes} votes</Text>
                <Text style={{ color: '#787878ff', fontSize: 12 }}> • {post.expires_at ? 'Ends soon' : 'Final results'}</Text>
            </View>
        </View>
    );
};

const ArticleContent = ({ post }) => {
    let payload = post.payload;

    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload);
        } catch (e) {
            console.warn("Failed to parse article payload", e);
            payload = {};
        }
    }
    
    if (!payload) return null;

    const { title, cover, text } = payload;
    
    // Basic HTML stripping and entity replacement for display
    const cleanText = text ? text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim() : '';

    return (
        <View style={{ marginTop: 10, width: '100%', paddingBottom: 10 }}>
             {cover ? (
                <Image 
                    source={{ uri: cover }} 
                    style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 15, backgroundColor: '#f0f0f0' }} 
                    resizeMode="cover" 
                />
            ) : null}
            
            {title ? (
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 10, lineHeight: 28 }}>
                    {title}
                </Text>
            ) : null}
            
            {cleanText ? (
                <Text style={{ fontSize: 16, color: '#333', lineHeight: 24 }}>
                    {cleanText}
                </Text>
            ) : (
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                     <Text style={{ fontSize: 14, color: '#787878', fontWeight: '500' }}>Read full article</Text>
                     <Ionicons name="arrow-forward" size={14} color="#787878" style={{marginLeft: 4}} />
                </View>
            )}
        </View>
    );
};


/**Shared Post Main Item............................................................................. */
const SharedPostItem = ({ post }) => {
    const isVideo = post.type === 'video' || post.type === 'reel';
    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;

    return (
        <View style={styles.sharedPostContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={{ uri: post.user.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>{post.user.full_name}</Text>
                    <Text style={{ color: '#787878ff' }}>{CalculateElapsedTime(post.created)}</Text>
                </View>
            </View>
            {post.text ? <Text style={{ marginTop: 10, fontFamily: "WorkSans_400Regular" }}>{post.text}</Text> : null}
            
            {post.type === 'poll' ? (
                <PollContent post={post} />
            ) : mediaItem && (
                <View style={{ width: '100%', marginTop: 10 }}>
                    {isVideo ? (
                        <CommentVideoItem videoUrl={mediaItem.video_url} thumbnail={mediaItem.thumbnail} />
                    ) : (
                        <Image 
                            source={{ uri: mediaItem.url || mediaItem.thumbnail }} 
                            style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT, borderRadius: 10 }} 
                            resizeMode="cover" 
                        />
                    )}
                </View>
            )}
        </View>
    );
};

const OriginalPost = ({ post, liked, likeCount, onLike, onReply, textInputRef }) => {
    if (!post) return null;

    return (
        <View style={[styles.postContainer, { flexDirection: 'column' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                <TouchableOpacity>
                    <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                </TouchableOpacity>

                <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity>
                            <Text style={styles.username}>{post.user.full_name}</Text>
                        </TouchableOpacity>
                    
                        {post.user.verified && 

                            <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />

                        }
                        <Text style={[styles.timeText, { marginLeft: 5, marginRight: 0 }]}>• {CalculateElapsedTime(post.created)}</Text>
                        <View style={styles.spacer} />

                    </View>
                </View>
            </View>
            
            <Text style={[styles.postText, { marginTop: 12 }]}>{post.text}</Text>
            {post.type === 'shared' && post.shared_post ? (
                <SharedPostItem post={post.shared_post} />
            ) : post.type === 'article' ? (
                <ArticleContent post={post} />
            ) : (
                (() => {
                    const isVideo = post.type === 'video' || post.type === 'reel';
                    if (isVideo) {
                        const mediaItem = post.media && post.media[0];
                        return mediaItem ? <CommentVideoItem videoUrl={mediaItem.video_url} thumbnail={mediaItem.thumbnail} /> : null;
                    }
                    if (post.media && post.media.length > 1) {
                        return (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                {post.media.map((item, index) => (
                                    <Image
                                        key={index}
                                        source={{ uri: item.url }}
                                        style={{ height: MEDIA_HEIGHT, width: MEDIA_WIDTH, borderRadius: 10, marginRight: 10 }}
                                        resizeMode="cover"
                                    />
                                ))}
                            </ScrollView>
                        );
                    }
                    return (
                        post.media && post.media.length > 0 &&
                        <Image
                            source={{ uri: post.media[0].url }}
                            style={{ height: MEDIA_HEIGHT, width: MEDIA_WIDTH, borderRadius: 10, marginTop: 10 }}
                            resizeMode="cover"
                        />
                    );
                })()
            )}

            <View style={styles.engagementBar}>
                <TouchableOpacity style={styles.engagementItem} onPress={onLike}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={23} style={{color: liked ? "#ff4444" : "#333", fontWeight:"bold"}} />
                    <Text style={styles.engagementText}>{likeCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem} onPress={() => textInputRef?.current?.focus()}>
                    <SvgIcon name="comment" width={20} height={20} color="#333" />
                    <Text style={styles.engagementText}>{post.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem}>
                    <SvgIcon name="share" width={20} height={20} color="#333" />
                    <Text style={styles.engagementText}>29</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem}>
                    <SvgIcon name="favourite" width={20} height={20} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const OriginalPostMemo = React.memo(OriginalPost);



const CommentScreen = ({ route }) => {
    const navigation = useNavigation();
    const { user, token } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { feedId } = route.params;

    const [localLiked, setLocalLiked] = useState(null);
    const [localLikeCount, setLocalLikeCount] = useState(null);

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const response = await getUserPostInteractionController(feedId, token);
                if (response.status === 200) {
                    setPost(response.data);
                    try {
                        setLocalLiked(!!response.data.liked);
                        setLocalLikeCount(parseInt(response.data.likes_count) || 0);
                    } catch (e) {}
                } else {
                    console.log('Something went wrong fetching post');
                }
            } catch (e) {
                console.log('Error fetching post', e);
            }
            setLoading(false);
        };
        getData();
    }, [feedId, token]);

    const liked = useMemo(() => (localLiked !== null ? localLiked : !!post?.liked), [localLiked, post?.liked]);
    const likeCount = useMemo(() => (localLikeCount !== null ? localLikeCount : (parseInt(post?.likes_count) || 0)), [localLikeCount, post?.likes_count]);

    const handleLikeCb = useCallback(async () => {
        const prev = localLiked !== null ? localLiked : !!post?.liked;
        const next = !prev;
        setLocalLiked(next);
        setLocalLikeCount(c => (c !== null ? (next ? c + 1 : Math.max(0, c - 1)) : (next ? (parseInt(post?.likes_count) || 0) + 1 : Math.max(0, (parseInt(post?.likes_count) || 0) - 1))));
        try {
            await ToggleFeedController(feedId, token);
        } catch (e) {
            setLocalLiked(l => !l);
            setLocalLikeCount(c => (c !== null ? (prev ? Math.max(0, c - 1) : c + 1) : (prev ? Math.max(0, (parseInt(post?.likes_count) || 0) - 1) : (parseInt(post?.likes_count) || 0) + 1)));
        }
    }, [feedId, token, localLiked, post?.likes_count]);

    const headerElement = useMemo(() => (
        <OriginalPostMemo post={post} liked={liked} likeCount={likeCount} onLike={handleLikeCb} onReply={() => {}} />
    ), [post, liked, likeCount, handleLikeCb]);


    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hafrik</Text>
            <View style={{ width: 24 }} />
        </View>
    );

    return (
        <View style={styles.container}>
            {renderHeader()}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={AppDetails.primaryColor} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent}>
                    {headerElement}




                </ScrollView>
            )}
        </View>
    );
};








const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 50, borderBottomWidth: 0.5, borderBottomColor: '#efefef', backgroundColor: '#fff' },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#000' },
    listContent: { paddingBottom: 20 },
    postContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 15, paddingBottom: 5 },
    commentContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 12 },
    avatarColumn: { alignItems: 'center', marginRight: 12, width: 40 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
    threadLine: { width: 2, flex: 1, backgroundColor: '#e0e0e0', marginTop: 8, marginBottom: -15, borderRadius: 1 },
    contentColumn: { flex: 1, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    username: { fontFamily:"ReadexPro_500Medium", marginRight: 3, fontWeight: '600',Size: 15, color: '#000' },
    spacer: { flex: 1 },
    timeText: { color: '#999', fontSize: 13, marginRight: 10, fontFamily:"WorkSans_400Regular" },
    moreButton: { padding: 2 },
    postText: { fontSize: 15, color: '#000', lineHeight: 21, marginBottom: 10 },
    commentText: { fontSize: 15, color: '#000', lineHeight: 20, marginBottom: 8 },
    interactionRow: { flexDirection: 'row', marginTop: 4, alignItems: 'center' },
    iconButton: { marginRight: 22 },
    inputWrapper: { borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
    inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'flex-start' },
    inputAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, marginTop: 2 },
    inputFieldContainer: { flex: 1, marginRight: 10, justifyContent: 'center' },
    replyingTo: { fontSize: 11, color: '#999', marginBottom: 4 },
    textInput: { fontSize: 15, color: '#000', maxHeight: 100, paddingTop: 0, paddingBottom: 0 },
    postButton: { color: AppDetails.primaryColor || '#0095f6', fontWeight: '600', fontSize: 15, marginTop: 10 },
    disabledPostButton: { opacity: 0.4 },
    engagementBar: {
        flexDirection: 'row',
        justifyContent: "space-evenly",
        marginTop: 15,
        // marginRight:50,
        width: '90%',
    },
    engagementItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    engagementText: {
        marginLeft: 5,
        fontSize: 13,
        color: '#333',
    },
    sharedPostContainer: {
        borderWidth: 1, 
        borderColor: '#e0e0e0', 
        borderRadius: 10, 
        marginTop: 10, 
        padding: 10,
        overflow: 'hidden' 
    },
})

export default CommentScreen;

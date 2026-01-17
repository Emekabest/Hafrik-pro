import React, { memo, useState, useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback, Dimensions, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CalculateElapsedTime from '../../../../helpers/calculateelapsedtime';
import { SkeletonLoader } from './photocontent.jsx';


const aspectRatioCache = new Map();
const MEDIA_HEIGHT = 470;
const MEDIA_WIDTH = 240;

const SharedPostCard = ({ post, currentPlayingId, setCurrentPlayingId, parentFeedId, isMuted, setIsMuted, isFocused }) => {
    const navigation = useNavigation();
    const isVideo = post.type === 'video' || post.type === 'reel';
    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;

    const mediaUrl = mediaItem ? (isVideo ? mediaItem.thumbnail : mediaItem.url) : null;
    const [aspectRatio, setAspectRatio] = useState(() => {
        if (mediaUrl && aspectRatioCache.has(mediaUrl)) {
            return aspectRatioCache.get(mediaUrl);
        }
        if (mediaItem && mediaItem.width && mediaItem.height) {
            const ratio = mediaItem.width / mediaItem.height;
            if (mediaUrl) aspectRatioCache.set(mediaUrl, ratio);
            return ratio;
        }
        return 16 / 9; // Default aspect ratio
    });

    // useEffect(() => {
    //     if (mediaUrl && !aspectRatioCache.has(mediaUrl)) {
    //         Image.getSize(mediaUrl, (width, height) => {
    //             if (height > 0) {
    //                 const ratio = width / height;
    //                 aspectRatioCache.set(mediaUrl, ratio);
    //                 setAspectRatio(ratio);
    //             }
    //         }, (error) => console.log(error));
    //     }
    // }, [mediaUrl]);
    
    // Video specific state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [showSharedPoster, setShowSharedPoster] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [source, setSource] = useState(null);
    const [shouldPlay, setShouldPlay] = useState(false);
    const [isDownloadingShared, setIsDownloadingShared] = useState(false);
    const [retryKeyShared, setRetryKeyShared] = useState(0);
    const bufferTimeoutSharedRef = useRef(null);

    const uniqueId = `${parentFeedId}_shared`;

    useEffect(() => {
        let timer;
        if (currentPlayingId === uniqueId && isFocused) {
            timer = setTimeout(() => {
                setShouldPlay(true);
            }, 600);
        } else {
            setShouldPlay(false);
        }
        return () => clearTimeout(timer);
    }, [currentPlayingId, uniqueId, isFocused]);

    useEffect(() => {
        return () => {
            if (bufferTimeoutSharedRef.current) {
                clearTimeout(bufferTimeoutSharedRef.current);
                bufferTimeoutSharedRef.current = null;
            }
        };
    }, []);


    
    useEffect(() => {
        // Use direct source for shared post videos
        setSource(null);
        if (isVideo && mediaItem && mediaItem.video_url) {
            setSource(mediaItem.video_url);
            setIsDownloadingShared(false);
        }
    }, [isVideo, mediaItem]);



    // Create player for shared post video (hooks called unconditionally)
    const hookSharedPlayer = useVideoPlayer(source || null, (p) => {
        if (p && source) {
            try { p.loop = true; } catch (e) {}
        }
    });

    // const preloadedShared = getPlayer(source) || getPlayer(mediaItem?.video_url);
    const sharedPlayer = hookSharedPlayer;

    useEffect(() => {
        if (sharedPlayer) {
            try { sharedPlayer.muted = isMuted; } catch (e) {}
        }
    }, [sharedPlayer, isMuted]);


    const { isPlaying: sharedPlaying } = useEvent(sharedPlayer, 'playingChange', { isPlaying: sharedPlayer?.playing ?? false });


    useEffect(() => {
        if (!sharedPlayer) return;
        try {
            if (shouldPlay) sharedPlayer.play(); else sharedPlayer.pause();
        } catch (e) {}
    }, [shouldPlay, sharedPlayer]);



    useEffect(() => {
        if (sharedPlaying) setShowSharedPoster(false);
    }, [sharedPlaying]);


    const handlePress = () => {
        navigation.navigate('CommentScreen', {feedId: post.id});
    };

    const screenWidth = Dimensions.get("window").width;
    // containerRight padding (5*2) + shared post border (1*2) + shared post padding (10*2)
    const mediaWidth = screenWidth * 0.87 - 10 - 2 - 20;

    const [isExpanded, setIsExpanded] = useState(false);
    const hasMedia = (post.media && post.media.length > 0) || ['video', 'reel', 'poll', 'article'].includes(post.type);
    const isLongPostText = post.text && post.text.length > 50;
    const shouldTruncate = isLongPostText && !isExpanded;

















    return (
        <View style={styles.sharedPostContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ExpoImage 
                source={{ uri: post.user.avatar }}
                style={{ width: 30, height: 30, borderRadius: 15 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                />
                <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontFamily:"WorkSans_600SemiBold" }}>{post.user.full_name}</Text>
                    <Text style={{ marginLeft: 5, fontSize: 12, color: 'lightgray' }}>@{post.user.username}</Text>
                    <Text style={{ color: '#787878ff', fontFamily:"WorkSans_400Regular" }}>{CalculateElapsedTime(post.created)}</Text>
                </View>
            </View>
            {post.text ? (
                <Text style={{ marginTop: 10, fontFamily: "WorkSans_400Regular" }}>
                    {isLongPostText && !isExpanded ? `${post.text.substring(0, 50)}...` : post.text}
                    {isLongPostText && (
                        <Text onPress={() => setIsExpanded(prev => !prev)} style={{ color: '#787878', fontWeight: '600' }}>
                            {isExpanded ? ' See less' : ' See more'}
                        </Text>
                    )}
                </Text>
            ) : null}
            {post.type === 'poll' ? (
                // Lightweight inline poll rendering to avoid circular imports
                <View style={{ marginTop: 5, paddingRight: 5, width: '100%' }}>
                    <Text style={{ color: '#787878ff', fontSize: 12 }}>Poll</Text>
                </View>
            ) : post.type === 'article' && post.payload ? (
                <TouchableOpacity onPress={() => navigation.navigate('CommentScreen', {feedId: post.id})} activeOpacity={0.8} style={{ marginTop: 10 }}>
                    {post.payload.cover && (
                        <ExpoImage 
                            source={{ uri: post.payload.cover }} 
                            style={{ width: '100%', height: 160, borderRadius: 8, backgroundColor: '#f0f0f0' }} 
                            contentFit="cover"
                            cachePolicy="memory-disk" 
                        />
                    )}
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }} numberOfLines={2}>{post.payload.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: '#787878', fontWeight: '500' }}>Read article</Text>
                            <Ionicons name="arrow-forward" size={12} color="#787878" style={{ marginLeft: 2 }} />
                        </View>
                    </View>
                </TouchableOpacity>
            ) : (
                mediaItem ? (
                    hasError ? (
                        <View style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT, marginTop: 10, backgroundColor: '#202020', borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="alert-circle-outline" size={30} color="#fff" />
                            <Text style={{color: '#fff', fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                            <TouchableOpacity onPress={() => setHasError(false)} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 20}}>
                                <Text style={{color: '#fff', fontSize: 12}}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                    <TouchableWithoutFeedback onPress={handlePress}>
                    <View style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT, marginTop: 10, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden' }}>
                        {isVideo ? (
                            <View style={{flex: 1, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden'}}>
                                {source ? (
                                <VideoView
                                    key={`${source || mediaItem.video_url}-${retryKeyShared}`}
                                    style={{ width: "100%", height: "100%" }}
                                    player={sharedPlayer}
                                    contentFit="contain"
                                    posterSource={{ uri: mediaItem.thumbnail }}
                                    usePoster={false}
                                    nativeControls={false}
                                    onError={(error) => {
                                        console.log('Shared VideoView onError', error);
                                        if (retryKeyShared < 2) {
                                            setRetryKeyShared(prev => prev + 1);
                                            setSource(null);
                                            setTimeout(() => setSource(mediaItem.video_url), 300);
                                        } else {
                                            setHasError(true);
                                            setIsBuffering(false);
                                        }
                                    }}
                                />
                                ) : (
                                    <ExpoImage
                                        source={{ uri: mediaItem.thumbnail }}
                                        style={{ width: "100%", height: "100%" }}
                                        contentFit='cover'
                                        cachePolicy="memory-disk"
                                    />
                                )}
                                {showSharedPoster && (
                                    <ExpoImage
                                        source={{ uri: mediaItem.thumbnail }}
                                        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                )}
                                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2, opacity: (isBuffering && !isPlaying) ? 1 : 0}]} pointerEvents="none">
                                    <ActivityIndicator size="large" color="#fff" animating={isBuffering && !isPlaying} />
                                </View>

                                <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.muteButton}>
                                    <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
                                </TouchableOpacity>
                                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 3, opacity: isDownloadingShared ? 1 : 0}]} pointerEvents="none">
                                    <ActivityIndicator size="large" color="#fff" animating={isDownloadingShared} />
                                </View>
                            </View>
                        ) : (
                            <>
                                {isImageLoading && <SkeletonLoader style={StyleSheet.absoluteFill} />}
                                <ExpoImage source={{ uri: mediaUrl }} style={{ width: '100%', height: '100%', borderRadius: 10 }} contentFit="contain" cachePolicy="memory-disk" onLoadStart={() => setIsImageLoading(true)} onLoadEnd={() => setIsImageLoading(false)} />
                            </>
                        )}
                    </View>
                    </TouchableWithoutFeedback>
                    )
                ) : null
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sharedPostContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        marginTop: 10,
        padding: 10,
        overflow: 'hidden'
    },
    muteButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 20,
    }
});




const handleMemomize = (prevProps, nextProps) => {
    const p = prevProps;
    const n = nextProps;

    // Different post -> re-render
    if (p.post.id !== n.post.id) return false;

    // Counts changed
    if ((p.post.likes_count || p.post.likes) !== (n.post.likes_count || n.post.likes)) return false;
    if ((p.post.comments_count || 0) !== (n.post.comments_count || 0)) return false;

    // Type or text changed
    if (p.post.type !== n.post.type) return false;
    if ((p.post.text || '') !== (n.post.text || '')) return false;

    // Media length changed
    const pMediaLen = (p.post.media && p.post.media.length) || 0;
    const nMediaLen = (n.post.media && n.post.media.length) || 0;
    if (pMediaLen !== nMediaLen) return false;

    // Derived shouldPlay flag for this shared post
    const prevShouldPlay = !!(p.currentPlayingId && String(p.currentPlayingId).startsWith(`${p.parentFeedId}_`) && p.isFocused);
    const nextShouldPlay = !!(n.currentPlayingId && String(n.currentPlayingId).startsWith(`${n.parentFeedId}_`) && n.isFocused);
    if (prevShouldPlay !== nextShouldPlay) return false;

    // mute/focus changes
    if (p.isMuted !== n.isMuted) return false;
    if (p.isFocused !== n.isFocused) return false;

    // No meaningful changes -> skip re-render
    return true;
}


export default memo(SharedPostCard, handleMemomize);

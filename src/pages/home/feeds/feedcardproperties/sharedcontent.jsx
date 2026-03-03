import React, { memo, useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import AppDetails from '../../../../helpers/appdetails.js';
import UserDetails from './userdetails.jsx';
import Videocontent from './videocontent.jsx';
import ProductContent from './productcontent.jsx';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};



const MEDIA_HEIGHT = 470;
const MEDIA_WIDTH = 240;

const defaultScreenWidth = Dimensions.get("window").width;
// Calculate offset: Container Padding (10) + Left Column Width (13% of available space) + Right Column Padding (5)
const defaultLeftOffset = 20 + ((defaultScreenWidth - 20) * 0.13) + 5;
const defaultRightOffset = 15;
const defaultImageWidth = defaultScreenWidth - defaultLeftOffset - defaultRightOffset;



const SharedContent = ({ post = {}, parentFeedId, containerWidth }) => {
    const openCommentModal = useStore(state => state.openCommentModal);
    const tabletMode = useStore(state => state.tabletMode);
    const storeFeedWidth = useStore(state => state.feedWidth);

    // In tablet mode, recalculate sizes based on feed container width
    const effectiveContainerWidth = containerWidth > 0 ? containerWidth : (tabletMode && storeFeedWidth > 0 ? storeFeedWidth : 0);
    const leftOffset = effectiveContainerWidth > 0 ? 20 + ((effectiveContainerWidth - 20) * 0.13) + 5 : defaultLeftOffset;
    const rightOffset = defaultRightOffset;
    const imageWidth = effectiveContainerWidth > 0 ? effectiveContainerWidth - leftOffset - rightOffset : defaultImageWidth;
 const safePost = post || {}

const mediaArray = Array.isArray(safePost.media)
  ? safePost.media
  : []

const mediaItem = mediaArray.length > 0 ? mediaArray[0] : null

const isVideo =
  safePost.type === 'video' ||
  safePost.type === 'reel'

const isMultiMedia =
  mediaArray.length > 1  
    
    const [hasError, setHasError] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Memoize computed values
    const isLongPostText = useMemo(() => post.text && post.text.length > 50, [post.text]);
    
    const displayText = useMemo(() => {
        if (!post.text) return null;
        if (isLongPostText && !isExpanded) {
            return `${post.text.substring(0, 50)}...`;
        }
        return post.text;
    }, [post.text, isLongPostText, isExpanded]);

    const handlePress = useCallback(() => {
        // Open modal with parentFeedId so global video player can match
        openCommentModal(parentFeedId);
    }, [openCommentModal, parentFeedId]);
    
    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);
    
    const handleRetry = useCallback(() => {
        setHasError(false);
    }, []);



    return (
        <View style={[styles.sharedPostContainer, {borderWidth:isMultiMedia ? 0 : 1,}]}>
            <View style={isMultiMedia ? styles.sharedPostContainerTop : null}>

                <View style={{ flexDirection: 'row' }}>
                    <View style={{ marginRight: 5 }}>
                        <ExpoImage 
                            source={{ uri: post.user.avatar }}
                            style={{ width: 40, height: 40, borderRadius: 50 }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    </View>
                    
                    <UserDetails feed={post} fullNameFontSize={13} />
                </View>
          
        
                <View >
                    {displayText ? (
                        <Text style={styles.postText}>
                            {displayText}
                            {isLongPostText && (
                                <Text onPress={toggleExpanded} style={styles.seeMoreText}>
                                    {isExpanded ? ' See less' : ' See more'}
                                </Text>
                            )}
                        </Text>
                    ) : null}
                </View>

        </View>

        

            {post.type === 'poll' ? (
                // Lightweight inline poll rendering to avoid circular imports
                <View style={{ marginTop: 5, paddingRight: 5, width: '100%' }}>
                    <Text style={{ color: Colors.neutral430, fontSize: 12 }}>Poll</Text>
                </View>
            ) : post.type === 'product' ? (
                // <SharedProductItem post={post} />
                    <ProductContent feed={post} leftOffset={leftOffset} rightOffset={rightOffset} imageWidth={imageWidth} containerWidth={effectiveContainerWidth} />
            ) : post.type === 'article' && post.payload ? (
                <TouchableOpacity onPress={() => openCommentModal(post.id)} activeOpacity={0.8} style={{ marginTop: 10 }}>
                    {post.payload.cover && (
                        <ExpoImage 
                            source={{ uri: post.payload.cover }} 
                            style={{ width: '100%', height: 160, borderRadius: 8, backgroundColor: Colors.neutral150 }} 
                            contentFit="cover"
                            cachePolicy="memory-disk" 
                        />
                    )}
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: Colors.neutral700 }} numberOfLines={2}>{post.payload.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: Colors.neutral430, fontWeight: '500' }}>Read article</Text>
                            <Ionicons name="arrow-forward" size={12} color={Colors.neutral430} style={{ marginLeft: 2 }} />
                        </View>
                    </View>
                </TouchableOpacity>
            ) : (
                mediaItem ? (
                    hasError ? (
                        <View style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT, marginTop: 10, backgroundColor: Colors.neutral800, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="alert-circle-outline" size={30} color={Colors.white} />
                            <Text style={{color: Colors.white, fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                            <TouchableOpacity onPress={handleRetry} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: Colors.neutral700, borderRadius: 20}}>
                                <Text style={{color: Colors.white, fontSize: 12}}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                    <TouchableWithoutFeedback onPress={handlePress}>
                    <View style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT, marginTop: 10, backgroundColor: Colors.black, borderRadius: 10, overflow: 'hidden' }}>
                        {isVideo ? (
                             <Videocontent feedId={parentFeedId} media={post.media} />
                        ) : (
                            mediaItem.url ? (
                                <ExpoImage 
                                    source={{ uri: mediaItem.url }} 
                                    style={{ width: '100%', height: '100%' }} 
                                    contentFit="cover"
                                    cachePolicy="memory-disk" 
                                />
                            ) : null
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
        borderColor: Colors.neutral210,
        borderRadius: 10,
        padding: 10,
    },
    muteButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: withOpacity(Colors.black, 0.6),
        padding: 8,
        borderRadius: 20,
    },
    sharedPostContainerTop: {
        paddingHorizontal:10,
        paddingTop:10,
        borderTopWidth:1,
        borderLeftWidth:1,
        borderRightWidth:1,
        borderTopLeftRadius:10,
        borderTopRightRadius:10,
        marginBottom:5,
        borderColor:Colors.neutral200,
    },
    postText: {
        marginTop: 10, 
        fontFamily: AppDetails.fontFamily.body, 
        fontSize: 13, 
        color: AppDetails.bodyColor,
    },
    seeMoreText: {
        color: Colors.neutral430, 
        fontWeight: '600',
    },
});


// Optimized memo - only re-render when post data changes
export default memo(SharedContent, (prev, next) => {
    return (
        prev.post.id === next.post.id &&
        prev.parentFeedId === next.parentFeedId &&
        prev.post.likes_count === next.post.likes_count &&
        prev.post.comments_count === next.post.comments_count
    );
});

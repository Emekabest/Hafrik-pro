import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Dimensions } from 'react-native';
import ImageViewModal from '../../../../imageviewmodal';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../../assl.js/svg/svg';
import CalculateElapsedTime from '../../../../../helpers/calculateelapsedtime';
import PhotoPostContent from '../../feedcardproperties/photocontent';
import PollContent from '../../feedcardproperties/pollcontent';
import ProductContent from '../../feedcardproperties/productcontent';
import AppDetails from '../../../../../helpers/appdetails';
import CommentSharedPostItem from './commentsharedpostitem';
import VideoPostContent from '../../feedcardproperties/videocontent';
import CommentVideoItem from './commentvideoitem';
import CommentArticleItem from './commentarticleitem';
import CommentProductItem from './commentproductitem';
import CommentPollItem from './commentpollitem';
import CommentPageCoverItem from './commentpagecoveritem';
import CleanText from '../../../../../helpers/cleantext';
import getActionText from '../../../../../helpers/getactiontext';
import { Link, useNavigation } from '@react-navigation/native';
import EventPostContent from '../../feedcardproperties/eventpostcontent';
import CommentEventPostCoverContent from './commenteventpostcovercontent';
import CommentJobPostContent from './commentjobpostcontent';
import CommentMediaLinkContent from './commentmedialinkcontent';
import parseLinkFromText from '../../../../../helpers/linkparser';
import CommentEngagementBar from '../commentengagementbar';
import CommentMultipleSharedProductMediaCard from './commentmultiplesharedproductmediacard';
import { Colors } from '../../../../../theme/colors';

const { width: screenWidth } = Dimensions.get('window');

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;
const horizontalPadding = 15;



const CommentMainPostContent = ({ post, textInputRef, isLeaving = false }) => {
    const navigation = useNavigation();
    const [viewingImage, setViewingImage] = useState(null);

    const handleAuthorPress = () => {
        if (!post?.user?.id) return;
        navigation.navigate('UserProfile', {
            userId: post.user.id,
            username: post.user.username ?? '',
        });
    };

    if (!post) return null;

    const { text } = post.type === "media" || post.type === "link" ? parseLinkFromText(post.text || '') : {text: post.text || '', url: null};
    const postText = post.text ? CleanText(text) : '';

    const actionText = getActionText(post).trim();


    const isMultimediapostMode = post.type === "product" || post.shared_post?.type === "product";

    
    return (
        <View style={styles.postWrapper}>
            {/* ── Author row ─────────────────────────────────────────────── */}
            <View style={styles.authorRow}>
                {/* Avatar */}
                <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.8}>
                    <Image
                        source={{ uri: post.user.avatar }}
                        style={styles.authorAvatar}
                    />
                </TouchableOpacity>

                {/* Name + username + timestamp */}
                <View style={styles.authorInfo}>
                    {/* Top row: full name + verified badge + @username */}
                    <View style={styles.authorNameRow}>
                        <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.7}>
                            <Text style={styles.authorFullName} numberOfLines={1}>
                                {post.user.full_name}
                            </Text>
                        </TouchableOpacity>

                        {post.user.verified && (
                            <View style={styles.verifiedIconInline}>
                                <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />
                            </View>
                        )}

                        <Text style={styles.userUsername} numberOfLines={1} ellipsizeMode="tail">
                            @{CleanText(post.user.username)}
                        </Text>
                    </View>

                    {/* Context row: action text + group/event link */}
                    {(actionText || post.type === 'group' || post.context?.type === 'event') && (
                        <View style={styles.bottomUserRow}>
                            {!!actionText && <Text style={styles.actionText}>{actionText}</Text>}
                            {post.type === 'group' ? (
                                <Link
                                    to={{ screen: 'GroupScreen', params: { contextId: post.context.id, contextType: post.context.type } }}
                                    style={styles.feedContextWrapper}
                                >
                                    <Text style={styles.feedContextText} numberOfLines={1} ellipsizeMode="tail">
                                        {post.context.name}
                                    </Text>
                                </Link>
                            ) : post.context?.type === 'event' ? (
                                <Link
                                    to={{ screen: 'GroupScreen', params: { contextId: post.context.id, contextType: post.context.type } }}
                                    style={styles.feedContextContainer}
                                >
                                    <Text style={styles.feedContextText}>{CleanText(post.context.title)}</Text>
                                </Link>
                            ) : null}
                        </View>
                    )}

                    {/* Timestamp */}
                    <Text style={styles.timestamp}>
                        {CalculateElapsedTime(post.created)}
                    </Text>
                </View>
            </View>
            
            {/* Post body — inline hashtags are tappable */}
            {!!postText && (
                <View style={{ marginHorizontal: horizontalPadding, marginTop: 12, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontFamily: AppDetails.fontFamily.body, color: AppDetails.bodyColor, lineHeight: 22 }}>
                        {postText.split(/(\s+)/).map((seg, i) => {
                            if (/^#\w+/.test(seg)) {
                                const tag = seg.slice(1);
                                return (
                                    <Text
                                        key={i}
                                        style={styles.inlineHashtag}
                                        onPress={() => navigation.navigate('SearchScreen', { initialTab: 'posts', initialQuery: tag })}
                                    >
                                        {seg}
                                    </Text>
                                );
                            }
                            return <Text key={i}>{seg}</Text>;
                        })}
                    </Text>
                </View>
            )}

            {/* Hashtag chips */}
            {post.hashtags?.length > 0 && (
                <View style={styles.hashtagsRow}>
                    {post.hashtags.map((tag, i) => (
                        <TouchableOpacity
                            key={`${tag}-${i}`}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('SearchScreen', { initialTab: 'posts', initialQuery: tag })}
                        >
                            <Text style={styles.hashtagChip}>#{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}



            <View style={{ marginHorizontal:isMultimediapostMode ? 0 : horizontalPadding }}>
                 {post.type === 'shared'   ? (
  
                     <CommentSharedPostItem post={post.shared_post} isLeaving={isLeaving} parentFeedId={post.id} />

                ) : post.type === 'article' ? (
                    <CommentArticleItem post={post} />
                ) : post.type === 'poll' ? (
                    <CommentPollItem post={post} />
                ) : post.type ==='product' ? (

                    <CommentProductItem post={post} />
                ) : post.type ==='page_cover' ? (

                    <CommentPageCoverItem post={post} />

                ) : post.type === "event_cover" ? (

                    <CommentEventPostCoverContent post={post} />
                ) : post.type === "job" ?(
                    
                    <CommentJobPostContent post={post} />

                ) : post.type === "media" ? (

                <CommentMediaLinkContent text={post.text} />
                ) :
                
                (
                (() => {
                    const isVideo = post.type === 'video' || post.type === 'reel';
                    if (isVideo) {
                        const mediaItem = post.media && post.media[0];
                        return mediaItem ? <CommentVideoItem 
                            videoUrl={mediaItem.video_url} 
                            thumbnail={mediaItem.thumbnail} 
                            isLeaving={isLeaving}
                            feedId={post.id}
                            isReel={post.type === 'reel'}
                        /> : null;
                    }

                    if (post.media && post.media?.length > 0) {
                        return (
                            <PhotoPostContent
                                media={post.media}
                                imageWidth={screenWidth - horizontalPadding * 2}
                                onImagePress={(url) => setViewingImage(url)}
                                contentFit="contain"
                            />
                        );
                    }

                    return null;
                })()
            )}

            </View>

           



            <CommentEngagementBar
                feedId={post.id}
                initialLiked={post.is_liked}
                initialLikeCount={post.likes_count}
                commentsCount={post.comments_count}
                onCommentPress={() => textInputRef?.current?.focus()}
            />

            <ImageViewModal
                isVisible={!!viewingImage}
                onClose={() => setViewingImage(null)}
                imageUrl={viewingImage}
            />
        </View>
    );
};


const styles = StyleSheet.create({

    // ── Post wrapper ──────────────────────────────────────────────────────────
    postWrapper: {
        flexDirection: 'column',
        paddingTop: 15,
        paddingBottom: 5,
    },

    // ── Author row ────────────────────────────────────────────────────────────
    authorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: horizontalPadding,
        marginBottom: 4,
    },
    authorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.neutral180,
        marginRight: 10,
        flexShrink: 0,
    },
    authorInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    authorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 2,
    },
    authorFullName: {
        fontFamily: AppDetails.fontFamily.heading,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.black,
    },
    verifiedIconInline: {
        marginLeft: 4,
        marginRight: 4,
    },
    userUsername: {
        fontSize: 12,
        color: 'gray',
        fontFamily: AppDetails.fontFamily.bodyItalic,
        marginLeft: 4,
        flexShrink: 1,
    },
    timestamp: {
        fontSize: 12,
        color: 'gray',
        fontFamily: AppDetails.fontFamily.body,
        marginTop: 2,
    },

    // ── Context / action ──────────────────────────────────────────────────────
    bottomUserRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 2,
    },
    actionText: {
        color: AppDetails.bodyColor,
        fontFamily: AppDetails.fontFamily.body,
        fontSize: 13,
    },
    feedContextText: {
        fontSize: 13,
        flexWrap: 'wrap',
        marginLeft: 4,
        color: AppDetails.linkColor,
        fontFamily: AppDetails.fontFamily.body,
    },

    // ── Hashtags ──────────────────────────────────────────────────────────────
    inlineHashtag: {
        color: Colors.tealAccent,
        fontWeight: '600',
    },
    hashtagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginHorizontal: horizontalPadding,
        marginTop: 6,
        marginBottom: 4,
    },
    hashtagChip: {
        fontSize: 13,
        color: Colors.tealAccent,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
})

export default CommentMainPostContent;

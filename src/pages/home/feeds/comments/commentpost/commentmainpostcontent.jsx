import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
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
import { Link } from '@react-navigation/native';
import EventPostContent from '../../feedcardproperties/eventpostcontent';
import CommentEventPostCoverContent from './commenteventpostcovercontent';
import CommentJobPostContent from './commentjobpostcontent';
import CommentMediaLinkContent from './commentmedialinkcontent';
import parseLinkFromText from '../../../../../helpers/linkparser';
import CommentEngagementBar from '../commentengagementbar';
import CommentMultipleSharedProductMediaCard from './commentmultiplesharedproductmediacard';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;
const horizontalPadding = 15;



const CommentMainPostContent = ({ post, textInputRef, isLeaving = false }) => {
    if (!post) return null;

    

    const { text } = post.type === "media" || post.type === "link" ? parseLinkFromText(post.text || '') : {text: post.text || '', url: null};
    const postText = post.text ? CleanText(text) : '';

    const actionText = getActionText(post).trim();


    const isMultimediapostMode = post.type === "product" || post.shared_post?.type === "product";

    
    return (
        <View style={[{ flexDirection: 'row', paddingTop: 15, paddingBottom: 5 }, { flexDirection: 'column' }]}>
            <View>
                    <View style={{ flexDirection: 'row',  marginHorizontal:horizontalPadding, }}>
                        <View style={{ width:"15%", alignItems:"center"}}>
                            <TouchableOpacity>
                                <Image source={{ uri: post.user.avatar }} style={{ width: 55, height: 55, borderRadius: 50, backgroundColor: '#eee'}} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.userRowInline}>
                          
                            <View style={styles.topUserRow}>
                            
                                
                                <TouchableOpacity>
                                    <Text style={{ fontFamily: AppDetails.fontFamily.heading, fontSize: 17, color: '#000' }}>
                                        {post.user.full_name}
                                    </Text>
                                </TouchableOpacity>

                                {post.user.verified && (
                                    <View style={styles.verifiedIconInline}>
                                        <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />
                                    </View>
                                )}

                                <Text style={[styles.userUsername, styles.flexShrink]} numberOfLines={1} ellipsizeMode="tail">
                                    @{CleanText(post.user.username)}
                                </Text>
                            </View>

                        <View style={styles.bottomUserRow}>
                            {
                                actionText && <Text style={[styles.actionText]}>{actionText}</Text>
                            }
                            

                            {(post.type === "group") ? (
                                <Link to={{ screen: 'GroupScreen', params: { contextId: post.context.id, contextType: post.context.type } }} style={styles.feedContextWrapper}>
                                    <Text style={styles.feedContextText} numberOfLines={1} ellipsizeMode="tail">{post.context.name}</Text>
                                </Link>
                            ) : post.context.type === "event" ? (
                                    <Link to={{ screen: 'GroupScreen', params: { contextId: post.context.id, contextType: post.context.type } }} style={styles.feedContextContainer}>
                                         <Text style={styles.feedContextText}>{CleanText(post.context.title)}</Text>
                                    </Link>

                                ) : null}

                        </View>

                        <Text style={{ color: 'gray', fontSize: 13, marginRight: 5, fontFamily: AppDetails.fontFamily.body, marginRight: 0 }}>
                            {CalculateElapsedTime(post.created)}
                        </Text>

                        </View>
                </View>
            </View>
            
            <View style={{ marginHorizontal:horizontalPadding, }}>
                <Text style={{ fontSize: 16, fontFamily: AppDetails.fontFamily.body, color: AppDetails.bodyColor, lineHeight: 21, marginBottom: post.text ? 10 : 0, marginTop: 12 }}>
                    {postText}
                </Text>
            </View>



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
                        /> : null;
                    }

                    if (post.media && post.media?.length > 0) {
                        return (
                            <PhotoPostContent
                                media={post.media}
                                imageWidth={MEDIA_WIDTH}
                                leftOffset={15}
                                rightOffset={15}
                                onImagePress={() => {}}
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
        </View>
    );
};


const styles = StyleSheet.create({

    userUsername:{
        fontSize: 12, 
        color: 'gray',
        fontFamily:AppDetails.fontFamily.bodyItalic,
        marginLeft: 5,
     },
     
    actionText:{
        color: AppDetails.bodyColor, 
        fontFamily:AppDetails.fontFamily.body,
    },

    feedContextText:{
        fontSize: 15,
        flexWrap:"wrap",
        marginLeft: 4,
        color:AppDetails.linkColor,
        fontFamily:AppDetails.fontFamily.body,
    },  

    userRowInline: {
        marginLeft: 5,
        width:"85%",
    },

    verifiedIconInline: {
        marginLeft: 2,
        marginRight: 5, 
    },

    topUserRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        
    },

    bottomUserRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },



})

export default CommentMainPostContent;

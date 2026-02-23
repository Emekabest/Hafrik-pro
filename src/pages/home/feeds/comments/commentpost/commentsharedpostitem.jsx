import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import CommentVideoItem from './commentvideoitem';
import PollContent from '../../feedcardproperties/pollcontent';
import CalculateElapsedTime from '../../../../../helpers/calculateelapsedtime';
import CommentProductItem from './commentproductitem';
import CleanText from '../../../../../helpers/cleantext';
import AppDetails from '../../../../../helpers/appdetails';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;

const CommentSharedPostItem = ({ post, isLeaving, parentFeedId }) => {
    const isVideo = post.type === 'video' || post.type === 'reel';
    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;

    const avatar = post.user?.avatar || "https://cdn.corporatefinanceinstitute.com/assets/united-states-dollar-usd.jpeg";
    const fullName = post.user?.full_name || "Unknown User";
    const postCreated = post.created || "2026";
    const text = CleanText(post.text) || '';

    

    const isMultimediapostMode = post.type === "product";
    
    return (
        <View style={{ 
            borderWidth: isMultimediapostMode ? 0 : 1,
            borderColor: '#e0e0e0',
            borderRadius: 10,
            marginTop: 10,
            padding: 10, 
            overflow: isMultimediapostMode ? 'visible' : 'hidden',
            }}
        >

            <View style={isMultimediapostMode ? styles.sharedPostTopContainer : null}>
                <View style={{ flexDirection: 'row', alignItems: 'center',  }}>
                    <Image source={{ uri: avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={{ fontWeight: 'bold' }}>{fullName}</Text>
                        <Text style={{ color: '#787878ff' }}>{CalculateElapsedTime(postCreated)}</Text>
                    </View>
                </View>
                <View>
                    {text ? <Text style={{ marginTop: 10, fontFamily: AppDetails.fontFamily.body }}>{text}</Text> : null}
                </View>
            </View>

            
            {post?.type === 'poll' ? (
                <PollContent feed={post} />
            ) : post?.type === "product" ? (

                <CommentProductItem post={post} />
            ) : mediaItem && (
                <View style={{ width: '100%', marginTop: 10 }}>
                    {isVideo ? (
                        <CommentVideoItem videoUrl={mediaItem.video_url} thumbnail={mediaItem.thumbnail} isLeaving={isLeaving} feedId={parentFeedId} />
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

const styles = StyleSheet.create({
    sharedPostTopContainer: {
        paddingHorizontal:20, 
        paddingTop:10,
        borderTopWidth:1,
        borderTopLeftRadius:10,
        borderTopRightRadius:10,
        borderLeftWidth:1,
        borderRightWidth:1,
        borderColor:"#dedede",
    }
})

export default CommentSharedPostItem;

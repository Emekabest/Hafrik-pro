import React from 'react';
import { View, Image, Text } from 'react-native';
import CommentVideoItem from './commentvideoitem';
import PollContent from '../../feedcardproperties/pollcontent';
import CalculateElapsedTime from '../../../../../helpers/calculateelapsedtime';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;

const CommentSharedPostItem = ({ post }) => {
    const isVideo = post.type === 'video' || post.type === 'reel';
    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;

    console.log("Logging")

    return (
        <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, marginTop: 10, padding: 10, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={{ uri: post.user.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>{post.user.full_name}</Text>
                    <Text style={{ color: '#787878ff' }}>{CalculateElapsedTime(post.created)}</Text>
                </View>
            </View>
            {post.text ? <Text style={{ marginTop: 10, fontFamily: 'WorkSans_400Regular' }}>{post.text}</Text> : null}
            
            {post.type === 'poll' ? (
                <PollContent feed={post} />
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

export default CommentSharedPostItem;

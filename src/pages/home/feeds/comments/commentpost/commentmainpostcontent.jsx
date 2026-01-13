import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../../assl.js/svg/svg';
import CalculateElapsedTime from '../../../../../helpers/calculateelapsedtime';
import PhotoPostContent from '../../feedcardproperties/photocontent';
import PollContent from '../../feedcardproperties/pollcontent';
import ProductPostContent from '../../feedcardproperties/productcontent';
import AppDetails from '../../../../../helpers/appdetails';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;




const CommentMainPostContent = ({ post, liked, likeCount, onLike, onReply, textInputRef }) => {
    if (!post) return null;

    return (
        <View style={[{ flexDirection: 'row', paddingHorizontal: 15, paddingTop: 15, paddingBottom: 5 }, { flexDirection: 'column' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                <TouchableOpacity>
                    <Image source={{ uri: post.user.avatar }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} />
                </TouchableOpacity>

                <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <TouchableOpacity>
                            <Text style={{ fontFamily: 'ReadexPro_500Medium', marginRight: 3, fontWeight: '600', size: 15, color: '#000' }}>{post.user.full_name}</Text>
                        </TouchableOpacity>
                    
                        {post.user.verified && 

                            <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />

                        }
                        <Text style={{ color: '#999', fontSize: 13, marginRight: 10, fontFamily: 'WorkSans_400Regular', marginLeft: 5, marginRight: 0 }}>• {CalculateElapsedTime(post.created)}</Text>
                        <View style={{ flex: 1 }} />

                    </View>
                </View>
            </View>
            

            <Text style={{ fontSize: 15, color: '#000', lineHeight: 21, marginBottom: 10, marginTop: 12 }}>{post.text}</Text>
            {post.type === 'shared' && post.shared_post ? (
                // Parent will render a shared post
                null
            ) : post.type === 'article' ? (
                <Text />
            ) : post.type === 'poll' ? (
                <PollContent feed={post} />
            ) : post.type ==='product' ? (
                <ProductPostContent feed={post} imageWidth={MEDIA_WIDTH} leftOffset={15} rightOffset={15} />
            ) : (
                (() => {
                    const isVideo = post.type === 'video' || post.type === 'reel';
                    if (isVideo) {
                        const mediaItem = post.media && post.media[0];
                        return mediaItem ? <PhotoPostContent media={[mediaItem]} imageWidth={MEDIA_WIDTH} leftOffset={15} rightOffset={15} onImagePress={() => {}} /> : null;
                    }

                    if (post.media && post.media.length > 0) {
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 15, width: '90%' }}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={onLike}>
                    <Ionicons name={liked ? 'heart' : 'heart-outline'} size={23} style={{ color: liked ? '#ff4444' : '#333' }} />
                    <Text style={{ marginLeft: 5, fontSize: 13, color: '#333' }}>{likeCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => textInputRef?.current?.focus()}>
                    <SvgIcon name="comment" width={20} height={20} color="#333" />
                    <Text style={{ marginLeft: 5, fontSize: 13, color: '#333' }}>{post.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SvgIcon name="share" width={20} height={20} color="#333" />
                    <Text style={{ marginLeft: 5, fontSize: 13, color: '#333' }}>29</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SvgIcon name="favourite" width={20} height={20} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default CommentMainPostContent;

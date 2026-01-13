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
import { useNavigation } from '@react-navigation/native';
import CommentVideoItem from './commentpost/commentvideoitem';
import CommentArticleItem from './commentpost/commentarticleitem';
import { useAuth } from "../../../../AuthContext";
import AppDetails from "../../../../helpers/appdetails";
// comments controllers removed - this screen now shows only the post
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';
import CommentBonds from './commentsbonds';
import AddComment from './addcomment';
import ToggleFeedController from "../../../../controllers/tooglefeedcontroller";
import CalculateElapsedTime from "../../../../helpers/calculateelapsedtime";
// no caching for comment video as requested
import SvgIcon from '../../../../assl.js/svg/svg';
import PhotoPostContent from '../feedcardproperties/photocontent';
import PollContent from '../feedcardproperties/pollcontent';
import ProductPostContent from '../feedcardproperties/productcontent';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;


// CommentVideoItem extracted to ./commentpost/commentvideoitem

// Using shared PollContent from feedcardproperties/pollcontent

// CommentArticleItem extracted to ./commentpost/commentarticleitem



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






const CommentMainPostContent = ({ post, liked, likeCount, onLike, onReply, textInputRef }) => {
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
                <CommentArticleItem post={post} />
            ) : post.type === 'poll' ? (
                <PollContent feed={post} />
            ) : post.type ==='product' ? (
                <ProductPostContent feed={post} imageWidth={MEDIA_WIDTH} leftOffset={15} rightOffset={15} />
            ) : (
                (() => {
                    const isVideo = post.type === 'video' || post.type === 'reel';
                    if (isVideo) {
                        const mediaItem = post.media && post.media[0];
                        return mediaItem ? <CommentVideoItem videoUrl={mediaItem.video_url} thumbnail={mediaItem.thumbnail} /> : null;
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

const OriginalPostMemo = React.memo(CommentMainPostContent);



const CommentScreen = ({ route }) => {
    const navigation = useNavigation();
    const { user, token } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { feedId } = route.params;

    const [localLiked, setLocalLiked] = useState(null);
    const [localLikeCount, setLocalLikeCount] = useState(null);


    console.log(feedId)


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

                    // comments are handled by CommentBonds component
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

                    <CommentBonds postId={feedId} token={token} />


                </ScrollView>
            )}

            <AddComment user={user} feedId={feedId} token={token} />
        </View>
    );
};








const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 50, borderBottomWidth: 0.5, borderBottomColor: '#efefef', backgroundColor: '#fff' },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#000' },
    listContent: { paddingBottom: 120 },
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
    replyingTo: { fontSize: 11, color: '#999', marginBottom: 4 },
    
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

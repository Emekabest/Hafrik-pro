import React, { useEffect, useState, useRef } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    TouchableOpacity, 
    TextInput, 
    FlatList, 
    Image, 
    KeyboardAvoidingView, 
    Platform,
    Dimensions,
    ActivityIndicator,
    ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from "../../../AuthContext";
import AppDetails from "../../../helpers/appdetails";
import GetCommentsController from '../../../controllers/getcommentscontroller';
import getUserPostInteractionController from '../../../controllers/getuserpostinteractioncontroller';
import ToggleFeedController from "../../../controllers/tooglefeedcontroller";
import CalculateElapsedTime from "../../../helpers/calculateelapsedtime";
import { useVideoCache } from "../../../helpers/videocache";

const CommentVideoItem = ({ videoUrl, thumbnail }) => {
    const { cachedUri, isCaching } = useVideoCache(videoUrl);
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    return (
        <View style={{ height: 250, width: '100%', borderRadius: 10, overflow: 'hidden', marginTop: 10, backgroundColor: '#000' }}>
            <Video
                ref={videoRef}
                style={{ width: "100%", height: "100%" }}
                source={{ uri: cachedUri }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                posterSource={{ uri: thumbnail }}
                usePoster={true}
                onPlaybackStatusUpdate={status => {
                    setIsPlaying(status.isPlaying);
                    setIsBuffering(status.isBuffering);
                    if (status.didJustFinish) {
                        setIsFinished(true);
                    }
                    if (status.isPlaying) {
                        setIsFinished(false);
                    }
                }}
            />
            
            {((isBuffering || isCaching) && !isPlaying) && (
                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2}]} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {(!isPlaying && !isBuffering && !isCaching) && (
                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 1}]}>
                    <TouchableOpacity 
                        onPress={() => {
                            if (isFinished) {
                                videoRef.current?.replayAsync();
                            } else {
                                videoRef.current?.playAsync();
                            }
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

const CommentScreen = ({route})=>{
    const navigation = useNavigation();
    const { user, token } = useAuth();
    const [replyText, setReplyText] = useState("");
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [comments, setComments] = useState([])
    const [replyingTo, setReplyingTo] = useState(null);
    const textInputRef = useRef(null);
    const { feedId } = route.params;

    
    // Mock Data for comments
    const mockComments = [
        {
            id: '1',
            user: {
                name: "Pedri González",
                username: "pedri",
                avatar: "https://randomuser.me/api/portraits/men/2.jpg",
            },
            content: "Bro, that kit looks fire! 🔥",
            time: "30m",
            likes: 120
        },
        {
            id: '2',
            user: {
                name: "Gavi",
                username: "gavi",
                avatar: "https://randomuser.me/api/portraits/men/3.jpg",
            },
            content: "Finally! Subscribed immediately. 😂",
            time: "25m",
            likes: 85
        },
        {
            id: '3',
            user: {
                name: "Frenkie de Jong",
                username: "frenkiedejong",
                avatar: "https://randomuser.me/api/portraits/men/4.jpg",
            },
            content: "Nice setup! Can't wait to see more content.",
            time: "10m",
            likes: 40
        },
        {
            id: '4',
            user: {
                name: "Robert Lewandowski",
                username: "lewy",
                avatar: "https://randomuser.me/api/portraits/men/5.jpg",
            },
            content: "Top class! ⚽️",
            time: "5m",
            likes: 200
        }
    ];


    useEffect(()=>{

        const getData = async()=>{
            setLoading(true);
            const response = await getUserPostInteractionController(feedId, token);
            if(response.status === 200){
                setPost(response.data);
                setLiked(!!response.data.liked);
                setLikeCount(parseInt(response.data.likes_count) || 0);
            }
            else{
                console.log("Something went wrong")
            }
            
            const commentsResponse = await GetCommentsController(feedId, token)
            if(commentsResponse.status === 200){
                const comments = commentsResponse.data
                console.log(comments)

                setComments(comments);
            }
            else{
                console.log("Something went wrong")
            }
            
            setLoading(false);
        }

        getData()
    },[feedId, token])





    const handleLike = async() => {  
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        await ToggleFeedController(feedId, token);
    };

    const handleReplyToComment = (comment) => {
        setReplyingTo(comment);
        textInputRef.current?.focus();
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const handlePostComment = () => {
        if (!replyText.trim()) return;
        
        const newComment = {
            id: Date.now().toString(),
            user: user,
            text: replyText,
            created: new Date().toISOString(),
            replies: []
        };

        if (replyingTo) {
            setComments(prev => prev.map(c => {
                if (c.id === replyingTo.id) {
                    return { ...c, replies: [...(c.replies || []), newComment] };
                }
                return c;
            }));
            setReplyingTo(null);
        } else {
            setComments(prev => [newComment, ...prev]);
        }
        setReplyText("");
    };

    const renderMedia = () => {
        if (!post || !post.media || post.media.length === 0) return null;
        
        const isVideo = post.type === 'video' || post.type === 'reel';
        const screenWidth = Dimensions.get('window').width;
        const contentWidth = screenWidth - 30; // 15 padding each side

        if (isVideo) {
            const mediaItem = post.media[0];
            return <CommentVideoItem videoUrl={mediaItem.video_url} thumbnail={mediaItem.thumbnail} />;
        }

        if (post.media.length > 1) {
            return (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {post.media.map((item, index) => (
                        <Image 
                            key={index}
                            source={{ uri: item.url }}
                            style={{ height: 250, width: contentWidth, borderRadius: 10, marginRight: 10 }}
                            resizeMode="cover"
                        />
                    ))}
                </ScrollView>
            );
        }

        return (
            <Image 
                source={{ uri: post.media[0].url }}
                style={{ height: 250, width: '100%', borderRadius: 10, marginTop: 10 }}
                resizeMode="cover"
            />
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hafrik</Text>
            <View style={{width: 24}} /> 
        </View>
    );

    const renderOriginalPost = () => {
        if (!post) return null;
        return (
        <View style={[styles.postContainer, { flexDirection: 'column' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={styles.headerRow}>
                        <Text style={styles.username}>{post.user.username}</Text>
                        {post.user.verified && <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" style={{marginLeft: 4}} />}
                        <Text style={[styles.timeText, { marginLeft: 5, marginRight: 0 }]}>• {CalculateElapsedTime(post.created)}</Text>
                        <View style={styles.spacer} />
                        <TouchableOpacity style={{ backgroundColor: "#000", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>Follow</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            
            <Text style={[styles.postText, { marginTop: 12 }]}>{post.text}</Text>
            {renderMedia()}

            <View style={styles.engagementBar}>
                <TouchableOpacity style={styles.engagementItem} onPress={handleLike}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={23} style={{color: liked ? "#ff4444" : "#333", fontWeight:"bold"}} />
                    <Text style={styles.engagementText}>{likeCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem} onPress={() => textInputRef.current?.focus()}>
                    <Ionicons name="chatbubble-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                    <Text style={styles.engagementText}>{post.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem}>
                    <Ionicons name="paper-plane-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                    <Text style={styles.engagementText}>29</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.engagementItem}>
                    <Ionicons name="star-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                </TouchableOpacity>
            </View>
        </View>
    )};

    const renderCommentItem = ({ item }) => (
        <View style={styles.commentContainer}>
             <View style={styles.avatarColumn}>
                <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            </View>
            <View style={styles.contentColumn}>
                <View style={styles.headerRow}>
                    <Text style={styles.username}>{item.user.full_name}</Text>
                    <View style={styles.spacer} />
                    <Text style={styles.timeText}>{CalculateElapsedTime(item.created)}</Text>
                    <TouchableOpacity style={styles.moreButton}>
                        <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.commentText}>{item.text}</Text>
                
                <View style={styles.interactionRow}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="heart-outline" size={22} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => handleReplyToComment(item)}>
                        <Ionicons name="chatbubble-outline" size={21} color="#333" />
                    </TouchableOpacity>
                </View>

                {item.replies && item.replies.length > 0 && (
                    <View style={{marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#f0f0f0'}}>
                        {item.replies.map((reply, index) => (
                            <View key={index} style={{flexDirection: 'row', marginTop: 8}}>
                                <Image source={{ uri: reply.user.avatar }} style={{width: 24, height: 24, borderRadius: 12, marginRight: 8}} />
                                <View style={{flex: 1}}>
                                    <Text style={{fontWeight: '600', fontSize: 13}}>{reply.user.full_name || reply.user.username}</Text>
                                    <Text style={{fontSize: 13, color: '#333'}}>{reply.text}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
    
    return(
        <View style={styles.container}>
            {renderHeader()}
            {loading ? (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                    <ActivityIndicator size="large" color={AppDetails.primaryColor} />
                </View>
            ) : (
            <>
            <FlatList
                data={comments}
                keyExtractor={item => item.id}
                renderItem={renderCommentItem}
                ListHeaderComponent={renderOriginalPost}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                style={styles.inputWrapper}
            >
                <View style={styles.inputContainer}>
                    <Image 
                        source={{ uri: user?.avatar || "https://via.placeholder.com/150" }} 
                        style={styles.inputAvatar} 
                    />
                    <View style={styles.inputFieldContainer}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Text style={styles.replyingTo}>
                                Replying to {replyingTo ? (replyingTo.user.full_name || replyingTo.user.username) : post?.user?.full_name}
                            </Text>
                            {replyingTo && (
                                <TouchableOpacity onPress={handleCancelReply} style={{padding: 2}}>
                                    <Ionicons name="close" size={14} color="#999" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TextInput
                            ref={textInputRef}
                            style={styles.textInput}
                            placeholder={`Reply to ${replyingTo ? (replyingTo.user.full_name || replyingTo.user.username) : post?.user?.full_name}...`}
                            placeholderTextColor="#999"
                            multiline
                            value={replyText}
                            onChangeText={setReplyText}
                        />
                    </View>
                    <TouchableOpacity disabled={!replyText.trim()} onPress={handlePostComment}>
                        <Text style={[styles.postButton, !replyText.trim() && styles.disabledPostButton]}>Post</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            </>
            )}
        </View>
    )
}

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
    username: { fontWeight: '600', fontSize: 15, color: '#000' },
    spacer: { flex: 1 },
    timeText: { color: '#999', fontSize: 13, marginRight: 10 },
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
        justifyContent: 'space-between',
        marginTop: 15,
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
})

export default CommentScreen;

import React, { useState } from 'react';
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
    Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import { useAuth } from "../../../AuthContext";
import AppDetails from "../../../helpers/appdetails";

const CommentScreen = ()=>{
    const navigation = useNavigation();
    const { user } = useAuth();
    const [replyText, setReplyText] = useState("");
    
    // Mock Data for the post being viewed
    const originalPost = {
        user: {
            name: "Lamine Yamal",
            username: "lamineyamal",
            avatar: "https://randomuser.me/api/portraits/men/1.jpg",
            verified: true
        },
        content: "Lamine Yamal launched his YouTube channel and gave a tour of his house while wearing a Luis Diaz kit \n\n\"This is the most precious thing i have at home: the ball i scored the goal with against france at the EUROs\"",
        time: "44m",
        image: null
    };

    // Mock Data for comments
    const comments = [
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

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hafrik</Text>
            <View style={{width: 24}} /> 
        </View>
    );

    const renderOriginalPost = () => (
        <View style={styles.postContainer}>
            <View style={styles.avatarColumn}>
                <Image source={{ uri: originalPost.user.avatar }} style={styles.avatar} />
                <View style={styles.threadLine} />
            </View>
            <View style={styles.contentColumn}>
                <View style={styles.headerRow}>
                    <Text style={styles.username}>{originalPost.user.name}</Text>
                    {originalPost.user.verified && <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" style={{marginLeft: 4}} />}
                    <View style={styles.spacer} />
                    <Text style={styles.timeText}>{originalPost.time}</Text>
                    <TouchableOpacity style={styles.moreButton}>
                        <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.postText}>{originalPost.content}</Text>
            </View>
        </View>
    );

    const renderCommentItem = ({ item }) => (
        <View style={styles.commentContainer}>
             <View style={styles.avatarColumn}>
                <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            </View>
            <View style={styles.contentColumn}>
                <View style={styles.headerRow}>
                    <Text style={styles.username}>{item.user.name}</Text>
                    <View style={styles.spacer} />
                    <Text style={styles.timeText}>{item.time}</Text>
                    <TouchableOpacity style={styles.moreButton}>
                        <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.commentText}>{item.content}</Text>
                
                <View style={styles.interactionRow}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="heart-outline" size={22} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="chatbubble-outline" size={21} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="repeat-outline" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="paper-plane-outline" size={22} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
    
    return(
        <View style={styles.container}>
            {renderHeader()}
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
                        <Text style={styles.replyingTo}>Replying to {originalPost.user.name}</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder={`Reply to ${originalPost.user.name}...`}
                            placeholderTextColor="#999"
                            multiline
                            value={replyText}
                            onChangeText={setReplyText}
                        />
                    </View>
                    <TouchableOpacity disabled={!replyText.trim()}>
                        <Text style={[styles.postButton, !replyText.trim() && styles.disabledPostButton]}>Post</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    disabledPostButton: { opacity: 0.4 }
})

export default CommentScreen;

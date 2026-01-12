import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Image, Text, StyleSheet, Platform, Keyboard, Alert } from 'react-native';
import { AddCommentController } from '../../../../controllers/commentscontroller';
import AppDetails from '../../../../helpers/appdetails';
import { Ionicons } from '@expo/vector-icons';

const PostComment = ({ user, feedId, token }) => {
    const [commentText, setCommentText] = useState('');
    const [posting, setPosting] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e) => {
            const h = e?.endCoordinates?.height || 0;
            setKeyboardHeight(h);
        };
        const onHide = () => setKeyboardHeight(0);

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);


    const handlePost = async () => {
        Keyboard.dismiss();
        if (!commentText || posting) return;
        setPosting(true);

        try {
            setCommentText('');
            const response = await AddCommentController(feedId, commentText, token);
            if (response && response.status === 200) {
                const responseData = response.data;
                
                const newComment = {
                    id: responseData.comment_id,
                    user: user,
                    text: responseData.comment,
                    created: new Date().toISOString(),
                    replies: []
                };


            }
            else{
                Alert.alert("Error", "Failed to post comment. Please try again.");
            }


        } catch (e) {
            Alert.alert("Error", "Failed to post comment. Please try again." + e);
        }
        setPosting(false);
    };


    return (
        <View style={[styles.inputWrapper, { bottom: keyboardHeight }] }>
            <View style={styles.inputContainer}>
                <Image source={{ uri: user?.avatar }} style={styles.inputAvatar} />
                <View style={styles.inputFieldContainer}>
                    <TextInput
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholderTextColor={"#a5a5a5ff"}
                        placeholder="Write a comment..."
                        multiline
                        style={styles.textInput}
                        returnKeyType="send"
                        onSubmitEditing={handlePost}
                    />
                </View>

                <TouchableOpacity style={styles.postButtonContainer} onPress={handlePost}>
                    <Ionicons name="send" size={20} color={commentText ? (AppDetails.primaryColor || '#0095f6') : '#ccc'} />
                    {/* <Text style={[styles.postButton, commentText ? {} : styles.disabledPostButton]}>{posting ? 'Posting...' : 'Post'}</Text> */}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    inputWrapper: { borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 20 : 8, position: 'absolute', left: 0, right: 0, bottom: 0 },
    inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'flex-start' },
    inputAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12, marginTop: 2 },
    inputFieldContainer: { flex: 1, marginRight: 10, justifyContent: 'center' },
    textInput: { fontSize: 15, color: '#000', maxHeight: 100, paddingTop: 6, paddingBottom: 6 },
    postButton: { color: AppDetails.primaryColor || '#0095f6', fontWeight: '600', fontSize: 15 },
    disabledPostButton: { opacity: 0.4 },
    postButtonContainer: { justifyContent: 'center', paddingHorizontal: 12 },
});

export default PostComment;

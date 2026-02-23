import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import CleanText from '../../../../../helpers/cleantext';



const CommentArticleItem = ({ post }) => {
    let payload = post.payload;

    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload);
        } catch (e) {
            console.warn("Failed to parse article payload", e);
            payload = {};
        }
    }
    
    if (!payload) return null;

    const { title, cover, text } = payload;
    
    // Basic HTML stripping and entity replacement for display
    const cleanText = CleanText(text)
    const cleanTitle = CleanText(title)

    return (
        <View style={{ marginTop: 10, width: '100%', paddingBottom: 10 }}>
             {cover ? (
                <ExpoImage 
                    source={{ uri: cover }} 
                    style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 15, backgroundColor: '#f0f0f0' }} 
                    contentFit='cover' 
                    cachePolicy="memory-disk"
                    
                />
            ) : null}
            
            {cleanTitle ? (
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 10, lineHeight: 28 }}>
                    {cleanTitle}
                </Text>
            ) : null}
            
            {cleanText ? (
                <Text style={{ fontSize: 16, color: '#333', lineHeight: 24 }}>
                    {cleanText}
                </Text>
            ) : (
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                     <Text style={{ fontSize: 14, color: '#787878', fontWeight: '500' }}>Read full article</Text>
                     <Ionicons name="arrow-forward" size={14} color="#787878" style={{marginLeft: 4}} />
                </View>
            )}
        </View>
    );
};

export default CommentArticleItem;

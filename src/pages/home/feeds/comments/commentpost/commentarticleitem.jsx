import React from 'react';
import { View, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';



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
    const cleanText = text ? text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim() : '';

    return (
        <View style={{ marginTop: 10, width: '100%', paddingBottom: 10 }}>
             {cover ? (
                <Image 
                    source={{ uri: cover }} 
                    style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 15, backgroundColor: '#f0f0f0' }} 
                    resizeMode="cover" 
                />
            ) : null}
            
            {title ? (
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 10, lineHeight: 28 }}>
                    {title}
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

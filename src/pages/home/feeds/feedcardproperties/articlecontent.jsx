import React, { memo, useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, Dimensions, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';


const aspectRatioCache = new Map();

const ArticlePostContent = ({ feed, imageWidth, leftOffset, rightOffset }) => {
    const navigation = useNavigation();
    const payload = feed.payload;
    if (!payload) return null;

    const coverUrl = payload.cover;
    const title = payload.title;


    const handlePress = () => {
        navigation.navigate('CommentScreen', {feedId: feed.id});
    };

    return (
        <View style={{ marginTop: 5 }}>
             <View style={[
                styles.mediaSection,
                { height: 240 },
                { width: Dimensions.get("window").width, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
            ]}>
                {coverUrl ? (
                    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={{flex: 1}}>
                        <ExpoImage
                            source={{uri: coverUrl}}
                            style={{height:"100%", width: imageWidth, marginLeft: leftOffset, borderRadius: 10}}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    </TouchableOpacity>
                ) : null}
            </View>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={{ marginTop: 10, paddingRight: 5 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', lineHeight: 22 }}>{title}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                     <Text style={{ fontSize: 12, color: '#787878', fontWeight: '500' }}>Read article</Text>
                     <Ionicons name="arrow-forward" size={12} color="#787878" style={{marginLeft: 2}} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    mediaSection: {
        overflow: 'hidden',
        backgroundColor: '#b1aaaaff'
    }
});





const handleMemomize = (prevProps, nextProps) => {
    if (prevProps.feed?.id !== nextProps.feed?.id) return false;
    const prevPayload = prevProps.feed?.payload ?? {};
    const nextPayload = nextProps.feed?.payload ?? {};
    if (prevPayload.cover !== nextPayload.cover) return false;
    if (prevPayload.title !== nextPayload.title) return false;
    if (prevProps.imageWidth !== nextProps.imageWidth) return false;
    if (prevProps.leftOffset !== nextProps.leftOffset) return false;
    if (prevProps.rightOffset !== nextProps.rightOffset) return false;
    return true;
}
export default memo(ArticlePostContent, handleMemomize);

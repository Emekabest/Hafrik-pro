import React, { memo, useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, Dimensions, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const aspectRatioCache = new Map();

const ArticlePostContent = memo(({ feed, imageWidth, leftOffset, rightOffset }) => {
    const navigation = useNavigation();
    const payload = feed.payload;
    if (!payload) return null;

    const coverUrl = payload.cover;
    const title = payload.title;

    const [aspectRatio, setAspectRatio] = useState(() => {
        if (coverUrl && aspectRatioCache.has(coverUrl)) {
            return aspectRatioCache.get(coverUrl);
        }
        return null;
    });

    useEffect(() => {
        if (coverUrl && !aspectRatioCache.has(coverUrl)) {
            Image.getSize(coverUrl, (width, height) => {
                const ratio = width / height;
                aspectRatioCache.set(coverUrl, ratio);
                setAspectRatio(ratio);
            }, (error) => console.log(error));
        }
    }, [coverUrl]);

    const handlePress = () => {
        navigation.navigate('CommentScreen', {feedId: feed.id});
    };

    return (
        <View style={{ marginTop: 5 }}>
             <View style={[
                styles.mediaSection,
                { height: aspectRatio ? imageWidth / aspectRatio : 240 },
                { width: Dimensions.get("window").width, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
            ]}>
                {coverUrl ? (
                    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={{flex: 1}}>
                        <Image
                            source={{uri: coverUrl}}
                            style={{height:"100%", width: imageWidth, marginLeft: leftOffset, borderRadius: 10}}
                            resizeMode="cover"
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
});

const styles = StyleSheet.create({
    mediaSection: {
        overflow: 'hidden',
        backgroundColor: '#b1aaaaff'
    }
});

export default ArticlePostContent;

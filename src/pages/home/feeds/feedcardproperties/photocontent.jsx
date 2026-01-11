import React, { memo, useState, useEffect, useRef } from 'react';
import {View, Dimensions, FlatList, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Image as RemoteImage } from 'expo-image';

const aspectRatioCache = new Map();
const MEDIA_HEIGHT = 470;
const MEDIA_WIDTH = 240;

const SkeletonLoader = ({ style }) => {
    const animValue = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(animValue, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View style={[style, { opacity: animValue, backgroundColor: '#dddddd' }]} />
    );
};

const FeedImageItem = memo(({ uri, targetHeight, maxWidth, marginRight, onPress }) => {
    const [width, setWidth] = useState(() => {
        if (aspectRatioCache.has(uri)) {
            return Math.min(targetHeight * aspectRatioCache.get(uri), maxWidth);
        }
        return maxWidth;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (aspectRatioCache.has(uri)) {
            setWidth(Math.min(targetHeight * aspectRatioCache.get(uri), maxWidth));
        } else {
            Image.getSize(uri, (w, h) => {
                const aspectRatio = w / h;
                aspectRatioCache.set(uri, aspectRatio);
                const calculatedWidth = targetHeight * aspectRatio;
                setWidth(Math.min(calculatedWidth, maxWidth));
            }, (error) => console.log(error));
        }
    }, [uri, targetHeight, maxWidth]);

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{
            height: "100%",
            width: width,
            marginRight: marginRight,
            borderRadius: 10,
            overflow: 'hidden',
        }}>
            {isLoading && <SkeletonLoader style={StyleSheet.absoluteFill} />}
            <Image
                source={{ uri: uri }}
                style={{
                    height: "100%",
                    width: "100%",
                }}
                resizeMode="contain"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
            />
        </TouchableOpacity>
    );
});

const PhotoPostContent = memo(({ media, imageWidth, leftOffset, rightOffset, onImagePress }) => {
    const isMultiMedia = media.length > 1;
    const mediaUrl = media.length > 0 ? media[0].url : null;
    const [isLoading, setIsLoading] = useState(true);
    const [aspectRatio, setAspectRatio] = useState(() => {
        if (mediaUrl && aspectRatioCache.has(mediaUrl)) {
            return aspectRatioCache.get(mediaUrl);
        }
        return null;
    });

    useEffect(() => {
        if (mediaUrl && !aspectRatioCache.has(mediaUrl)) {
            Image.getSize(mediaUrl, (width, height) => {
                const ratio = width / height;
                aspectRatioCache.set(mediaUrl, ratio);
                setAspectRatio(ratio);
            }, (error) => console.log(error));
        }
    }, [mediaUrl]);

    if (!media || media.length === 0) return null;

    return (
        <View style={[
            styles.mediaSection,
            { height: isMultiMedia ? MEDIA_HEIGHT : undefined },
            { width: Dimensions.get("window").width, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
        ]}>
            {isMultiMedia ? (
                <FlatList
                    data={media}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}
                    keyExtractor={(item, index) => String(index)}
                    renderItem={({ item, index }) => (
                        <FeedImageItem
                            uri={item.url}
                            targetHeight={MEDIA_HEIGHT}
                            maxWidth={MEDIA_WIDTH}
                            marginRight={10}
                            onPress={() => onImagePress(item.url)}
                        />
                    )}
                    initialNumToRender={1}
                    maxToRenderPerBatch={1}
                    windowSize={1}
                    decelerationRate="fast"
                    snapToInterval={MEDIA_WIDTH + 10}
                />
            ) : (
                <TouchableOpacity onPress={() => onImagePress(media[0].url)} activeOpacity={1} style={{marginLeft: leftOffset, width: MEDIA_WIDTH, height: MEDIA_HEIGHT, borderRadius: 10, backgroundColor: '#000', overflow: 'hidden'}}>
                    {isLoading && <SkeletonLoader style={StyleSheet.absoluteFill} />}
                    <RemoteImage
                        source={{uri: media[0].url}}
                        style={{height:"100%", width: "100%", borderRadius: 10}}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    mediaSection: {
        overflow: "hidden",
        backgroundColor: '#b1aaaaff'
    }
});

export default PhotoPostContent;
export { SkeletonLoader };

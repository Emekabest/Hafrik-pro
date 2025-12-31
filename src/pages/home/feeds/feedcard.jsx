import { Ionicons } from "@expo/vector-icons";
import {Image, StyleSheet, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback, ScrollView, Dimensions, Alert, ActivityIndicator, Animated, TextInput } from "react-native";
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useEffect, memo } from "react";
import AppDetails from "../../../helpers/appdetails";
import CalculateElapsedTime from "../../../helpers/calculateelapsedtime";
import ToggleFeedController from "../../../controllers/tooglefeedcontroller";
import { useAuth } from "../../../AuthContext";
import getUserPostInteractionController from "../../../controllers/getuserpostinteractioncontroller";
import ShareModal from "./share";
import { Image as RemoteImage } from "expo-image";
import cacheVideo from '../../../helpers/cachemedia';
import OptionsModal from "./options";
import SvgIcon from "../../../assl.js/svg/svg";



const aspectRatioCache = new Map();

const SkeletonLoader = ({ style }) => {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: false,
                }),
                Animated.timing(animValue, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: false,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const backgroundColor = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['#f3f3f3', '#dddddd']
    });

    return (
        <Animated.View style={[style, { backgroundColor }]} />
    );
};

// #region Media Item Components
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

const FeedVideoItem = memo(({ videoUrl, thumbnail, targetHeight, maxWidth, marginRight, currentPlayingId, setCurrentPlayingId, uniqueId, isFocused, isMuted, setIsMuted, feedId }) => {
    const navigation = useNavigation();
    const [width, setWidth] = useState(() => {
        if (thumbnail && aspectRatioCache.has(thumbnail)) {
            return Math.min(targetHeight * aspectRatioCache.get(thumbnail), maxWidth);
        }
        return maxWidth;
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const video = useRef(null);
    const [hasError, setHasError] = useState(false);
    const [source, setSource] = useState(videoUrl);
    const lastTap = useRef(null);

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            navigation.navigate('CommentScreen', {feedId: feedId});
        } else {
            lastTap.current = now;
        }
    };

    if (hasError) {
        return (
            <View style={{
                height: "100%",
                width: width,
                marginRight: marginRight,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: '#202020',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Ionicons name="alert-circle-outline" size={24} color="#fff" />
                <Text style={{color: '#fff', fontSize: 12, marginTop: 5, textAlign: 'center'}}>Something went wrong{'\n'}Please try again</Text>
                <TouchableOpacity onPress={() => setHasError(false)} style={{marginTop: 10, padding: 5, backgroundColor: '#333', borderRadius: 5}}>
                    <Text style={{color: '#fff', fontSize: 12}}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    useEffect(() => {
        if (thumbnail) {
            if (aspectRatioCache.has(thumbnail)) {
                setWidth(Math.min(targetHeight * aspectRatioCache.get(thumbnail), maxWidth));
            } else {
                Image.getSize(thumbnail, (w, h) => {
                    const aspectRatio = w / h;
                    aspectRatioCache.set(thumbnail, aspectRatio);
                    const calculatedWidth = targetHeight * aspectRatio;
                    setWidth(Math.min(calculatedWidth, maxWidth));
                }, (error) => console.log(error));
            }
        }
    }, [thumbnail, targetHeight, maxWidth]);

    useEffect(() => {
        const prepareVideo = async () => {
            const cachedSource = await cacheVideo(videoUrl);
            setSource(cachedSource);
        };

        prepareVideo();
    }, [videoUrl]);

    //Create a function that says hello world
    const sayHelloWorld = () => {
        console.log("Hello World");
    };

    return (
        <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={{
            height: "100%",
            width: width,
            marginRight: marginRight,
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: '#000',
        }}>
            <Video
                ref={video}
                style={{ width: "100%", height: "100%" }}
                source={{
                    uri: source,
                }}
                shouldPlay={currentPlayingId === uniqueId && isFocused}
                useNativeControls={false}
                isMuted={isMuted}
                resizeMode={ResizeMode.CONTAIN}
                isLooping={true}
                posterSource={{ uri: thumbnail }}
                posterStyle={{ resizeMode: 'contain', height: '100%', width: '100%' }}
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
                onLoadStart={() => setIsBuffering(true)}
                onError={(error) => {
                    setHasError(true);
                    setIsBuffering(false);
                }}
            />
            <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2, opacity: (isBuffering && !isPlaying) ? 1 : 0}]} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" animating={isBuffering && !isPlaying} />
            </View>
            
            <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.muteButton}>
                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="blue" />
            </TouchableOpacity>
        </View>
        </TouchableWithoutFeedback>
    );
});
// #endregion



// #region Post Content Components...............................................................
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
            { height: isMultiMedia ? 600 : undefined },
            { width: Dimensions.get("window").width, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
        ]}>
            {isMultiMedia ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}>
                    {media.map((item, index) => (
                        <FeedImageItem
                            key={index}
                            uri={item.url}
                            targetHeight={600}
                            maxWidth={300}
                            marginRight={10}
                            onPress={() => onImagePress(item.url)}
                        />
                    ))}
                </ScrollView>
            ) : (
                <TouchableOpacity onPress={() => onImagePress(media[0].url)} activeOpacity={1} style={{marginLeft: leftOffset, width: 300, height: 600, borderRadius: 10, backgroundColor: '#000', overflow: 'hidden'}}>
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

const VideoPostContent = memo(({ media, imageWidth, leftOffset, rightOffset, currentPlayingId, setCurrentPlayingId, parentFeedId, isMuted, setIsMuted, isFocused }) => {
    const navigation = useNavigation();
    const isMultiMedia = media.length > 1;
    const mediaItem = media.length > 0 ? media[0] : null;
    const mediaUrl = mediaItem ? mediaItem.thumbnail : null;
    
    const [aspectRatio, setAspectRatio] = useState(() => {
        if (mediaUrl && aspectRatioCache.has(mediaUrl)) {
            return aspectRatioCache.get(mediaUrl);
        }
        if (mediaItem && mediaItem.width && mediaItem.height){
            const ratio = mediaItem.width / mediaItem.height;
            if (mediaUrl) aspectRatioCache.set(mediaUrl, ratio);
            return ratio;
        }
        return null;
    });
    
    const singleVideoRef = useRef(null);
    const [isSingleVideoPlaying, setIsSingleVideoPlaying] = useState(false);
    const [isSingleVideoFinished, setIsSingleVideoFinished] = useState(false);
    const [isSingleVideoBuffering, setIsSingleVideoBuffering] = useState(false);
    const [isSingleVideoError, setIsSingleVideoError] = useState(false);
    const uniqueId = `${parentFeedId}_video_0`;
    const lastTap = useRef(null);
    const [source, setSource] = useState(mediaItem ? mediaItem.video_url : null);

    useEffect(() => {
        if (!isMultiMedia && mediaItem && mediaItem.video_url) {
            const prepareVideo = async () => {
                const cachedSource = await cacheVideo(mediaItem.video_url);
                setSource(cachedSource);
            };
            prepareVideo();
        }
    }, [isMultiMedia, mediaItem]);

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            navigation.navigate('CommentScreen', {feedId: parentFeedId});
        } else {
            lastTap.current = now;
        }
    };

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
            { height: isMultiMedia ? 600 : undefined },
            { width: Dimensions.get("window").width, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
        ]}>
            {isMultiMedia ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}>
                    {media.map((item, index) => (
                        <FeedVideoItem
                            key={index}
                            videoUrl={item.video_url}
                            thumbnail={item.thumbnail}
                            targetHeight={600}
                            maxWidth={300}
                            marginRight={10}
                            currentPlayingId={currentPlayingId}
                            setCurrentPlayingId={setCurrentPlayingId}
                            uniqueId={`${parentFeedId}_video_${index}`}
                            isFocused={isFocused}
                            isMuted={isMuted}
                            setIsMuted={setIsMuted}
                            feedId={parentFeedId}
                        />
                    ))}
                </ScrollView>
            ) : (
                isSingleVideoError ? (
                    <View style={{width: 300, height: 600, marginLeft: leftOffset, borderRadius: 10, overflow: 'hidden', backgroundColor: '#202020', justifyContent: 'center', alignItems: 'center'}}>
                        <Ionicons name="alert-circle-outline" size={30} color="#fff" />
                        <Text style={{color: '#fff', fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                        <TouchableOpacity onPress={() => setIsSingleVideoError(false)} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 20}}>
                            <Text style={{color: '#fff', fontSize: 12}}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                <TouchableWithoutFeedback onPress={handleDoubleTap}>
                <View style={{width: 300, height: 600, marginLeft: leftOffset, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000'}}>
                    <Video
                        ref={singleVideoRef}
                        style={{height:"100%", width: "100%"}}
                        source={{ uri: source }}
                        shouldPlay={currentPlayingId === uniqueId && isFocused}
                        useNativeControls={false}
                        isMuted={isMuted}
                        isLooping={true}
                        resizeMode={ResizeMode.CONTAIN}
                        posterSource={{ uri: mediaItem.thumbnail }}
                        posterStyle={{ resizeMode: 'contain', height: '100%', width: '100%' }}
                        usePoster={true}
                        onLoad={(status) => {
                            if (status.naturalSize && status.naturalSize.height > 0 && !aspectRatio) {
                                const ratio = status.naturalSize.width / status.naturalSize.height;
                                setAspectRatio(ratio);
                                if (mediaUrl) aspectRatioCache.set(mediaUrl, ratio);
                            }
                        }}
                        onPlaybackStatusUpdate={status => {
                            setIsSingleVideoPlaying(status.isPlaying);
                            setIsSingleVideoBuffering(status.isBuffering);
                            if (status.didJustFinish) setIsSingleVideoFinished(true);
                            if (status.isPlaying) {
                                setIsSingleVideoFinished(false);
                            }
                        }}
                        onLoadStart={() => setIsSingleVideoBuffering(true)}
                        onError={(error) => {
                            setIsSingleVideoError(true);
                            setIsSingleVideoBuffering(false);
                        }}
                    />
                    <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2, opacity: (isSingleVideoBuffering && !isSingleVideoPlaying) ? 1 : 0}]} pointerEvents="none">
                        <ActivityIndicator size="large" color="#fff" animating={isSingleVideoBuffering && !isSingleVideoPlaying} />
                    </View>

                    <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.muteButton}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
                    </TouchableOpacity>
                </View>
                </TouchableWithoutFeedback>
                )
            )}
        </View>
    );
});

const ProductPostContent = memo(({ feed, imageWidth, leftOffset, rightOffset }) => {
    const navigation = useNavigation();
    const products = feed.media || [];
    
    if (products.length === 0) return null;

    if (products.length === 1) {
        const product = products[0];
        const images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
        const inStock = (product.quantity && product.quantity > 0) || false;

        return (
            <View style={{ marginTop: 5 }}>
                <View style={{ 
                    width: Dimensions.get("window").width, 
                    marginLeft: -leftOffset, 
                    marginBottom: 10 
                }}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}
                        snapToInterval={imageWidth + 10}
                        decelerationRate="fast"
                    >
                        {images.length > 0 ? images.map((img, index) => (
                            <View key={index} style={{ width: imageWidth, marginRight: 10 }}>
                                <View style={{ width: '100%', height: imageWidth, borderRadius: 10, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                                    <RemoteImage 
                                        source={{ uri: img }} 
                                        style={{ width: '100%', height: '100%' }} 
                                        contentFit="cover" 
                                        cachePolicy="memory-disk"
                                    />
                                    {images.length > 1 && (
                                        <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{index + 1}/{images.length}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )) : (
                            <View style={{ width: imageWidth, marginRight: 10 }}>
                                <View style={{ width: '100%', height: imageWidth, borderRadius: 10, backgroundColor: '#f0f0f0', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="image-outline" size={40} color="#ccc" />
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>

                <View style={{ paddingHorizontal: 2 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }} numberOfLines={1}>{product.name || product.title || 'Product Name'}</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: AppDetails.primaryColor || '#000', marginTop: 2 }}>
                        {feed.currency || '$'}{product.price || '0.00'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons key={i} name="star" size={12} color="#FFD700" />
                        ))}
                        <Text style={{ fontSize: 12, color: '#787878ff', marginLeft: 5 }}>0.0 (0 Reviews)</Text>
                    </View>
                    {feed.text ? <Text style={{ color: '#787878ff', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{feed.text}</Text> : null}
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
                        <TouchableOpacity style={{ 
                            flex: 1,
                            backgroundColor: inStock ? (AppDetails.primaryColor || '#000') : '#ccc', 
                            paddingVertical: 10, 
                            borderRadius: 50, 
                            alignItems: 'center',
                            marginRight: 10
                        }}
                        activeOpacity={1}
                        disabled={!inStock}
                        >
                            <Text style={{ fontWeight: '600', fontSize: 13, color: '#ffffffff' }}>{inStock ? 'Buy' : 'Out of Stock'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={{ 
                                width: 50,
                                backgroundColor: '#f0f0f0', 
                                paddingVertical: 10, 
                                borderRadius: 50, 
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Ionicons name="chatbubble-outline" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="cube-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: '#555' }}>
                                <Text style={{ color: inStock ? 'green' : 'red', fontWeight: '600' }}>{inStock ? 'In stock' : 'Out of stock'}</Text> • New
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: '#555' }} numberOfLines={1}>{product.location || feed.location || "Location, City"}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="pricetag-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: '#555' }}>{product.category_id ? `Category` : (feed.category || "Category")}</Text>
                        </View>
                    </View>
                    
                </View>
            </View>
        );
    }
    
    return (
        <View style={{ marginTop: 5 }}>
            <View style={{ 
                width: Dimensions.get("window").width, 
                marginLeft: -leftOffset, 
                marginBottom: 10 
            }}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}
                    snapToInterval={imageWidth + 10}
                    decelerationRate="fast"
                >
                    {products.map((product, index) => {
                        const productImage = (product.images && product.images.length > 0) ? product.images[0] : product.image;
                        const inStock = (product.quantity && product.quantity > 0) || false;

                        return (
                        <View key={index} style={{ width: imageWidth, marginRight: 10 }}>
                            <View style={{ width: '100%', height: imageWidth, borderRadius: 10, backgroundColor: '#f0f0f0', overflow: 'hidden', marginBottom: 10 }}>
                                {productImage ? (
                                <Image 
                                    source={{ uri: productImage }} 
                                    style={{ width: '100%', height: '100%' }} 
                                    resizeMode="cover" 
                                />
                                ) : (
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f8f8' }}>
                                        <Ionicons name="image-outline" size={40} color="#ccc" />
                                    </View>
                                )}
                                {products.length > 1 && (
                                    <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{index + 1}/{products.length}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ paddingHorizontal: 2 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }} numberOfLines={1}>{product.name || product.title || 'Product Name'}</Text>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: AppDetails.primaryColor || '#000', marginTop: 2 }}>
                                    {feed.currency || '$'}{product.price || '0.00'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Ionicons key={i} name="star" size={12} color="#FFD700" />
                                    ))}
                                    <Text style={{ fontSize: 12, color: '#787878ff', marginLeft: 5 }}>0.0 (0 Reviews)</Text>
                                </View>
                                {feed.text ? <Text style={{ color: '#787878ff', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{feed.text}</Text> : null}
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
                                    <TouchableOpacity style={{ 
                                        flex: 1,
                                        backgroundColor: inStock ? (AppDetails.primaryColor || '#000') : '#ccc', 
                                        paddingVertical: 10, 
                                        borderRadius: 50, 
                                        alignItems: 'center',
                                        marginRight: 10
                                    }}
                                    activeOpacity={1}
                                    disabled={!inStock}
                                    >
                                        <Text style={{ fontWeight: '600', fontSize: 13, color: '#ffffffff' }}>{inStock ? 'Buy' : 'Out of Stock'}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={{ 
                                            width: 50,
                                            backgroundColor: '#f0f0f0', 
                                            paddingVertical: 10, 
                                            borderRadius: 50, 
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={20} color="#333" />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ marginTop: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Ionicons name="cube-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, color: '#555' }}>
                                            <Text style={{ color: inStock ? 'green' : 'red', fontWeight: '600' }}>{inStock ? 'In stock' : 'Out of stock'}</Text> • New
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, color: '#555' }} numberOfLines={1}>{product.location || feed.location || "Location, City"}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="pricetag-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, color: '#555' }}>{product.category_id ? `Category` : (feed.category || "Category")}</Text>
                                    </View>
                                </View>
                                
                            </View>
                        </View>
                    );
                    })}
                </ScrollView>
            </View>
        </View>
    );
});

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

const PollPostContent = memo(({ feed }) => {
    let options = [];

    if (feed.payload && Array.isArray(feed.payload.options)) {
        options = feed.payload.options;
    } else {
        const pollMedia = (feed.media && Array.isArray(feed.media) && feed.media.length > 0) ? feed.media[0] : null;
        options = (pollMedia && Array.isArray(pollMedia.options) && pollMedia.options.length > 0) 
            ? pollMedia.options 
            : (Array.isArray(feed.options) ? feed.options : []);
    }

    const [votedId, setVotedId] = useState(feed.user_voted_id || null);
    
    if (!options || options.length === 0) return null;

    // Calculate total votes
    const totalVotes = options.reduce((acc, opt) => acc + (opt.votes || 0), 0) + (votedId && !feed.user_voted_id ? 1 : 0);

    const handleVote = (id) => {
        if (votedId) return;
        setVotedId(id);


        // API integration would happen here
    };

    return (
        <View style={{ marginTop: 5, paddingRight: 5, width: '100%' }}>
            {options.map((option, index) => {
                const isSelected = votedId === option.id;
                const votes = (option.votes || 0) + (isSelected && !feed.user_voted_id ? 1 : 0);
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const primaryColor = AppDetails.primaryColor || '#000000';

                return (
                    <View key={option.id || index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity 
                            onPress={() => handleVote(option.id)}
                            disabled={!!votedId}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                height: 45,
                                justifyContent: 'center',
                                borderRadius: 50,
                                borderWidth: 1,
                                borderColor: isSelected ? primaryColor : '#e0e0e0',
                                backgroundColor: '#fff',
                                overflow: 'hidden'
                            }}
                        >
                            {votedId && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    width: `${percentage}%`,
                                    backgroundColor: isSelected ? (primaryColor + '33') : '#f5f5f5', 
                                }} />
                            )}
                            
                            <View style={{ paddingHorizontal: 12 }}>
                                <Text style={{ fontWeight: isSelected ? '600' : '400', color: '#333', fontSize: 14 }}>{option.text}</Text>
                            </View>
                        </TouchableOpacity>
                        {votedId && (
                            <View style={{ 
                                width: 30, 
                                height: 30, 
                                borderRadius: 15, 
                                backgroundColor: '#f0f0f0', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                marginLeft: 8 
                            }}>
                                <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>{votes}</Text>
                            </View>
                        )}
                    </View>
                )
            })}
            <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 2 }}>
                <Text style={{ color: '#787878ff', fontSize: 12, fontFamily:"WorkSans_400Regular" }}>{totalVotes} votes</Text>
                <Text style={{ color: '#787878ff', fontSize: 12, fontFamily:"WorkSans_400Regular" }}> • {feed.expires_at ? 'Ends soon' : 'Final results'}</Text>
            </View>
        </View>
    );
});


const SharedPostCard = memo(({ post, currentPlayingId, setCurrentPlayingId, parentFeedId, isMuted, setIsMuted, isFocused }) => {
    const navigation = useNavigation();
    const isVideo = post.type === 'video' || post.type === 'reel';
    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;

    const mediaUrl = mediaItem ? (isVideo ? mediaItem.thumbnail : mediaItem.url) : null;
    const [aspectRatio, setAspectRatio] = useState(() => {
        if (mediaUrl && aspectRatioCache.has(mediaUrl)) {
            return aspectRatioCache.get(mediaUrl);
        }
        if (mediaItem && mediaItem.width && mediaItem.height) {
            const ratio = mediaItem.width / mediaItem.height;
            if (mediaUrl) aspectRatioCache.set(mediaUrl, ratio);
            return ratio;
        }
        return 16 / 9; // Default aspect ratio
    });

    useEffect(() => {
        if (mediaUrl && !aspectRatioCache.has(mediaUrl)) {
            Image.getSize(mediaUrl, (width, height) => {
                if (height > 0) {
                    const ratio = width / height;
                    aspectRatioCache.set(mediaUrl, ratio);
                    setAspectRatio(ratio);
                }
            }, (error) => console.log(error));
        }
    }, [mediaUrl]);
    
    // Video specific state
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const lastTap = useRef(null);
    const [source, setSource] = useState(mediaItem ? mediaItem.video_url : null);

    useEffect(() => {
        if (isVideo && mediaItem && mediaItem.video_url) {
            const prepareVideo = async () => {
                const cachedSource = await cacheVideo(mediaItem.video_url);
                setSource(cachedSource);
            };
            prepareVideo();
        }
    }, [isVideo, mediaItem]);

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            navigation.navigate('CommentScreen', {feedId: post.id});
        } else {
            lastTap.current = now;
        }
    };

    const uniqueId = `${parentFeedId}_shared`;

    const screenWidth = Dimensions.get("window").width;
    // containerRight padding (5*2) + shared post border (1*2) + shared post padding (10*2)
    const mediaWidth = screenWidth * 0.87 - 10 - 2 - 20;

    return (
        <View style={styles.sharedPostContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={{ uri: post.user.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontFamily:"WorkSans_600SemiBold" }}>{post.user.full_name}</Text>
                    <Text style={{ color: '#787878ff', fontFamily:"WorkSans_400Regular" }}>{CalculateElapsedTime(post.created)}</Text>
                </View>
            </View>
            {post.text ? <Text style={{ marginTop: 10, fontFamily: "WorkSans_400Regular" }}>{post.text}</Text> : null}
            {post.type === 'poll' ? (
                <PollPostContent feed={post} />
            ) : post.type === 'article' && post.payload ? (
                <TouchableOpacity onPress={() => navigation.navigate('CommentScreen', {feedId: post.id})} activeOpacity={0.8} style={{ marginTop: 10 }}>
                    {post.payload.cover && (
                        <Image 
                            source={{ uri: post.payload.cover }} 
                            style={{ width: '100%', height: 160, borderRadius: 8, backgroundColor: '#f0f0f0' }} 
                            resizeMode="cover" 
                        />
                    )}
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }} numberOfLines={2}>{post.payload.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: '#787878', fontWeight: '500' }}>Read article</Text>
                            <Ionicons name="arrow-forward" size={12} color="#787878" style={{ marginLeft: 2 }} />
                        </View>
                    </View>
                </TouchableOpacity>
            ) : (
                mediaItem ? (
                    hasError ? (
                        <View style={{ width: 300, height: 600, marginTop: 10, backgroundColor: '#202020', borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="alert-circle-outline" size={30} color="#fff" />
                            <Text style={{color: '#fff', fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                            <TouchableOpacity onPress={() => setHasError(false)} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 20}}>
                                <Text style={{color: '#fff', fontSize: 12}}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                    <TouchableWithoutFeedback onPress={handleDoubleTap}>
                    <View style={{ width: 300, height: 600, marginTop: 10, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden' }}>
                        {isVideo ? (
                            <View style={{flex: 1, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden'}}>
                                <Video
                                    ref={videoRef}
                                    style={{ width: "100%", height: "100%" }}
                                    source={{ uri: source }}
                                    shouldPlay={currentPlayingId === uniqueId && isFocused}
                                    resizeMode={ResizeMode.CONTAIN}
                                    posterSource={{ uri: mediaItem.thumbnail }}
                                    posterStyle={{ resizeMode: 'contain', height: '100%', width: '100%' }}
                                    usePoster={true}
                                    useNativeControls={false}
                                    isMuted={isMuted}
                                    isLooping={true}
                                    onLoad={(status) => {
                                        if (status.naturalSize && status.naturalSize.height > 0 && !aspectRatioCache.has(mediaUrl)) {
                                            const ratio = status.naturalSize.width / status.naturalSize.height;
                                            setAspectRatio(ratio);
                                            if (mediaUrl) aspectRatioCache.set(mediaUrl, ratio);
                                        }
                                    }}
                                    onPlaybackStatusUpdate={status => {
                                        setIsPlaying(status.isPlaying);
                                        setIsBuffering(status.isBuffering);
                                        if (status.didJustFinish) setIsFinished(true);
                                        if (status.isPlaying) {
                                            setIsFinished(false);
                                        }
                                    }}
                                    onLoadStart={() => setIsBuffering(true)}
                                    onError={(error) => {
                                        setHasError(true);
                                        setIsBuffering(false);
                                    }}
                                />
                                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2, opacity: (isBuffering && !isPlaying) ? 1 : 0}]} pointerEvents="none">
                                    <ActivityIndicator size="large" color="#fff" animating={isBuffering && !isPlaying} />
                                </View>

                                <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.muteButton}>
                                    <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {isImageLoading && <SkeletonLoader style={StyleSheet.absoluteFill} />}
                                <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="contain" onLoadStart={() => setIsImageLoading(true)} onLoadEnd={() => setIsImageLoading(false)} />
                            </>
                        )}
                    </View>
                    </TouchableWithoutFeedback>
                    )
                ) : null
            )}
        </View>
    );
});


const PostContent = memo(({ feed, imageWidth, leftOffset, rightOffset, onImagePress, currentPlayingId, setCurrentPlayingId, isMuted, setIsMuted, isFocused }) => {
    const isVideo = feed.type === 'video' || feed.type === 'reel';

    if (feed.type === 'shared' && feed.shared_post) {
        return <SharedPostCard post={feed.shared_post} currentPlayingId={currentPlayingId} setCurrentPlayingId={setCurrentPlayingId} parentFeedId={feed.id} isMuted={isMuted} setIsMuted={setIsMuted} isFocused={isFocused} />;
    }

    if (feed.type === 'product') {
        return <ProductPostContent feed={feed} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} />;
    }

    if (feed.type === 'article') {
        return <ArticlePostContent feed={feed} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} onImagePress={onImagePress} />;
    }

    if (feed.type === 'poll') {
        return <PollPostContent feed={feed} />;
    }
    else{
    }

    if (feed.media && feed.media.length > 0) {
        if (isVideo) {
            return <VideoPostContent media={feed.media} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} currentPlayingId={currentPlayingId} setCurrentPlayingId={setCurrentPlayingId} parentFeedId={feed.id} isMuted={isMuted} setIsMuted={setIsMuted} isFocused={isFocused} />;
        }
        return <PhotoPostContent media={feed.media} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} onImagePress={onImagePress} />;
    }

    return null; // Return null if there is no media and it's not a shared post
});

// #endregion



















//MAIN CARD.........................................................
const FeedCard = ({ feed, currentPlayingId, setCurrentPlayingId, isFocused })=>{
    const navigation = useNavigation();
    const [isMuted, setIsMuted] = useState(false);
    const [showProfileOptions, setShowProfileOptions] = useState(false);
    const [showPostOptions, setShowPostOptions] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(parseInt(feed.likes_count) || 0);
    const { token } = useAuth();

    useEffect(()=>{

        const getUserPostInteraction = async()=>{
            if(token){
                const response = await getUserPostInteractionController(feed.id, token)
                
                if(response && response.data){
                    setLiked(!!response.data.liked)
                }
            }
        }

        getUserPostInteraction()
    },[feed.id, token])
    
    const iconRef = useRef(null);

    const screenWidth = Dimensions.get("window").width;
    // Calculate offset: Container Padding (10) + Left Column Width (13% of available space) + Right Column Padding (5)
    const leftOffset = 10 + ((screenWidth - 20) * 0.13) + 5;
    const rightOffset = 15;
    const imageWidth = screenWidth - leftOffset - rightOffset;

    const handleOpenOptions = () => {
        iconRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPosition({ top: y + height, left: x });
            setShowProfileOptions(true);
        });
    };


    const handleSaveImage = () => {
        // To implement actual saving, you would typically use expo-media-library and expo-file-system

        // Alert.alert("Save Image", "Image saved to gallery!");
    };


    /**Handles when the user likes a feed post */
    const handleLike = async() => {  
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);

        const response = await ToggleFeedController(feed.id, token)
    };
    /**.................................................................... */



    const getActionText = () => {
        if (feed.type === 'product') {
            return " added product for sale";
        }
        if (feed.type === 'article') {
            return " added a blog";
        }
        if (feed.type === 'poll') {
            return " created a poll";
        }
        if (feed.type === 'profile_picture') {
            return " updated the profile picture";
        }
        if (feed.type === 'profile_cover') {
            return " updated the cover photo";
        }
        if (feed.type === 'video'){
            return " added a video";
        }
        if (feed.type === 'reel'){
            return " added a reel";
        } 
        if (feed.media && feed.media.length > 0) {
            const isVideo = feed.type === 'video' || feed.type === 'reel';
            if (!isVideo) {
                const count = feed.media.length;
                return ` added ${count} photo${count > 1 ? 's' : ''}`;
            }
        }
        if (feed.type === 'shared') return " shared a post";
        return "";
    };


    return(
        <View style = {styles.container}>
            <View style = {styles.containerLeft}>
                <View style = {styles.ProfileContainer}>
                    <View style = {styles.ImageContainer}>
                        <Image
                            source={{uri:feed.user.avatar}}
                            style={{height:"100%", width:"100%"}}
                        />

                    </View>
                    <TouchableOpacity 
                        ref={iconRef}
                        activeOpacity={1} 
                        style = {[styles.profileIconContainer, {backgroundColor:AppDetails.primaryColor}]} 
                        onPress={handleOpenOptions}
                    >
                            <Ionicons name="add" size={16} style={{color:"#fff", fontWeight:"bold"}} />
                    </TouchableOpacity>

                    <Modal
                        visible={showProfileOptions}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowProfileOptions(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setShowProfileOptions(false)}>
                            <View style={styles.modalOverlay}>
                                <View style={[styles.profileOptionsModal, { top: menuPosition.top, left: menuPosition.left }]}>
                                    <TouchableOpacity style={styles.profileOptionItem} onPress={() => setShowProfileOptions(false)}>
                                        <Text style={styles.profileOptionText}>Visit Profile</Text>
                                    </TouchableOpacity>
                                    <View style={styles.divider} />
                                    <TouchableOpacity style={styles.profileOptionItem} onPress={() => setShowProfileOptions(false)}>
                                        <Text style={styles.profileOptionText}>Follow</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>

                </View>
            </View>


            <View style = {styles.containerRight}>
                <View style = {styles.firstSection}>
                    <View style = {styles.fullnameSection}>
                        <Text style={{marginBottom: 4, flexWrap: 'wrap'}}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style = { {color:"#000", fontFamily:"WorkSans_600SemiBold"}}>{feed.user.full_name}</Text>
                            {
                                feed.user.verified ? (
                                    <View style={{ transform: [{ translateY: 6}, { translateX: 2 }], marginHorizontal: 3 }}>
                                        <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />
                                    </View>
                                ) : null
                            }
                

                            <Text style={{color: "#333", fontFamily:"WorkSans_400Regular"}}>{getActionText()}</Text>
                        </Text>
                        <Text style = {{color:"#787878ff", fontSize: 12, fontFamily:"WorkSans_400Regular"}}>{CalculateElapsedTime(feed.created)}</Text>
                    </View>


                    <TouchableOpacity style = {styles.options} onPress={() => setShowPostOptions(true)}>
                        <Ionicons name="ellipsis-horizontal" size={20} style={{color:"#333", fontWeight:"bold"}} />
                    </TouchableOpacity>
                </View>

                {feed.text ? (
                    <TouchableOpacity onPress={() => navigation.navigate('CommentScreen', {feedId: feed.id})} activeOpacity={1} style={styles.textSection}>
                        <Text style = {{fontSize:14, color:"#000", fontFamily:"WorkSans_400Regular"}}>{feed.text}</Text>
                    </TouchableOpacity>
                ) : <View style = {styles.textSection} />}

                <PostContent 
                    feed={feed}
                    imageWidth={imageWidth}
                    leftOffset={leftOffset}
                    rightOffset={rightOffset}
                    onImagePress={setFullScreenImage}
                    currentPlayingId={currentPlayingId}
                    setCurrentPlayingId={setCurrentPlayingId}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    isFocused={isFocused}
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 2 }}>
                    <Ionicons name="eye-outline" size={16} style={{color:"#787878ff", marginRight: 4}} />
                    <Text style={{ fontSize: 12, color: "#787878ff", fontFamily:"WorkSans_400Regular" }}>{feed.views}</Text>
                </View>

                <View style = {[styles.engagementBar, { marginTop: 5 }]}>
                    <TouchableOpacity style = {[styles.likeSection, styles.engagementBarViews]} onPress={handleLike}>
                        <Ionicons name={liked ? "heart" : "heart-outline"} size={22} style={{color: liked ? "#ff4444" : "#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>{likeCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.commentSection, styles.engagementBarViews]} onPress={() => navigation.navigate('CommentScreen', {feedId: feed.id})}>
                        <SvgIcon name="comment" width={20} height={20} color="#333" />
                        <Text style ={styles.engagementCount}>{feed.comments_count}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.shareSection, styles.engagementBarViews]} onPress={() => setShowShareOptions(true)}>
                        <SvgIcon name="share" width={20} height={20} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.repostSection, styles.engagementBarViews]}>
                        <SvgIcon name="favourite" width={20} height={20} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <OptionsModal visible={showPostOptions} postId={feed.id} onClose={() => setShowPostOptions(false)} />

            <ShareModal visible={showShareOptions} onClose={() => setShowShareOptions(false)} feed={feed} />

            <Modal visible={!!fullScreenImage} transparent={true} onRequestClose={() => setFullScreenImage(null)} animationType="fade">
                <View style={styles.fullScreenContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveImage}>
                        <Ionicons name="download-outline" size={30} color="white" />
                    </TouchableOpacity>
                    <Image source={{uri: fullScreenImage}} style={styles.fullScreenImage} resizeMode="contain" />
                </View>
            </Modal>

        </View>
    )


}



const styles = StyleSheet.create({

    container:{
        borderTopWidth:1,
        borderTopColor:"#efefefff",
        // minHeight:150,
        width:"100%",
        padding:10,  
        display:"flex",
        flexDirection:"row",
    },

    containerLeft:{
        height:"100%",
        width:"13%",
    },


    containerRight:{
        height:"100%",
        width:"87%",
        paddingHorizontal:5,
        // backgroundColor:"#b8b058ff"

    },

    firstSection:{
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        // backgroundColor:"#929292ff"
        // alignItems:"center",
    },

    fullnameSection:{
        width:"80%",
        display:"flex",
        flexDirection:"column",
        justifyContent: "center",
    },

    options:{
        width:"20%",
        display:"flex",
        alignItems:"flex-end",
    },

    textSection:{
        paddingVertical:5,

    },

    mediaSection:{
        // width:"80%",
        // width:"100%",
        // borderRadius:10,
        overflow:"hidden",
        backgroundColor:'#b1aaaaff'
    },

    engagementBar:{
        height:30,
        width:"80%",
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        marginTop:10,

    },

    engagementBarViews:{
        height:"100%",
        width:"20%",
        display:"flex",
        flexDirection:"row",
        alignItems:"center",
        // backgroundColor:"#468137ff"
    },

    engagementCount:{
        fontSize:13,
        fontFamily:"WorkSans_400Regular",
        color:"#333",
        marginLeft: 3
    },
    
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    saveButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },

    ProfileContainer:{
        height:70,
        width:"100%",
    },


    ImageContainer:{
        height:50,
        width:"100%",
        borderRadius:50,
        overflow:"hidden",
        backgroundColor:"#e9e9e9ff"
    },

    profileIconContainer:{
        height:20,
        width:20,
        borderRadius:50,
        right:0,
        bottom:20,
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        position:"absolute",
        backgroundColor:"#a38080ff"

    },

    profileOptionsModal: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 8,
        width: 130,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1000,
    },
    profileOptionItem: {
        padding: 12,
        justifyContent: 'center',
    },
    profileOptionText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sharedPostContainer: {
        borderWidth: 1, 
        borderColor: '#e0e0e0', 
        borderRadius: 10, 
        marginTop: 10, 
        padding: 10,
        overflow: 'hidden' 
    },
    videoOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    playButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 30,
        padding: 10,
    },
    muteButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 20,
    },

})


export default memo(FeedCard);
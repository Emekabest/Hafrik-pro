import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, FlatList, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useIsFocused } from '@react-navigation/native';
import SvgIcon from '../../assl.js/svg/svg';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

// Memoized gallery item component
const GalleryItem = memo(({ item, onSelect }) => {
    const [resolving, setResolving] = useState(false);

    // ph:// URIs from MediaLibrary are not supported by VideoThumbnails or expo-video.
    // getAssetInfoAsync resolves them to a file:// localUri that everything supports.
    const handlePress = useCallback(async () => {
        if (resolving) return;
        try {
            setResolving(true);
            const info = await MediaLibrary.getAssetInfoAsync(item);
            const srcUri = info.localUri || item.uri;
            // Copy to app cache so iOS sandbox allows read access
            const ext = (srcUri.split('.').pop()?.split('?')[0] || 'mp4').toLowerCase();
            const dest = `${FileSystem.cacheDirectory}reel_${item.id}.${ext}`;
            await FileSystem.copyAsync({ from: srcUri, to: dest });
            onSelect({ ...item, uri: dest });
        } catch {
            onSelect(item); // fallback — let downstream handle it
        } finally {
            setResolving(false);
        }
    }, [item, onSelect, resolving]);

    return (
        <TouchableOpacity style={styles.galleryItem} onPress={handlePress} activeOpacity={0.75}>
            <ExpoImage
                source={{ uri: item.uri }}
                style={styles.galleryImage}
                contentFit="cover"
                cachePolicy="memory"
            />
            <Text style={styles.durationText}>{Math.round(item.duration)}s</Text>
            {resolving && (
                <View style={styles.resolvingOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                </View>
            )}
        </TouchableOpacity>
    );
});

// Memoized loading component
const LoadingComponent = memo(() => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.black} />
        <Text style={styles.loadingText}>Loading videos...</Text>
    </View>
));

// Memoized empty component
const EmptyComponent = memo(() => (
    <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No videos found</Text>
    </View>
));

// Memoized footer component
const FooterComponent = memo(() => (
    <ActivityIndicator size="small" color={Colors.black} style={styles.footerLoader} />
));

const Gallery = ({ onSelect }) => {

    const [galleryVideos, setGalleryVideos] = useState([]);
    const [permissionResponse] = MediaLibrary.usePermissions();
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [loadingGallery, setLoadingGallery] = useState(false);
    
    const isFocused = useIsFocused();
    const isFetchingRef = useRef(false);
    const prevFocusedRef = useRef(false);

    const fetchGalleryVideos = useCallback(async (cursor = null) => {
        if (isFetchingRef.current && cursor === null) return;
        isFetchingRef.current = true;
        setLoadingGallery(true);

        try {
            let permission = permissionResponse;
            if (!permission?.granted) {
                permission = await MediaLibrary.requestPermissionsAsync(false);
                if (!permission.granted) {
                    setLoadingGallery(false);
                    isFetchingRef.current = false;
                    Alert.alert(
                        "Permission Required",
                        "Please grant access to all photos and videos in your device settings to see your recent videos.",
                        [{ text: "OK" }]
                    );
                    return;
                }
            }

            const { assets, endCursor: newCursor, hasNextPage: next } = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.video,
                sortBy: [MediaLibrary.SortBy.modificationTime],
                first: 50,
                after: cursor,
            });

            if (cursor === null) {
                setGalleryVideos(assets);
            } else {
                setGalleryVideos(prev => [...prev, ...assets]);
            }
            setEndCursor(newCursor);
            setHasNextPage(next);
        } catch (error) {
            console.error("Error fetching gallery videos:", error);
        } finally {
            setLoadingGallery(false);
            isFetchingRef.current = false;
        }
    }, [permissionResponse]);

    // Fetch fresh videos every time the screen gains focus
    useEffect(() => {
        if (isFocused && !prevFocusedRef.current) {
            setGalleryVideos([]);
            setEndCursor(null);
            setHasNextPage(true);
            fetchGalleryVideos(null);
        }
        prevFocusedRef.current = isFocused;
    }, [isFocused, fetchGalleryVideos]);

    const pickVideo = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaType.videos,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                onSelect(result.assets[0]);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick video");
        }
    }, [onSelect]);

    const recordVideo = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission needed", "Camera permission is required to record videos.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaType.videos,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                onSelect(result.assets[0]);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to open camera");
        }
    }, [onSelect]);

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !loadingGallery) {
            fetchGalleryVideos(endCursor);
        }
    }, [hasNextPage, loadingGallery, endCursor, fetchGalleryVideos]);

    const renderItem = useCallback(({ item }) => (
        <GalleryItem item={item} onSelect={onSelect} />
    ), [onSelect]);

    const keyExtractor = useCallback((item) => item.id, []);

    const ListEmptyComponent = useMemo(() => (
        loadingGallery ? <LoadingComponent /> : <EmptyComponent />
    ), [loadingGallery]);

    const ListFooterComponent = useMemo(() => (
        loadingGallery && galleryVideos.length > 0 ? <FooterComponent /> : null
    ), [loadingGallery, galleryVideos.length]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Video</Text>
                <TouchableOpacity onPress={pickVideo} activeOpacity={0.7}>
                    <SvgIcon name="album2" width={24} height={24} color={AppDetails.primaryColor} />
                </TouchableOpacity>
            </View>

            <View style={styles.cameraButtonContainer}>
                <TouchableOpacity style={styles.cameraButton} onPress={recordVideo} activeOpacity={0.7}>
                    <View style={styles.cameraIconContainer}>
                        <Ionicons name="camera" size={24} color={Colors.white} />
                    </View>                  
                    <Text style={styles.cameraButtonText}>Record a Video</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={galleryVideos}
                numColumns={3}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={ListEmptyComponent}
                ListFooterComponent={ListFooterComponent}
                removeClippedSubviews={true}
                maxToRenderPerBatch={15}
                windowSize={10}
                initialNumToRender={15}
                getItemLayout={(data, index) => ({
                    length: ITEM_SIZE,
                    offset: ITEM_SIZE * Math.floor(index / 3),
                    index,
                })}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral180,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    galleryItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        padding: 1,
    },
    resolvingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: withOpacity(Colors.black, 0.45),
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    durationText: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: withOpacity(Colors.black, 0.5),
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    cameraButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        paddingHorizontal: 16,
        paddingVertical: 50,
    },
    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cameraIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.neutral700,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cameraButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.neutral700,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: Colors.neutral500,
    },
    footerLoader: {
        margin: 20,
    },
});

export default memo(Gallery);
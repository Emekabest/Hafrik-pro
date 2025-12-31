import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, Dimensions, KeyboardAvoidingView, Platform, FlatList, Image, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '../AuthContext';
import CreateReelsController from '../controllers/createreelscontroller';
import UploadMediaController from '../controllers/uploadmediacontroller';
import { useIsFocused } from '@react-navigation/native';
import AppDetails from '../helpers/appdetails';

const { width } = Dimensions.get('window');

const CreateReels = ({ navigation, route }) => {
    const { token } = useAuth();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [step, setStep] = useState('gallery'); // 'gallery' | 'preview' | 'details'
    const [galleryVideos, setGalleryVideos] = useState([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoMounted, setVideoMounted] = useState(false);
    
    const isFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const uploadIdRef = useRef(0);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            setAppState(nextAppState);
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (route.params?.videoAsset) {
            const asset = route.params.videoAsset;
            setStep('preview');
            processVideoSelection(asset);
            navigation.setParams({ videoAsset: null }); // Clear params to prevent re-trigger
        }
    }, [route.params?.videoAsset]);

    // Hide Tab Bar in Preview Mode
    useLayoutEffect(() => {
        if (step === 'preview' || step === 'details') {
            navigation.setOptions({ tabBarStyle: { display: 'none' } });
        } else {
            navigation.setOptions({ tabBarStyle: { display: 'flex' } });
        }
    }, [navigation, step]);

    useEffect(() => {
        if (step === 'preview' && selectedVideo?.uri) {
            setVideoMounted(false);
            const timer = setTimeout(() => {
                setVideoMounted(true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [step, selectedVideo?.uri]);

    const fetchGalleryVideos = async (cursor = null) => {
        if (loadingGallery) return;
        setLoadingGallery(true);

        try {
            if (!permissionResponse?.granted) {
                const { granted } = await requestPermission();
                if (!granted) {
                    setLoadingGallery(false);
                    return;
                }
            }

            const { assets, endCursor: newCursor, hasNextPage: next } = await MediaLibrary.getAssetsAsync({
                mediaType: 'video',
                sortBy: ['creationTime'],
                first: 50,
                after: cursor,
            });

            setGalleryVideos(prev => cursor ? [...prev, ...assets] : assets);
            setEndCursor(newCursor);
            setHasNextPage(next);
        } catch (error) {
            console.error("Error fetching gallery videos:", error);
        } finally {
            setLoadingGallery(false);
        }
    };

    useEffect(() => {
        if (step === 'gallery' && galleryVideos.length === 0) {
            fetchGalleryVideos(null);
        }
    }, [step, permissionResponse]);

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setStep('preview');
                processVideoSelection(asset);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick video");
        }
    };

    const processVideoSelection = async (asset) => {
        setUploading(false);
        setCaption('');
        setLocation('');
        const currentId = Date.now();
        uploadIdRef.current = currentId;
        
        // 1. Set local state for preview immediately
        const localVideo = {
            uri: asset.uri,
            duration: asset.duration,
            uploading: false,
            serverUrl: null,
            thumbnailUrl: null
        };
        setSelectedVideo(localVideo);

        try {
            // 2. Generate Thumbnail
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
                time: 1000,
            });
            if (uploadIdRef.current !== currentId) return;
            setSelectedVideo(prev => ({ ...prev, localThumbnailUri: thumbUri }));
        } catch (error) {
            console.error("Error processing video selection:", error);
        }
    };

    const startUpload = async () => {
        if (!selectedVideo || selectedVideo.uploading || selectedVideo.serverUrl) return;
        
        const currentId = uploadIdRef.current;
        setUploading(true);
        setUploadProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) return 90;
                return prev + 5;
            });
        }, 500);

        try {
            // 3. Upload Video
            const videoFile = {
                uri: selectedVideo.uri,
                type: 'video/mp4',
                fileName: selectedVideo.uri.split('/').pop() || 'reel.mp4',
                fileType: 'video'
            };
            const videoResponse = await UploadMediaController(videoFile, token);
            if (uploadIdRef.current !== currentId) return;

            // 4. Upload Thumbnail
            let thumbUri = selectedVideo.localThumbnailUri;
            if (!thumbUri) {
                 const { uri } = await VideoThumbnails.getThumbnailAsync(selectedVideo.uri, { time: 1000 });
                 thumbUri = uri;
            }

            const thumbFile = {
                uri: thumbUri,
                type: 'image/jpeg',
                fileName: 'thumbnail.jpg',
                fileType: 'photo'
            };
            const thumbResponse = await UploadMediaController(thumbFile, token);
            if (uploadIdRef.current !== currentId) return;

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (videoResponse.status === "success" && thumbResponse.status === "success") {
                console.log("Upload successful. Video URL:", videoResponse.data.url, "Thumb URL:", thumbResponse.data.url);
                setSelectedVideo(prev => ({
                    ...prev,
                    uploading: false,
                    serverUrl: videoResponse.data.url,
                    thumbnailUrl: thumbResponse.data.url
                }));
                setUploading(false);
            } else {
                console.log("Upload failed. Video:", videoResponse, "Thumb:", thumbResponse);
                Alert.alert("Upload Failed", "Could not upload media.");
                setUploading(false);
            }

        } catch (error) {
            if (uploadIdRef.current !== currentId) return;
            console.error(error);
            Alert.alert("Error", "An error occurred during upload.");
            setUploading(false);
        } finally {
            // setUploading(false) is handled in success/error blocks or kept true if we want to show loading state
            clearInterval(progressInterval);
        }
    };

    const handlePost = async () => {
        if (!selectedVideo || !selectedVideo.serverUrl) {
            Alert.alert("Wait", "Please wait for video to finish uploading.");
            return;
        }

        setPosting(true);
        const postData = {
            type: 'reel',
            text: caption,
            location: location,
            media: [{
                video_url: selectedVideo.serverUrl,
                thumbnail: selectedVideo.thumbnailUrl,
                duration: selectedVideo.duration
            }]
        };

        const response = await CreateReelsController(postData, token);
        setPosting(false);

        if (response.status === 200 || response.status === 201) {
            navigation.goBack();
        } else {
            Alert.alert("Error", "Failed to create reel.");
        }
    };

    // Render Custom Gallery Step
    if (step === 'gallery') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={28} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Video</Text>
                    <TouchableOpacity onPress={pickVideo}>
                        <Ionicons name="folder-open-outline" size={28} color="black" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={galleryVideos}
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    onEndReached={() => { if (hasNextPage) fetchGalleryVideos(endCursor); }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingGallery && galleryVideos.length > 0 ? <ActivityIndicator size="small" color="#000" style={{margin: 20}} /> : null}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.galleryItem} 
                            onPress={() => {
                                setStep('preview');
                                processVideoSelection(item);
                            }}
                        >
                            <Image 
                                source={{ uri: item.uri }} 
                                style={styles.galleryImage} 
                                resizeMode="cover"
                            />
                            <Text style={styles.durationText}>{Math.round(item.duration)}s</Text>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        );
    }

    // Render Preview Step
    if (step === 'preview' && selectedVideo) {
        return (
            <View style={styles.fullScreenContainer}>
                <View style={[styles.fullScreenPreview, { marginTop: 0 }]}>
                    {videoMounted ? (
                        <Video
                            key={selectedVideo.uri}
                            source={{ uri: selectedVideo.uri }}
                            style={styles.fullScreenVideo}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={isFocused && appState === 'active'}
                            isLooping
                            useNativeControls={false}
                        />
                    ) : (
                        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    )}
                    
                    <TouchableOpacity style={styles.backButtonOverlay} onPress={() => {
                        uploadIdRef.current = 0;
                        setUploading(false);
                        setStep('gallery');
                        setSelectedVideo(null);
                    }}>
                        <Ionicons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>

                    <View style={styles.previewBottomBar}>
                        <TouchableOpacity 
                            style={[styles.nextButton, { backgroundColor: AppDetails.primaryColor }]} 
                            onPress={() => {
                                startUpload();
                                setStep('details');
                            }}
                        >
                            <Text style={styles.nextButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    uploadIdRef.current = 0;
                    setUploading(false);
                    setStep('preview');
                }}>
                    <Ionicons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Reel</Text>
                <View style={{ width: 28 }} />
            </View>
            
            <View style={styles.content}>
                <TextInput
                    style={styles.input}
                    placeholder="Write a caption..."
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                />

                <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <TextInput
                        style={styles.locationInput}
                        placeholder="Add Location"
                        placeholderTextColor="#999"
                        value={location}
                        onChangeText={setLocation}
                    />
                </View>
                
                {selectedVideo ? (
                    <View style={styles.videoContainer}>
                        <Image
                            source={{ uri: selectedVideo.localThumbnailUri || selectedVideo.thumbnailUrl }}
                            style={styles.video}
                            resizeMode="cover"
                        />
                        {uploading && (
                            <View style={styles.uploadingOverlay}>
                                <Text style={{color:'white', marginBottom: 10, fontWeight: '600'}}>Uploading Media...</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
                                </View>
                                <Text style={{color:'white', marginTop: 5, fontSize: 12}}>{Math.round(uploadProgress)}%</Text>
                            </View>
                        )}
                    
                    </View>
                ) : (
                    <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                        <Ionicons name="videocam-outline" size={40} color="#666" />
                        <Text style={styles.uploadText}>Select Video</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.bottomActionContainer}>
                    <TouchableOpacity 
                        onPress={handlePost} 
                        disabled={posting || uploading || !selectedVideo}
                        style={[styles.bottomPostButton, { backgroundColor: AppDetails.primaryColor }, (posting || uploading || !selectedVideo) && { opacity: 0.5 }]}>
                        <Text style={styles.bottomPostButtonText}>{posting ? "Posting..." : "Post"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 30 : 0
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    postButton: {
        color: '#0095f6',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    input: {
        fontSize: 16,
        marginBottom: 10,
        minHeight: 60,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    locationInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 10,
    },
    uploadButton: {
        height: 200,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    videoContainer: {
        height: 400,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'black',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressBarContainer: {
        width: '60%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#0095f6',
        backgroundColor: AppDetails.primaryColor,
    },
    removeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 20,
    },
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    fullScreenPreview: {
        flex: 1,
        backgroundColor: 'black',
    },
    fullScreenVideo: {
        width: '100%',
        height: '100%',
    },
    backButtonOverlay: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 40 : 20,
        left: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    previewBottomBar: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        left: 20,
        alignItems: 'flex-end',
    },
    nextButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    nextButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    galleryItem: {
        width: width / 3,
        height: width / 3,
        padding: 1,
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    bottomActionContainer: {
        marginTop: 'auto',
        alignItems: 'flex-end',
        paddingBottom: 10,
    },
    bottomPostButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    bottomPostButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CreateReels;
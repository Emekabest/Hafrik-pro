// src/pages/CreatePost.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
// import Video from 'react-native-video';
import { Video } from 'expo-av';

import { useAuth } from '../AuthContext';
import CreateReelsController from '../controllers/createreelscontroller';
import UploadMediaController from '../controllers/uploadmediacontroller';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = 'https://hafrik.com/api/v1';

const CreateReels = ({ navigation }) => {
    const { user, token, isAuthenticated } = useAuth();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [videoUri, setVideoUri] = useState(null);
    const [thumbnailUri, setThumbnailUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
    const videoRef = useRef(null);
    const [showControls, setShowControls] = useState(false);
    const controlsTimeout = useRef(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadedData, setUploadedData] = useState({ video: null, thumbnail: null });

    // Pause video when app goes to background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState.match(/inactive|background/)) {
                setIsPaused(true);
            }
        });
        return () => subscription.remove();
    }, []);

    // Get user ID from auth context
    const userId = user?.id || user?.user_id;

    useEffect(() => {
        // Check authentication when component mounts
        if (!isAuthenticated || !userId) {
            Alert.alert(
                'Login Required',
                'Please login to create a reel',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Login')
                    }
                ]
            );
            return;
        }
        
        requestPermissions();
    }, [isAuthenticated, userId]);

    const requestPermissions = async () => {
        try {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
                Alert.alert(
                    'Permissions Required',
                    'Camera and gallery permissions are required to create reels.'
                );
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };


     const processVideo = async (videoAsset) => {
        try {
            setLoading(true);
            setVideoUri(videoAsset.uri);
            
            // Get video duration
            console.log('Video duration:', videoAsset.duration);
            setVideoDuration(videoAsset.duration || 0);

            // Generate thumbnail
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoAsset.uri, {
                time: videoAsset.duration ? videoAsset.duration / 2 : 0,
            });
            setThumbnailUri(uri);

            // START UPLOAD LOGIC
            setUploadingMedia(true);
            
            // 1. Upload Video
            const videoFile = {
                uri: videoAsset.uri,
                type: getMimeType(videoAsset.uri),
                fileName: videoAsset.uri.split('/').pop() || `video_${Date.now()}.mp4`,
                fileType: 'video'
            };
            
            const videoResponse = await UploadMediaController(videoFile, token);
            
            // 2. Upload Thumbnail
            const thumbFile = {
                uri: uri,
                type: 'image/jpeg',
                fileName: `thumbnail_${Date.now()}.jpg`,
                fileType: 'image'
            };
            
            const thumbResponse = await UploadMediaController(thumbFile, token);

            if ((videoResponse.status === 200 || videoResponse.status === 'success') && 
                (thumbResponse.status === 200 || thumbResponse.status === 'success')) {
                 setUploadedData({
                     video: videoResponse.data, 
                     thumbnail: thumbResponse.data
                 });
                 console.log("Media uploaded successfully", videoResponse.data, thumbResponse.data);
            } else {
                Alert.alert("Upload Failed", "Could not upload video media to server.");
            }
            
            setUploadingMedia(false);

            // Play video briefly to get duration
            setTimeout(() => {
                setIsPaused(false);
                setTimeout(() => {
                    setIsPaused(true);
                }, 1000);
            }, 500);

        } catch (error) {
            console.error('Error processing video:', error);
            Alert.alert('Error', 'Failed to process video');
            setUploadingMedia(false);
        } finally {
            setLoading(false);
        }
    };


    
    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                // NO time limit - let users select any video
                aspect: [9, 16],
            });

            if (!result.canceled) {
                await processVideo(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert('Error', 'Failed to pick video');
        }
    };
    

    const recordVideo = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                // NO time limit for recording
                aspect: [9, 16],
            });

            if (!result.canceled) {
                await processVideo(result.assets[0]);
            }
        } catch (error) {
            console.error('Error recording video:', error);
            Alert.alert('Error', 'Failed to record video');
        }
    };

   
    const togglePlayPause = () => {
        setIsPaused(!isPaused);
    };

    const handleVideoPress = () => {
        togglePlayPause();
        setShowControls(true);
        if (controlsTimeout.current) {
            clearTimeout(controlsTimeout.current);
        }
        controlsTimeout.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const handleProgress = (data) => {
        setVideoProgress(data.currentTime);
        if (videoDurationSeconds === 0 && data.seekableDuration > 0) {
            setVideoDurationSeconds(data.seekableDuration);
        }
    };

    const handleLoad = (data) => {
        setVideoDurationSeconds(data.duration);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Helper function to get file extension
    const getFileExtension = (filename) => {
        if (!filename) return 'mp4';
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : 'mp4';
    };

    // Helper function to get MIME type
    const getMimeType = (uri) => {
        const extension = getFileExtension(uri);
        switch (extension.toLowerCase()) {
            case 'mp4':
            case 'm4v':
                return 'video/mp4';
            case 'mov':
                return 'video/quicktime';
            case 'avi':
                return 'video/x-msvideo';
            case 'wmv':
                return 'video/x-ms-wmv';
            case 'flv':
                return 'video/x-flv';
            case 'mkv':
                return 'video/x-matroska';
            case 'webm':
                return 'video/webm';
            case '3gp':
                return 'video/3gpp';
            default:
                return 'video/mp4';
        }
    };


    const uploadReel = async () => {
        // Check authentication first
        if (!isAuthenticated || !userId) {
            Alert.alert(
                'Login Required',
                'Please login to create a reel',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Login')
                    }
                ]
            );
            return;
        }

        if (!videoUri) {
            Alert.alert('Error', 'Please select a video first');
            return;
        }

        if (!caption.trim()) {
            Alert.alert('Error', 'Please add a caption for your reel');
            return;
        }
        
        if (uploadingMedia) {
            Alert.alert('Please wait', 'Video is still uploading to server...');
            return;
        }

        if (!uploadedData.video) {
            Alert.alert('Error', 'Video upload failed. Please try selecting the video again.');
            return;
        }

        try {
            setLoading(true);

            const postData = {
                type: 'reel',
                text: caption,
                location: location,
                media: [
                    {
                        // Use the URL/path returned from the upload controller
                        video_url: uploadedData.video.url || uploadedData.video.path || uploadedData.video, 
                        thumbnail: uploadedData.thumbnail.url || uploadedData.thumbnail.path || uploadedData.thumbnail,
                        duration: videoDuration
                    }
                ]
            };

            const response = await CreateReelsController(postData, token);

            console.log('Upload response:', response);

            const responseData = response.data;

            if (responseData.message === 'success') {
                Alert.alert(
                    'Success',
                    'Reel uploaded successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                resetForm();
                                navigation.navigate('Reels', {
                                    initialReelId: responseData.data?.post_id,
                                    initialIndex: 0
                                });
                            }
                        }
                    ]
                );
            } else {
                throw new Error(responseData.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert(
                'Upload Failed',
                error.message || 'Failed to upload reel. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCaption('');
        setLocation('');
        setVideoUri(null);
        setThumbnailUri(null);
        setIsPaused(true);
        setVideoProgress(0);
        setVideoDurationSeconds(0);
        setUploadingMedia(false);
        setUploadedData({ video: null, thumbnail: null });
    };

    const handleBack = () => {
        if (videoUri || caption.trim() || location.trim()) {
            Alert.alert(
                'Discard Post?',
                'You have unsaved changes. Are you sure you want to discard?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            resetForm();
                            navigation.goBack();
                        }
                    }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} disabled={loading}>
                    <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Reel</Text>
                <TouchableOpacity
                    onPress={uploadReel}
                    disabled={loading || uploadingMedia || !videoUri || !caption.trim()}
                    style={styles.postButtonContainer}
                >
                    <Text style={[
                        styles.postButton,
                        { opacity: (loading || uploadingMedia || !videoUri || !caption.trim()) ? 0.5 : 1 }
                    ]}>
                        {loading ? 'Posting...' : uploadingMedia ? 'Uploading...' : 'Post'}
                    </Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* User Info */}
                    <View style={styles.userInfo}>
                        <View style={styles.avatar} />
                        <View>
                            <Text style={styles.username}>Your Reel</Text>
                            <Text style={styles.privacy}>Public ▼</Text>
                        </View>
                    </View>

                    {/* Caption Input */}
                    <TextInput
                        style={styles.captionInput}
                        placeholder="What's happening? Add a caption..."
                        placeholderTextColor="#999"
                        multiline
                        value={caption}
                        onChangeText={setCaption}
                        maxLength={500}
                        editable={!loading}
                    />
                    <Text style={styles.charCount}>{caption.length}/500</Text>

                    {/* Location Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.locationInput}
                            placeholder="Add location (optional)"
                            placeholderTextColor="#999"
                            value={location}
                            onChangeText={setLocation}
                            editable={!loading}
                        />
                    </View>

                    {/* Video Preview Section */}
                    {videoUri ? (
                        <View style={styles.videoPreviewSection}>
                            <Text style={styles.sectionTitle}>Video Preview</Text>

                            {/* Video Player */}
                            <TouchableOpacity
                                style={styles.videoContainer}
                                activeOpacity={1}
                                onPress={handleVideoPress}
                            >
                                <Video
                                    ref={videoRef}
                                    source={{ uri: videoUri }}
                                    style={styles.video}
                                    resizeMode="cover"
                                    paused={isPaused}
                                    repeat={true}
                                    controls={false}
                                    onLoad={handleLoad}
                                    onProgress={handleProgress}
                                    onError={(error) => console.error('Video error:', error)}
                                />

                                {/* Loading Overlay */}
                                {(loading || uploadingMedia) && (
                                    <View style={styles.loadingOverlay}>
                                        <ActivityIndicator size="large" color="#fff" />
                                    </View>
                                )}

                                {/* Play/Pause Button Overlay */}
                                {showControls && (
                                    <TouchableOpacity
                                        style={styles.playPauseButton}
                                        onPress={togglePlayPause}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={isPaused ? "play-circle" : "pause-circle"}
                                            size={60}
                                            color="rgba(255, 255, 255, 0.8)"
                                        />
                                    </TouchableOpacity>
                                )}

                                {/* Progress bar */}
                                <View style={styles.progressBarContainer}>
                                    <View style={styles.progressBarBackground}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: videoDurationSeconds > 0
                                                    ? `${(videoProgress / videoDurationSeconds) * 100}%`
                                                    : '0%'
                                            }
                                        ]} />
                                    </View>

                                    {/* Time indicators */}
                                    {showControls && videoDurationSeconds > 0 && (
                                        <View style={styles.timeContainer}>
                                            <Text style={styles.timeText}>
                                                {formatTime(videoProgress)}
                                            </Text>
                                            <Text style={styles.timeText}>
                                                {formatTime(videoDurationSeconds)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Duration Indicator */}
                                <View style={styles.durationBadge}>
                                    <Text style={styles.durationText}>
                                        {formatTime(videoDuration)}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <Text style={styles.videoInfo}>
                                Duration: {formatTime(videoDuration)} ({Math.round(videoDuration)} seconds)
                            </Text>

                            <TouchableOpacity
                                style={[styles.removeButton, { opacity: uploadingMedia ? 0.5 : 1 }]}
                                onPress={() => {
                                    setVideoUri(null);
                                    setThumbnailUri(null);
                                    setIsPaused(true);
                                    setVideoProgress(0);
                                    setVideoDurationSeconds(0);
                                }}
                                disabled={loading || uploadingMedia}
                            >
                                <Ionicons name="close-circle" size={24} color="#ff4444" />
                                <Text style={styles.removeButtonText}>Remove Video</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Video Selection Buttons */
                        <View style={styles.videoSelectionSection}>
                            <Text style={styles.sectionTitle}>Select Video</Text>

                            <TouchableOpacity
                                style={styles.actionButtonLarge}
                                onPress={recordVideo}
                                disabled={loading}
                            >
                                <Ionicons name="videocam" size={48} color="#fff" />
                                <Text style={styles.actionButtonLargeText}>Record Video</Text>
                                <Text style={styles.actionButtonSubtext}>Record any length video</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButtonLarge, styles.uploadButton]}
                                onPress={pickVideo}
                                disabled={loading}
                            >
                                <Ionicons name="folder-open" size={48} color="#fff" />
                                <Text style={styles.actionButtonLargeText}>Upload Video</Text>
                                <Text style={styles.actionButtonSubtext}>Select from gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tips */}
                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsTitle}>Tips for great reels:</Text>
                        <Text style={styles.tip}>• Keep videos engaging and high-quality</Text>
                        <Text style={styles.tip}>• Use good lighting and stable camera</Text>
                        <Text style={styles.tip}>• Add clear, engaging captions</Text>
                        <Text style={styles.tip}>• Include relevant location for context</Text>
                        <Text style={styles.tip}>• Use portrait mode (9:16 aspect ratio)</Text>
                        <Text style={styles.tip}>• Videos of any length are welcome!</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        marginTop: Platform.OS === 'android' ? 25 : 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    postButtonContainer: {
        minWidth: 60,
        alignItems: 'flex-end',
    },
    postButton: {
        color: '#0C3F44',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0C3F44',
        marginRight: 12,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
    },
    privacy: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    captionInput: {
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        marginHorizontal: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
    },
    charCount: {
        textAlign: 'right',
        color: '#999',
        fontSize: 12,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 20,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    inputIcon: {
        marginRight: 8,
    },
    locationInput: {
        flex: 1,
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 16,
        marginBottom: 12,
        color: '#333',
    },
    videoPreviewSection: {
        marginBottom: 20,
    },
    videoContainer: {
        width: '100%',
        height: height * 0.6,
        backgroundColor: '#000',
        position: 'relative',
        marginBottom: 12,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    playPauseButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -30,
        marginTop: -30,
        zIndex: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 30,
    },
    progressBarContainer: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        zIndex: 2,
        paddingHorizontal: 10,
    },
    progressBarBackground: {
        width: '100%',
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#0C3F44',
        borderRadius: 1.5,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    timeText: {
        color: 'white',
        fontSize: 12,
    },
    durationBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    durationText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    videoInfo: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginHorizontal: 16,
        marginTop: 8,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 10,
    },
    removeButtonText: {
        color: '#ff4444',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    videoSelectionSection: {
        marginBottom: 30,
    },
    actionButtonLarge: {
        backgroundColor: '#0C3F44',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    uploadButton: {
        backgroundColor: '#1E7A7F',
    },
    actionButtonLargeText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginTop: 12,
    },
    actionButtonSubtext: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginTop: 6,
    },
    tipsContainer: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 30,
        marginTop: 10,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    tip: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        lineHeight: 20,
    },
});

export default CreateReels;
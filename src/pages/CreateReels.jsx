import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useAuth } from '../AuthContext';
import CreateReelsController from '../controllers/createreelscontroller';
import UploadMediaController from '../controllers/uploadmediacontroller';

const { width } = Dimensions.get('window');

const CreateReels = ({ navigation, route }) => {
    const { token } = useAuth();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [step, setStep] = useState('preview'); // 'preview' | 'details'

    useEffect(() => {
        if (route.params?.videoAsset) {
            const asset = route.params.videoAsset;
            setStep('preview');
            processAndUploadVideo(asset);
            navigation.setParams({ videoAsset: null }); // Clear params to prevent re-trigger
        }
    }, [route.params?.videoAsset]);

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                processAndUploadVideo(asset);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick video");
        }
    };

    const processAndUploadVideo = async (asset) => {
        setUploading(true);
        
        // 1. Set local state for preview immediately
        const localVideo = {
            uri: asset.uri,
            duration: asset.duration,
            uploading: true,
            serverUrl: null,
            thumbnailUrl: null
        };
        setSelectedVideo(localVideo);

        try {
            // 2. Generate Thumbnail
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, {
                time: 1000,
            });

            // 3. Upload Video
            const videoFile = {
                uri: asset.uri,
                type: 'video/mp4',
                fileName: asset.uri.split('/').pop() || 'reel.mp4',
                fileType: 'video'
            };
            const videoResponse = await UploadMediaController(videoFile, token);

            // 4. Upload Thumbnail
            const thumbFile = {
                uri: thumbUri,
                type: 'image/jpeg',
                fileName: 'thumbnail.jpg',
                fileType: 'photo'
            };
            const thumbResponse = await UploadMediaController(thumbFile, token);

            if (videoResponse.status === "success" && thumbResponse.status === "success") {
                console.log("Upload successful. Video URL:", videoResponse.data.url, "Thumb URL:", thumbResponse.data.url);
                setSelectedVideo(prev => ({
                    ...prev,
                    uploading: false,
                    serverUrl: videoResponse.data.url,
                    thumbnailUrl: thumbResponse.data.url
                }));
            } else {
                console.log("Upload failed. Video:", videoResponse, "Thumb:", thumbResponse);
                Alert.alert("Upload Failed", "Could not upload media.");
                setSelectedVideo(null);
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An error occurred during upload.");
            setSelectedVideo(null);
        } finally {
            setUploading(false);
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

    // Render Preview Step
    if (step === 'preview' && selectedVideo) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.fullScreenPreview}>
                    <Video
                        source={{ uri: selectedVideo.uri }}
                        style={styles.fullScreenVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={true}
                        isLooping
                        useNativeControls={false}
                    />
                    
                    <TouchableOpacity style={styles.backButtonOverlay} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>

                    <View style={styles.previewBottomBar}>
                        <TouchableOpacity 
                            style={styles.nextButton} 
                            onPress={() => setStep('details')}
                        >
                            <Text style={styles.nextButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={28} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Reel</Text>
                <TouchableOpacity onPress={handlePost} disabled={posting || uploading || !selectedVideo}>
                    <Text style={[styles.postButton, (posting || uploading || !selectedVideo) && { opacity: 0.5 }]}>
                        {posting ? "Posting..." : "Share"}
                    </Text>
                </TouchableOpacity>
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
                        <Video
                            source={{ uri: selectedVideo.uri }}
                            style={styles.video}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            useNativeControls
                        />
                        {uploading && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="white" />
                                <Text style={{color:'white', marginTop: 5}}>Uploading...</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedVideo(null)}>
                            <Ionicons name="trash" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                        <Ionicons name="videocam-outline" size={40} color="#666" />
                        <Text style={styles.uploadText}>Select Video</Text>
                    </TouchableOpacity>
                )}
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
    removeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 20,
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
        backgroundColor: '#0095f6',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    nextButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CreateReels;
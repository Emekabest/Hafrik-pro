import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Image, AppState, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import CreateReelsController from '../../controllers/createreelscontroller';
import UploadMediaController from '../../controllers/uploadmediacontroller';
import { useIsFocused } from '@react-navigation/native';
import AppDetails from '../../helpers/appdetails';
import Gallery from './gallery';
import Preview from './preview';
import ReelsManager from '../../helpers/reelsmanager';
import VideoManager from '../../helpers/videomanager';
import useStore from '../../repository/store';

const CreateReels = ({ navigation, route }) => {
    const { token } = useAuth();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [step, setStep] = useState('gallery'); // 'gallery' | 'preview' | 'details'
    const [uploadProgress, setUploadProgress] = useState(0);

    const currentReel_store = useStore((state)=> state.currentReel);
    const isNextVideo_store = useStore((state) => state.isNextVideo);

    
    const isFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const uploadIdRef = useRef(0);


    useEffect(() => {

        console.log(isFocused, isNextVideo_store)
            VideoManager.singlePause()
            ReelsManager.singlePause();

        // if (isFocused  && isNextVideo_store.feedId !== null){
        //     console.log("I Reached...")
        //     VideoManager.singlePause()
        // }
        // if (isFocused && currentReel_store.reelId !== null){
        //         ReelsManager.singlePause();//

        // }

    },[isFocused, isNextVideo_store, currentReel_store]);



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
        
        let postData = {
            text: caption,
            location: location,
        };

        if (selectedVideo != null) {
            postData.type = "reel";
            postData.video_url = selectedVideo.serverUrl;
            if (selectedVideo.thumbnailUrl) {
                postData.thumbnail = selectedVideo.thumbnailUrl;
            }
        }

        const response = await CreateReelsController(postData, token);
        setPosting(false);

        if (response.status === 200 || response.status === 201) {
            Alert.alert("Success", "Reel uploaded Succesfully", [
                { 
                    text: "OK", 
                    onPress: () => {
                        setCaption('');
                        setLocation('');
                        setSelectedVideo(null);
                        setStep('gallery');
                        setUploadProgress(0);
                        uploadIdRef.current = 0;
                        navigation.navigate('Home');
                    } 
                }
            ]);
        } else {
            Alert.alert("Error", "Unable to upload reel please try again");
        }
    };

    const handleChangeThumbnail = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [9, 16],
                quality: 1,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setSelectedVideo(prev => ({ ...prev, localThumbnailUri: asset.uri }));

                if (!uploading && selectedVideo?.serverUrl) {
                     const thumbFile = {
                        uri: asset.uri,
                        type: 'image/jpeg',
                        fileName: 'thumbnail.jpg',
                        fileType: 'photo'
                    };
                    const thumbResponse = await UploadMediaController(thumbFile, token);
                    if (thumbResponse.status === "success") {
                        setSelectedVideo(prev => ({ ...prev, thumbnailUrl: thumbResponse.data.url }));
                    }
                }
            }
        } catch (error) {
            console.log("Error picking thumbnail", error);
        }
    };

    // Render Custom Gallery Step
    if (step === 'gallery') {
        return (
            <Gallery onSelect={(asset) => {
                setStep('preview');
                processVideoSelection(asset);
            }} navigation={navigation} />
        );
    }

    
    // Render Preview Step
    if (step === 'preview' && selectedVideo) {
        return (
            <Preview 
                videoUri={selectedVideo.uri}
                onBack={() => {
                    uploadIdRef.current = 0;
                    setUploading(false);
                    setStep('gallery');
                    setSelectedVideo(null);
                }}
                onNext={() => {
                    startUpload();
                    setStep('details');
                }}
                isFocused={isFocused}
                appState={appState}
                primaryColor={AppDetails.primaryColor}
            />
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
                    <View style={styles.selectedMediaContainer}>
                        <View style={styles.thumbnailRow}>
                            <Image
                                source={{ uri: selectedVideo.localThumbnailUri || selectedVideo.thumbnailUrl }}
                                style={styles.smallThumbnail}
                                resizeMode="cover"
                            />
                            <TouchableOpacity onPress={handleChangeThumbnail} style={styles.changeThumbnailButton} disabled={uploading}>
                                <Ionicons name="image-outline" size={24} color={uploading ? "#ccc" : "#333"} />
                                <Text style={[styles.changeThumbnailText, uploading && {color: '#ccc'}]}>Change Cover</Text>
                            </TouchableOpacity>
                        </View>

                        {(uploading || uploadProgress === 100) && (
                            <View style={styles.uploadStatusContainer}>
                                <Text style={styles.uploadTextLabel}>{uploading ? "Uploading Media..." : "Upload Complete"}</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
                                </View>
                                <Text style={styles.uploadPercentage}>{Math.round(uploadProgress)}%</Text>
                            </View>
                        )}
                    
                    </View>
                ) : (
                    <TouchableOpacity style={styles.uploadButton} onPress={() => setStep('gallery')}>
                        <Ionicons name="videocam-outline" size={40} color="#666" />
                        <Text style={styles.uploadText}>Select Video</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.bottomActionContainer}>
                    <TouchableOpacity 
                        activeOpacity={1}
                        onPress={handlePost} 
                        disabled={posting || uploading || !selectedVideo}
                        style={[styles.bottomPostButton, { backgroundColor: AppDetails.primaryColor }, (posting || uploading || !selectedVideo) && { opacity: 0.5 }]}>
                        <Text style={styles.bottomPostButtonText}>{posting ? "Posting..." : "Post"}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                transparent={true}
                animationType="fade"
                visible={posting}
                onRequestClose={() => {}}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={AppDetails.primaryColor} />
                        <Text style={{marginTop: 10, color: '#333', fontWeight: '600'}}>Posting Reel...</Text>
                    </View>
                </View>
            </Modal>
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
    selectedMediaContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    smallThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 10,
        backgroundColor: '#eee',
    },
    thumbnailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    changeThumbnailButton: {
        marginLeft: 20,
        alignItems: 'center',
    },
    changeThumbnailText: {
        fontSize: 12,
        marginTop: 5,
        color: '#333',
    },
    uploadStatusContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 15,
    },
    uploadTextLabel: {
        color: '#333',
        marginBottom: 8,
        fontWeight: '500',
        fontSize: 14,
    },
    progressBarContainer: {
        width: '80%',
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: AppDetails.primaryColor,
    },
    uploadPercentage: {
        color: '#666',
        marginTop: 5,
        fontSize: 12,
    },
    bottomActionContainer: {
        marginTop: 'auto',
        alignItems: 'flex-end',
        paddingBottom: 10,
    },
    bottomPostButton: {
        height:60,
        width:"50%",
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    bottomPostButtonText: {
        color: 'white',
        fontFamily:"WorkSans_600SemiBold",
        fontSize: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingBox: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 5,
    },
});

export default CreateReels;
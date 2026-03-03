import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView,
  Platform, AppState, Modal, Animated, Dimensions, ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width: SW } = Dimensions.get('window');
const DARK   = Colors.nearBlack;
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const GLASS  = withOpacity(Colors.white, 0.07);
const BORDER = withOpacity(Colors.white, 0.11);
const MAX_CAPTION = 300;

const CreateReels = ({ navigation, route }) => {
    const { token } = useAuth();
    const { top, bottom } = useSafeAreaInsets();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [step, setStep] = useState('gallery'); // 'gallery' | 'preview' | 'details'
    const [uploadProgress, setUploadProgress] = useState(0);

    // Animated progress bar width
    const barAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(barAnim, {
            toValue: uploadProgress / 100,
            duration: 350,
            useNativeDriver: false,
        }).start();
    }, [uploadProgress]);

    const currentReel_store = useStore((state)=> state.currentReel);
    const isNextVideo_store = useStore((state) => state.isNextVideo);

    
    const isFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const uploadIdRef = useRef(0);

    // Track previous focus state to only pause when gaining focus
    const prevFocusedRef = useRef(false);
    useEffect(() => {
        // Only pause videos when this screen GAINS focus (user navigated TO createreels)
        if (isFocused && !prevFocusedRef.current) {
            console.log("CreateReels gained focus - pausing all videos");
            VideoManager.singlePause();
            ReelsManager.singlePause();
        }
        prevFocusedRef.current = isFocused;
    },[isFocused]);



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
                mediaTypes: ImagePicker.MediaType.images,
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









    const canPost = !!selectedVideo?.serverUrl && !posting && !uploading;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: DARK }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: DARK }}>

                {/* ── Header ── */}
                <View style={[s.header, { paddingTop: Platform.OS === 'android' ? top + 6 : 0 }]}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => {
                            uploadIdRef.current = 0;
                            setUploading(false);
                            setStep('preview');
                        }}
                    >
                        <Ionicons name="arrow-back" size={22} color={Colors.white} />
                    </TouchableOpacity>

                    <Text style={s.headerTitle}>New Reel</Text>

                    <TouchableOpacity
                        style={[s.postPill, !canPost && { opacity: 0.35 }]}
                        onPress={handlePost}
                        disabled={!canPost}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[ACCENT, Colors.tealAccentMid]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.postPillGrad}
                        >
                            {posting
                                ? <ActivityIndicator size="small" color={Colors.white} />
                                : <Text style={s.postPillTxt}>Share</Text>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Preview card + form row ── */}
                    <View style={s.mainRow}>

                        {/* Thumbnail */}
                        <View style={s.thumbWrap}>
                            {selectedVideo?.localThumbnailUri || selectedVideo?.thumbnailUrl ? (
                                <ExpoImage
                                    source={{ uri: selectedVideo.localThumbnailUri || selectedVideo.thumbnailUrl }}
                                    style={s.thumb}
                                    contentFit="cover"
                                    cachePolicy="memory"
                                />
                            ) : (
                                <View style={[s.thumb, s.thumbPlaceholder]}>
                                    <Ionicons name="videocam-outline" size={28} color={withOpacity(Colors.white, 0.25)} />
                                </View>
                            )}
                            {/* change cover */}
                            <TouchableOpacity
                                style={s.changeCoverBtn}
                                onPress={handleChangeThumbnail}
                                disabled={uploading}
                            >
                                <Ionicons name="image-outline" size={14} color={Colors.white} />
                                <Text style={s.changeCoverTxt}>Cover</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Caption */}
                        <View style={s.captionCard}>
                            <TextInput
                                style={s.captionInput}
                                placeholder="Write a caption, add hashtags..."
                                placeholderTextColor={withOpacity(Colors.white, 0.28)}
                                value={caption}
                                onChangeText={(t) => setCaption(t.slice(0, MAX_CAPTION))}
                                multiline
                                maxLength={MAX_CAPTION}
                                selectionColor={ACCENT}
                            />
                            <Text style={s.charCount}>
                                {caption.length}/{MAX_CAPTION}
                            </Text>
                        </View>
                    </View>

                    {/* ── Upload progress ── */}
                    {(uploading || uploadProgress > 0) && (
                        <View style={s.progressWrap}>
                            <View style={s.progressRow}>
                                <Text style={s.progressLabel}>
                                    {uploadProgress < 100 ? 'Uploading…' : '✓ Upload complete'}
                                </Text>
                                <Text style={s.progressPct}>{Math.round(uploadProgress)}%</Text>
                            </View>
                            <View style={s.progressTrack}>
                                <Animated.View
                                    style={[
                                        s.progressFill,
                                        {
                                            width: barAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                            }),
                                        },
                                    ]}
                                />
                                {/* glow dot */}
                                {uploading && (
                                    <Animated.View
                                        style={[
                                            s.progressGlow,
                                            {
                                                left: barAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                            },
                                        ]}
                                    />
                                )}
                            </View>
                        </View>
                    )}

                    {/* ── Options ── */}
                    <View style={s.optionsWrap}>

                        {/* Location */}
                        <View style={s.optionRow}>
                            <View style={s.optionIcon}>
                                <Ionicons name="location-outline" size={18} color={ACCENT} />
                            </View>
                            <TextInput
                                style={s.optionInput}
                                placeholder="Add location"
                                placeholderTextColor={withOpacity(Colors.white, 0.28)}
                                value={location}
                                onChangeText={setLocation}
                                selectionColor={ACCENT}
                            />
                            {location.length > 0 && (
                                <TouchableOpacity onPress={() => setLocation('')}>
                                    <Ionicons name="close-circle" size={16} color={withOpacity(Colors.white, 0.35)} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={s.divider} />

                        {/* Audience pill */}
                        <View style={s.optionRow}>
                            <View style={s.optionIcon}>
                                <Ionicons name="earth-outline" size={18} color={ACCENT} />
                            </View>
                            <Text style={s.optionLabel}>Audience</Text>
                            <View style={s.audiencePill}>
                                <Text style={s.audiencePillTxt}>Everyone</Text>
                            </View>
                        </View>

                        <View style={s.divider} />

                        {/* Comments */}
                        <View style={s.optionRow}>
                            <View style={s.optionIcon}>
                                <Ionicons name="chatbubble-ellipses-outline" size={18} color={ACCENT} />
                            </View>
                            <Text style={s.optionLabel}>Allow comments</Text>
                            <View style={s.audiencePill}>
                                <Text style={s.audiencePillTxt}>On</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Big post button ── */}
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={!canPost}
                        activeOpacity={0.86}
                        style={{ marginHorizontal: 18, marginTop: 28, marginBottom: Math.max(bottom + 20, 36) }}
                    >
                        <LinearGradient
                            colors={canPost ? [ACCENT, Colors.tealAccentDark] : [Colors.neutral780, Colors.neutral780]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.bigPostBtn}
                        >
                            {posting ? (
                                <>
                                    <ActivityIndicator size="small" color={Colors.white} />
                                    <Text style={s.bigPostTxt}>Posting…</Text>
                                </>
                            ) : uploading ? (
                                <>
                                    <ActivityIndicator size="small" color={Colors.white} />
                                    <Text style={s.bigPostTxt}>Uploading…</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color={Colors.white} />
                                    <Text style={s.bigPostTxt}>Post Reel</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>

                {/* Posting overlay */}
                <Modal transparent animationType="fade" visible={posting} onRequestClose={() => {}}>
                    <View style={s.overlay}>
                        <View style={s.overlayBox}>
                            <ActivityIndicator size="large" color={ACCENT} />
                            <Text style={s.overlayTxt}>Posting reel…</Text>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const s = StyleSheet.create({
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    backBtn: {
        width: 38, height: 38,
        borderRadius: 19,
        backgroundColor: GLASS,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    postPill: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    postPillGrad: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postPillTxt: {
        color: Colors.white,
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 0.4,
    },

    // Scroll
    scroll: { paddingTop: 20 },

    // Main row: thumb + caption
    mainRow: {
        flexDirection: 'row',
        paddingHorizontal: 18,
        gap: 14,
        marginBottom: 20,
    },
    thumbWrap: {
        width: SW * 0.28,
        aspectRatio: 9 / 16,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: Colors.nearBlackSoft,
        position: 'relative',
    },
    thumb: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
    },
    thumbPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.nearBlackSoft,
        borderWidth: 1,
        borderColor: BORDER,
        borderStyle: 'dashed',
    },
    changeCoverBtn: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: withOpacity(Colors.black, 0.55),
        paddingVertical: 5,
    },
    changeCoverTxt: {
        color: Colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
    captionCard: {
        flex: 1,
        backgroundColor: GLASS,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
        justifyContent: 'space-between',
        minHeight: SW * 0.28 * (16 / 9),
    },
    captionInput: {
        flex: 1,
        color: Colors.white,
        fontSize: 14.5,
        lineHeight: 22,
    },
    charCount: {
        alignSelf: 'flex-end',
        color: withOpacity(Colors.white, 0.3),
        fontSize: 11,
        marginTop: 6,
    },

    // Progress
    progressWrap: {
        marginHorizontal: 18,
        marginBottom: 18,
        backgroundColor: GLASS,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    progressLabel: {
        color: withOpacity(Colors.white, 0.6),
        fontSize: 12.5,
        fontWeight: '600',
    },
    progressPct: {
        color: ACCENT,
        fontSize: 12.5,
        fontWeight: '900',
    },
    progressTrack: {
        height: 5,
        backgroundColor: withOpacity(Colors.white, 0.08),
        borderRadius: 99,
        overflow: 'visible',
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        backgroundColor: ACCENT,
        borderRadius: 99,
    },
    progressGlow: {
        position: 'absolute',
        top: -5,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: ACCENT,
        shadowColor: ACCENT,
        shadowOpacity: 1,
        shadowRadius: 6,
        marginLeft: -7,
    },

    // Options
    optionsWrap: {
        marginHorizontal: 18,
        backgroundColor: GLASS,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    optionIcon: {
        width: 30,
        alignItems: 'center',
    },
    optionInput: {
        flex: 1,
        color: Colors.white,
        fontSize: 14,
    },
    optionLabel: {
        flex: 1,
        color: withOpacity(Colors.white, 0.75),
        fontSize: 14,
    },
    audiencePill: {
        backgroundColor: withOpacity(Colors.tealAccent, 0.15),
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: withOpacity(Colors.tealAccent, 0.3),
    },
    audiencePillTxt: {
        color: ACCENT,
        fontSize: 12,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: BORDER,
        marginLeft: 58,
    },

    // Big post button
    bigPostBtn: {
        height: 58,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    bigPostTxt: {
        color: Colors.white,
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 0.3,
    },

    // Modal
    overlay: {
        flex: 1,
        backgroundColor: withOpacity(Colors.black, 0.75),
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayBox: {
        backgroundColor: Colors.nearBlackSoft,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: BORDER,
    },
    overlayTxt: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
});

export default CreateReels;
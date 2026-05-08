import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, SafeAreaView, KeyboardAvoidingView,
  Platform, AppState, Dimensions, ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import { startBackgroundUpload } from '../../helpers/BackgroundUploadManager';
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
const DARK          = Colors.nearBlack        ?? '#0a0a0a';
const BRAND         = Colors.primaryDark      ?? '#0a6370';
const ACCENT        = Colors.primary          ?? '#13c296';
const TEAL_MID      = Colors.tealAccentMid    ?? '#0fa87d';
const TEAL_DARK     = Colors.tealAccentDark   ?? '#0a9e78';
const NEUTRAL_DARK  = Colors.neutral780       ?? '#2a2a2a';
const GLASS         = withOpacity(Colors.white ?? '#ffffff', 0.07);
const BORDER        = withOpacity(Colors.white ?? '#ffffff', 0.11);
const MAX_CAPTION = 300;

const CreateReels = ({ navigation, route }) => {
    const { token } = useAuth();
    const { top, bottom } = useSafeAreaInsets();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [step, setStep] = useState('gallery'); // 'gallery' | 'preview' | 'details'

    const currentReel_store = useStore((state) => state.currentReel);
    const isNextVideo_store = useStore((state) => state.isNextVideo);

    const isFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const uploadIdRef = useRef(0);

    const prevFocusedRef = useRef(false);
    useEffect(() => {
        if (isFocused && !prevFocusedRef.current) {
            VideoManager.singlePause();
            ReelsManager.singlePause();
        }
        prevFocusedRef.current = isFocused;
    }, [isFocused]);

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
            navigation.setParams({ videoAsset: null });
        }
    }, [route.params?.videoAsset]);

    useLayoutEffect(() => {
        if (step === 'preview' || step === 'details') {
            navigation.setOptions({ tabBarStyle: { display: 'none' } });
        } else {
            navigation.setOptions({ tabBarStyle: { display: 'flex' } });
        }
    }, [navigation, step]);

    const processVideoSelection = async (asset) => {
        // ── Reel limits: 500 MB / 3 minutes ──────────────────────────────────
        const MAX_REEL_BYTES    = 500 * 1024 * 1024;
        const MAX_REEL_DURATION = 180 * 1000;
        if (asset.fileSize && asset.fileSize > MAX_REEL_BYTES) {
            Alert.alert('File Too Large', 'Reels must be under 500 MB. Please trim or compress your video and try again.');
            return;
        }
        if (asset.duration && asset.duration > MAX_REEL_DURATION) {
            Alert.alert('Video Too Long', 'Reels can be at most 3 minutes long. Please trim your video and try again.');
            return;
        }

        setCaption('');
        setLocation('');
        const currentId = Date.now();
        uploadIdRef.current = currentId;

        const localVideo = {
            uri: asset.uri,
            duration: asset.duration,
            fileName: asset.fileName || asset.uri?.split('/').pop() || 'reel.mp4',
            type: asset.mimeType || ((asset.fileName || asset.uri || '').toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'),
            mimeType: asset.mimeType || ((asset.fileName || asset.uri || '').toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'),
            fileType: 'video',
            fileSize: asset.fileSize,
            serverUrl: null,
            thumbnailUrl: null,
        };
        setSelectedVideo(localVideo);

        try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
            if (uploadIdRef.current !== currentId) return;
            setSelectedVideo(prev => ({ ...prev, localThumbnailUri: thumbUri }));
        } catch (_) {}
    };

    const handlePost = () => {
        if (!selectedVideo?.uri) {
            Alert.alert('Wait', 'Please select a reel first.');
            return;
        }

        const videoFile = {
            uri: selectedVideo.uri,
            type: selectedVideo.type || selectedVideo.mimeType || 'video/mp4',
            mimeType: selectedVideo.mimeType || selectedVideo.type || 'video/mp4',
            fileName: selectedVideo.fileName || selectedVideo.uri.split('/').pop() || 'reel.mp4',
            fileType: 'video',
            fileSize: selectedVideo.fileSize,
        };
        const thumbnailFile = selectedVideo.localThumbnailUri
            ? { uri: selectedVideo.localThumbnailUri, type: 'image/jpeg', fileName: 'thumbnail.jpg', fileType: 'photo' }
            : null;

        startBackgroundUpload({
            postBody: { type: 'reel', text: caption, location },
            activeTab: 'reel',
            selectedVideo: videoFile,
            selectedThumbnail: thumbnailFile,
            token,
        });

        // Reset and go home — GlobalUploadBanner tracks the rest
        setCaption('');
        setLocation('');
        setSelectedVideo(null);
        setStep('gallery');
        uploadIdRef.current = 0;
        navigation.navigate('Home');
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
                setSelectedVideo(prev => ({ ...prev, localThumbnailUri: result.assets[0].uri }));
            }
        } catch (_) {}
    };

    if (step === 'gallery') {
        return (
            <Gallery onSelect={(asset) => {
                setStep('preview');
                processVideoSelection(asset);
            }} navigation={navigation} />
        );
    }

    if (step === 'preview' && selectedVideo) {
        return (
            <Preview
                videoUri={selectedVideo.uri}
                onBack={() => {
                    uploadIdRef.current = 0;
                    setStep('gallery');
                    setSelectedVideo(null);
                }}
                onNext={() => setStep('details')}
                isFocused={isFocused}
                appState={appState}
                primaryColor={AppDetails.primaryColor}
            />
        );
    }

    const canPost = !!selectedVideo?.uri;

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
                            colors={[ACCENT, TEAL_MID]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.postPillGrad}
                        >
                            <Text style={s.postPillTxt}>Share</Text>
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
                            <TouchableOpacity style={s.changeCoverBtn} onPress={handleChangeThumbnail}>
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
                            <Text style={s.charCount}>{caption.length}/{MAX_CAPTION}</Text>
                        </View>
                    </View>

                    {/* ── Options ── */}
                    <View style={s.optionsWrap}>

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

                    {/* ── Post button ── */}
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={!canPost}
                        activeOpacity={0.86}
                        style={{ marginHorizontal: 18, marginTop: 28, marginBottom: Math.max(bottom + 20, 36) }}
                    >
                        <LinearGradient
                            colors={canPost ? [ACCENT, TEAL_DARK] : [NEUTRAL_DARK, NEUTRAL_DARK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.bigPostBtn}
                        >
                            <Ionicons name="send" size={20} color={Colors.white} />
                            <Text style={s.bigPostTxt}>Post Reel</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const s = StyleSheet.create({
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
    postPill: { borderRadius: 22, overflow: 'hidden' },
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
    scroll: { paddingTop: 20 },
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
    thumb: { width: '100%', height: '100%', borderRadius: 14 },
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
        bottom: 8, left: 0, right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: withOpacity(Colors.black, 0.55),
        paddingVertical: 5,
    },
    changeCoverTxt: { color: Colors.white, fontSize: 11, fontWeight: '700' },
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
    optionIcon: { width: 30, alignItems: 'center' },
    optionInput: { flex: 1, color: Colors.white, fontSize: 14 },
    optionLabel: { flex: 1, color: withOpacity(Colors.white, 0.75), fontSize: 14 },
    audiencePill: {
        backgroundColor: withOpacity(Colors.tealAccent, 0.15),
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: withOpacity(Colors.tealAccent, 0.3),
    },
    audiencePillTxt: { color: ACCENT, fontSize: 12, fontWeight: '800' },
    divider: { height: 1, backgroundColor: BORDER, marginLeft: 58 },
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
});

export default CreateReels;

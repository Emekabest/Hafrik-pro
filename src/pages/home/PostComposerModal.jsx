import React, {
    useState, useRef, useEffect, useCallback, memo,
} from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, FlatList,
    Modal, TextInput, Dimensions, Image, ActivityIndicator,
    ScrollView, Platform, Animated, KeyboardAvoidingView, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import PostFeedController from '../../controllers/postfeedcontroller';
import UploadMediaController from '../../controllers/uploadmediacontroller';
import PostFeedList from '../../helpers/postfeedlists';
import useStore from '../../repository/store';
import { Colors } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const BORDER = Colors.border;
const BG     = Colors.surfaceTint;
const WHITE  = Colors.white;
const BLACK  = Colors.black;

// ─── Post type tabs ────────────────────────────────────────────────────────────
const POST_TYPES = [
    { id: 'text',   label: 'Text',   icon: 'create-outline'   },
    { id: 'photos', label: 'Photos', icon: 'images-outline'   },
    { id: 'video',  label: 'Video',  icon: 'videocam-outline' },
    { id: 'reel',   label: 'Reel',   icon: 'flame-outline'    },
];

// ─── Target avatar chip ────────────────────────────────────────────────────────
const TargetChip = memo(({ item, isSelected, onPress }) => {
    const name       = item.title || item.name || item.username || 'Me';
    const isVerified = !!item.verified;
    return (
        <TouchableOpacity
            style={[styles.chip, isSelected && styles.chipSelected]}
            activeOpacity={0.8}
            onPress={onPress}
        >
            <View style={[styles.chipRing, isSelected && styles.chipRingActive]}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.chipAvatar} />
                ) : (
                    <View style={[styles.chipAvatar, styles.chipAvatarFallback]}>
                        <Ionicons
                            name={item._type === 'group' ? 'people' : item._type === 'page' ? 'storefront' : 'person'}
                            size={18} color={BRAND}
                        />
                    </View>
                )}
            </View>
            <View style={styles.chipNameRow}>
                <Text style={[styles.chipName, isSelected && styles.chipNameActive]} numberOfLines={1}>{name}</Text>
                {isVerified && <Ionicons name="checkmark-circle" size={11} color={ACCENT} style={{ marginLeft: 2 }} />}
            </View>
            {item._type === 'group' && <Text style={styles.chipSub}>{Number(item.members ?? 0).toLocaleString()} members</Text>}
            {item._type === 'page'  && <Text style={styles.chipSub}>{Number(item.likes ?? 0).toLocaleString()} likes</Text>}
        </TouchableOpacity>
    );
});

// ─── Main component ────────────────────────────────────────────────────────────
const PostComposerModal = () => {
    const { top }        = useSafeAreaInsets();
    const { token }      = useAuth();
    const isComposerOpen = useStore((s) => s.isComposerOpen);
    const closeComposer  = useStore((s) => s.closeComposer);
    const composerConfig = useStore((s) => s.composerConfig);
    const userAvatar     = useStore((s) => s.userAvatar);
    const triggerRefresh = useStore((s) => s.triggerRefresh);

    // ── Targets ─────────────────────────────────────────────────────────────
    const [targets,           setTargets]           = useState([]);
    const [targetsLoading,    setTargetsLoading]    = useState(false);
    const [selectedTargetIdx, setSelectedTargetIdx] = useState(0);
    const [selectedTargetType, setSelectedTargetType] = useState('profile');
    const [selectedTargetId,  setSelectedTargetId]  = useState(0);

    // ── Post type ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('text');

    const resolveTargetTypeAndId = useCallback((item) => {
        const type = item?._type === 'group' || item?._type === 'page' ? item._type : 'profile';
        if (type === 'profile') return { type: 'profile', id: 0 };
        const id = item?.id ?? item?.group_id ?? item?.page_id ?? item?.target_id ?? 0;
        return { type, id };
    }, []);

    const handleSelectTarget = useCallback((item, index) => {
        const resolved = resolveTargetTypeAndId(item);
        setSelectedTargetIdx(index);
        setSelectedTargetType(resolved.type);
        setSelectedTargetId(resolved.id);
    }, [resolveTargetTypeAndId]);

    // ── Content state ─────────────────────────────────────────────────────────
    const [postText,       setPostText]       = useState('');
    const [locationText,   setLocationText]   = useState('');
    const [showLocation,   setShowLocation]   = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedVideo,  setSelectedVideo]  = useState(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [selectedCategory,  setSelectedCategory]  = useState(null);

    // ── Upload / post state ───────────────────────────────────────────────────
    const [uploadState, setUploadState] = useState(null);
    const [postSuccess, setPostSuccess] = useState(false);
    const successScale = useRef(new Animated.Value(0)).current;

    // ── Video player ──────────────────────────────────────────────────────────
    const videoPlayer = useVideoPlayer(null, (p) => { if (p) p.loop = true; });
    useEffect(() => {
        if (selectedVideo?.uri) {
            videoPlayer.replaceAsync({ uri: selectedVideo.uri }).catch(() => {});
        } else {
            try { videoPlayer.pause(); } catch (_) {}
        }
    }, [selectedVideo?.uri]); // eslint-disable-line

    // ── Fetch targets on open ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isComposerOpen || !token) return;

        if (composerConfig?.locked) {
            const type = composerConfig._type === 'group' ? 'group'
                       : composerConfig._type === 'page'  ? 'page'
                       : 'profile';
            setSelectedTargetType(type);
            setSelectedTargetId(composerConfig.id ?? 0);
            return;
        }

        let cancelled = false;
        const fetchTargets = async () => {
            setTargetsLoading(true);
            try {
                const res  = await fetch('https://hafrik.com/api/v1/feed/my_target.php', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (cancelled) return;
                const data    = json?.data ?? {};
                const profile = data.profile ? [{ ...data.profile, _type: 'profile' }] : [];
                const groups  = (Array.isArray(data.groups) ? data.groups : []).map(g => ({ ...g, _type: 'group' }));
                const pages   = (Array.isArray(data.pages)  ? data.pages  : []).map(p => ({ ...p, _type: 'page'  }));
                const next    = [...profile, ...groups, ...pages];
                setTargets(next);
                const first    = next[0] ?? null;
                const resolved = resolveTargetTypeAndId(first);
                setSelectedTargetIdx(0);
                setSelectedTargetType(resolved.type);
                setSelectedTargetId(resolved.id);
            } catch (_) {}
            if (!cancelled) setTargetsLoading(false);
        };
        fetchTargets();
        return () => { cancelled = true; };
    }, [isComposerOpen, token, composerConfig]);

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetAll = useCallback(() => {
        try { videoPlayer.pause(); } catch (_) {}
        setTargets([]); setSelectedTargetIdx(0);
        setSelectedTargetType('profile'); setSelectedTargetId(0);
        setTargetsLoading(false); setActiveTab('text');
        setPostText(''); setLocationText(''); setShowLocation(false);
        setSelectedImages([]); setSelectedVideo(null);
        setSelectedThumbnail(null); setSelectedCategory(null);
        setUploadState(null); setPostSuccess(false);
        successScale.setValue(0);
    }, []); // eslint-disable-line

    const handleClose = useCallback(() => { resetAll(); closeComposer(); }, [resetAll, closeComposer]);

    // ── Can post? ─────────────────────────────────────────────────────────────
    const canPost = (() => {
        if (uploadState || postSuccess) return false;
        if (activeTab === 'text')   return postText.trim().length > 0;
        if (activeTab === 'photos') return selectedImages.length > 0;
        if (activeTab === 'video')  return !!selectedVideo;
        if (activeTab === 'reel')   return !!selectedVideo;
        return false;
    })();

    // ── Permission helper ─────────────────────────────────────────────────────
    const requestPermission = useCallback(async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm?.granted || perm?.status === 'limited') return true;
        if (Platform.OS === 'android') return true;
        Alert.alert(
            'Photos & Videos Access',
            'Hafrik needs access to your photo library to add media to your post.',
            [
                { text: 'Not Now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
            ],
        );
        return false;
    }, []);

    // ── Media pickers (FIXED: using string array format for mediaTypes) ────────
    const pickImages = async () => {
        if (!(await requestPermission())) return;
        if (selectedImages.length >= 10) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],          // ✅ fixed — was deprecated enum
            allowsMultipleSelection: true,
            quality: 1,
            selectionLimit: 10 - selectedImages.length,
        });
        if (result.canceled) return;
        const next = result.assets.slice(0, 10 - selectedImages.length).map(a => ({
            id: `${Date.now()}_${Math.random()}`,
            uri: a.uri, fileName: a.fileName || 'photo.jpg', type: 'image', fileType: 'photo',
        }));
        setSelectedImages(prev => [...prev, ...next]);
    };

    const pickVideo = async () => {
        if (!(await requestPermission())) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],          // ✅ fixed — was deprecated enum
            quality: 1,
        });
        if (result.canceled) return;
        const a = result.assets[0];
        setSelectedVideo({ id: `${Date.now()}`, uri: a.uri, fileName: a.fileName || 'video.mp4', type: 'video', fileType: 'video' });
        setSelectedThumbnail(null);
    };

    const pickThumbnail = async () => {
        if (!(await requestPermission())) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],          // ✅ fixed — was deprecated enum
            quality: 1,
        });
        if (result.canceled) return;
        const a = result.assets[0];
        setSelectedThumbnail({ id: `${Date.now()}`, uri: a.uri, fileName: a.fileName || 'thumb.jpg', type: 'image', fileType: 'photo' });
    };

    // ── Post ──────────────────────────────────────────────────────────────────
    const handlePost = async () => {
        if (!canPost) return;
        const mappedType = activeTab === 'text' ? 'post' : activeTab;
        const postBody = { type: mappedType, target_type: selectedTargetType };
        if (postText.trim()) postBody.text = postText.trim();
        if (locationText.trim()) postBody.location = locationText.trim();
        if ((selectedTargetType === 'group' || selectedTargetType === 'page') && selectedTargetId) {
            postBody.target_id = selectedTargetId;
        }
        try {
            if (activeTab === 'photos' && selectedImages.length > 0) {
                const total = selectedImages.length;
                setUploadState({ phase: 'uploading', done: 0, total });
                const urls = [];
                for (let i = 0; i < total; i++) {
                    const res = await UploadMediaController(selectedImages[i], token);
                    if (res.status === 'success') urls.push(res.data.url);
                    setUploadState({ phase: 'uploading', done: i + 1, total });
                }
                postBody.media = urls;
            } else if (activeTab === 'video' || activeTab === 'reel') {
                const total = selectedThumbnail ? 2 : 1;
                setUploadState({ phase: 'uploading', done: 0, total });
                const vidRes = await UploadMediaController(selectedVideo, token);
                if (vidRes.status === 'success') postBody.video_url = vidRes.data.url;
                setUploadState({ phase: 'uploading', done: 1, total });
                if (selectedThumbnail) {
                    const tRes = await UploadMediaController(selectedThumbnail, token);
                    if (tRes.status === 'success') postBody.thumbnail = tRes.data.url;
                    setUploadState({ phase: 'uploading', done: 2, total });
                }
                if (activeTab === 'video' && selectedCategory) postBody.category_id = selectedCategory;
            }
            setUploadState({ phase: 'publishing', done: 0, total: 1 });
            const response = await PostFeedController(postBody, token);
            if (response.status === 'success') {
                setUploadState(null);
                setPostSuccess(true);
                triggerRefresh();
                Animated.sequence([
                    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
                    Animated.delay(1000),
                    Animated.timing(successScale, { toValue: 0, duration: 160, useNativeDriver: true }),
                ]).start(() => handleClose());
            } else {
                setUploadState(null);
                Alert.alert('Post Failed', response.data?.message || response.message || 'Please try again.');
            }
        } catch (err) {
            setUploadState(null);
            Alert.alert('Error', err?.message || 'Something went wrong. Please try again.');
        }
    };

    // ── Tab content ───────────────────────────────────────────────────────────
    const renderContent = () => {
        if (activeTab === 'text') {
            return (
                <View style={styles.contentArea}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="What's on your mind?"
                        placeholderTextColor={MUTED}
                        multiline
                        value={postText}
                        onChangeText={setPostText}
                        autoFocus
                        textAlignVertical="top"
                    />
                    {showLocation ? (
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={16} color={ACCENT} />
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Add location…"
                                placeholderTextColor={MUTED}
                                value={locationText}
                                onChangeText={setLocationText}
                            />
                            <TouchableOpacity onPress={() => { setShowLocation(false); setLocationText(''); }}>
                                <Ionicons name="close-circle" size={18} color={MUTED} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.addLocationBtn} onPress={() => setShowLocation(true)}>
                            <Ionicons name="location-outline" size={15} color={MUTED} />
                            <Text style={styles.addLocationText}>Add location</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        if (activeTab === 'photos') {
            return (
                <View style={styles.contentArea}>
                    <TextInput
                        style={[styles.textInput, { minHeight: 72 }]}
                        placeholder="Write a caption…"
                        placeholderTextColor={MUTED}
                        multiline
                        value={postText}
                        onChangeText={setPostText}
                        textAlignVertical="top"
                    />
                    {selectedImages.length === 0 ? (
                        <TouchableOpacity style={styles.mediaPickerEmpty} onPress={pickImages} activeOpacity={0.85}>
                            <View style={styles.mediaPickerEmptyIcon}>
                                <Ionicons name="images" size={36} color={ACCENT} />
                            </View>
                            <Text style={styles.mediaPickerEmptyTitle}>Add Photos</Text>
                            <Text style={styles.mediaPickerEmptySub}>Tap to pick from your library · up to 10</Text>
                        </TouchableOpacity>
                    ) : (
                        <View>
                            <View style={styles.photoGrid}>
                                {selectedImages.map((img, idx) => (
                                    <View key={img.id} style={styles.photoCell}>
                                        <Image source={{ uri: img.uri }} style={styles.photoThumb} resizeMode="cover" />
                                        <TouchableOpacity
                                            style={styles.photoRemove}
                                            onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                                        >
                                            <Ionicons name="close-circle" size={22} color={BLACK + 'BF'} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {selectedImages.length < 10 && (
                                    <TouchableOpacity style={styles.photoAddMore} onPress={pickImages} activeOpacity={0.8}>
                                        <Ionicons name="add" size={28} color={ACCENT} />
                                        <Text style={styles.photoAddMoreText}>More</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={styles.photoCount}>{selectedImages.length}/10 photos selected</Text>
                        </View>
                    )}
                </View>
            );
        }

        if (activeTab === 'video' || activeTab === 'reel') {
            return (
                <View style={styles.contentArea}>
                    <TextInput
                        style={[styles.textInput, { minHeight: 72 }]}
                        placeholder={activeTab === 'reel' ? 'Describe your reel…' : 'Write a caption…'}
                        placeholderTextColor={MUTED}
                        multiline
                        value={postText}
                        onChangeText={setPostText}
                        textAlignVertical="top"
                    />
                    {selectedVideo ? (
                        <View style={styles.videoWrap}>
                            <VideoView player={videoPlayer} style={styles.videoPreview} nativeControls contentFit="cover" />
                            <TouchableOpacity
                                style={styles.videoRemove}
                                onPress={() => { try { videoPlayer.pause(); } catch (_) {} setSelectedVideo(null); setSelectedThumbnail(null); }}
                                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                            >
                                <Ionicons name="close-circle" size={24} color={BLACK + 'BF'} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.mediaPickerEmpty} onPress={pickVideo} activeOpacity={0.85}>
                            <View style={styles.mediaPickerEmptyIcon}>
                                <Ionicons name="videocam" size={36} color={ACCENT} />
                            </View>
                            <Text style={styles.mediaPickerEmptyTitle}>
                                {activeTab === 'reel' ? 'Add Reel Video' : 'Add Video'}
                            </Text>
                            <Text style={styles.mediaPickerEmptySub}>Tap to pick a video from your library</Text>
                        </TouchableOpacity>
                    )}
                    {selectedVideo && (
                        <View style={styles.thumbSection}>
                            <Text style={styles.thumbLabel}>Thumbnail (optional)</Text>
                            <TouchableOpacity style={styles.thumbPicker} onPress={pickThumbnail} activeOpacity={0.85}>
                                {selectedThumbnail ? (
                                    <>
                                        <Image source={{ uri: selectedThumbnail.uri }} style={styles.thumbImg} resizeMode="cover" />
                                        <TouchableOpacity
                                            style={styles.thumbRemove}
                                            onPress={(e) => { e.stopPropagation?.(); setSelectedThumbnail(null); }}
                                            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                                        >
                                            <Ionicons name="close-circle" size={18} color={BLACK + 'BF'} />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.thumbPlaceholder}>
                                        <Ionicons name="image-outline" size={24} color={MUTED} />
                                        <Text style={styles.thumbPlaceholderText}>Pick thumbnail</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                    {activeTab === 'video' && selectedVideo && (
                        <View style={styles.categorySection}>
                            <Text style={styles.categoryLabel}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {PostFeedList.videoCategory.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.catPill, selectedCategory === cat.id && styles.catPillActive]}
                                        onPress={() => setSelectedCategory(cat.id)}
                                    >
                                        <Text style={[styles.catPillText, selectedCategory === cat.id && styles.catPillTextActive]}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            );
        }
        return null;
    };

    const uploadLabel = uploadState
        ? uploadState.phase === 'uploading' ? `Uploading ${uploadState.done}/${uploadState.total}…` : 'Publishing…'
        : '';

    return (
        <Modal
            visible={isComposerOpen}
            animationType="slide"
            transparent={true}               // ✅ transparent so backdrop shows
            onRequestClose={handleClose}
        >
            {/* ── Dimmed backdrop ── */}
            <View style={styles.backdrop}>
                {/* Tap outside to close */}
                <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={handleClose} />

                {/* ── Bottom sheet ── */}
                <KeyboardAvoidingView
                    style={styles.sheetWrapper}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={[styles.root, { paddingBottom: Platform.OS === 'ios' ? top : 0 }]}>
                        {/* Drag handle */}
                        <View style={styles.dragHandle} />

                        <KeyboardAvoidingView
                            style={{ flex: 1 }}
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        >
                            {/* ── HEADER ─────────────────────────────────────────────── */}
                            <LinearGradient
                                colors={[WHITE, BG]}
                                style={styles.header}
                            >
                                <TouchableOpacity style={styles.headerClose} onPress={handleClose} activeOpacity={0.7}>
                                    <Ionicons name="close" size={22} color={BRAND} />
                                </TouchableOpacity>

                                <Text style={styles.headerTitle}>New Post</Text>

                                <TouchableOpacity
                                    style={[styles.postBtn, !canPost && styles.postBtnOff]}
                                    onPress={handlePost}
                                    disabled={!canPost || !!uploadState}
                                    activeOpacity={0.85}
                                >
                                    {uploadState
                                        ? <ActivityIndicator size="small" color={WHITE} />
                                        : <Text style={styles.postBtnText}>Post</Text>
                                    }
                                </TouchableOpacity>
                            </LinearGradient>

                            {/* ── POST TO ─────────────────────────────────────────────── */}
                            <View style={styles.targetSection}>
                                <Text style={styles.targetLabel}>
                                    Post to{composerConfig?.locked ? '' : ''}
                                </Text>
                                {composerConfig?.locked ? (
                                    <View style={styles.targetFallback}>
                                        <View style={[styles.chipRing, styles.chipRingActive]}>
                                            {composerConfig.avatar ? (
                                                <Image source={{ uri: composerConfig.avatar }} style={styles.chipAvatar} />
                                            ) : (
                                                <View style={[styles.chipAvatar, styles.chipAvatarFallback]}>
                                                    <Ionicons
                                                        name={composerConfig._type === 'group' ? 'people' : 'storefront'}
                                                        size={18} color={BRAND}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.chipName, styles.chipNameActive]} numberOfLines={1}>
                                            {composerConfig.title || (composerConfig._type === 'group' ? 'Group' : 'Page')}
                                        </Text>
                                        <Ionicons name="lock-closed" size={11} color={MUTED} style={{ marginLeft: 4 }} />
                                    </View>
                                ) : targetsLoading ? (
                                    <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 16, marginTop: 8 }} />
                                ) : targets.length === 0 ? (
                                    <View style={styles.targetFallback}>
                                        <View style={[styles.chipRing, styles.chipRingActive]}>
                                            {userAvatar ? (
                                                <Image source={{ uri: userAvatar }} style={styles.chipAvatar} />
                                            ) : (
                                                <View style={[styles.chipAvatar, styles.chipAvatarFallback]}>
                                                    <Ionicons name="person" size={18} color={BRAND} />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.chipName, styles.chipNameActive]}>My Profile</Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={targets}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyExtractor={(item, i) => `${item._type}_${item.id ?? i}`}
                                        contentContainerStyle={styles.targetList}
                                        renderItem={({ item, index }) => (
                                            <TargetChip
                                                item={item}
                                                isSelected={selectedTargetIdx === index}
                                                onPress={() => handleSelectTarget(item, index)}
                                            />
                                        )}
                                    />
                                )}
                            </View>

                            {/* ── POST TYPE TABS ─────────────────────────────────────── */}
                            <View style={styles.tabs}>
                                {POST_TYPES.map(tab => {
                                    const active = activeTab === tab.id;
                                    return (
                                        <TouchableOpacity
                                            key={tab.id}
                                            style={[styles.tab, active && styles.tabActive]}
                                            onPress={() => setActiveTab(tab.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                                                <Ionicons name={tab.icon} size={17} color={active ? ACCENT : MUTED} />
                                            </View>
                                            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* ── CONTENT ─────────────────────────────────────────────── */}
                            <ScrollView
                                style={{ flex: 1 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 32 }}
                            >
                                {renderContent()}
                            </ScrollView>

                            {/* ── UPLOAD OVERLAY ─────────────────────────────────────── */}
                            {!!uploadState && (
                                <View style={styles.overlay}>
                                    <View style={styles.overlayCard}>
                                        <ActivityIndicator size="large" color={ACCENT} />
                                        <Text style={styles.overlayLabel}>{uploadLabel}</Text>
                                        {uploadState.phase === 'uploading' && uploadState.total > 1 && (
                                            <View style={styles.progressBar}>
                                                <View style={[styles.progressFill, { width: `${(uploadState.done / uploadState.total) * 100}%` }]} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* ── SUCCESS OVERLAY ─────────────────────────────────────── */}
                            {postSuccess && (
                                <View style={styles.overlay}>
                                    <Animated.View style={[styles.overlayCard, { transform: [{ scale: successScale }] }]}>
                                        <LinearGradient colors={[ACCENT, BRAND]} style={styles.successCircle}>
                                            <Ionicons name="checkmark" size={40} color={WHITE} />
                                        </LinearGradient>
                                        <Text style={styles.successLabel}>Posted!</Text>
                                        <Text style={styles.successSub}>Your post is live</Text>
                                    </Animated.View>
                                </View>
                            )}
                        </KeyboardAvoidingView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const PHOTO_CELL = (SCREEN_W - 36 - 8 * 2) / 3;

const styles = StyleSheet.create({

    // ── Modal backdrop (full screen, dimmed) ──────────────────────────────────
    backdrop: {
        flex: 1,
        backgroundColor: BLACK + '80',   // ✅ dimmed overlay
        justifyContent: 'flex-end',            // ✅ sheet sits at the bottom
    },
    backdropTap: {
        // Fills the space above the sheet so tapping it closes the modal
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },

    // ── Sheet wrapper (90% screen height, rounded top corners) ───────────────
    sheetWrapper: {
        height: '90%',                         // ✅ ~90% of screen height
    },

    // ── Sheet root ────────────────────────────────────────────────────────────
    root: {
        flex: 1,
        backgroundColor: WHITE,
        borderTopLeftRadius: 20,               // ✅ rounded top corners
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },

    // ── Drag handle ───────────────────────────────────────────────────────────
    dragHandle: {
        width: 40, height: 4,
        backgroundColor: BORDER,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10, marginBottom: 4,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        height: 58,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerClose: {
        width: 38, height: 38,
        borderRadius: 19,
        backgroundColor: BG,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17, fontWeight: '800', color: BRAND,
        letterSpacing: -0.3,
    },
    postBtn: {
        backgroundColor: ACCENT,
        paddingHorizontal: 22, paddingVertical: 9,
        borderRadius: 22, minWidth: 72,
        alignItems: 'center', justifyContent: 'center',
    },
    postBtnOff: { backgroundColor: ACCENT + '66' },
    postBtnText: { color: WHITE, fontWeight: '800', fontSize: 14 },

    // ── Target selector ───────────────────────────────────────────────────────
    targetSection: {
        paddingTop: 12, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: BORDER,
    },
    targetLabel: {
        fontSize: 10, fontWeight: '800', color: MUTED,
        letterSpacing: 1, textTransform: 'uppercase',
        marginLeft: 16, marginBottom: 10,
    },
    targetList: { paddingHorizontal: 16, gap: 14 },
    targetFallback: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 4 },

    // ── Chip ──────────────────────────────────────────────────────────────────
    chip: { alignItems: 'center', width: 72, opacity: 0.5 },
    chipSelected: { opacity: 1 },
    chipRing: {
        width: 54, height: 54, borderRadius: 27,
        borderWidth: 2.5, borderColor: 'transparent',
        padding: 2, marginBottom: 5,
    },
    chipRingActive: { borderColor: ACCENT },
    chipAvatar: { width: '100%', height: '100%', borderRadius: 23 },
    chipAvatarFallback: { backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    chipNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    chipName: { fontSize: 11, color: MUTED, fontWeight: '500', textAlign: 'center' },
    chipNameActive: { color: BRAND, fontWeight: '700' },
    chipSub: { fontSize: 9, color: MUTED, marginTop: 1, textAlign: 'center' },

    // ── Post type tabs ────────────────────────────────────────────────────────
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1, borderBottomColor: BORDER,
        backgroundColor: WHITE,
    },
    tab: {
        flex: 1,
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, gap: 4,
    },
    tabActive: {},
    tabIconWrap: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    tabIconWrapActive: { backgroundColor: ACCENT + '1F' },
    tabText: { fontSize: 10.5, color: MUTED, fontWeight: '600' },
    tabTextActive: { color: ACCENT, fontWeight: '800' },

    // ── Content area ──────────────────────────────────────────────────────────
    contentArea: { padding: 18 },
    textInput: {
        fontSize: 16, color: BRAND, lineHeight: 25,
        minHeight: 130, textAlignVertical: 'top', marginBottom: 14,
    },

    // ── Location ─────────────────────────────────────────────────────────────
    locationRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: BG, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10, marginTop: 4,
    },
    locationInput: { flex: 1, fontSize: 14, color: BRAND },
    addLocationBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
    addLocationText: { fontSize: 13, color: MUTED },

    // ── Empty media picker ────────────────────────────────────────────────────
    mediaPickerEmpty: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: BG, borderRadius: 18,
        paddingVertical: 44,
        borderWidth: 1.5, borderColor: ACCENT, borderStyle: 'dashed',
        marginBottom: 16,
    },
    mediaPickerEmptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: ACCENT + '1F',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    mediaPickerEmptyTitle: {
        fontSize: 17, fontWeight: '800', color: BRAND, marginBottom: 6,
    },
    mediaPickerEmptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },

    // ── Photo grid ────────────────────────────────────────────────────────────
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    photoCell: { position: 'relative', width: PHOTO_CELL, height: PHOTO_CELL },
    photoThumb: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: BG },
    photoRemove: {
        position: 'absolute', top: 5, right: 5,
        backgroundColor: WHITE + 'E6', borderRadius: 11,
    },
    photoAddMore: {
        width: PHOTO_CELL, height: PHOTO_CELL,
        borderRadius: 12, borderWidth: 1.5, borderColor: ACCENT, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: ACCENT + '0F',
    },
    photoAddMoreText: { fontSize: 11, color: ACCENT, fontWeight: '700' },
    photoCount: { fontSize: 12, color: MUTED, marginTop: 2, textAlign: 'right' },

    // ── Video ─────────────────────────────────────────────────────────────────
    videoWrap: { position: 'relative', marginBottom: 16, alignSelf: 'flex-start', width: '100%' },
    videoPreview: {
        width: SCREEN_W - 36,
        height: Math.round((SCREEN_W - 36) * 9 / 16),
        borderRadius: 14, backgroundColor: BLACK,
    },
    videoRemove: {
        position: 'absolute', top: 10, right: 10,
        backgroundColor: WHITE + 'E6', borderRadius: 12,
    },

    // ── Thumbnail ─────────────────────────────────────────────────────────────
    thumbSection: { marginBottom: 16 },
    thumbLabel: { fontSize: 13, fontWeight: '700', color: BRAND, marginBottom: 8 },
    thumbPicker: { position: 'relative', alignSelf: 'flex-start' },
    thumbImg: { width: 130, height: 88, borderRadius: 12 },
    thumbPlaceholder: {
        width: 130, height: 88, borderRadius: 12,
        backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    thumbPlaceholderText: { fontSize: 11, color: MUTED },
    thumbRemove: {
        position: 'absolute', top: 5, right: 5,
        backgroundColor: WHITE + 'E6', borderRadius: 9,
    },

    // ── Category ──────────────────────────────────────────────────────────────
    categorySection: { marginTop: 4, marginBottom: 8 },
    categoryLabel: { fontSize: 13, fontWeight: '700', color: BRAND, marginBottom: 10 },
    catPill: {
        backgroundColor: BG, borderRadius: 22,
        paddingHorizontal: 14, paddingVertical: 8,
        marginRight: 8, borderWidth: 1, borderColor: BORDER,
    },
    catPillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    catPillText: { fontSize: 12, color: MUTED, fontWeight: '600' },
    catPillTextActive: { color: WHITE, fontWeight: '800' },

    // ── Upload / Success overlay ──────────────────────────────────────────────
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: BRAND + '8C',
        justifyContent: 'center', alignItems: 'center', zIndex: 100,
    },
    overlayCard: {
        backgroundColor: WHITE, borderRadius: 24,
        paddingHorizontal: 44, paddingVertical: 36,
        alignItems: 'center', gap: 14,
        shadowColor: BLACK, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2, shadowRadius: 24, elevation: 16, minWidth: 220,
    },
    overlayLabel: { fontSize: 15, fontWeight: '700', color: BRAND },
    progressBar: {
        width: 160, height: 5, backgroundColor: BG,
        borderRadius: 3, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 3 },
    successCircle: {
        width: 78, height: 78, borderRadius: 39,
        justifyContent: 'center', alignItems: 'center',
    },
    successLabel: { fontSize: 22, fontWeight: '900', color: BRAND },
    successSub: { fontSize: 13, color: MUTED },
});

export default memo(PostComposerModal);
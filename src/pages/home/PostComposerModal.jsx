import React, {
    useState, useRef, useEffect, useCallback, memo,
} from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    Modal, TextInput, Dimensions, Image, ActivityIndicator,
    ScrollView, Platform, KeyboardAvoidingView, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import apiClient from '../../api/apiClient';
import { startBackgroundUpload } from '../../helpers/BackgroundUploadManager';
import PostFeedList from '../../helpers/postfeedlists';
import useStore from '../../repository/store';
import { Colors } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const BORDER = Colors.border ?? '#E8E8E8';
const BG     = Colors.surfaceTint ?? '#F7F8FA';
const WHITE  = Colors.white;
const BLACK  = Colors.black;

// ─── Predefined hashtag categories ────────────────────────────────────────────
const PREDEFINED_HASHTAGS = [
    'ChinaLife', 'Guangzhou', 'MarketFinds', 'Shipping',
    'Sourcing', 'BusinessTips', 'FactoryVisit', 'HafrikShop',
    'BuyAndShip', 'StudentLife', 'Admission', 'Scholarship',
    'VisaHelp', 'Accommodation', 'AfricanFood', 'TravelChina',
    'Jobs', 'Community', 'WalletTips', 'Translator',
];

const cleanAiText = (text = '') =>
    String(text)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
        .trim();

const cleanAiError = (message = '') => {
    const text = String(message || '').trim();
    if (!text) return 'AI could not respond clearly. Please try again.';
    if (/kimi|moonshot|provider|empty response|empty\s+respon/i.test(text)) {
        return 'AI could not respond clearly. Please try again.';
    }
    return text;
};

const parseAiDrafts = (reply = '') => {
    const lines = String(reply)
        .split('\n')
        .map(line => cleanAiText(line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')))
        .filter(Boolean)
        .filter(line => !/^(options?|drafts?|captions?|rewrites?)[:：]?$/i.test(line));

    if (lines.length > 1) return Array.from(new Set(lines)).slice(0, 4);

    const parts = String(reply)
        .split(/\n{2,}|(?:Option|Draft)\s*\d+[:：]/i)
        .map(cleanAiText)
        .filter(Boolean);

    return Array.from(new Set(parts)).slice(0, 4);
};

const fallbackComposerDrafts = ({ draft = '', activeTab = 'text', selectedHashtags = [] }) => {
    const tags = selectedHashtags.length ? `\n\n${selectedHashtags.map(t => `#${t}`).join(' ')}` : '';
    const base = draft.trim();
    if (base) {
        return [
            `${base}${tags}`,
            `Sharing this because it may help someone here: ${base}${tags}`,
            `Quick one: ${base}${tags}`,
            `What do you think about this? ${base}${tags}`,
        ].map(cleanAiText);
    }

    if (activeTab === 'reel') {
        return [
            `A quick moment worth sharing.${tags}`,
            `Watch this and tell me what you think.${tags}`,
            `Small clip, big message.${tags}`,
            `Sharing this from Hafrik.${tags}`,
        ];
    }
    if (activeTab === 'photos') {
        return [
            `A few moments from today.${tags}`,
            `Photos that tell the story better.${tags}`,
            `Sharing this with my Hafrik people.${tags}`,
            `Which one is your favorite?${tags}`,
        ];
    }
    if (activeTab === 'video') {
        return [
            `This video explains it better.${tags}`,
            `Sharing something useful here.${tags}`,
            `Watch this and share your thoughts.${tags}`,
            `A quick video update.${tags}`,
        ];
    }
    return [
        `What is on my mind today...${tags}`,
        `Let me share this with you all.${tags}`,
        `Quick thought for the Hafrik community.${tags}`,
        `I would like to hear your thoughts on this.${tags}`,
    ];
};

// ─── Target picker modal ──────────────────────────────────────────────────────
const TargetPickerModal = memo(({ visible, targets, selectedIdx, onSelect, onClose }) => {
    const profile = targets.filter(t => t._type === 'profile');
    const groups  = targets.filter(t => t._type === 'group');
    const pages   = targets.filter(t => t._type === 'page');

    const Section = ({ title, icon, color, items, startIdx }) => {
        if (!items.length) return null;
        return (
            <View style={tpStyles.section}>
                <View style={tpStyles.sectionHeader}>
                    <Ionicons name={icon} size={13} color={color} />
                    <Text style={[tpStyles.sectionTitle, { color }]}>{title}</Text>
                </View>
                {items.map((item, i) => {
                    const globalIdx = startIdx + i;
                    const active = selectedIdx === globalIdx;
                    const name   = item.title || item.name || item.username || 'Me';
                    return (
                        <TouchableOpacity
                            key={item.id ?? i}
                            style={[tpStyles.row, active && tpStyles.rowActive]}
                            onPress={() => { onSelect(item, globalIdx); onClose(); }}
                            activeOpacity={0.8}
                        >
                            {item.avatar ? (
                                <Image source={{ uri: item.avatar }} style={tpStyles.rowAvatar} />
                            ) : (
                                <View style={[tpStyles.rowAvatar, tpStyles.rowAvatarFallback]}>
                                    <Ionicons
                                        name={item._type === 'group' ? 'people' : item._type === 'page' ? 'storefront' : 'person'}
                                        size={16} color={active ? WHITE : BRAND}
                                    />
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={[tpStyles.rowName, active && { color: WHITE }]} numberOfLines={1}>{name}</Text>
                                {item._type === 'group' && !!item.members && (
                                    <Text style={[tpStyles.rowSub, active && { color: WHITE + 'BB' }]}>{Number(item.members).toLocaleString()} members</Text>
                                )}
                                {item._type === 'page' && !!item.likes && (
                                    <Text style={[tpStyles.rowSub, active && { color: WHITE + 'BB' }]}>{Number(item.likes).toLocaleString()} followers</Text>
                                )}
                            </View>
                            {active && <Ionicons name="checkmark-circle" size={20} color={WHITE} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const profileEnd  = profile.length;
    const groupEnd    = profileEnd + groups.length;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={tpStyles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={tpStyles.sheet}>
                    <View style={tpStyles.handle} />
                    <View style={tpStyles.sheetHeader}>
                        <Text style={tpStyles.sheetTitle}>Post to</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={22} color={BRAND} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Section title="My Profile"  icon="person-circle"  color={ACCENT} items={profile} startIdx={0}         />
                        <Section title="My Groups"   icon="people"         color='#27AE60' items={groups}  startIdx={profileEnd} />
                        <Section title="My Pages"    icon="storefront"     color='#F39C12' items={pages}   startIdx={groupEnd}   />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

const tpStyles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '75%', paddingHorizontal: 16, paddingBottom: 32, paddingTop: 10,
        shadowColor: BLACK, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 20,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER,
        alignSelf: 'center', marginBottom: 14,
    },
    sheetHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
    },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: BRAND },
    section: { marginBottom: 18 },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
    },
    sectionTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14,
        marginBottom: 4, backgroundColor: BG,
    },
    rowActive: { backgroundColor: BRAND },
    rowAvatar: { width: 40, height: 40, borderRadius: 20 },
    rowAvatarFallback: { backgroundColor: BORDER + '40', alignItems: 'center', justifyContent: 'center' },
    rowName: { fontSize: 14, fontWeight: '700', color: BRAND },
    rowSub:  { fontSize: 11, color: MUTED, marginTop: 1 },
});

// ─── Bottom toolbar actions ────────────────────────────────────────────────────
const TOOLBAR_ACTIONS = [
    { id: 'photos', icon: 'images',          label: 'Photo',    color: '#27AE60' },
    { id: 'video',  icon: 'videocam',         label: 'Video',    color: '#E74C3C' },
    { id: 'reel',   icon: 'play-circle',      label: 'Reel',     color: '#9B59B6' },
    { id: 'poll',   icon: 'stats-chart',      label: 'Poll',     color: '#F39C12' },
    { id: 'location', icon: 'location',       label: 'Location', color: '#3498DB' },
];

// (TargetChip replaced by TargetPickerModal)

// ─── Poll builder ─────────────────────────────────────────────────────────────
const PollBuilder = memo(({ options, onUpdate, onAdd, onRemove }) => (
    <View style={styles.pollWrap}>
        <View style={styles.pollTitleRow}>
            <Ionicons name="stats-chart" size={15} color={ACCENT} />
            <Text style={styles.pollTitle}>Poll Options</Text>
            <Text style={styles.pollHint}>(min 2, max 4)</Text>
        </View>
        {options.map((opt, idx) => (
            <View key={idx} style={styles.pollOptionRow}>
                <View style={styles.pollOptionBullet}>
                    <Text style={styles.pollOptionBulletText}>{idx + 1}</Text>
                </View>
                <TextInput
                    style={styles.pollOptionInput}
                    value={opt}
                    onChangeText={v => onUpdate(idx, v)}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={MUTED}
                    maxLength={60}
                    returnKeyType="next"
                />
                {options.length > 2 && (
                    <TouchableOpacity onPress={() => onRemove(idx)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Ionicons name="close-circle" size={20} color={MUTED} />
                    </TouchableOpacity>
                )}
            </View>
        ))}
        {options.length < 4 && (
            <TouchableOpacity style={styles.pollAddBtn} onPress={onAdd} activeOpacity={0.75}>
                <Ionicons name="add-circle-outline" size={17} color={ACCENT} />
                <Text style={styles.pollAddText}>Add option</Text>
            </TouchableOpacity>
        )}
    </View>
));

// ─── Hashtag selector ─────────────────────────────────────────────────────────
const HashtagSelector = memo(({ selected, onToggle, onClearAll }) => (
    <View style={styles.hashtagSection}>
        <View style={styles.hashtagHeader}>
            <Ionicons name="pricetag" size={13} color={ACCENT} />
            <Text style={styles.hashtagLabel}>Categories</Text>
            {selected.length > 0 && (
                <TouchableOpacity onPress={onClearAll} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
            )}
        </View>
        <View style={styles.hashtagGrid}>
            {PREDEFINED_HASHTAGS.map(tag => {
                const active = selected.includes(tag);
                return (
                    <TouchableOpacity
                        key={tag}
                        style={[styles.hashtagPill, active && styles.hashtagPillActive]}
                        onPress={() => onToggle(tag)}
                        activeOpacity={0.75}
                    >
                        {active
                            ? <Ionicons name="checkmark" size={10} color={WHITE} style={{ marginRight: 2 }} />
                            : <Text style={styles.hashtagHash}>#</Text>
                        }
                        <Text style={[styles.hashtagPillText, active && styles.hashtagPillTextActive]}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
        {selected.length > 0 && (
            <View style={styles.hashtagSelectedRow}>
                {selected.map(t => (
                    <View key={t} style={styles.hashtagBadge}>
                        <Text style={styles.hashtagBadgeText}>#{t}</Text>
                    </View>
                ))}
            </View>
        )}
    </View>
));

// ─── Main Composer ────────────────────────────────────────────────────────────
const PostComposerModal = () => {
    const { top, bottom } = useSafeAreaInsets();
    const { token }       = useAuth();
    const isComposerOpen  = useStore((s) => s.isComposerOpen);
    const closeComposer   = useStore((s) => s.closeComposer);
    const composerConfig  = useStore((s) => s.composerConfig);
    const userAvatar      = useStore((s) => s.userAvatar);

    // ── Targets ──────────────────────────────────────────────────────────────
    const [targets,            setTargets]            = useState([]);
    const [targetsLoading,     setTargetsLoading]     = useState(false);
    const [selectedTargetIdx,  setSelectedTargetIdx]  = useState(0);
    const [selectedTargetType, setSelectedTargetType] = useState('profile');
    const [selectedTargetId,   setSelectedTargetId]   = useState(0);

    // ── Active mode ───────────────────────────────────────────────────────────
    const [activeTab,        setActiveTab]        = useState('text');
    const [targetPickerOpen, setTargetPickerOpen] = useState(false);

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
    const [postText,          setPostText]          = useState('');
    const [locationText,      setLocationText]      = useState('');
    const [showLocation,      setShowLocation]      = useState(false);
    const [selectedImages,    setSelectedImages]    = useState([]);
    const [selectedVideo,     setSelectedVideo]     = useState(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [selectedCategory,  setSelectedCategory]  = useState(null);
    const [iCloudDownloading, setICloudDownloading] = useState(false);
    const [thumbnailLoading,  setThumbnailLoading]  = useState(false);
    const [selectedHashtags,  setSelectedHashtags]  = useState([]);
    const [aiDrafts,          setAiDrafts]          = useState([]);
    const [aiWriting,         setAiWriting]         = useState(false);
    const thumbnailAttemptRef = useRef(null);

    // ── Poll state ────────────────────────────────────────────────────────────
    const [pollOptions, setPollOptions] = useState(['', '']);

    const updatePollOption = useCallback((idx, val) => {
        setPollOptions(prev => { const n = [...prev]; n[idx] = val; return n; });
    }, []);
    const addPollOption    = useCallback(() => {
        setPollOptions(prev => prev.length < 4 ? [...prev, ''] : prev);
    }, []);
    const removePollOption = useCallback((idx) => {
        setPollOptions(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const toggleHashtag = useCallback((tag) => {
        setSelectedHashtags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }, []);
    const clearHashtags = useCallback(() => setSelectedHashtags([]), []);

    // ── Video player ──────────────────────────────────────────────────────────
    const videoPlayer = useVideoPlayer(null, (p) => { if (p) p.loop = true; });
    useEffect(() => {
        if (selectedVideo?.uri) {
            videoPlayer.replaceAsync({ uri: selectedVideo.uri }).catch(() => {});
        } else {
            try { videoPlayer.pause(); } catch (_) {}
        }
    }, [selectedVideo?.uri]); // eslint-disable-line

    const generateVideoThumbnail = useCallback(async (videoUri, force = false) => {
        if (!videoUri) return null;

        const cleanUri = videoUri.includes('#') ? videoUri.split('#')[0] : videoUri;
        if (!force && thumbnailAttemptRef.current === cleanUri) return null;

        thumbnailAttemptRef.current = cleanUri;
        setThumbnailLoading(true);

        try {
            const attempts = [
                { time: 1000 },
                { time: 500 },
                { time: 0 },
            ];

            let generated = null;
            for (const options of attempts) {
                try {
                    generated = await VideoThumbnails.getThumbnailAsync(cleanUri, options);
                    if (generated?.uri) break;
                } catch (_) {}
            }

            if (!generated?.uri) return null;

            const thumb = {
                id: `${Date.now()}`,
                uri: generated.uri,
                fileName: `hafrik_thumb_${Date.now()}.jpg`,
                type: 'image/jpeg',
                mimeType: 'image/jpeg',
                fileType: 'thumbnail',
            };
            setSelectedThumbnail(thumb);
            return thumb;
        } finally {
            setThumbnailLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isComposerOpen) return;
        if (!(activeTab === 'video' || activeTab === 'reel')) return;
        if (!selectedVideo?.uri || selectedThumbnail?.uri || thumbnailLoading) return;
        generateVideoThumbnail(selectedVideo.uri);
    }, [
        activeTab,
        generateVideoThumbnail,
        isComposerOpen,
        selectedThumbnail?.uri,
        selectedVideo?.uri,
        thumbnailLoading,
    ]);

    // ── Apply initialTab from composerConfig ──────────────────────────────────
    useEffect(() => {
        if (!isComposerOpen) return;
        const tab = composerConfig?.initialTab;
        if (tab) setActiveTab(tab);
        if (typeof composerConfig?.initialText === 'string') {
            setPostText(composerConfig.initialText);
        }
    }, [isComposerOpen, composerConfig?.initialTab, composerConfig?.initialText]);

    // ── Fetch targets on open ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isComposerOpen || !token) return;

        if (composerConfig?.locked) {
            const type = composerConfig.target_type
                       ?? (composerConfig._type === 'group' ? 'group'
                         : composerConfig._type === 'page'  ? 'page'
                         : 'profile');
            const id   = composerConfig.target_id ?? composerConfig.id ?? 0;
            setSelectedTargetType(type);
            setSelectedTargetId(id);
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
        thumbnailAttemptRef.current = null;
        setThumbnailLoading(false);
        setSelectedHashtags([]);
        setAiDrafts([]);
        setAiWriting(false);
        setPollOptions(['', '']);
        setTargetPickerOpen(false);
    }, []); // eslint-disable-line

    const handleClose = useCallback(() => { resetAll(); closeComposer(); }, [resetAll, closeComposer]);

    // ── Upload state ──────────────────────────────────────────────────────────
    const activeUpload = useStore((s) => s.activeUpload);

    // ── Can post? ─────────────────────────────────────────────────────────────
    const canPost = (() => {
        if (activeUpload) return false;
        if (activeTab === 'poll')   return pollOptions.filter(o => o.trim()).length >= 2;
        if (activeTab === 'photos') return selectedImages.length > 0;
        if (activeTab === 'video')  return !!selectedVideo;
        if (activeTab === 'reel')   return !!selectedVideo;
        // text (default) — allow if has text OR hashtags
        return postText.trim().length > 0 || selectedHashtags.length > 0;
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

    // ── Media pickers ─────────────────────────────────────────────────────────
    const pickImages = async () => {
        if (!(await requestPermission())) return;
        if (selectedImages.length >= 10) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 1,
            selectionLimit: 10 - selectedImages.length,
        });
        if (result.canceled) return;

        // ── Photo limit: 20 MB per image ──────────────────────────────────────
        const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
        const oversized = result.assets.filter(a => a.fileSize && a.fileSize > MAX_PHOTO_BYTES);
        if (oversized.length > 0) {
            Alert.alert(
                'Photo Too Large',
                `${oversized.length > 1 ? `${oversized.length} photos are` : 'One photo is'} over 20 MB and ${oversized.length > 1 ? 'were' : 'was'} skipped. Please use smaller images.`,
            );
        }
        const valid = result.assets.filter(a => !a.fileSize || a.fileSize <= MAX_PHOTO_BYTES);
        const next = valid.slice(0, 10 - selectedImages.length).map(a => ({
            id: `${Date.now()}_${Math.random()}`,
            uri: a.uri, fileName: a.fileName || 'photo.jpg', type: 'image', fileType: 'photo',
            fileSize: a.fileSize,
        }));
        setSelectedImages(prev => [...prev, ...next]);
    };

    const pickVideo = async (forReel = false) => {
        if (!(await requestPermission())) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            quality: 1,
        });
        if (result.canceled) return;
        const a = result.assets[0];

        // ── Resolve iCloud / off-device assets ────────────────────────────────
        // On iOS, videos stored only in iCloud return a URI that isn't fully
        // downloaded yet. getAssetInfoAsync with shouldDownloadFromNetwork:true
        // blocks until the file is fully available locally before we proceed.
        let resolvedUri = a.uri;
        if (a.assetId) {
            try {
                setICloudDownloading(true);
                const info = await MediaLibrary.getAssetInfoAsync(a.assetId, {
                    shouldDownloadFromNetwork: true,
                });
                if (info?.localUri) resolvedUri = info.localUri;
            } catch (_) {
                // iCloud fetch failed — fall back to picker URI and let upload handle it
            } finally {
                setICloudDownloading(false);
            }
        }

        // Strip iOS spatial/immersive video metadata fragment (e.g. #YnBsaXN0...).
        // iPhone 15 Pro+ appends a binary-plist fragment to spatial video URIs.
        // Both expo-video-thumbnails and react-native-compressor fail when the
        // file path contains this fragment, so strip it here once for all callers.
        if (resolvedUri?.includes('#')) {
            resolvedUri = resolvedUri.split('#')[0];
        }
        thumbnailAttemptRef.current = null;

        // ── Per-type limits ───────────────────────────────────────────────────
        const MAX_BYTES    = 1024 * 1024 * 1024;  // 1 GB for both reels and videos
        const MAX_DURATION = 10 * 60 * 1000;      // 10 min for both reels and videos
        const typeLabel    = forReel ? 'Reels' : 'Videos';
        const maxSizeLabel = '1 GB';
        const maxDurLabel  = '10 minutes';

        if (a.fileSize && a.fileSize > MAX_BYTES) {
            Alert.alert(
                'File Too Large',
                `${typeLabel} must be under ${maxSizeLabel}. Please trim or compress and try again.`,
            );
            return;
        }
        if (a.duration && a.duration > MAX_DURATION) {
            Alert.alert(
                'Video Too Long',
                `${typeLabel} can be at most ${maxDurLabel} long. Please trim and try again.`,
            );
            return;
        }

        setSelectedVideo({
            id: `${Date.now()}`,
            uri: resolvedUri,
            fileName: a.fileName || 'video.mp4',
            type: a.mimeType || 'video/mp4',
            mimeType: a.mimeType || 'video/mp4',
            fileType: forReel ? 'reel' : 'video',
            fileSize: a.fileSize,
            duration: a.duration,
        });
        setSelectedThumbnail(null);
        generateVideoThumbnail(resolvedUri, true).catch(() => {});
    };

    const pickThumbnail = async () => {
        if (!(await requestPermission())) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
        });
        if (result.canceled) return;
        const a = result.assets[0];
        thumbnailAttemptRef.current = null;
        setSelectedThumbnail({ id: `${Date.now()}`, uri: a.uri, fileName: a.fileName || 'thumb.jpg', type: 'image', fileType: 'photo' });
    };

    const handleAiWrite = useCallback(async () => {
        if (aiWriting) return;

        const draft = postText.trim();
        const mediaType = activeTab === 'text' ? 'normal text post' : activeTab;
        const hashtagText = selectedHashtags.length ? selectedHashtags.map(t => `#${t}`).join(' ') : '';
        const prompt = draft
            ? `Return only 4 caption options as a numbered list. Rewrite this Hafrik ${mediaType} caption. Keep the user's meaning, make it natural, short, and social. Do not add fake facts. Draft: ${draft}${hashtagText ? `\nHashtags: ${hashtagText}` : ''}`
            : `Return only 4 caption options as a numbered list for a Hafrik ${mediaType}. Make them natural, useful, and easy to post.${hashtagText ? ` Use these hashtags if helpful: ${hashtagText}` : ''}`;

        setAiWriting(true);
        try {
            const response = await apiClient.post('/ai/chat.php', {
                mode: 'Post Composer',
                context_type: 'post_composer',
                context_data: {
                    active_tab: activeTab,
                    selected_hashtags: selectedHashtags,
                    current_text: draft,
                },
                messages: [{ role: 'user', content: `${prompt}\nVariation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 7)}.` }],
                response_style: 'composer_drafts',
            }, { timeout: 45000 });

            if (response?.data?.status && response.data.status !== 'success') {
                throw new Error(response.data.message || 'AI could not respond clearly.');
            }

            const reply = response?.data?.reply
                ?? response?.data?.data?.reply
                ?? response?.data?.data?.content
                ?? response?.data?.content
                ?? response?.data?.text
                ?? '';
            const drafts = parseAiDrafts(reply);
            if (drafts.length) {
                setAiDrafts(drafts);
            } else {
                setAiDrafts(fallbackComposerDrafts({ draft, activeTab, selectedHashtags }));
            }
        } catch (error) {
            setAiDrafts(fallbackComposerDrafts({ draft, activeTab, selectedHashtags }));
            Alert.alert('AI helper', cleanAiError(error?.response?.data?.message ?? error?.message));
        } finally {
            setAiWriting(false);
        }
    }, [activeTab, aiWriting, postText, selectedHashtags]);

    // ── Toolbar press ─────────────────────────────────────────────────────────
    const handleToolbarPress = useCallback(async (actionId) => {
        if (actionId === 'location') {
            setShowLocation(v => !v);
            return;
        }
        if (actionId === 'photos') {
            setActiveTab('photos');
            await pickImages();
            return;
        }
        if (actionId === 'video') {
            setActiveTab('video');
            await pickVideo(false);
            return;
        }
        if (actionId === 'reel') {
            setActiveTab('reel');
            await pickVideo(true);
            return;
        }
        if (actionId === 'poll') {
            setActiveTab(prev => prev === 'poll' ? 'text' : 'poll');
            return;
        }
    }, []); // eslint-disable-line

    // ── Post ──────────────────────────────────────────────────────────────────
    const handlePost = useCallback(async () => {
        if (!canPost) return;

        const mappedType = activeTab === 'text' ? 'post' : activeTab;
        const postBody = {
            type: mappedType,
            target_type: selectedTargetType,
            privacy: 'public',
        };

        if (postText.trim()) postBody.text = postText.trim();
        if (locationText.trim()) postBody.location = locationText.trim();

        // Attach selected hashtags
        if (selectedHashtags.length > 0) {
            postBody.hashtags = selectedHashtags.join(',');
            const tagStr = selectedHashtags.map(t => `#${t}`).join(' ');
            postBody.text = postBody.text ? `${postBody.text}\n\n${tagStr}` : tagStr;
        }

        if (selectedTargetType !== 'profile' && selectedTargetId) {
            postBody.target_id = selectedTargetId;
        }

        // Poll options
        if (activeTab === 'poll') {
            postBody.poll_options = pollOptions.map(o => o.trim()).filter(Boolean);
        }

        const images    = [...selectedImages];
        const video     = selectedVideo;
        const thumbnail = selectedThumbnail;
        const category  = selectedCategory;
        const tab       = activeTab;
        const authToken = token;

        startBackgroundUpload({
            postBody,
            activeTab: tab,
            selectedImages: images,
            selectedVideo: video,
            selectedThumbnail: thumbnail,
            selectedCategory: category,
            token: authToken,
        });

        handleClose();
    }, [
        canPost, activeTab, selectedTargetType, selectedTargetId,
        postText, locationText, selectedHashtags, pollOptions,
        selectedImages, selectedVideo, selectedThumbnail, selectedCategory,
        token, handleClose,
    ]);

    const PHOTO_CELL = (SCREEN_W - 32 - 8) / 3;

    return (
        <Modal
            visible={isComposerOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <View style={styles.fullScreen}>

                {/* ── Header ── */}
                <LinearGradient
                    colors={[BRAND, '#10545B', ACCENT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: top, height: top + 78 }]}
                >
                    <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
                        <Ionicons name="close" size={22} color={WHITE} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerEyebrow}>HAFRIK</Text>
                        <Text style={styles.headerTitle}>Create Post</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.postBtn, !canPost && styles.postBtnOff]}
                        onPress={handlePost}
                        disabled={!canPost}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.postBtnText}>Post</Text>
                    </TouchableOpacity>
                </LinearGradient>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >

                    {/* ── Scrollable body ── */}
                    <ScrollView
                        style={{ flex: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingTop: 14, paddingBottom: 16 }}
                    >

                        {/* Post-to compact selector */}
                        {!composerConfig?.locked && (
                            <>
                                <TouchableOpacity
                                    style={styles.targetBar}
                                    onPress={() => !targetsLoading && setTargetPickerOpen(true)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.targetBarLabel}>Posting to</Text>
                                    {targetsLoading ? (
                                        <ActivityIndicator size="small" color={ACCENT} style={{ marginHorizontal: 8 }} />
                                    ) : (() => {
                                        const sel = targets[selectedTargetIdx];
                                        const name = sel?.title || sel?.name || sel?.username || 'My Profile';
                                        const type = sel?._type ?? 'profile';
                                        return (
                                            <View style={styles.targetSelected}>
                                                {sel?.avatar ? (
                                                    <Image source={{ uri: sel.avatar }} style={styles.targetSelAvatar} />
                                                ) : (
                                                    <View style={[styles.targetSelAvatar, { backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' }]}>
                                                        <Ionicons
                                                            name={type === 'group' ? 'people' : type === 'page' ? 'storefront' : 'person'}
                                                            size={12} color={ACCENT}
                                                        />
                                                    </View>
                                                )}
                                                <Text style={styles.targetSelName} numberOfLines={1}>{name}</Text>
                                                <View style={styles.targetTypeBadge}>
                                                    <Text style={styles.targetTypeText}>
                                                        {type === 'group' ? 'Group' : type === 'page' ? 'Page' : 'Profile'}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-down" size={14} color={MUTED} />
                                            </View>
                                        );
                                    })()}
                                </TouchableOpacity>

                                <TargetPickerModal
                                    visible={targetPickerOpen}
                                    targets={targets}
                                    selectedIdx={selectedTargetIdx}
                                    onSelect={handleSelectTarget}
                                    onClose={() => setTargetPickerOpen(false)}
                                />
                            </>
                        )}

                        {/* User avatar + text input */}
                        <View style={styles.composeRow}>
                            {userAvatar ? (
                                <Image source={{ uri: userAvatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback]}>
                                    <Ionicons name="person" size={20} color={MUTED} />
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={
                                        activeTab === 'poll'   ? "Ask a question… (optional)" :
                                        activeTab === 'photos' ? "Write a caption…" :
                                        activeTab === 'video' || activeTab === 'reel' ? "Describe this…" :
                                        "What's on your mind?"
                                    }
                                    placeholderTextColor={MUTED}
                                    multiline
                                    value={postText}
                                    onChangeText={setPostText}
                                    autoFocus={activeTab === 'text' || activeTab === 'poll'}
                                    textAlignVertical="top"
                                    scrollEnabled
                                    nestedScrollEnabled
                                />
                            </View>
                        </View>

                        <View style={styles.aiWriterCard}>
                            <View style={styles.aiWriterHead}>
                                <View style={styles.aiWriterIcon}>
                                    <Ionicons name="sparkles" size={15} color={WHITE} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.aiWriterTitle}>Hafrik AI writer</Text>
                                    <Text style={styles.aiWriterSub}>
                                        {postText.trim() ? 'Improve your draft before posting' : 'Need an idea? Generate a caption'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.aiRefreshBtn}
                                    activeOpacity={0.84}
                                    onPress={handleAiWrite}
                                    disabled={aiWriting}
                                >
                                    {aiWriting ? (
                                        <ActivityIndicator size="small" color={BRAND} />
                                    ) : (
                                        <Ionicons name={aiDrafts.length ? 'refresh' : 'sparkles-outline'} size={16} color={BRAND} />
                                    )}
                                    <Text style={styles.aiRefreshText}>{aiDrafts.length ? 'Shuffle' : 'Help me'}</Text>
                                </TouchableOpacity>
                            </View>

                            {aiDrafts.length > 0 && (
                                <View style={styles.aiDraftList}>
                                    {aiDrafts.map((draft, index) => (
                                        <TouchableOpacity
                                            key={`${draft}-${index}`}
                                            style={styles.aiDraftBtn}
                                            activeOpacity={0.86}
                                            onPress={() => setPostText(draft)}
                                        >
                                            <Text style={styles.aiDraftText}>{draft}</Text>
                                            <Ionicons name="checkmark-circle-outline" size={17} color={ACCENT} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* ── Media content by tab ── */}

                        {/* Photos */}
                        {activeTab === 'photos' && (
                            <View style={styles.mediaSection}>
                                {selectedImages.length > 0 ? (
                                    <>
                                        <View style={styles.photoGrid}>
                                            {selectedImages.map((img, idx) => (
                                                <View key={img.id} style={[styles.photoCell, { width: PHOTO_CELL, height: PHOTO_CELL }]}>
                                                    <Image source={{ uri: img.uri }} style={styles.photoThumb} resizeMode="cover" />
                                                    <TouchableOpacity
                                                        style={styles.photoRemove}
                                                        onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                                                        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                                                    >
                                                        <Ionicons name="close-circle" size={22} color={WHITE} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            {selectedImages.length < 10 && (
                                                <TouchableOpacity
                                                    style={[styles.photoAddMore, { width: PHOTO_CELL, height: PHOTO_CELL }]}
                                                    onPress={pickImages}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="add" size={28} color={ACCENT} />
                                                    <Text style={styles.photoAddMoreText}>Add</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <Text style={styles.photoCount}>{selectedImages.length}/10 photos</Text>
                                    </>
                                ) : (
                                    <TouchableOpacity style={styles.mediaPicker} onPress={pickImages} activeOpacity={0.85}>
                                        <Ionicons name="images" size={38} color={ACCENT} />
                                        <Text style={styles.mediaPickerTitle}>Add Photos</Text>
                                        <Text style={styles.mediaPickerSub}>Up to 10 photos</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Video / Reel */}
                        {(activeTab === 'video' || activeTab === 'reel') && (
                            <View style={styles.mediaSection}>
                                {selectedVideo ? (
                                    <>
                                        <View style={styles.videoWrap}>
                                            <VideoView
                                                player={videoPlayer}
                                                style={[styles.videoPreview, { height: Math.round((SCREEN_W - 32) * 9 / 16) }]}
                                                nativeControls
                                                contentFit="cover"
                                            />
                                            <TouchableOpacity
                                                style={styles.videoRemove}
                                                onPress={() => { try { videoPlayer.pause(); } catch (_) {} setSelectedVideo(null); setSelectedThumbnail(null); }}
                                            >
                                                <Ionicons name="close-circle" size={26} color={WHITE} />
                                            </TouchableOpacity>
                                        </View>
                                        {/* Thumbnail */}
                                        <View style={styles.thumbRow}>
                                            <Text style={styles.thumbLabel}>Thumbnail</Text>
                                            <TouchableOpacity style={styles.thumbPicker} onPress={pickThumbnail} activeOpacity={0.85}>
                                                {thumbnailLoading ? (
                                                    <View style={styles.thumbPlaceholder}>
                                                        <ActivityIndicator size="small" color={ACCENT} />
                                                        <Text style={styles.thumbPlaceholderText}>Making</Text>
                                                    </View>
                                                ) : selectedThumbnail ? (
                                                    <>
                                                        <Image source={{ uri: selectedThumbnail.uri }} style={styles.thumbImg} resizeMode="cover" />
                                                        <TouchableOpacity
                                                            style={styles.thumbRemove}
                                                            onPress={(e) => {
                                                                e.stopPropagation?.();
                                                                setSelectedThumbnail(null);
                                                                thumbnailAttemptRef.current = null;
                                                                if (selectedVideo?.uri) generateVideoThumbnail(selectedVideo.uri, true).catch(() => {});
                                                            }}
                                                        >
                                                            <Ionicons name="close-circle" size={16} color={WHITE} />
                                                        </TouchableOpacity>
                                                    </>
                                                ) : (
                                                    <View style={styles.thumbPlaceholder}>
                                                        <Ionicons name="image-outline" size={22} color={MUTED} />
                                                        <Text style={styles.thumbPlaceholderText}>Pick</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                        {/* Video category */}
                                        {activeTab === 'video' && (
                                            <View style={styles.catRow}>
                                                <Text style={styles.catLabel}>Category</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
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
                                    </>
                                ) : iCloudDownloading ? (
                                    <View style={styles.mediaPicker}>
                                        <ActivityIndicator size="large" color={ACCENT} />
                                        <Text style={styles.mediaPickerTitle}>Downloading from iCloud…</Text>
                                        <Text style={styles.mediaPickerSub}>This may take a moment</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.mediaPicker} onPress={pickVideo} activeOpacity={0.85}>
                                        <Ionicons name={activeTab === 'reel' ? 'play-circle' : 'videocam'} size={38} color={ACCENT} />
                                        <Text style={styles.mediaPickerTitle}>{activeTab === 'reel' ? 'Add Reel' : 'Add Video'}</Text>
                                        <Text style={styles.mediaPickerSub}>Tap to choose from library</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Poll */}
                        {activeTab === 'poll' && (
                            <PollBuilder
                                options={pollOptions}
                                onUpdate={updatePollOption}
                                onAdd={addPollOption}
                                onRemove={removePollOption}
                            />
                        )}

                        {/* Location */}
                        {showLocation && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={16} color='#3498DB' />
                                <TextInput
                                    style={styles.locationInput}
                                    placeholder="Add your location…"
                                    placeholderTextColor={MUTED}
                                    value={locationText}
                                    onChangeText={setLocationText}
                                />
                                <TouchableOpacity onPress={() => { setShowLocation(false); setLocationText(''); }}>
                                    <Ionicons name="close-circle" size={18} color={MUTED} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── Hashtag Categories ── */}
                        <HashtagSelector
                            selected={selectedHashtags}
                            onToggle={toggleHashtag}
                            onClearAll={clearHashtags}
                        />

                    </ScrollView>

                    {/* ── Bottom Toolbar ── */}
                    <View style={[styles.toolbar, { paddingBottom: bottom + 4 }]}>
                        {TOOLBAR_ACTIONS.map(action => {
                            const isActive = action.id === 'poll'
                                ? activeTab === 'poll'
                                : action.id === 'location'
                                ? showLocation
                                : activeTab === action.id;
                            return (
                                <TouchableOpacity
                                    key={action.id}
                                    style={[styles.toolbarBtn, isActive && { backgroundColor: action.color + '18' }]}
                                    onPress={() => handleToolbarPress(action.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={action.icon}
                                        size={22}
                                        color={isActive ? action.color : MUTED}
                                    />
                                    <Text style={[styles.toolbarLabel, isActive && { color: action.color }]}>
                                        {action.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    fullScreen: {
        flex: 1,
        backgroundColor: '#EEF7F7',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        height: 78,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingBottom: 10,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
    },
    closeBtn: {
        width: 40, height: 40,
        borderRadius: 16,
        backgroundColor: WHITE + '22',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
        borderColor: WHITE + '24',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 10,
    },
    headerEyebrow: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2.2,
        color: WHITE + 'B8',
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 18, fontWeight: '900', color: WHITE, letterSpacing: -0.3,
    },
    postBtn: {
        backgroundColor: WHITE,
        paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 999,
        alignItems: 'center', justifyContent: 'center',
    },
    postBtnOff: { backgroundColor: WHITE + '55' },
    postBtnText: { color: ACCENT, fontWeight: '900', fontSize: 14 },

    // ── Target bar ────────────────────────────────────────────────────────────
    targetBar: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 14,
        marginBottom: 8,
        paddingHorizontal: 14, paddingVertical: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: BRAND + '12',
        gap: 8, backgroundColor: WHITE,
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 3,
    },
    targetBarLabel: {
        fontSize: 11, fontWeight: '700', color: MUTED,
        textTransform: 'uppercase', letterSpacing: 0.6,
    },
    targetSelected: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    targetSelAvatar: {
        width: 22, height: 22, borderRadius: 11,
    },
    targetSelName: {
        fontSize: 13, fontWeight: '700', color: BRAND, flex: 1,
    },
    targetTypeBadge: {
        backgroundColor: ACCENT + '18', borderRadius: 8,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    targetTypeText: {
        fontSize: 10, fontWeight: '700', color: ACCENT,
    },

    // ── Compose row ───────────────────────────────────────────────────────────
    composeRow: {
        flexDirection: 'row',
        marginHorizontal: 14,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        gap: 12,
        alignItems: 'flex-start',
        backgroundColor: WHITE,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: BRAND + '10',
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
    },
    avatarFallback: {
        backgroundColor: BG,
        alignItems: 'center', justifyContent: 'center',
    },
    textInput: {
        fontSize: 16, color: BRAND, lineHeight: 24,
        minHeight: 112,
        maxHeight: 220,
        textAlignVertical: 'top',
        paddingBottom: 10,
    },
    aiWriterCard: {
        marginHorizontal: 14,
        marginBottom: 12,
        padding: 12,
        borderRadius: 20,
        backgroundColor: ACCENT + '09',
        borderWidth: 1,
        borderColor: ACCENT + '25',
    },
    aiWriterHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    aiWriterIcon: {
        width: 34,
        height: 34,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BRAND,
    },
    aiWriterTitle: {
        fontSize: 13.5,
        fontWeight: '900',
        color: BRAND,
    },
    aiWriterSub: {
        fontSize: 11.5,
        fontWeight: '600',
        color: MUTED,
        marginTop: 1,
    },
    aiRefreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: ACCENT + '22',
    },
    aiRefreshText: {
        fontSize: 11.5,
        fontWeight: '900',
        color: BRAND,
    },
    aiDraftList: {
        gap: 8,
        marginTop: 12,
    },
    aiDraftBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: 16,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: BRAND + '10',
    },
    aiDraftText: {
        flex: 1,
        fontSize: 13.5,
        lineHeight: 19,
        fontWeight: '700',
        color: BRAND,
    },

    // ── Media section ─────────────────────────────────────────────────────────
    mediaSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    mediaPicker: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: WHITE, borderRadius: 22,
        paddingVertical: 44,
        borderWidth: 1.5, borderColor: ACCENT + '44', borderStyle: 'dashed',
        gap: 6,
    },
    mediaPickerTitle: { fontSize: 16, fontWeight: '800', color: BRAND },
    mediaPickerSub:   { fontSize: 12, color: MUTED },

    photoGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6,
    },
    photoCell: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
    photoThumb: { width: '100%', height: '100%' },
    photoRemove: {
        position: 'absolute', top: 4, right: 4,
    },
    photoAddMore: {
        borderRadius: 12, borderWidth: 1.5, borderColor: ACCENT + '66', borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: ACCENT + '08',
    },
    photoAddMoreText: { fontSize: 10, color: ACCENT, fontWeight: '700' },
    photoCount: { fontSize: 11, color: MUTED, textAlign: 'right' },

    videoWrap: { position: 'relative', marginBottom: 12 },
    videoPreview: {
        width: SCREEN_W - 32, borderRadius: 14, backgroundColor: BLACK,
    },
    videoRemove: {
        position: 'absolute', top: 8, right: 8,
    },

    thumbRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    },
    thumbLabel: { fontSize: 13, fontWeight: '700', color: BRAND, flex: 1 },
    thumbPicker: { position: 'relative' },
    thumbImg: { width: 90, height: 60, borderRadius: 10 },
    thumbPlaceholder: {
        width: 90, height: 60, borderRadius: 10,
        backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    thumbPlaceholderText: { fontSize: 10, color: MUTED },
    thumbRemove: { position: 'absolute', top: 2, right: 2 },

    catRow: { marginBottom: 8 },
    catLabel: { fontSize: 12, fontWeight: '700', color: BRAND, marginBottom: 8, marginLeft: 0 },
    catPill: {
        backgroundColor: BG, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: BORDER,
    },
    catPillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    catPillText: { fontSize: 12, color: MUTED, fontWeight: '600' },
    catPillTextActive: { color: WHITE, fontWeight: '800' },

    // ── Poll ──────────────────────────────────────────────────────────────────
    pollWrap: {
        marginHorizontal: 16,
        backgroundColor: BG,
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F39C12' + '33',
    },
    pollTitleRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
    },
    pollTitle: { fontSize: 13, fontWeight: '800', color: BRAND, flex: 1 },
    pollHint:  { fontSize: 11, color: MUTED },
    pollOptionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    },
    pollOptionBullet: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: ACCENT + '1A',
        alignItems: 'center', justifyContent: 'center',
    },
    pollOptionBulletText: {
        fontSize: 11, fontWeight: '800', color: ACCENT,
    },
    pollOptionInput: {
        flex: 1, height: 40,
        backgroundColor: WHITE,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14, color: BRAND,
        borderWidth: 1, borderColor: BORDER,
    },
    pollAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, marginTop: 2,
    },
    pollAddText: { fontSize: 13, color: ACCENT, fontWeight: '700' },

    // ── Location ──────────────────────────────────────────────────────────────
    locationRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginBottom: 8,
        backgroundColor: '#3498DB' + '10',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: '#3498DB' + '30',
    },
    locationInput: { flex: 1, fontSize: 14, color: BRAND },

    // ── Hashtag section ───────────────────────────────────────────────────────
    hashtagSection: {
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 8,
        padding: 14,
        backgroundColor: ACCENT + '08',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: ACCENT + '25',
    },
    hashtagHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
    },
    hashtagLabel: {
        fontSize: 11, fontWeight: '800', color: BRAND,
        textTransform: 'uppercase', letterSpacing: 0.8, flex: 1,
    },
    clearBtn: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, backgroundColor: ACCENT + '18',
    },
    clearBtnText: { fontSize: 11, fontWeight: '700', color: ACCENT },
    hashtagGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    },
    hashtagPill: {
        flexDirection: 'row', alignItems: 'center', gap: 1,
        backgroundColor: WHITE,
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 1.5, borderColor: BORDER,
    },
    hashtagPillActive: {
        backgroundColor: ACCENT, borderColor: ACCENT,
    },
    hashtagHash: { fontSize: 11, fontWeight: '700', color: ACCENT, opacity: 0.7 },
    hashtagPillText: { fontSize: 12.5, fontWeight: '600', color: BRAND },
    hashtagPillTextActive: { color: WHITE },
    hashtagSelectedRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10,
    },
    hashtagBadge: {
        backgroundColor: ACCENT + '18',
        borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4,
        borderWidth: 1, borderColor: ACCENT + '44',
    },
    hashtagBadgeText: { fontSize: 12, fontWeight: '700', color: ACCENT },

    // ── Bottom toolbar ────────────────────────────────────────────────────────
    toolbar: {
        flexDirection: 'row',
        borderTopWidth: 0,
        backgroundColor: WHITE,
        paddingTop: 8,
        paddingHorizontal: 8,
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 10,
    },
    toolbarBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 7, gap: 3, borderRadius: 10, marginHorizontal: 2,
    },
    toolbarLabel: {
        fontSize: 10, fontWeight: '600', color: MUTED,
    },
});

export default PostComposerModal;

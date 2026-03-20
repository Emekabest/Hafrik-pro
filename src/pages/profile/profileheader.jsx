import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, Alert, Linking } from "react-native";
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppDetails from "../../helpers/appdetails";
import SvgIcon from "../../assl.js/svg/svg";
import EditModal from "./timeline/editmodal";
import ImageViewModal from "../imageviewmodal";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import { UploadProfileImageController } from '../../controllers/profilecontroller';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const TEAL   = Colors.tealAccent;


const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(n);
};


const ProfileHeader = ({ userDetails, user, postsCount, followersCount, followingsCount, groupsCount, pagesCount, isOwner, isFollowing, onProfileUpdated }) => {
    
    const {token} = useAuth();

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [avatarImage, setAvatarImage] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [avatarOptionsVisible, setAvatarOptionsVisible] = useState(false);


    const getGender = (g) => {
        const gender = Number(g);
        if (gender === 1) return 'Male';
        if (gender === 2) return 'Female';
        if (gender === 3) return 'Other';
        return 'Unknown';
    };

    const biography = userDetails?.bio || userDetails?.about_me || userDetails?.biography || userDetails?.user_biography || '';
    const countryLabel = userDetails?.country_name || userDetails?.country_label || userDetails?.user_country_name || userDetails?.country || '';
    const cityLabel = userDetails?.current_city || userDetails?.city || userDetails?.user_current_city || '';
    const roleLabel = userDetails?.role || '';
    const originLabel = userDetails?.origin || userDetails?.hometown || userDetails?.from || '';
    const dobLabel = userDetails?.dob || userDetails?.date_of_birth || '';
    const monetizationEnabled = !!userDetails?.monetization_enabled;

    const formatDob = (dob) => {
        if (!dob) return '';
        try {
            const d = new Date(dob);
            if (isNaN(d.getTime())) return dob;
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return dob; }
    };

    useEffect(()=>{
        if (userDetails?.cover) {
            setCoverImage({
                uri: userDetails.cover,
                uploading: false,
                loading: false,
                fileType: "photo"
            });
        }

        if (userDetails?.avatar) {
            setAvatarImage({
                uri: userDetails.avatar, 
                uploading: false, 
                loading: false, 
                fileType: "photo" 
            });
        }

    },[userDetails]);

    
     const pickImageFromGallery = async (mode, apiUrl) => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                if (!permission.canAskAgain) {
                    Alert.alert(
                        'Permission Required',
                        'Photo library access is disabled. Please enable it in your device Settings to choose a profile photo.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                        ]
                    );
                } else {
                    Alert.alert(
                        'Permission Denied',
                        'We need access to your photo library to update your profile picture.',
                        [{ text: 'OK' }]
                    );
                }
                return;
            }

            const isAvatar = mode === 'avatar';
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: isAvatar,
                aspect: isAvatar ? [1, 1] : [16, 9],
                quality: 1,
            });

            if (!result || result.canceled) {
                console.log('Image selection cancelled or no result');
                return;
            }

            const asset = result.assets[0];
            const mimeType = asset.mimeType || 'image/jpeg';
            const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace('heic', 'jpg').replace('heif', 'jpg') || 'jpg';
            const imageDataFromGallery = {
                id: Date.now() + Math.random(),
                uri: asset.uri,
                fileName: asset.fileName || `upload_${Date.now()}.${ext}`,
                mimeType,
                type: asset.type || "image",
                uploading: true,
                loading: true,
                fileType: "photo"
            };
            
            if (mode === "cover"){
                setCoverImage(imageDataFromGallery);
            }
            else if (mode === "avatar"){
                setAvatarImage(imageDataFromGallery);
            }

            try{//
                const response = await UploadProfileImageController(imageDataFromGallery, token, apiUrl);
                console.log("Upload response:", JSON.stringify(response, null, 2));

                if (response.status === 'success'){
                    // Add timestamp to bust expo-image cache
                    const timestamp = Date.now();
                    
                    if (mode === "cover"){
                        console.log("Cover image uploaded successfully..");
                        const url = response.data?.image || response.data?.cover_url || response.data?.url || response.data?.cover;
                        if (url) {
                            const separator = url.includes('?') ? '&' : '?';
                            const newUri = `${url}${separator}t=${timestamp}`;
                            setCoverImage(prev => ({ ...prev, uploading: false, loading: false, uri: newUri }));
                        } else {
                            console.log("No cover URL in response, using local image");
                            setCoverImage(prev => ({ ...prev, uploading: false, loading: false }));
                        }
                    }
                    else if (mode === "avatar"){
                        console.log("Profile image uploaded successfully");
                        const url = response.data?.image || response.data?.avatar_url || response.data?.url || response.data?.avatar;
                        if (url) {
                            const separator = url.includes('?') ? '&' : '?';
                            const newUri = `${url}${separator}t=${timestamp}`;
                            setAvatarImage(prev => ({ ...prev, uploading: false, loading: false, uri: newUri }));
                        } else {
                            console.log("No avatar URL in response, using local image");
                            setAvatarImage(prev => ({ ...prev, uploading: false, loading: false }));
                        }
                    }

                }
                else{
                    if (mode === "cover"){
                        console.error("Failed to upload cover image, server responded with status:", response.status);
                        setCoverImage(prev => ({ ...prev, uploading: false, loading: false }));
                    }
                    else if (mode === "avatar"){
                        console.error("Failed to upload profile image, server responded with status:", response.status);
                        setAvatarImage(prev => ({ ...prev, uploading: false, loading: false }));
                    }
                   
                }

            }
            catch(error){
                console.log("Error uploading image:", error);
                if (mode === 'cover') {
                    setCoverImage(prev => ({ ...prev, uploading: false, loading: false }));
                } else if (mode === 'avatar') {
                    setAvatarImage(prev => ({ ...prev, uploading: false, loading: false }));
                }
            }
            

        } catch (err) {
            console.error('pickImageFromGallery error:', err);
        }
    };







    return (
        <View style={styles.container}>
            {/* ── Cover Photo with gradient overlay ── */}
            <View style={styles.coverPhotoContainer}>
                <ExpoImage
                    source={{ uri: coverImage?.uri || user?.cover }}
                    style={styles.coverImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <LinearGradient
                    colors={['transparent', withOpacity(BRAND, 0.80)]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.coverGradient}
                />
                {isOwner && (
                    <View style={[styles.coverActions, coverImage?.uploading && { opacity: 0.5, pointerEvents: 'none' }]}>
                        <TouchableOpacity 
                            disabled={coverImage?.uploading}
                            onPress={() => setTimeout(() => pickImageFromGallery("cover", "https://hafrik.com/api/v1/users/update_cover.php"), 100)}
                            style={styles.actionButton} 
                            activeOpacity={0.8}
                        >
                            <Ionicons name="camera-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.actionButton} 
                            activeOpacity={0.8}
                            onPress={() => setFullscreenImage(coverImage?.uri || user?.cover)}
                        >
                            <Ionicons name="expand-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ── Avatar + Info row ── */}
            <View style={styles.profileInfoRow}>
                <View style={styles.avatarSection}>
                    <View style={styles.mainAvatarWrapper}>
                        <TouchableOpacity 
                            activeOpacity={0.8} 
                            style={styles.mainAvatarContainer}
                            onPress={() => isOwner ? setAvatarOptionsVisible(true) : setFullscreenImage(avatarImage?.uri || user?.avatar)}
                        >
                            <ExpoImage
                                source={{ uri: avatarImage?.uri }}
                                style={styles.mainAvatar}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                        </TouchableOpacity>
                        {/* Online indicator */}
                        <View style={styles.onlineIndicator} />
                        {isOwner && (
                            <TouchableOpacity
                                disabled={avatarImage?.uploading}
                                onPress={() => setAvatarOptionsVisible(true)}
                                activeOpacity={0.8}
                                style={[styles.avatarEditButton, avatarImage?.uploading && { opacity: 0.5 }]}
                            >
                                <Ionicons name="camera" size={13} color={Colors.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Stats row next to avatar */}
                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statBlock} activeOpacity={0.7}>
                        <Text style={styles.statNumber}>{formatCount(postsCount)}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statBlock} activeOpacity={0.7}>
                        <Text style={styles.statNumber}>{formatCount(followersCount)}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statBlock} activeOpacity={0.7}>
                        <Text style={styles.statNumber}>{formatCount(followingsCount)}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Name + Username ── */}
            <View style={styles.userInfoSection}>
                {/* Name row */}
                <View style={styles.nameRow}>
                    <Text style={styles.fullNameText} numberOfLines={1}>
                        {userDetails
                            ? (userDetails.full_name || `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim() || 'Hafrik User')
                            : (user?.full_name || 'Hafrik User')}
                    </Text>
                    {userDetails?.verified ? (
                        <View style={styles.verifiedBadge}>
                            <SvgIcon name="verified" width={18} height={18} color={ACCENT} />
                        </View>
                    ) : null}
                </View>

                {/* Role badge — only shown if role exists */}
                {!!roleLabel && (
                    <View style={styles.roleBadgeRow}>
                        <View style={styles.roleBadge}>
                            <Ionicons name="briefcase-outline" size={11} color={ACCENT} />
                            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.usernameText}>@{userDetails?.username || user?.username || 'username'}</Text>

                {/* Bio — multi-line, no truncation */}
                {!!biography && (
                    <Text style={styles.bioText}>{biography}</Text>
                )}

                {/* Info chips — only rendered if value exists */}
                <View style={styles.infoChipsRow}>
                    {!!getGender(userDetails?.gender) && getGender(userDetails?.gender) !== 'Unknown' && (
                        <View style={styles.infoChip}>
                            <Ionicons
                                name={getGender(userDetails?.gender).toLowerCase() === 'female' ? 'female-outline' : 'male-outline'}
                                size={13}
                                color={ACCENT}
                            />
                            <Text style={styles.infoChipText}>{getGender(userDetails?.gender)}</Text>
                        </View>
                    )}
                    {!!(cityLabel || countryLabel) && (
                        <View style={styles.infoChip}>
                            <Ionicons name="location-outline" size={13} color={ACCENT} />
                            <Text style={styles.infoChipText}>
                                Lives in {[cityLabel, countryLabel].filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    )}
                    {!!originLabel && (
                        <View style={styles.infoChip}>
                            <Ionicons name="home-outline" size={13} color={ACCENT} />
                            <Text style={styles.infoChipText}>From {originLabel}</Text>
                        </View>
                    )}
                    {!!dobLabel && (
                        <View style={styles.infoChip}>
                            <Ionicons name="calendar-outline" size={13} color={ACCENT} />
                            <Text style={styles.infoChipText}>{formatDob(dobLabel)}</Text>
                        </View>
                    )}
                    {groupsCount > 0 && (
                        <View style={styles.infoChip}>
                            <Ionicons name="people-outline" size={13} color={ACCENT} />
                            <Text style={styles.infoChipText}>{groupsCount} Groups</Text>
                        </View>
                    )}
                    {pagesCount > 0 && (
                        <View style={styles.infoChip}>
                            <Ionicons name="flag-outline" size={13} color={ACCENT} />
                            <Text style={styles.infoChipText}>{pagesCount} Pages</Text>
                        </View>
                    )}
                </View>

                {/* Location prompt — only for owner with no location set */}
                {isOwner && !(cityLabel || countryLabel) && (
                    <TouchableOpacity
                        style={styles.locationPrompt}
                        activeOpacity={0.8}
                        onPress={() => setEditModalVisible(true)}
                    >
                        <View style={styles.locationPromptIcon}>
                            <Ionicons name="location" size={16} color={Colors.white} />
                        </View>
                        <View style={styles.locationPromptTextWrap}>
                            <Text style={styles.locationPromptTitle}>Add your location</Text>
                            <Text style={styles.locationPromptSub}>Let people know where you're based</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={ACCENT} />
                    </TouchableOpacity>
                )}

                {/* Action buttons */}
                {isOwner ? (
                    <TouchableOpacity style={styles.editButton} activeOpacity={0.8} onPress={() => setEditModalVisible(true)}>
                        <Ionicons name="create-outline" size={16} color={BRAND} />
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.actionButtonsRow}>
                        {/* Follow / Following toggle */}
                        <TouchableOpacity
                            style={[styles.followButton, isFollowing && styles.followingButton]}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={isFollowing ? 'checkmark' : 'person-add-outline'}
                                size={15}
                                color={isFollowing ? ACCENT : Colors.white}
                            />
                            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>

                        {/* Message */}
                        <TouchableOpacity style={styles.iconActionBtn} activeOpacity={0.8}>
                            <Ionicons name="chatbubble-outline" size={17} color={BRAND} />
                        </TouchableOpacity>

                        {/* Gift */}
                        <TouchableOpacity style={styles.iconActionBtn} activeOpacity={0.8}>
                            <Ionicons name="gift-outline" size={17} color={BRAND} />
                        </TouchableOpacity>

                        {/* More */}
                        <TouchableOpacity style={styles.iconActionBtn} activeOpacity={0.8}>
                            <Ionicons name="ellipsis-horizontal" size={17} color={BRAND} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Send a Tip — only shown when monetization_enabled */}
                {monetizationEnabled && !isOwner && (
                    <TouchableOpacity style={styles.sendTipButton} activeOpacity={0.85}>
                        <Ionicons name="diamond-outline" size={17} color={Colors.white} />
                        <Text style={styles.sendTipText}>Send a Tip</Text>
                    </TouchableOpacity>
                )}
            </View>

            <EditModal 
                visible={editModalVisible} 
                onClose={() => setEditModalVisible(false)}
                userDetails={userDetails || user}
                onProfileUpdated={onProfileUpdated}
            />
            
            {/* Avatar options bottom sheet */}
            <Modal visible={avatarOptionsVisible} transparent animationType="fade" onRequestClose={() => setAvatarOptionsVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setAvatarOptionsVisible(false)}>
                    <View style={styles.avatarOptionsOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.avatarOptionsSheet}>
                                <View style={styles.sheetHandle} />
                                <Text style={styles.sheetTitle}>Profile Photo</Text>

                                <TouchableOpacity activeOpacity={0.7} style={styles.sheetOption} onPress={() => { setAvatarOptionsVisible(false); setTimeout(() => pickImageFromGallery('avatar', 'https://hafrik.com/api/v1/users/update_avatar.php'), 400); }}>
                                    <View style={[styles.sheetOptionIcon, { backgroundColor: withOpacity(ACCENT, 0.12) }]}> 
                                        <Ionicons name="image-outline" size={20} color={ACCENT} />
                                    </View>
                                    <View>
                                        <Text style={styles.sheetOptionText}>Choose from Gallery</Text>
                                        <Text style={styles.sheetOptionSub}>Select a photo from your device</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity activeOpacity={0.7} style={styles.sheetOption} onPress={() => { setAvatarOptionsVisible(false); setFullscreenImage(avatarImage?.uri || user?.avatar); }}>
                                    <View style={[styles.sheetOptionIcon, { backgroundColor: withOpacity(BRAND, 0.1) }]}> 
                                        <Ionicons name="eye-outline" size={20} color={BRAND} />
                                    </View>
                                    <View>
                                        <Text style={styles.sheetOptionText}>View Photo</Text>
                                        <Text style={styles.sheetOptionSub}>See your current profile picture</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity activeOpacity={0.7} style={styles.sheetOption} onPress={() => { setAvatarOptionsVisible(false); }}>
                                    <View style={[styles.sheetOptionIcon, { backgroundColor: withOpacity(Colors.destructive, 0.1) }]}> 
                                        <Ionicons name="trash-outline" size={20} color={Colors.destructive} />
                                    </View>
                                    <View>
                                        <Text style={[styles.sheetOptionText, { color: Colors.destructive }]}>Remove Photo</Text>
                                        <Text style={styles.sheetOptionSub}>Delete your profile picture</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity activeOpacity={0.7} style={styles.sheetCancel} onPress={() => setAvatarOptionsVisible(false)}>
                                    <Text style={styles.sheetCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Custom Image View Modal */}
            <ImageViewModal 
                isVisible={!!fullscreenImage} 
                onClose={() => setFullscreenImage(null)} 
                imageUrl={fullscreenImage} 
            />
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
    },

    // ── Cover photo ───────────────────────────────────────────────
    coverPhotoContainer: {
        width: '100%',
        height: 200,
        backgroundColor: Colors.neutral180,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    coverActions: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        backgroundColor: withOpacity(Colors.black, 0.45),
        borderRadius: 20,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    actionButton: {
        padding: 6,
        marginHorizontal: 2,
    },

    // ── Avatar + Stats row ────────────────────────────────────────
    profileInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: -45,
    },
    avatarSection: {
        marginRight: 16,
    },
    mainAvatarWrapper: {
        position: 'relative',
    },
    mainAvatarContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3.5,
        borderColor: Colors.white,
        backgroundColor: Colors.neutral180,
        overflow: 'hidden',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    mainAvatar: {
        width: '100%',
        height: '100%',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: Colors.tealAccent,
        borderWidth: 2.5,
        borderColor: Colors.white,
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: ACCENT,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: Colors.white,
        elevation: 3,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    statsRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 8,
    },
    statBlock: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '800',
        color: BRAND,
        fontFamily: AppDetails.fontFamily?.inter?.bold,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.mutedBlueGrayAlt,
        marginTop: 2,
        fontFamily: AppDetails.fontFamily?.body,
        letterSpacing: 0.3,
    },

    // ── User info ─────────────────────────────────────────────────
    userInfoSection: {
        paddingHorizontal: 20,
        marginTop: 12,
        paddingBottom: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullNameText: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.textBodyIndigo,
        fontFamily: AppDetails.fontFamily?.inter?.bold,
        letterSpacing: -0.3,
    },
    verifiedBadge: {
        marginLeft: 6,
    },
    usernameText: {
        fontSize: 14,
        color: Colors.mutedBlueGray,
        marginTop: 2,
        fontFamily: AppDetails.fontFamily?.body,
    },
    bioText: {
        fontSize: 14,
        color: Colors.textBodyMuted,
        marginTop: 10,
        lineHeight: 20,
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Info chips ────────────────────────────────────────────────
    infoChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 8,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceCool,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    infoChipText: {
        fontSize: 12,
        color: Colors.textBodyMuted,
        marginLeft: 5,
        fontFamily: AppDetails.fontFamily?.body,
        fontWeight: '500',
    },

    // ── Role badge ────────────────────────────────────────────────
    roleBadgeRow: {
        marginTop: 4,
        marginBottom: 2,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: withOpacity(ACCENT, 0.1),
        borderWidth: 1,
        borderColor: withOpacity(ACCENT, 0.25),
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        gap: 5,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: ACCENT,
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Send a Tip ────────────────────────────────────────────────
    sendTipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: TEAL,
        borderRadius: 12,
        height: 44,
        marginTop: 10,
        gap: 8,
    },
    sendTipText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.white,
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Icon-only action button (Message / Gift / More) ───────────
    iconActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.surfaceCool,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Action buttons ────────────────────────────────────────────
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceCool,
        borderRadius: 12,
        height: 44,
        marginTop: 16,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
    },
    editButtonText: {
        fontSize: 15,
        fontFamily: AppDetails.fontFamily?.outfit?.medium,
        color: BRAND,
        marginLeft: 6,
        fontWeight: '600',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 10,
    },
    followButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACCENT,
        borderRadius: 12,
        height: 44,
        gap: 6,
    },
    followingButton: {
        backgroundColor: Colors.surfaceCool,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
    },
    followButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.white,
    },
    followingButtonText: {
        color: ACCENT,
    },
    messageButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.surfaceCool,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Avatar options bottom sheet ────────────────────────────────
    avatarOptionsOverlay: {
        flex: 1,
        backgroundColor: withOpacity(Colors.black, 0.35),
        justifyContent: 'flex-end',
    },
    avatarOptionsSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
        paddingTop: 8,
        paddingHorizontal: 16,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.borderSoft || '#dde',
        alignSelf: 'center',
        marginBottom: 14,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textBodyIndigo,
        fontFamily: AppDetails.fontFamily?.inter?.bold,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 14,
    },
    sheetOptionIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textBodyIndigo,
        fontFamily: AppDetails.fontFamily?.body,
    },
    sheetOptionSub: {
        fontSize: 12,
        color: Colors.mutedBlueGray,
        fontFamily: AppDetails.fontFamily?.body,
        marginTop: 1,
    },
    sheetCancel: {
        marginTop: 10,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: Colors.surfaceCool || '#f2f4f8',
        alignItems: 'center',
    },
    sheetCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.mutedBlueGray,
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Location prompt banner ────────────────────────────────────
    locationPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: withOpacity(ACCENT, 0.08),
        borderWidth: 1,
        borderColor: withOpacity(ACCENT, 0.2),
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
        gap: 10,
    },
    locationPromptIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationPromptTextWrap: {
        flex: 1,
    },
    locationPromptTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: BRAND,
        letterSpacing: -0.1,
    },
    locationPromptSub: {
        fontSize: 11.5,
        color: Colors.mutedBlueGray,
        marginTop: 1,
    },
});

export default ProfileHeader;
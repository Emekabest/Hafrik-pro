import React, { useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, TextInput, StyleSheet, ActivityIndicator, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../../helpers/appdetails";
import RepostController from '../../../controllers/repostcontroller';
import { useAuth } from '../../../AuthContext';
import { Colors } from '../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};



const ShareModal = ({ visible, onClose, feed }) => {
    const [selectedShareTarget, setSelectedShareTarget] = useState(null);
    const [loading, setLoading] = useState(false);
    const [caption, setCaption] = useState('');
    const { token } = useAuth();


    const handleShare = async () => {
        if (!selectedShareTarget) return;
        setLoading(true);

        const postData = {
            post_id: feed.id,
            text: caption.trim(),
            privacy: 'public',
        };

        // For group/event shares, add target info
        if (selectedShareTarget === 'group') {
            postData.target = 'group';
        } else if (selectedShareTarget === 'event') {
            postData.target = 'event';
        }

        try {
            const response = await RepostController(postData, token);
            if (response.status === 200) {
                // Update share count in store
                const useStore = require('../../../repository/store').default;
                const { feeds, updateFeedById } = useStore.getState();
                const currentFeed = feeds.feedsById[feed.id];
                if (currentFeed) {
                    const newShareCount = response.data?.shares_count_new
                      ?? (Number(currentFeed.shares_count ?? currentFeed.shares ?? 0) + 1);
                    updateFeedById(feed.id, {
                        ...currentFeed,
                        shares_count: newShareCount,
                        shares: newShareCount,
                    });
                }
                setCaption('');
                setSelectedShareTarget(null);
                onClose();
            }
        } catch (error) {
            console.warn("Share error:", error?.message);
        } finally {
            setLoading(false);
        }
    }

    const postUrl = `https://hafrik.com/post/${feed?.id}`;

    const handleCopyLink = useCallback(async () => {
        try {
            await Clipboard.setStringAsync(postUrl);
            Alert.alert('Copied', 'Link copied to clipboard');
        } catch {}
    }, [postUrl]);

    const handleNativeShare = useCallback(async () => {
        try {
            await Share.share({
                message: `Check this out on Hafrik! ${postUrl}`,
                url: postUrl,
            });
        } catch {}
    }, [postUrl]);

    

    

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.bottomSheetContainer}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                        <View style={styles.bottomSheetContent}>
                            <View style={styles.bottomSheetHandle} />
                            <Text style={styles.bottomSheetTitle}>Share</Text>
                            
                            <View style={styles.copyLinkContainer}>
                                <Text style={styles.linkText} numberOfLines={1}>{postUrl}</Text>
                                <TouchableOpacity onPress={handleCopyLink}>
                                    <Ionicons name="clipboard-outline" size={20} color={Colors.neutral500} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.socialRow}>
                                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-facebook" size={28} color="#1877F2" /></TouchableOpacity>
                                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-twitter" size={28} color="#1DA1F2" /></TouchableOpacity>
                                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-linkedin" size={28} color="#0A66C2" /></TouchableOpacity>
                                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-whatsapp" size={28} color="#25D366" /></TouchableOpacity>
                                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-reddit" size={28} color="#FF4500" /></TouchableOpacity>
                                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-pinterest" size={28} color="#E60023" /></TouchableOpacity>
                            </View>

                            <View style={styles.shareTargetsContainer}>
                                <View style={styles.shareTargetsRow}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.shareTargetButton, 
                                            { width: '48%' },
                                            selectedShareTarget === 'timeline' && { borderColor: AppDetails.primaryColor || Colors.black }
                                        ]}
                                        onPress={() => setSelectedShareTarget('timeline')}
                                    >
                                        <Text style={[styles.shareTargetText, selectedShareTarget === 'timeline' && { color: AppDetails.primaryColor || Colors.black }]}>Timeline</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[
                                            styles.shareTargetButton, 
                                            { width: '48%' },
                                            selectedShareTarget === 'group' && { borderColor: AppDetails.primaryColor || Colors.black }
                                        ]}
                                        onPress={() => setSelectedShareTarget('group')}
                                    >
                                        <Text style={[styles.shareTargetText, selectedShareTarget === 'group' && { color: AppDetails.primaryColor || Colors.black }]}>Group</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.shareTargetsCenter}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.shareTargetButton, 
                                            { width: '100%' },
                                            selectedShareTarget === 'event' && { borderColor: AppDetails.primaryColor || Colors.black }
                                        ]}
                                        onPress={() => setSelectedShareTarget('event')}
                                    >
                                        <Text style={[styles.shareTargetText, selectedShareTarget === 'event' && { color: AppDetails.primaryColor || Colors.black }]}>Event</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TextInput 
                                style={styles.shareInput}
                                placeholder="Say something about this..."
                                placeholderTextColor={Colors.neutral350}
                                value={caption}
                                onChangeText={setCaption}
                                multiline
                            />

                            <TouchableOpacity 
                                style={[styles.mainShareButton, (!selectedShareTarget || loading) && { opacity: 0.5 }]}
                                disabled={!selectedShareTarget || loading}
                                onPress={handleShare}
                            >
                                {loading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.mainShareButtonText}>Share</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    bottomSheetContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: withOpacity(Colors.black, 0.5),
    },
    bottomSheetContent: {
        backgroundColor: Colors.white,
        width: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    bottomSheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: Colors.neutral200,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 15,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontFamily:"WorkSans_600SemiBold",
        marginBottom: 20,
        textAlign: 'center',
        color: Colors.neutral700,
    },
    copyLinkContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.neutral130,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    linkText: {
        color: Colors.neutral500,
        fontSize: 13,
        flex: 1,
        fontFamily:"WorkSans_400Regular",
        marginRight: 10,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        paddingHorizontal: 5,
    },
    shareTargetsContainer: {
        marginBottom: 20,
    },
    shareTargetsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    shareTargetsCenter: {
        alignItems: 'center',
    },
    shareTargetButton: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.neutral200,
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    shareTargetText: {
        color: Colors.neutral700,
        fontSize: 14,
        fontFamily:"WorkSans_500Medium",
    },
    shareInput: {
        backgroundColor: Colors.neutral110,
        borderRadius: 10,
        padding: 12,
        height: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: Colors.neutral700,
    },
    mainShareButton: {
        backgroundColor: AppDetails.primaryColor || Colors.black,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    mainShareButtonText: {
        color: Colors.white,
        fontFamily:"WorkSans_600SemiBold",
        fontSize: 16,
    },
});

export default ShareModal;
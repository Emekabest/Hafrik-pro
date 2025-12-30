import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../../helpers/appdetails";
import RepostController from '../../../controllers/repostcontroller';
import { useAuth } from '../../../AuthContext';

const ShareModal = ({ visible, onClose, feed }) => {
    const [selectedShareTarget, setSelectedShareTarget] = useState(null);
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();

    const handleShareToTimeline = async () => {
        setLoading(true);
        try {
            const response = await RepostController(feed.id, token);
            if (response.status === 200) {
                onClose();
            } else {
                console.error("Error sharing post:", response.data);
            }
        } catch (error) {
            console.error("Error sharing post:", error);
            // Handle error, e.g., show a toast message
        } finally {
            setLoading(false);
        }
    }


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
                                <Text style={styles.linkText} numberOfLines={1}>https://hafrik.com/post/{feed.id}</Text>
                                <TouchableOpacity>
                                    <Ionicons name="clipboard-outline" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.socialRow}>
                                <TouchableOpacity><Ionicons name="logo-facebook" size={28} color="#1877F2" /></TouchableOpacity>
                                <TouchableOpacity><Ionicons name="logo-twitter" size={28} color="#1DA1F2" /></TouchableOpacity>
                                <TouchableOpacity><Ionicons name="logo-linkedin" size={28} color="#0A66C2" /></TouchableOpacity>
                                <TouchableOpacity><Ionicons name="logo-whatsapp" size={28} color="#25D366" /></TouchableOpacity>
                                <TouchableOpacity><Ionicons name="logo-reddit" size={28} color="#FF4500" /></TouchableOpacity>
                                <TouchableOpacity><Ionicons name="logo-pinterest" size={28} color="#E60023" /></TouchableOpacity>
                            </View>

                            <View style={styles.shareTargetsContainer}>
                                <View style={styles.shareTargetsRow}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.shareTargetButton, 
                                            { width: '48%' },
                                            selectedShareTarget === 'timeline' && { borderColor: AppDetails.primaryColor || '#000' }
                                        ]}
                                        onPress={() => setSelectedShareTarget('timeline')}
                                    >
                                        <Text style={[styles.shareTargetText, selectedShareTarget === 'timeline' && { color: AppDetails.primaryColor || '#000' }]}>Timeline</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[
                                            styles.shareTargetButton, 
                                            { width: '48%' },
                                            selectedShareTarget === 'group' && { borderColor: AppDetails.primaryColor || '#000' }
                                        ]}
                                        onPress={() => setSelectedShareTarget('group')}
                                    >
                                        <Text style={[styles.shareTargetText, selectedShareTarget === 'group' && { color: AppDetails.primaryColor || '#000' }]}>Group</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.shareTargetsCenter}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.shareTargetButton, 
                                            { width: '100%' },
                                            selectedShareTarget === 'event' && { borderColor: AppDetails.primaryColor || '#000' }
                                        ]}
                                        onPress={() => setSelectedShareTarget('event')}
                                    >
                                        <Text style={[styles.shareTargetText, selectedShareTarget === 'event' && { color: AppDetails.primaryColor || '#000' }]}>Event</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TextInput 
                                style={styles.shareInput}
                                placeholder="Say something about this..."
                                placeholderTextColor="#999"
                                multiline
                            />

                            <TouchableOpacity 
                                style={[styles.mainShareButton, (!selectedShareTarget || loading) && { opacity: 0.5 }]}
                                disabled={!selectedShareTarget || loading}
                                onPress={handleShareToTimeline}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheetContent: {
        backgroundColor: '#fff',
        width: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    bottomSheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#e0e0e0',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 15,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontFamily:"WorkSans_600SemiBold",
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    copyLinkContainer: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    linkText: {
        color: '#666',
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
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    shareTargetText: {
        color: '#333',
        fontSize: 14,
        fontFamily:"WorkSans_500Medium",
    },
    shareInput: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 12,
        height: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: '#333',
    },
    mainShareButton: {
        backgroundColor: AppDetails.primaryColor || '#000',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    mainShareButtonText: {
        color: '#fff',
        fontFamily:"WorkSans_600SemiBold",
        fontSize: 16,
    },
});

export default ShareModal;
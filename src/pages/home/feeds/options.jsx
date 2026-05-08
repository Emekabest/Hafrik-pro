import React, { useState } from 'react';
import { Alert, Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import ToggleSaveController from '../../../controllers/tooglesavecontroller';
import { useAuth } from '../../../AuthContext';
import AppDetails from '../../../helpers/appdetails';
import { Colors } from '../../../theme/colors';
import { blockUser, reportPost } from '../../../api/feedApi';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const REPORT_REASONS = [
  'Spam or misleading',
  'Hate speech or discrimination',
  'Violence or harmful content',
  'Nudity or sexual content',
  'Harassment or bullying',
  'False information',
  'Other',
];

const OptionsModal = ({ visible, postId, userId, onClose, onEdit, onDelete, isOwner = false }) => {

    const {token} = useAuth();
    const [reportVisible, setReportVisible] = useState(false);

    const handleSavePost = async () => {
        const response = await ToggleSaveController(postId, token);
        if (response.status === 200) {
            onClose();
        }
    };

    const handleBlockUser = () => {
        onClose();
        Alert.alert(
            'Block User',
            'This user will no longer be able to see your posts or interact with you. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await blockUser(userId);
                            Alert.alert('Blocked', 'User has been blocked.');
                        } catch {
                            Alert.alert('Error', 'Could not block user. Please try again.');
                        }
                    },
                },
            ],
        );
    };

    const handleReportPost = (reason) => {
        setReportVisible(false);
        onClose();
        Alert.alert(
            'Report Submitted',
            'Thank you for your report. We will review it shortly.',
            [{ text: 'OK' }],
        );
        reportPost(postId, reason).catch(() => {});
    };



    return (
        <>
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
                                <Text style={styles.bottomSheetTitle}>Options</Text>

                                <TouchableOpacity style={styles.bottomSheetOption} onPress={handleSavePost}>
                                    <Ionicons name="bookmark-outline" size={24} color={Colors.neutral700} />
                                    <Text style={styles.bottomSheetOptionText}>Save Post</Text>
                                </TouchableOpacity>

                                {isOwner && (
                                    <TouchableOpacity
                                        style={styles.bottomSheetOption}
                                        onPress={() => { onClose(); onEdit?.(); }}
                                    >
                                        <Ionicons name="create-outline" size={24} color={Colors.neutral700} />
                                        <Text style={styles.bottomSheetOptionText}>Edit Post</Text>
                                    </TouchableOpacity>
                                )}
                                {isOwner && (
                                    <TouchableOpacity
                                        style={styles.bottomSheetOption}
                                        onPress={() => { onClose(); onDelete?.(); }}
                                    >
                                        <Ionicons name="trash-outline" size={24} color="#E53935" />
                                        <Text style={[styles.bottomSheetOptionText, { color: '#E53935' }]}>Delete Post</Text>
                                    </TouchableOpacity>
                                )}

                                {!isOwner && !!userId && (
                                    <TouchableOpacity style={styles.bottomSheetOption} onPress={handleBlockUser}>
                                        <Ionicons name="ban-outline" size={24} color="#E53935" />
                                        <Text style={[styles.bottomSheetOptionText, { color: '#E53935' }]}>Block User</Text>
                                    </TouchableOpacity>
                                )}
                                {!isOwner && (
                                    <TouchableOpacity
                                        style={styles.bottomSheetOption}
                                        onPress={() => { setReportVisible(true); }}
                                    >
                                        <Ionicons name="flag-outline" size={24} color="#E53935" />
                                        <Text style={[styles.bottomSheetOptionText, { color: '#E53935' }]}>Report Post</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Report reason sub-modal */}
            <Modal
                visible={reportVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setReportVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setReportVisible(false)}>
                    <View style={styles.bottomSheetContainer}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={styles.bottomSheetContent}>
                                <View style={styles.bottomSheetHandle} />
                                <Text style={styles.bottomSheetTitle}>Why are you reporting this?</Text>
                                {REPORT_REASONS.map((reason) => (
                                    <TouchableOpacity
                                        key={reason}
                                        style={styles.bottomSheetOption}
                                        onPress={() => handleReportPost(reason)}
                                    >
                                        <Ionicons name="chevron-forward-outline" size={20} color={Colors.neutral700} />
                                        <Text style={styles.bottomSheetOptionText}>{reason}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
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
        marginBottom: 20,
        textAlign: 'center',
        color: Colors.neutral700,
        fontFamily:"ReadexPro_600SemiBold",
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral150,
    },
    bottomSheetOptionText: {
        fontSize: 16,
        marginLeft: 15,
        color: Colors.neutral700,
        fontFamily:AppDetails.fontFamily.redex.medium,
    },
});

export default OptionsModal;
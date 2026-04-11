import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Alert } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import ToggleSaveController from '../../../controllers/tooglesavecontroller';
import { useAuth } from '../../../AuthContext';
import AppDetails from '../../../helpers/appdetails';
import { Colors } from '../../../theme/colors';
import { BlockUserController } from '../../../controllers/optionscontroller';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};



const OptionsModal = ({ visible, postId, onClose, onEdit, onDelete, isOwner = false, userFullname = 'User', reportedUserId = null, onBlock }) => {

    const navigation = useNavigation();
    const {token} = useAuth();
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);

    const handleSavePost = async () => {

        const response = await ToggleSaveController(postId, token);

        if (response.status === 200) {

            onClose();
        }

    }

    const handleReportPost = () => {
        onClose();
        navigation.navigate('ReportPost', { postId, reportedUserId, reportedUserFullname: userFullname });
    }

    const handleBlockUser = () => {

        setShowBlockConfirm(true);
    }

    const handleConfirmBlock = async() => {

        const response = await BlockUserController({user_id: reportedUserId, action: 'block'}, token)

        
        setShowBlockConfirm(false);

        const IsBlockedAlready = response.data.data?.error_code;

        if (IsBlockedAlready) {
              Alert.alert("Blocked", `${userFullname} has been blocked Already.`, [
                { text: "OK"}
            ]);

            return;
        }

        Alert.alert("Blocked", `${userFullname} has been blocked. You will no longer see content from this user.`, [
            { text: "OK"}
        ]);

    }

    const handleConfirmUnblock = async() => {
        const response = await BlockUserController({user_id: reportedUserId, action: 'unblock'}, token)
        
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
                           
                                <TouchableOpacity
                                    style={styles.bottomSheetOption}
                                    onPress={handleReportPost}
                                >
                                    <Ionicons name="alert" size={24}  />
                                    <Text style={styles.bottomSheetOptionText}>Report Post</Text>
                                </TouchableOpacity>

                            {isOwner && (
                                <TouchableOpacity
                                    style={styles.bottomSheetOption}
                                    onPress={() => { onClose(); onDelete?.(); }}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#E53935" />
                                    <Text style={[styles.bottomSheetOptionText, { color: '#E53935' }]}>Delete Post</Text>
                                </TouchableOpacity>
                            )}
                                <TouchableOpacity
                                    style={styles.bottomSheetOption}
                                    onPress={handleBlockUser}
                                >
                                    <Ionicons name="ban" size={24} color="#E53935" />
                                    <Text style={[styles.bottomSheetOptionText, { color: '#E53935' }]}>Block {userFullname}</Text>
                                </TouchableOpacity>
                            
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            {/* Confirm Block Modal */}
            <Modal
                visible={showBlockConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowBlockConfirm(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowBlockConfirm(false)}>
                    <View style={styles.confirmOverlay}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={styles.confirmContainer}>
                                <Text style={styles.confirmTitle}>Block {userFullname}?</Text>
                                <Text style={styles.confirmMessage}>You will no longer be able to engage with this user.</Text>
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowBlockConfirm(false)}>
                                        <Text style={styles.confirmCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.confirmBlock} onPress={handleConfirmBlock}>
                                        <Text style={styles.confirmBlockText}>Block</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    confirmOverlay: {
        flex: 1,
        backgroundColor: withOpacity(Colors.black, 0.5),
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmContainer: {
        width: '100%',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 20,
    },
    confirmTitle: {
        fontSize: 18,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.semiBold,
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 14,
        color: Colors.neutral700,
        fontFamily: AppDetails.fontFamily.redex.regular,
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
    },
    confirmCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 12,
    },
    confirmCancelText: {
        color: Colors.neutral700,
        fontSize: 16,
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
    confirmBlock: {
        backgroundColor: '#E53935',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    confirmBlockText: {
        color: Colors.white,
        fontSize: 16,
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
});

export default OptionsModal;
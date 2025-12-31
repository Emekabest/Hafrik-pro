import React from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import ToggleSaveController from '../../../controllers/tooglesavecontroller';
import { useAuth } from '../../../AuthContext';

const OptionsModal = ({ visible, postId, onClose }) => {

    const {token} = useAuth();

    const handleSavePost = async () => {

        const response = await ToggleSaveController(postId, token);

        console.log(response);
        if (response.status === 200) {

            onClose();
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
                            <Text style={styles.bottomSheetTitle}>Options</Text>
                            
                            <TouchableOpacity style={styles.bottomSheetOption} onPress={handleSavePost}>
                                <Ionicons name="bookmark-outline" size={24} color="#333" />
                                <Text style={styles.bottomSheetOptionText}>Save Post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bottomSheetOption}>
                                <Ionicons name="eye-off-outline" size={24} color="#333" />
                                <Text style={styles.bottomSheetOptionText}>Edit Post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bottomSheetOption}>
                                <Ionicons name="trash-outline" size={24} color="#333" />
                                <Text style={[styles.bottomSheetOptionText, {color: '#333'}]}>Delete Post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bottomSheetOption}>
                                <Ionicons name="alert-circle-outline" size={24} color="#333" />
                                <Text style={[styles.bottomSheetOptionText, {color: '#333'}]}>Turn off Commenting</Text>
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
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
        fontFamily:"ReadexPro_600SemiBold",
    },
    bottomSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    bottomSheetOptionText: {
        fontSize: 16,
        marginLeft: 15,
        color: '#333',
        fontFamily:'WorkSans_500Medium',
    },
});

export default OptionsModal;
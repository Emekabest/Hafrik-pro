import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Dimensions, StatusBar } from "react-native";
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageViewModal = ({ isVisible, onClose, imageUrl }) => {
    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <StatusBar backgroundColor={Colors.black} barStyle="light-content" />
            <View style={styles.fullscreenContainer}>
                <TouchableOpacity 
                    style={styles.fullscreenCloseBtn} 
                    onPress={onClose}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close" size={20} color={Colors.white} />
                </TouchableOpacity>
                <ExpoImage
                    source={{ uri: imageUrl }}
                    style={styles.fullscreenImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
            </View>
        </Modal>
    );
};


const styles = StyleSheet.create({
    fullscreenContainer: {
        flex: 1,
        backgroundColor: 'rgb(0, 0, 0)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 5,
        backgroundColor: withOpacity(Colors.white, 0.15),
        borderRadius: 20,
    },
    fullscreenImage: {
        width: screenWidth,
        height: screenHeight * 0.7,
    },
});

export default ImageViewModal;

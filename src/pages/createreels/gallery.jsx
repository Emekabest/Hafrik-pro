import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');

const Gallery = ({ onSelect, navigation }) => {
    const [galleryVideos, setGalleryVideos] = useState([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [loadingGallery, setLoadingGallery] = useState(false);

    const fetchGalleryVideos = async (cursor = null) => {
        if (loadingGallery) return;
        setLoadingGallery(true);

        try {
            if (!permissionResponse?.granted) {
                const { granted } = await requestPermission();
                if (!granted) {
                    setLoadingGallery(false);
                    return;
                }
            }

            const { assets, endCursor: newCursor, hasNextPage: next } = await MediaLibrary.getAssetsAsync({
                mediaType: 'video',
                sortBy: ['creationTime'],
                first: 50,
                after: cursor,
            });

            setGalleryVideos(prev => cursor ? [...prev, ...assets] : assets);
            setEndCursor(newCursor);
            setHasNextPage(next);
        } catch (error) {
            console.error("Error fetching gallery videos:", error);
        } finally {
            setLoadingGallery(false);
        }
    };

    useEffect(() => {
        if (galleryVideos.length === 0) {
            fetchGalleryVideos(null);
        }
    }, [permissionResponse]);

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                onSelect(asset);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick video");
        }
    };

    const recordVideo = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission needed", "Camera permission is required to record videos.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                onSelect(asset);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to open camera");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Video</Text>
                <TouchableOpacity onPress={pickVideo}activeOpacity={1}>
                    <Ionicons name="folder-open-outline" size={28} color="black" />
                </TouchableOpacity>
            </View>

            <View style={styles.cameraButtonContainer}>
                <TouchableOpacity style={styles.cameraButton}  onPress={recordVideo}>
                    <View style={styles.cameraIconContainer}>
                        <Ionicons name="camera" size={24} color="#fff" />
                    </View>                  
                    <Text style={styles.cameraButtonText}>Record a Video</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={galleryVideos}
                numColumns={3}
                keyExtractor={(item) => item.id}
                onEndReached={() => { if (hasNextPage) fetchGalleryVideos(endCursor); }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingGallery && galleryVideos.length > 0 ? <ActivityIndicator size="small" color="#000" style={{margin: 20}} /> : null}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.galleryItem} 
                        onPress={() => onSelect(item)}
                    >
                        <Image 
                            source={{ uri: item.uri }} 
                            style={styles.galleryImage} 
                            resizeMode="cover"
                        />
                        <Text style={styles.durationText}>{Math.round(item.duration)}s</Text>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    galleryItem: {
        width: width / 3,
        height: width / 3,
        padding: 1,
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    durationText: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 4,
        borderRadius: 4,
    },

    cameraButtonContainer:{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:"center",
        padding: 10,
        paddingHorizontal: 16,
        paddingVertical:50
    },

    cameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cameraIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cameraButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
});

export default Gallery;
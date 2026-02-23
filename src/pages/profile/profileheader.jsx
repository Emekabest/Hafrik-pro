import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Modal, Dimensions, StatusBar, TouchableWithoutFeedback } from "react-native";
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from "../../helpers/appdetails";
import SvgIcon from "../../assl.js/svg/svg";
import EditModal from "./timeline/editmodal";
import ImageViewModal from "../imageviewmodal";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import { UploadProfileImageController } from '../../controllers/profilecontroller';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


const ProfileHeader = ({ userDetails, user, postsCount, followersCount, followingsCount, groupsCount, pagesCount, isOwner, isFollowing }) => {
    
    const {token} = useAuth();

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [avatarImage, setAvatarImage] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [avatarOptionsVisible, setAvatarOptionsVisible] = useState(false);
    const [avatarOptionsPos, setAvatarOptionsPos] = useState({ left: 0, top: 0 });
    const avatarButtonRef = useRef(null);


    const getGender = (g) => {
        if (g === 1) return 'Male';
        if (g === 2) return 'Female';
        return 'Unknown';
    };

    const openAvatarOptions = () => {
        if (!avatarButtonRef.current) {
            setAvatarOptionsVisible(true);
            return;
        }
        avatarButtonRef.current.measureInWindow((x, y, w, h) => {
            // position to the right of the button by default
            const width = 180;
            let left = x + w + 8;
            let top = y;
            // If it would overflow screen, show to the left
            if (left + width > screenWidth) {
                left = x - 8 - width;
            }
            setAvatarOptionsPos({ left, top });
            setAvatarOptionsVisible(true);
        });
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
                console.warn('Media library permission not granted');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                aspect: [16, 9],
                quality: 1,
            });

            if (!result || result.canceled) {
                console.log('Image selection cancelled or no result');
                return;
            }

            const asset = result.assets[0];
            const imageDataFromGallery = {
                id: Date.now() + Math.random(),
                uri: asset.uri,
                fileName: asset.fileName || "thumbnail.jpg",
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
                        const url = response.data?.cover_url || response.data?.url || response.data?.cover;
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
                        const url = response.data?.avatar_url || response.data?.url || response.data?.avatar;
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
                // console.error("Error uploading cover image:", error);
                console.log("Error uploading cover image:", error);
                setCoverImage(prev => ({ ...prev, uploading: false, loading: false }));
            }
            

        } catch (err) {
            console.error('pickImageFromGallery error:', err);
        }
    };



    const handleUploadCover = () => {

        // https://hafrik.com/api/v1/users/update_avatar.php'

    }





    return (
        <View style={styles.container}>
            <View style={styles.profileHeaderSection}>
                {/* First container: Cover Photo */}
                <View style={styles.coverPhotoContainer}>
                    <ExpoImage
                        source={{ uri: coverImage?.uri || user?.cover }}
                        style={styles.coverImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <View style={[styles.coverActions, coverImage?.uploading && { opacity: 0.5, pointerEvents: 'none' }]}>
                        <TouchableOpacity 
                            disabled={coverImage?.uploading}
                            onPress={() => pickImageFromGallery("cover", "https://hafrik.com/api/v1/users/update_cover.php")} 
                            style={styles.actionButton} 
                            activeOpacity={1}
                        >
                            <Ionicons name="image-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.actionButton} 
                            activeOpacity={1}
                            onPress={() => setFullscreenImage(coverImage?.uri || user?.cover)}
                        >
                            <Ionicons name="expand-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            disabled={coverImage?.uploading}
                            style={styles.actionButton} 
                            activeOpacity={1}
                        >
                            <Ionicons name="trash-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Second container: User Avatar */}
                <View style={styles.mainAvatarWrapper}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.mainAvatarContainer}>
                        <ExpoImage
                            source={{ uri: avatarImage?.uri}}
                            style={styles.mainAvatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        ref={avatarButtonRef}
                        disabled={avatarImage?.uploading}
                        onPress={() => openAvatarOptions()}
                        activeOpacity={1}
                        style={[styles.avatarEditButton, avatarImage?.uploading && { opacity: 0.5 }]}
                    >
                        <Ionicons name="image-outline" size={16} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* User Info Section */}
            <View style={styles.userInfoSection}>
                <Text style={styles.fullNameText}>
                    {userDetails ? `${userDetails.first_name} ${userDetails.last_name || ''}`.trim() : (user?.full_name || 'Hafrik User')}
                </Text>
                <Text style={styles.usernameText}>@{userDetails?.username || user?.username || 'username'}</Text>

                
                <View style={styles.genderSection}>
                    <Ionicons 
                        name={getGender(userDetails?.gender).toLowerCase() === 'female' ? 'female' : 'male'} 
                        size={14} 
                        color="#666" 
                    />
                    <Text style={styles.genderText}>{getGender(userDetails?.gender)}</Text>
                </View>


                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsScroll}
                    contentContainerStyle={styles.statsContainer}
                >
                    <TouchableOpacity style={styles.followItem}>
                        <Text style={styles.followCount}>{postsCount}</Text>
                        <Text style={styles.followLabel}>Posts</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.followItem}>
                        <Text style={styles.followCount}>{followersCount}</Text>
                        <Text style={styles.followLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.followItem}>
                        <Text style={styles.followCount}>{followingsCount}</Text>
                        <Text style={styles.followLabel}>Following</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.followItem}>
                        <Text style={styles.followCount}>{groupsCount}</Text>
                        <Text style={styles.followLabel}>Groups</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.followItem}>
                        <Text style={styles.followCount}>{pagesCount}</Text>
                        <Text style={styles.followLabel}>Pages</Text>
                    </TouchableOpacity>
                </ScrollView>

                {isOwner && (
                    <>
                        <View style={styles.profileCompletionContainer}>
                            {/* Profile completion UI (only visible to owner) */}
                        </View>

                        <TouchableOpacity style={styles.editButton} activeOpacity={1} onPress={() => setEditModalVisible(true)}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <View style={styles.postFeedContainer}>
                            {/* Post feed container (owner-only) */}
                        </View>
                    </>
                )}

                <EditModal 
                    visible={editModalVisible} 
                    onClose={() => setEditModalVisible(false)}
                    userDetails={userDetails || user}
                />
            
            {/* Avatar options popover */}
            <Modal visible={avatarOptionsVisible} transparent animationType="none" onRequestClose={() => setAvatarOptionsVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setAvatarOptionsVisible(false)}>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.avatarOptionsContainer, { top: avatarOptionsPos.top, left: avatarOptionsPos.left }]}>
                     
                            <TouchableOpacity activeOpacity={0.5} style={styles.avatarOption} onPress={() => { setAvatarOptionsVisible(false); pickImageFromGallery('avatar', 'https://hafrik.com/api/v1/users/update_avatar.php'); }}>
                                <View style={styles.avatarOptionRow}>
                                    <Ionicons name="cloud-upload-outline" size={18} color="#333" style={styles.avatarOptionIcon} />
                                    <Text style={styles.avatarOptionText}>Upload Photo</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.5} style={styles.avatarOption} onPress={() => { setAvatarOptionsVisible(false); pickImageFromGallery('avatar', 'https://hafrik.com/api/v1/users/update_avatar.php'); }}>
                                <View style={styles.avatarOptionRow}>
                                    <Ionicons name="images-outline" size={18} color="#333" style={styles.avatarOptionIcon} />
                                    <Text style={styles.avatarOptionText}>Select Photo</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.5} style={styles.avatarOption} onPress={() => { setAvatarOptionsVisible(false); console.log('Crop Photo - not implemented'); }}>
                                <View style={styles.avatarOptionRow}>
                                    <Ionicons name="crop-outline" size={18} color="#333" style={styles.avatarOptionIcon} />
                                    <Text style={styles.avatarOptionText}>Crop Photo</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.5} style={styles.avatarOption} onPress={() => { setAvatarOptionsVisible(false); setFullscreenImage(avatarImage?.uri || user?.avatar); }}>
                                <View style={styles.avatarOptionRow}>
                                    <Ionicons name="eye-outline" size={18} color="#333" style={styles.avatarOptionIcon} />
                                    <Text style={styles.avatarOptionText}>See profile picture</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.5} style={styles.avatarOption} >
                                <View style={styles.avatarOptionRow}>
                                    <Ionicons name="trash-outline" size={18} color="#d00" style={styles.avatarOptionIcon} />
                                    <Text style={[styles.avatarOptionText, { color: '#d00' }]}>Delete Photo</Text>
                                </View>
                            </TouchableOpacity>
                            
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            </View>

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
        backgroundColor: '#fff',
    },
    profileHeaderSection: {
        width: '100%',
        backgroundColor: '#fff',
        paddingBottom: 60,
    },
    coverPhotoContainer: {
        width: '100%',
        height: 180,
        backgroundColor: '#eee',
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverActions: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    actionButton: {
        padding: 6,
        marginHorizontal: 2,
    },
    mainAvatarWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        zIndex: 1,
    },
    mainAvatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
        backgroundColor: '#eee',
        overflow: 'hidden',
    },
    mainAvatar: {
        width: '100%',
        height: '100%',
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: "#fff",
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    userInfoSection: {
        paddingHorizontal: 20,
        marginTop: 5,
    },
    fullNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    usernameText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    statsScroll: {
        marginTop: 15,
        marginBottom: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        paddingRight: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        fontSize: 13,
        fontFamily: AppDetails.fontFamily.body,
        color: '#333',
        marginLeft: 5,
    },
    genderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    genderText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 5,
        textTransform: 'capitalize',
    },
    followItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    followCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    followLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 5,
    },
    profileCompletionContainer: {
        marginTop: 12,
    },
    postFeedContainer: {
        marginTop: 12,
    },
    editButton: {
        backgroundColor: '#f0f0f0',
        borderRadius: 50,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    editButtonText: {
        fontSize: 15,
        fontFamily:AppDetails.fontFamily.outfit.medium,
        color: '#333',
    },
    avatarOptionsContainer: {
        position: 'absolute',
        width: 250,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        paddingVertical: 6,
    },
    avatarOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    avatarOptionText: {
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.body,
        color: '#111'
    },
    avatarOptionRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatarOptionIcon: {
        marginRight: 10
    },
});

export default ProfileHeader;
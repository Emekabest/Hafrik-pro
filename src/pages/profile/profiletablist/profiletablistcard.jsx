import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import useStore from "../../../repository/store";
import AppDetails from "../../../helpers/appdetails";
import SkeletonBusinessPageCard from "../../profile/businesspages/skeletonbusinesspagecard";

const ProfileTabListCard = ({ item }) => {

    const profileTabMode = useStore(state => state.profileTabMode);

    const data = item.data || item || {};

    // Skeleton placeholder for business pages
    if (profileTabMode && profileTabMode.value === 'business_pages' && data && data.skeleton) {
        return <SkeletonBusinessPageCard />;
    }

    // Business pages card
    if (profileTabMode && profileTabMode.value === 'business_pages') {
        const business = data;
        const avatar = business.avatar || null;
        const name = business.name || business.username || 'Business';
        const likes = typeof business.likes === 'number' ? business.likes : 0;

        return (
            <TouchableOpacity activeOpacity={0.8} style={styles.businessContainer}>
                <View style={styles.businessLeft}>
                    {avatar ? (
                        <ExpoImage source={{ uri: avatar }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="person" size={28} color="#fff" />
                        </View>
                    )}
                </View>
                <View style={styles.businessRight}>
                    <Text numberOfLines={1} style={styles.businessName}>{name}</Text>
                    <Text style={styles.likesText}>{likes} likes</Text>
                    <TouchableOpacity style={styles.unlikeButton}>
                        <View style={styles.unlikeContent}>
                            <Ionicons name="heart" size={16} color="#fff" />
                            <Text style={styles.unlikeText}>Unlike</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }

    

    // Default media card behavior
    const type = (data.type) || 'photo';
    const media = data.media && data.media.length > 0 ? data.media[0] : null;

    // Determine image source
    let imageSource = null;
    if (media) {
        if (type === 'video') {
            imageSource = media.thumbnail;
        } else {
            imageSource = media.url;
        }
    }

    const renderMainPost = () => {
        return (
            <View style={styles.mediaContainer}>
                {imageSource ? (
                    <ExpoImage 
                        source={{ uri: imageSource }} 
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={styles.placeholder}>
                         <Ionicons name="image" size={32} color="#888" />
                    </View>
                )}

                {/* Icons based on type */}
                {type === 'video' && (
                    <View style={styles.centerIconContainer}>
                         <Ionicons name="play" size={24} color="white" />
                    </View>
                )}

                {type === 'album' && (
                     <View style={styles.centerIconContainer}>
                         <Ionicons name="folder" size={24} color="white" />
                    </View>
                )}
                 
                {/* Fallback or other types */}
                {!['video', 'album', 'photo'].includes(type) && (
                   <View style={styles.centerIconContainer}>
                         <Ionicons name="apps" size={24} color="white" />
                    </View>
                )}
            </View>
        );
    }

    return(
        <TouchableOpacity activeOpacity={0.8} style={styles.cardContainer}>
            {renderMainPost()}
        </TouchableOpacity>
    )

}

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        // Using aspect ratio 1 ensures square grid items
        aspectRatio: 1, 
        backgroundColor: '#f8f8f8',
        borderRadius: 20,
        margin:2,
        overflow: 'hidden',
    },
    mediaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e6e6e6',
        width: '100%',
        height: '100%',
        position: 'relative'
    },
    placeholder: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100%',
        height: '100%'
    },
    centerIconContainer: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 50,
        height: 40,
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        alignSelf: 'center',
        top: '50%',
        marginTop: -20, // Half of height to truly center
    }
    ,
    /* Business card styles */
    businessContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        margin: 4,
        overflow: 'hidden'
    },
    businessLeft: {
        width: 80,
        height: 80,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 50,
        backgroundColor: '#ccc'
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#888'
    },
    businessRight: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: 8
    },
    businessName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111'
    },
    likesRow: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginTop: 6
    },
    unlikeContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    likesText: {

        color: '#666',
        marginRight: 12,
        marginVertical:10,
    },
    unlikeButton: {
        backgroundColor: AppDetails.primaryColor,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        width: 100,
        alignItems: 'center',
        alignSelf: 'flex-start'
    },
    unlikeText: {
        color: '#fff',
        fontWeight: '500',
        marginLeft:5,
    }
});


export default ProfileTabListCard;
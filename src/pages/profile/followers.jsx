import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import AppDetails from '../../helpers/appdetails';
import { ScrollView } from 'react-native-gesture-handler';
import ProfileTabs from './tabs';
import { FollowersController } from '../../controllers/profilecontroller';
import { useAuth } from '../../AuthContext';
import Svg from '../../assl.js/svg/svg';
import FilterHeader from './filterheader';



const Followers = ({ header, tabs, activeTab, onTabChange, userId }) =>{

    const { token } = useAuth();

    const [followers, setFollowers] = useState([]);
    const [skeletonFollowers, setSkeletonFollowers] = useState(Array(5).fill({}));
    const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);

    const filterOptions = [
        { label: "Followers", value: "followers", icon:"document", action: () => fetchFollowers("profile_followers.php") },
        { label: "Following", value: "following", action: () => fetchFollowers("profile_following.php")},
        { label: "Subscriptions", value: "subscriptions" },
    ];

    
    
    const fetchFollowers = async(path)=>{
        setIsLoadingFollowers(true);
        try{
            const response = await FollowersController(token, userId, path);

            if(response.status === 200){
                setFollowers(response.data);
            }
        }
        catch(err){
            console.warn('Failed to fetch followers', err);
        }
        finally{
            setIsLoadingFollowers(false);
        }
    }
    useEffect(()=>{

        fetchFollowers("profile_followers.php");
    },[token, userId])

    const dataToRender = followers && followers.length ? followers : [];
    
    return(
            <ScrollView stickyHeaderIndices={[1]}>
                {header}
                <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

                <FilterHeader name="Followers" options={filterOptions} />

                {isLoadingFollowers ? (
                    skeletonFollowers.map((_, idx) => (
                        <View key={`skeleton-${idx}`} style={styles.followerCard}>
                            <View style={[styles.followerAvatar, styles.skeletonAvatar]} />
                            <View style={styles.followerInfo}>
                                <View style={[styles.skeletonLine, { width: '50%' }]} />
                                <View style={[styles.skeletonLine, { width: '30%', marginTop: 8 }]} />
                            </View>
                            <View style={[styles.skeletonButton]} />
                        </View>
                    ))
                ) : (
                    dataToRender.map((item) => {
                        const avatarUri = item.avatar || `https://i.pravatar.cc/150?img=${item.id}`;
                        const fullName = item.full_name || item.name || item.fullName || '';
                        const username = item.username || (item.name ? item.name.toLowerCase().replace(/\s+/g, '') : '');

                        return (
                            <View key={item.id} style={styles.followerCard}>
                                <ExpoImage
                                    source={{ uri: avatarUri }}
                                    style={styles.followerAvatar}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <View style={styles.followerInfo}>
                                    <Text style={styles.followerName} numberOfLines={1}>
                                        {fullName}
                                        {item.verified && (
                                            <Svg name="verified" height={16} width={16} color={AppDetails.primaryColor} />
                                        )}
                                    </Text>
                                    <Text style={styles.followerUsername} numberOfLines={1}>
                                        @{username}
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.followButton}>
                                    <Text style={styles.followButtonText}>Follow</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    })
                )}
            </ScrollView>
    )
}

const styles = StyleSheet.create({
    followerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    followerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
        marginRight: 12,
    },
    followerInfo: {
        flex: 1,
    },
    followerName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    followerUsername: {
        fontSize: 13,
        color: '#666',
    },
    followButton: {
        backgroundColor: AppDetails.primaryColor,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 50,
    },
    followButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    skeletonAvatar: {
        backgroundColor: '#e9e9e9',
    },
    skeletonLine: {
        height: 12,
        backgroundColor: '#e9e9e9',
        borderRadius: 6,
    },
    skeletonButton: {
        width: 70,
        height: 30,
        borderRadius: 30,
        backgroundColor: '#e9e9e9',
    }
});

export default Followers;
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from "react-native";
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";
import { ProfileHeaderController } from '../../controllers/profilecontroller';
import AppHeader from '../AppHeader';
import Timeline from './timeline/timeline';
import Followers from './followers';
import ProfileHeader from './profileheader';
import DrawerNavigation from '../home/drawernavigation';
import Photos from './photos';
import Videos from './videos';
import BusinessPages from './businesspages/BusinessPages';
import Communities from './Communities';
import ProgressBarLoader from '../progressbarloader';
import PostComposerModal from '../home/PostComposerModal';
import { useLiveCounts } from '../../hooks/useLiveCounts';
import { Colors } from '../../theme/colors';
import { useNotification } from '../../../context/notificationcontext';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;

const ProfileScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user, token, updateUser } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState({label: "Timeline", value: "timeline"});
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const setSearchVisible  = useStore((state) => state.setSearchVisible);
    const setProfileTabMode = useStore((state) => state.setProfileTabMode);
    const openComposer      = useStore((state) => state.openComposer);
    const profileDoubleTap  = useStore((state) => state.tabRefreshSignals?.Profile ?? 0);

    // Double-tap on Profile tab → reload profile
    const prevProfileDoubleTap = useRef(profileDoubleTap);
    useEffect(() => {
        if (profileDoubleTap === prevProfileDoubleTap.current) return;
        prevProfileDoubleTap.current = profileDoubleTap;
        handleRefreshProfile();
    }, [profileDoubleTap]);


    const { expoPushToken, notification } = useNotification();
        
    // console.log("Expo Push Token in ProfileScreen:", notification);

    // Live notification + message counts (polls every 20 s while focused)
    useLiveCounts();

    // const tabs = useRef([
    //     "Timeline", 
    //     "Followers", 
    //     "Photos", 
    //     "Videos", 
    //     "Product", 
    //     "Business Pages", 
    //     "Communities", 
    //     "Events" 
    // ])

    const tabs = useRef([
        {label: "Timeline",  value: "timeline",       icon: "home-outline"},
        {label: "Followers", value: "followers",       icon: "people-outline"},
        {label: "Photos",    value: "photos",          icon: "image-outline"},
        {label: "Videos",    value: "videos",          icon: "videocam-outline"},
        {label: "Business",  value: "business_pages",  icon: "storefront-outline"},
        {label: "Communities", value: "communities",   icon: "globe-outline"},
    ])



        useEffect(() => {
        if (!isFocused) return;
        const getProfileData = async () => {
            setLoading(true);
            try {
                console.log("TOKEN:", token);
                console.log("AUTH HEADER:", `Bearer ${token}`);
                const response = await ProfileHeaderController(token);
                if (response && response.data) {

                    setProfileData(response.data);

                }
            } catch (error) {
                Alert.alert("Error", "Failed to fetch profile data.");
            } finally {
                setLoading(false);
                setProfileTabMode(tabs.current[0]); // Set default tab mode in store
            }//
        }
        getProfileData();
    }, [token, isFocused]);



    const openDrawer = useCallback(() => {
        setIsDrawerVisible(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setIsDrawerVisible(false);
    }, []);

    // Pull-to-refresh: re-fetch profile data + timeline feeds
    const handleRefreshProfile = useCallback(async () => {
        setRefreshing(true);
        try {
            const response = await ProfileHeaderController(token);
            if (response && response.data) {
                setProfileData(response.data);
            }
        } catch {}
        setRefreshing(false);
    }, [token]);

    const handleProfileUpdated = useCallback(async (updatedUser) => {
        if (!updatedUser) return;

        setProfileData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                user: {
                    ...prev.user,
                    ...updatedUser,
                },
            };
        });

        await updateUser({ ...(user || {}), ...updatedUser });
    }, [updateUser, user]);






    // Handle tab change — simple and fast, no double-RAF
    const handleTabChange = useCallback((tab) => {
        if (tab.value === activeTab.value) return;
        setActiveTab(tab);
        setProfileTabMode(tab);
    }, [activeTab.value]);

    
    
    const userId = profileData?.user?.id;
    const userDetails = profileData?.user;
    const followersCount = profileData?.counts?.followers || 0;
    const followingsCount = profileData?.counts?.following || 0;
    const postsCount = profileData?.counts?.posts || 0;
    const groupsCount = profileData?.counts?.groups || 0;
    const pagesCount = profileData?.counts?.pages || 0;
    
    const isOwner = profileData?.viewer?.is_owner || false;
    const isFollowing = profileData?.viewer?.is_following || false;

    // Memoize the header so it's not recreated on every render
    const profileHeader = useMemo(() => (
        <ProfileHeader 
            userDetails={userDetails} 
            user={user} 
            postsCount={postsCount} 
            followersCount={followersCount} 
            followingsCount={followingsCount} 
            groupsCount={groupsCount}
            pagesCount={pagesCount}
            isOwner={isOwner}
            isFollowing={isFollowing}
            onProfileUpdated={handleProfileUpdated}
        />
    ), [userDetails, user, postsCount, followersCount, followingsCount, groupsCount, pagesCount, isOwner, isFollowing, handleProfileUpdated]);

    

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ProgressBarLoader visible={false} />
            {/* Header already handles top safe-area via useSafeAreaInsets internally */}
            <AppHeader onOpenDrawer={openDrawer} />
            <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={AppDetails.primaryColor} />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab.value === 'timeline' && (
                        <Timeline 
                            header={profileHeader} 
                            posts={profileData?.posts || []}
                            tabs={tabs.current}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            isOwner={isOwner}
                            userId={userId}
                            refreshing={refreshing}
                            onRefresh={handleRefreshProfile}
                        />
                    )}

                    {
                        activeTab.value === 'followers' && (
                            <Followers
                                header={profileHeader}
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }


                    {
                        activeTab.value === 'photos' && (
                            <Photos
                                header={profileHeader}
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }

                    {
                        activeTab.value === 'videos' && (
                            <Videos
                                header={profileHeader}
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }



                    {
                        activeTab.value === 'business_pages' && (
                            <BusinessPages
                                header={profileHeader}
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }

                    {
                        activeTab.value === 'communities' && (
                            <Communities
                                header={profileHeader}
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }

                </View>
            )}

            {/* FAB — opens PostComposerModal */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.88}
                onPress={() => openComposer()}
            >
                <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>

            {isFocused && <PostComposerModal />}
        </View>
    );
};




const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: BRAND,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 60,
    },
    headerLeft: {
        width: '20%',
        justifyContent: 'center',
    },
    headerMiddle: {
        width: '60%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: '20%',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    avatarContainer: {
        height: 38,
        width: 38,
        borderRadius: 19, // 50% radius for a perfect circle
        overflow: 'hidden',
        backgroundColor: Colors.neutral180,
    },
    avatar: {
        height: '100%',
        width: '100%',
    },
    logo: {
        height: 30,
        width: 120,
    },
    ProfileContentSection: {
        marginTop: 20,
    },
    tabsContainer: {
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral150,
        paddingBottom: 10,
    },
    tabItem: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: Colors.neutral120,
    },
    activeTabItem: {
        backgroundColor: AppDetails.primaryColor,
    },
    tabText: {
        fontSize: 14,
        color: Colors.neutral500,
        fontWeight: '500',
    },
    activeTabText: {
        color: Colors.white,
    },
    tabContent: {
        paddingHorizontal: 15,
        minHeight: 200,
    },
});

export default ProfileScreen;
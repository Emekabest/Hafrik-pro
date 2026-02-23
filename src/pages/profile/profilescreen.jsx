import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";
import { ProfileHeaderController } from '../../controllers/profilecontroller';
import Header from '../header';
import Timeline from './timeline/timeline';
import Followers from './followers';
import ProfileHeader from './profileheader';
import DrawerNavigation from '../home/drawernavigation';
import Photos from './photos';
import Videos from './videos';
import Product from './Product';
import BusinessPages from './businesspages/BusinessPages';
import Communities from './Communities';
import Events from './Events';
import ProgressBarLoader from '../progressbarloader';
import PostComposerModal from '../home/PostComposerModal';
import { useLiveCounts } from '../../hooks/useLiveCounts';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';

const ProfileScreen = () => {
    const navigation = useNavigation();
    const { user, token } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState({label: "Timeline", value: "timeline"});
    const [isTabLoading, setIsTabLoading] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);

    const setSearchVisible = useStore((state) => state.setSearchVisible);
    const setProfileTabMode = useStore((state) => state.setProfileTabMode);
    const openComposer = useStore((state) => state.openComposer);

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
        {label: "Timeline", value: "timeline"},
        {label: "Followers", value: "followers"},
        {label: "Photos", value: "photos"},
        {label: "Videos", value: "videos"},
        {label: "Product", value: "product"},
        {label: "Business Pages", value: "business_pages"},
        {label: "Communities", value: "communities"},
        {label: "Events", value: "events"},
    ])



        useEffect(() => {
        const getProfileData = async () => {
            setLoading(true);
            try {
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
    }, [token]);



    const openDrawer = useCallback(() => {
        setIsDrawerVisible(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setIsDrawerVisible(false);
    }, []);






    // Handle tab change: show loader immediately, then mount component after paint
    const handleTabChange = useCallback((tab) => {
        if (tab.value === activeTab.value) return;
        // Show loader immediately
        setIsTabLoading(true);
        // Use double requestAnimationFrame to ensure loader paints before switching
        // First RAF schedules for next frame, second RAF ensures paint completed
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setActiveTab(tab); // Update local state to switch tab content
                setProfileTabMode(tab); // Update global state with active tab
                // Hide loader after short delay
                setTimeout(() => setIsTabLoading(false), 400);
            });
        });
    }, [activeTab]);

    



    const userId = profileData?.user?.id;
    const userDetails = profileData?.user;
    const followersCount = profileData?.counts?.followers || 0;
    const followingsCount = profileData?.counts?.following || 0;
    const postsCount = profileData?.counts?.posts || 0;
    const groupsCount = profileData?.counts?.groups || 0;
    const pagesCount = profileData?.counts?.pages || 0;
    
    const isOwner = profileData?.viewer?.is_owner || false;
    const isFollowing = profileData?.viewer?.is_following || false;

    

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ProgressBarLoader visible={isTabLoading} />
            {/* Header already handles top safe-area via useSafeAreaInsets internally */}
            {/* <Header
                onOpenDrawer={openDrawer}
                onOpenNotifications={() => navigation.navigate('Notifications')}
                onOpenMessages={() => navigation.navigate('Inbox')}
            /> */}
            <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={AppDetails.primaryColor} />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab.value === 'timeline' && (
                        <Timeline 
                            header={
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
                                />
                            } 
                            posts={profileData?.posts || []}
                            tabs={tabs.current}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            isOwner={isOwner}
                            userId={userId}
                        />
                    )}

                    {
                        activeTab.value === 'followers' && (
                            <Followers
                                header={
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
                                    />
                                }
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
                                header={
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
                                    />
                                }
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
                                header={
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
                                    />
                                }
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }

                    {
                        activeTab.value === 'product' && (
                            <Product
                                header={
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
                                    />
                                }
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
                                header={
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
                                    />
                                }
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
                                header={
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
                                    />
                                }
                                tabs={tabs.current}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                userId={userId}
                            />
                        )
                    }

                    {
                        activeTab.value === 'events' && (
                            <Events
                                header={
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
                                    />
                                }
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
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            <PostComposerModal />
        </View>
    );
};




const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        backgroundColor: '#eee',
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
        borderBottomColor: '#f0f0f0',
        paddingBottom: 10,
    },
    tabItem: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: '#f8f8f8',
    },
    activeTabItem: {
        backgroundColor: AppDetails.primaryColor,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
    tabContent: {
        paddingHorizontal: 15,
        minHeight: 200,
    },
});

export default ProfileScreen;
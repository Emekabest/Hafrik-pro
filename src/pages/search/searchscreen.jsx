import React, { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, FlatList, TextInput, ActivityIndicator, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import { useAuth } from "../../AuthContext";
import { useNavigation } from '@react-navigation/native';
import FeedCard from "../home/feeds/feedcard";
import { useIsFocused } from '@react-navigation/native';


const SearchScreen = ()=>{
    const setSearchResultsVisible = useStore((state) => state.setSearchResultsVisible);
    const setSearchVisible = useStore((state) => state.setSearchVisible);
    const searchQuery = useStore((state) => state.searchQuery);
    const setSearchQuery = useStore((state) => state.setSearchQuery);
    const [activeTab, setActiveTab] = useState("Posts");
    const [activeSearchData, setActiveSearchData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useAuth();
    const tabs = ["Posts", "Users", "Pages", "Groups", "Events"];


    const handleSearchType = async ()=>{
        if (!searchQuery || searchQuery.trim() === "") {
            setActiveSearchData([]);
            return;
        }
    
        setIsLoading(true);
        const response = await SearchSuggestionController(searchQuery, token);
        const result = response?.data?.results || [];

        // Filter based on active tab (e.g., "Posts" -> "post")
        const targetType = activeTab.slice(0, -1).toLowerCase();
        const filteredData = result.filter(item => (item.type || '').toLowerCase() === targetType);

        setActiveSearchData(filteredData);
        setIsLoading(false);
    } 






    const navigation = useNavigation();

    const handleBackToPreviousScreen = useCallback(()=>{
        setSearchVisible(true);

        /* Delay hiding search results to allow any UI transitions */
        setTimeout(() => {
            setSearchResultsVisible(false);
        }, 100);
    }, [setSearchVisible, setSearchResultsVisible]);

    useEffect(() => {
        handleSearchType();
    }, [activeTab, searchQuery]);









        const [currentPlayingId, setCurrentPlayingId] = useState(null);
        const isFocused = useIsFocused();

        const normalizeToFeed = useCallback((item) => {
            const author = item?.meta?.author || {};
            const media = (() => {
                const m = item?.media;
                if (!m) {
                    return item.thumbnail ? [{ url: item.thumbnail, thumbnail: item.thumbnail }] : [];
                }

                // If media is already an array of media objects
                if (Array.isArray(m)) {
                    return m.map(mi => ({
                        url: mi.url || mi.thumbnail || mi.thumb || (mi.thumbs && mi.thumbs[0]) || null,
                        thumbnail: mi.thumbnail || mi.thumb || (mi.thumbs && mi.thumbs[0]) || mi.url || null,
                        type: mi.type || item.post_type || m.type || null,
                    })).filter(x => x.url);
                }

                // media is an object with thumbs/total/layout
                if (Array.isArray(m.thumbs) && m.thumbs.length > 0) {
                    return m.thumbs.map(t => ({ url: t, thumbnail: t, type: m.type || item.post_type || null }));
                }

                // fallback to any nested items
                if (Array.isArray(m.items) && m.items.length > 0) {
                    return m.items.map(it => ({ url: it.url || it.thumbnail || null, thumbnail: it.thumbnail || it.url || null, type: it.type || m.type || null })).filter(x => x.url);
                }

                return [];
            })();
            const thumbnail = item.thumbnail || (media[0] && media[0].thumbnail) || null;
            return {
                id: item.id,
                user: {
                    id: author.id,
                    full_name: author.name || author.full_name || item.user?.full_name || item.title,
                    username: author.username || item.user?.username,
                    avatar: author.avatar || item.user?.avatar || item.thumbnail,
                    verified: !!author.verified || !!item.user?.verified,
                },
                text: item.title || item.subtitle || item.text || "",
                title: item.title,
                subtitle: item.subtitle,
                type: (item.type || item.post_type || (item.is_video ? 'video' : 'post')).toLowerCase(),
                media,
                thumbnail,
                likes_count: item.meta?.likes || item.likes || 0,
                comments_count: item.meta?.comments || item.comments || 0,
                views: item.meta?.views || item.views || 0,
                created: (() => {
                    const t = item.meta?.time || item.created || null;
                    if (t === null || t === undefined) return null;
                    if (typeof t === 'number') return new Date(t * 1000).toISOString();
                    return String(t);
                })(),
                payload: item.payload,
                shared_post: item.shared_post || null,
            };
        }, []);


        
        const renderSearchItem = useCallback(({ item }) => {
            const feed = normalizeToFeed(item);
            return (
                <FeedCard
                    feed={feed}
                    currentPlayingId={currentPlayingId}
                    setCurrentPlayingId={setCurrentPlayingId}
                    isFocused={isFocused}
                />
            );
        }, [normalizeToFeed, currentPlayingId, isFocused]);

        const keyExtractor = useCallback((item, index) => `${item.id}-${index}`, []);








    
    return(
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackToPreviousScreen} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle} numberOfLines={1}>Search</Text>
            </View>


            <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                    {tabs.map((tab) => (
                        <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            {activeTab === tab && <View style={styles.activeTabIndicator} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            
            <View style={styles.content}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                {isLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={AppDetails.primaryColor} />
                    </View>
                ) : (
                    <FlatList
                        data={activeSearchData}
                        keyExtractor={keyExtractor}
                        renderItem={renderSearchItem}
                        style={{ flex: 1 }}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No results found</Text>}
                        onEndReachedThreshold={0.5}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        windowSize={3}
                        removeClippedSubviews={Platform.OS === 'android'}
                    />
                )}
            </View>
        </View>
    )

}



const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    headerTitle: {
        fontSize: 19,
        fontFamily:"ReadexPro_600SemiBold",
        color: '#333',
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 15,
    },
    tabsWrapper: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabsContainer: {
        paddingHorizontal: 10,
    },
    tabItem: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 5,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontFamily: "ReadexPro_400Regular",
    },
    activeTabText: {
        color: AppDetails.primaryColor,
        fontFamily: "ReadexPro_600SemiBold",
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        width: '60%',
        backgroundColor: AppDetails.primaryColor,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#edededff',
        borderRadius: 50,
        height: 35,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    searchInput: {
        flex: 1,
        height:50,
        marginLeft: 5,
        fontSize: 15,
        color: '#333',
        fontFamily: "ReadexPro_400Regular",
        paddingVertical: 0,
        textAlignVertical: 'center',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    resultImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    resultTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    resultTitle: {
        fontSize: 16,
        fontFamily: "ReadexPro_400Regular",
        color: '#333',
    },
    resultSubtitle: {
        fontSize: 13,
        color: '#888',
        fontFamily: "ReadexPro_400Regular",
    },
})

export default React.memo(SearchScreen);
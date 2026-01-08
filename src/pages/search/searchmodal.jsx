import React, { useState, useMemo, useEffect, use } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity, Modal, SectionList, Image, Text, Platform, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import GetFeedsController from "../../controllers/getfeedscontroller";
import { useAuth } from "../../AuthContext";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";


/** ........................................ **/

const youMayLikeDescriptionLength = 40;


////////////////////////////////////////////////





const SearchModal = ()=>{
    const setSearchVisible = useStore((state) => state.setSearchVisible);
    const setSearchQuery = useStore((state) => state.setSearchQuery);
    const setSearchResultsVisible = useStore((state) => state.setSearchResultsVisible);
    const [searchText, setSearchText] = useState("");
    const { token } = useAuth();
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [showAllRecent, setShowAllRecent] = useState(false);

    const [recentSearches, setRecentSearches] = useState([]);

    const [youMayLike, setYouMayLike] = useState([]);

    const navigation = useNavigation();
    



    

    const setRecentSearch = async(searchText)=>{
        try {
            const recentSearchesRaw = await AsyncStorage.getItem('recent_search');
            let recentSearches = recentSearchesRaw ? JSON.parse(recentSearchesRaw) : [];
            
            // Remove if exists to move it to the top
            recentSearches = recentSearches.filter(item => item.text !== searchText);

            const newRecentSearches = [{text: searchText}, ...recentSearches].slice(0, 20); // Keep only top 20
            
            await AsyncStorage.setItem('recent_search', JSON.stringify(newRecentSearches));
        } catch (error) {
            console.error("Failed to save recent search", error);
        }
    }   
    

    const getRecentSearches = async()=>{
        try {
            const recentSearchesJSON = await AsyncStorage.getItem('recent_search');
            if (recentSearchesJSON) {
                setRecentSearches(JSON.parse(recentSearchesJSON));
            } else {
                setRecentSearches([]);
            }
        } catch (error) {
            console.error("Failed to get recent searches", error);
            setRecentSearches([]);
        }
    }

    useEffect(() => {
        getRecentSearches();
    }, []);



    const handleDeleteRecentSearch = async(indexToDelete)=>{
        try {
            const searchesFromStorage = await AsyncStorage.getItem('recent_search');
            const recentSearches = searchesFromStorage ? JSON.parse(searchesFromStorage) : [];
            
            const updatedSearches = recentSearches.filter((_, itemIndex) => itemIndex !== indexToDelete);

            await AsyncStorage.setItem('recent_search', JSON.stringify(updatedSearches));
            setRecentSearches(updatedSearches);

        } catch (error) {
            console.error("Failed to delete recent search", error);
        }
    }





    const handleYouMayLike = async ()=>{
         const API_URL = `https://hafrik.com/api/v1/feed/list.php`;

        const randomNum  = Math.floor(Math.random() * 20) + 1; // Random number between 1 and 20
        const response = await GetFeedsController(API_URL, token, randomNum);


        if((response?.data || []).length > 0){
            const allFeeds = response.data;
            
            // Shuffle the array to get random posts
            const shuffledFeeds = [...allFeeds].sort(() => 0.5 - Math.random());


            /**Other post type like (photos, videos, post, text), Max limit of 6 */
            const otherPosts = shuffledFeeds.filter(feed => feed.type !== 'article').slice(0, 10).map(feed => ({
                id: feed.id,
                full_name: feed.user?.full_name,
                title: feed.text
            }));


            /**Article posts type only, Max limit of 4. */
            const articlePosts = shuffledFeeds.filter(feed => feed.type === 'article').slice(0, 4).map(feed => ({
                id: feed.id,
                full_name: feed.user?.full_name,
                title: feed.payload?.title.trim()
            }));


            setYouMayLike([...otherPosts, ...articlePosts]);
        }
    }

    useEffect(() => {
        handleYouMayLike();
    }, []);










    /**This function handles when the user types in the search input */
    const handleSearchSuggestions = async (text)=>{
        setSearchText(text)

        if (text.trim().length === 0) {
            setSearchSuggestions([]);
            setIsLoading(false);
            return;
        }


        setIsLoading(true);
        const response = await SearchSuggestionController(text, token);
        setIsLoading(false);

        const suggestions = response?.data?.results || [];
        
        setSearchSuggestions(suggestions);
    }
    
    

    /**Section list grouping................................................ */
    const sections = useMemo(() => {
        const grouped = searchSuggestions.reduce((acc, item) => {
            const type = item.type || 'Result';
            if (!acc[type]) acc[type] = [];
            acc[type].push(item);
            return acc;
        }, {});

        return Object.keys(grouped).map(key => ({
            title: key.charAt(0).toUpperCase() + key.slice(1) + 's',
            data: grouped[key]
        }));
    }, [searchSuggestions]);
    /**..................................................................... */

    const handleSeeAllResults = () => {
        setSearchVisible(false);
        setSearchQuery(searchText);
        setSearchResultsVisible(true);

        setRecentSearch(searchText);

    }

    const handleSelectRecentSearch = (text)=>{

        setSearchVisible(false);
        setSearchText(text);
        setSearchQuery(text)
        setSearchResultsVisible(true);
        setRecentSearch(text);
    
    }

    

    return(
        <Modal
            visible={true}
            animationType="fade"
            onRequestClose={() => setSearchVisible(false)}
        >
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.headerContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="#999"
                        autoFocus={true}
                        value={searchText}
                        onChangeText={handleSearchSuggestions}
                        onSubmitEditing={handleSeeAllResults}
                        returnKeyType="search"
                    />
                    {isLoading && <ActivityIndicator size="small" color={AppDetails.primaryColor} style={{ marginLeft: 5 }} />}
                </View>
                <TouchableOpacity onPress={() => setSearchVisible(false)} style={styles.closeButton} activeOpacity={1}>
                    <Ionicons name="close" size={28} color={AppDetails.primaryColor} />
                </TouchableOpacity>
            </View>

        {
            searchText.trim().length === 0 ? 
            <ScrollView style= {{paddingHorizontal:17}}>

                <View style={styles.recentSearchContainer}>
                    <View>
                        {(showAllRecent ? recentSearches : recentSearches.slice(0, 10)).map((item, index) => (
                            <TouchableOpacity onPress={()=> handleSelectRecentSearch(item.text) } activeOpacity={0.5} key={index}  style={styles.recentSearchesDesContainer} >
                                <Ionicons name="time-outline" size={15} color="#333" />
                                <Text style={[styles.youMayLike_RecentSearchDescription, {flex: 1}]}  key={index}>{item.text}</Text>
                                <TouchableOpacity onPress={() => handleDeleteRecentSearch(index)}>
                                    <Ionicons name="close-circle" size={18} color="#999" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {recentSearches.length > 10 && (
                        <TouchableOpacity onPress={() => setShowAllRecent(!showAllRecent)}>
                            <Text style={{ color: AppDetails.primaryColor, marginTop: 10 }}>
                                {showAllRecent ? 'See less' : 'See more'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.youMayLikeContainer}>
                    <Text style={styles.youMayLike_RecentSearchText}>You may like</Text>

                    {
                        youMayLike.map((item, index) => {
                        const textToDisplay = item.title || item.full_name || '';
                        const truncatedText = textToDisplay.length > youMayLikeDescriptionLength ? textToDisplay.substring(0, youMayLikeDescriptionLength) + '...' : textToDisplay;
                            return (
                                <TouchableOpacity activeOpacity={0.5} key={index} onPress={()=> navigation.navigate('CommentScreen', {feedId: item.id})}  style={styles.youMayLikeItem}>
                                    <Ionicons name="ellipse" size={6} color={AppDetails.primaryColor} />
                                    <Text style={styles.youMayLike_RecentSearchDescription}>{truncatedText}</Text>
                                </TouchableOpacity>
                            )
                        })
                    }
                    
                </View>

            </ScrollView>
            
            :

            <>
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.resultItem}>
                            <Image source={{ uri: item.thumbnail }} style={styles.resultImage} />
                            <View style={styles.resultTextContainer}>
                                <Text style={styles.resultTitle}>{item.title}</Text>
                                <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    style={styles.resultsContainer}
                    keyboardShouldPersistTaps="handled"
                    initialNumToRender={3}
                    maxToRenderPerBatch={3}
                    windowSize={2}
                    removeClippedSubviews={Platform.OS === 'android'}
                    scrollEventThrottle={AppDetails.flatList.scrollEventThrottle} // Adjust the throttle rate (16ms for ~60fps)
                    decelerationRate={AppDetails.flatList.decelerationRate}
                />

                {searchText.trim().length > 0 && (
                    <View style={styles.seeAllButton}>
                    <TouchableOpacity onPress={handleSeeAllResults} >
                        <Text style={styles.seeAllText}>See all results</Text>
                    </TouchableOpacity>
                    </View>

                )}
                
            </>

        }

            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container:{
        flex: 1,
        backgroundColor:"#fff",
    },
    headerContainer:{
        flexDirection: "row",
        alignItems: 'center',
        justifyContent: "space-between",
        paddingHorizontal: 10,
        height: 50,
        width: "100%",
        borderBottomWidth: 1,
        borderBottomColor: "#efefef"
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#edededff',
        borderRadius: 50,
        height: 35,
        paddingHorizontal: 10,
    },

    searchInput: {
        flex: 1,
        height: 35,
        marginLeft: 5,
        fontSize: 14,
        color: '#333',
        paddingVertical: 0,
        textAlignVertical: 'center',
    },

    closeButton: {
        marginLeft: 10,
    },

    resultsContainer: {
        flex: 1,
    },

    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
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
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
        marginBottom: 2,
    },
    resultSubtitle: {
        fontSize: 13,
        color: '#888',
    },
    sectionHeader: {
        backgroundColor: '#f7f7f7',
        paddingVertical: 8,
        paddingHorizontal: 15,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#666',
    },
    seeAllButton: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#efefef',
        alignItems: 'center',
        justifyContent: 'center',
    },
    seeAllText: {
        color: AppDetails.primaryColor,
        fontWeight: '600',
        fontSize: 15,
    },

    recentSearchContainer:{
        marginTop: 10,

    },

    recentSearchesDesContainer:{
        display:"flex",
        flexDirection:"row",
        alignItems:"center",
        marginVertical:6,

    },
 
    youMayLikeContainer: {
        flex: 1,
        marginTop: 30,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    youMayLike_RecentSearchText: {
        fontSize: 15,
        fontFamily: "WorkSans_600SemiBold",
        color: '#000',
    },


    youMayLikeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    youMayLike_RecentSearchDescription: {
        marginLeft: 10,
        fontSize: 14,
        color: '#333',
        fontFamily: "WorkSans_400Regular",
    }
})

export default SearchModal;
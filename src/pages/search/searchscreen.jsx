import { useState, useEffect } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, FlatList, TextInput, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import { useAuth } from "../../AuthContext";


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


    const handleBackToPreviousScreen = ()=>{
        
        setSearchVisible(true);

        /* Delay hiding search results to allow any UI transitions */
        setTimeout(() => {
            setSearchResultsVisible(false);
        }, 100);
    }

    useEffect(() => {
        handleSearchType();
    }, [activeTab, searchQuery]);

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
                        style={{ flex: 1 }}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>No results found</Text>}
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

export default SearchScreen;
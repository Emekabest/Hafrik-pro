import React, { useState, useMemo } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity, Modal, SectionList, Image, Text, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import { useAuth } from "../../AuthContext";
import { useNavigation } from "@react-navigation/native";


const SearchModal = ()=>{
    const setSearchVisible = useStore((state) => state.setSearchVisible);
    const setSearchQuery = useStore((state) => state.setSearchQuery);
    const setSearchResultsVisible = useStore((state) => state.setSearchResultsVisible);
    const [searchText, setSearchText] = useState("");
    const { token } = useAuth();
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigation = useNavigation();

    
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
})

export default SearchModal;
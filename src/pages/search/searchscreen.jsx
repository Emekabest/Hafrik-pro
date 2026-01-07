import { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, FlatList, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";


const SearchScreen = ()=>{
    const setSearchResultsVisible = useStore((state) => state.setSearchResultsVisible);
    const searchQuery = useStore((state) => state.searchQuery);
    const [activeTab, setActiveTab] = useState("Posts");
    const tabs = ["Posts", "Blogs", "Users", "Pages", "Groups", "Events"];


    const randomData = Array.from({ length: 40 }, (_, i) => `Result Item ${i + 1} for "${searchQuery}"`);


    return(
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSearchResultsVisible(false)} style={styles.backButton}>
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
                <TextInput />
                <FlatList
                    data={randomData}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    renderItem={({ item }) => (
                        <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                            <Text style={{ fontSize: 16, fontFamily: "ReadexPro_400Regular", color: '#333' }}>{item}</Text>
                        </View>
                    )}
                    style={{ flex: 1 }}

                />
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
    }
})

export default SearchScreen;
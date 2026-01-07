import React, { useState } from "react";
import { View, StyleSheet, TextInput, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import { useAuth } from "../../AuthContext";


const SearchModal = ()=>{
    const setSearchVisible = useStore((state) => state.setSearchVisible);
    const [searchText, setSearchText] = useState("");
    const { token } = useAuth();


    const handleSearchSuggestions = async (text)=>{
        setSearchText(text)

        const response = await SearchSuggestionController(text, token);

        console.log(response.data.results.length);
 
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
                    />
                </View>
                <TouchableOpacity onPress={() => setSearchVisible(false)} style={styles.closeButton} activeOpacity={1}>
                    <Ionicons name="close" size={28} color={AppDetails.primaryColor} />
                </TouchableOpacity>
            </View>
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
})

export default SearchModal;
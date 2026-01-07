import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../../repository/store";


const SearchScreen = ()=>{
    const setSearchResultsVisible = useStore((state) => state.setSearchResultsVisible);
    const searchQuery = useStore((state) => state.searchQuery);

    

    return(
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSearchResultsVisible(false)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <Text style={styles.headerTitle} numberOfLines={1}>Search</Text>

                <View>

                </View>
            </View>


            <View style={styles.content}>
                <Text>Search Screen</Text>
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
    }
})

export default SearchScreen;
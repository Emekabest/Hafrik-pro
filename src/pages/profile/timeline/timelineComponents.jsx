import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, View } from "react-native";
import PostFeed from "../../home/postfeed";
import FeedsHeader from "../../home/feedsheader";
import FilterHeader from "../filterheader";
import AppDetails from "../../../helpers/appdetails";
import ProfileCompletionContainer from "./profilecompletioncontainer";


const TimelineComponents = ({isOwner, getFeeds})=>{

    const filterOptions = [
        { label: "All", value: "all", icon:"document" , icon:"document", action:()=> getFeeds()},
        { label: "Text", value: "texts" , icon:"document", action:()=> getFeeds()},
        { label: "Links", value: "links" , icon:"document", action:()=> getFeeds()},
        { label: "Media", value: "media" , icon:"document", action:()=> getFeeds()},
        { label: "Live", value: "live" , icon:"document", action:()=> getFeeds()},
        { label: "Photos", value: "photos" , icon:"document", action:()=> getFeeds()},
        { label: "Maps", value: "maps" , icon:"document", action:()=> getFeeds()},
        { label: "Articles", value: "articles" , icon:"document", action:()=> getFeeds()},
        { label: "Products", value: "products" , icon:"document", action:()=> getFeeds()},
        { label: "Jobs", value: "jobs" , icon:"document", action:()=> getFeeds()},
        { label: "Polls", value: "polls" , icon:"document", action:()=> getFeeds()},
        { label: "Reels", value: "reels" , icon:"document", action:()=> getFeeds()},
        { label: "Videos", value: "videos" , icon:"document", action:()=> getFeeds()},
        { label: "Audios", value: "audios" , icon:"document", action:()=> getFeeds()},
    ];



    
    return(
        <View style={styles.container}>
             <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search"
                        style={styles.searchInput}
                        placeholderTextColor="#646464"
                    />
            </View>

            {isOwner && (
                <>
                    <ProfileCompletionContainer />

                    <PostFeed />
                </>
            )}
                

            <FilterHeader name="Recent Updates" options={filterOptions} />
        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingBottom: 10,
    },
   searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 50,
        paddingHorizontal: 12,
        height: 45,
        marginHorizontal: 15,
        marginTop: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: AppDetails.borderLineColor,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
        height: '100%',
    },


});


 export default TimelineComponents;
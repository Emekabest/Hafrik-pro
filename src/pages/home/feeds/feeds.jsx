import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import FeedCard from "./feedcard.jsx";



const Feeds = ()=>{



    const feeds = [
        {
            id: '1',
            user: {
                username: "Amazah",
                avatar: "https://randomuser.me/api/portraits/men/2.jpg",
            },
            content: "I enjoyed the ride last night, Buza ride is the best",
            time: "30m",
            likes: 120
        },

        {
            id: '1',
            user: {
                username: "Hallow",
                avatar: "https://randomuser.me/api/portraits/men/3.jpg",
            },
            content: "I enjoyed the ride last night, Buza ride is the best",
            time: "30m",
            likes: 120
        },




    ]








    return (
        <View style = {styles.container}>
            <View style = {styles.containerHeader} >
                <View style = {styles.containerHeaderLeft}>
                    <Text style ={{fontSize:17, fontWeight:"500"}}>Recent Updates</Text>
                </View>
                <View style = {styles.containerHeaderRight}>
                    <TouchableOpacity style = {styles.containerHeaderRightExplore}>  
                        <Ionicons name="globe-outline" size={20} color="#000" />
                        <Text style = {{fontSize:12, fontWeight:"500"}}>Explore by cities</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {styles.containerHeaderRightAll}>
                        <Ionicons name="apps" size={15} />
                        <Text style ={{fontSize:12, fontWeight:"500"}}>All</Text>
                    </TouchableOpacity>
                </View>

            </View>

            <View style = {styles.containerFeeds}>

                <FeedCard />
                <FeedCard />
                <FeedCard />


            </View>


        </View>
    )


}


const styles = StyleSheet.create({

    container:{
        // paddingHorizontal:10,        
    },

    containerHeader:{
        height:30,
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
        paddingVertical:35,
        paddingHorizontal:10,        

    },

    containerHeaderLeft:{

        width:"45%",
        height:30,

    },

    containerHeaderRight:{

        width:"55%",
        height:25,

        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between"
    },

    containerHeaderRightExplore:{
        height:25,
        width:"65%",
        paddingHorizontal:5,
        backgroundColor:"#e9e9e9ff",
        display:"flex",
        flexDirection:"row",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"space-around",

    },

    containerHeaderRightAll:{
        height:25,
        width:"25%",
        display:"flex",
        flexDirection:"row",
        backgroundColor:"#e9e9e9ff",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"space-around",
        paddingHorizontal:7,

    },

    containerFeeds:{
        // paddingHorizontal:10,        

    }


})

export default Feeds;
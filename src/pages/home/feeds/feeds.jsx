import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import FeedCard from "./feedcard.jsx";
import { useEffect, useState, useCallback } from "react";
import GetFeedsController from "../../../controllers/getfeedscontroller.js";
import Banner from "../banner.jsx";
import QuickLinks from "../quicklinks.jsx";
import PostFeed from "../postfeed.jsx";
import { useAuth } from "../../../AuthContext.js";



const Feeds = ()=>{


    const [feeds, setFeeds] = useState([])
    const { token } = useAuth();


    useEffect(()=>{
        const getFeeds = async()=>{

            const response = await GetFeedsController(token);   
            setFeeds(response.data);
        }
        getFeeds()
    },[])



    console.log(feeds.length)

    const renderHeader = () => (
        <View>
            <Banner />
            <QuickLinks />
            <PostFeed />
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
        </View>
    );

    const renderItem = useCallback(({item}) => {
        return <FeedCard feed={item} />
    }, []);

    return (
        <View style={styles.container}>
            <FlatList 
                data={feeds}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                contentContainerStyle={styles.containerFeeds}
            />
        </View>
    )


}


const styles = StyleSheet.create({

    container:{
        flex: 1,
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
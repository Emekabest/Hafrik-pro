import { Image, StyleSheet, Text, View, TouchableOpacity, FlatList } from "react-native"
import { useAuth } from "../../AuthContext";
import AppDetails from "../../service/appdetails";
import { useState } from "react";
import SvgIcon from "../../assl.js/svg/svg";

const PostFeed = () => {

    const { token, user } = useAuth();

    const [postButtonOpacity, setPostButtonOpacity] = useState(0.5)

    const bottomLeftIconsSize = 19


    const icons = [
        {
            id:1,
            name: "location",
        },

        {
            id:2,
            name: "music",
        },

        {
            id:3,
            name: "photos",

        }
        
    ]

    

    return(
        <View style = {styles.container}>
            <View style = {styles.containerTop}>
                <View style = {styles.containerTopImage}>
                    <Image
                        source={{uri: user.avatar}}
                        style={{ height: "100%", width: "100%" }}
                        resizeMode="cover"
                    />
                </View>
                <View style = {styles.containerTopTextContainer}>
                    <Text style = {styles.containerTopTextContainer_Text}>What is on your mind? #Hashtag.. {"\n"} @Mention.. Link..  </Text>
                </View>

            </View>
            <View style = {styles.containerBottom}>
                <View style={styles.containerBottomLeft}>
                    <FlatList
                        data={icons}
                        horizontal
                        inverted
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity activeOpacity={1} style={styles.containerBottomLeftIcons}>
                                <SvgIcon name={item.name} width={bottomLeftIconsSize} height={bottomLeftIconsSize} color={AppDetails.primaryColor} />
                            </TouchableOpacity>
                        )}
                    />

                </View>
                <View style={styles.containerBottomRight}>
                    <TouchableOpacity activeOpacity={postButtonOpacity} style={[styles.postButton, { opacity: postButtonOpacity }]}>
                        <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                </View>
            </View>


        </View>
    )
}



const styles = StyleSheet.create({

    container:{
        marginHorizontal:10,
        height:180,
    },

    containerTop:{
        height:"70%",
        display:"flex",
        flexDirection:"row",
        alignItems:"center",
        paddingHorizontal:15,
    },

    containerTopImage:{
        height:50,
        width:50,
        borderRadius:50,
        overflow:"hidden"
    },

    containerTopTextContainer:{
        marginLeft:10

    },

    containerTopTextContainer_Text:{
        fontSize:16,
        color:"#848484ff"


    },

    containerBottom:{
        height:"30%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth:1,
        borderBottomColor:"#f0f0f0ff",
    },

    containerBottomLeft: {
        height:"100%",
        width:"70%",
        display:"flex",
        flexDirection:"row",
        paddingRight:35,
        alignItems:"center",
        justifyContent:"flex-end",
    },

    containerBottomLeftIcons:{
        marginLeft:17

    },

    containerBottomRight: {
        height:"100%",
        width:"70%",
        justifyContent:"center"

    },

    postButton: {
        backgroundColor: AppDetails.primaryColor,
        height:43,
        width:110,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 50,
        
        
    },

    postButtonText: {
        color: "#fff",
        fontWeight: "bold",
    }

})


export default PostFeed;

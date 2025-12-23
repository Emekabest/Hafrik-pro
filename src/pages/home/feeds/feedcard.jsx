import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppDetails from "../../../service/appdetails";


const FeedCard = ()=>{



    return(
        <View style = {styles.container}>
            <View style = {styles.containerLeft}>
                <View style = {styles.ProfileContainer}>
                    <View style = {styles.ImageContainer}>

                    </View>


                    <View style = {[styles.profileIconContainer, {backgroundColor:AppDetails.primaryColor}]}>
                            <Ionicons name="add" size={16} style={{color:"#fff", fontWeight:"bold"}} />
                    </View>

                </View>
            </View>

            <View style = {styles.containerRight}>
                <View style = {styles.firstSection}>
                    <View style = {styles.usernameSection}>
                        <View style = {styles.username}>
                            <Text style = {{color:"#333", fontWeight:"bold"}}>Username</Text>
                        </View>
                        <View style = {styles.elapsed}>
                            <Text style = {{color:"#787878ff"}}>44m</Text>
                        </View>
                    </View>


                    <TouchableOpacity style = {styles.options}>
                        <Ionicons name="ellipsis-horizontal" size={20} style={{color:"#333", fontWeight:"bold"}} />
                    </TouchableOpacity>
                </View>

                <View style={styles.textSection}>
                    <Text>
                        Lamine Yamal launched his YouTube channel and gave a tour of his house while wearing a Luis Diaz kit {"\n"} {"\n"}

                        "This is the most precious thing i have at home: the ball i scored the goal with against france at the EUROs"
                    </Text>
                </View>

                <View style = {styles.mediaSection}>

                </View>

                <View style = {styles.engagementBar}>
                    <TouchableOpacity style = {[styles.likeSection, styles.engagementBarViews]}>
                        <Ionicons name="heart-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>1.2k</Text>

                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.commentSection, styles.engagementBarViews]}>
                        <Ionicons name="chatbubble-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>72k</Text>

                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.repostSection, styles.engagementBarViews]}>
                        <Ionicons name="repeat-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>182</Text>

                    </TouchableOpacity>
                    <TouchableOpacity style = {[styles.shareSection, styles.engagementBarViews]}>
                        <Ionicons name="paper-plane-outline" size={23} style={{color:"#333", fontWeight:"bold"}} />
                        <Text style ={styles.engagementCount}>29</Text>
                    </TouchableOpacity>
                </View>

            </View>

        </View>
    )


}



const styles = StyleSheet.create({

    container:{
        borderTopWidth:1,
        borderTopColor:"#efefefff",
        minHeight:300,
        width:"100%",
        padding:10,  
        display:"flex",
        flexDirection:"row",
    },

    containerLeft:{
        height:"100%",
        width:"13%",
    },


    containerRight:{
        height:"100%",
        width:"87%",
        paddingHorizontal:5,
        // backgroundColor:"#b8b058ff"

    },

    firstSection:{
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        // backgroundColor:"#929292ff"
        // alignItems:"center",
    },

    usernameSection:{
        width:"80%",
        display:"flex",
        flexDirection:"row",
        // alignItems:"center",

    },

    username:{
        marginRight:5
    },

    options:{
        width:"20%",
        display:"flex",
        alignItems:"flex-end",
    },

    mediaSection:{
        height:300,
        width:"100%",
        borderRadius:10,
        backgroundColor:'#b1aaaaff'
    },

    engagementBar:{
        height:30,
        width:"80%",
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",

    },

    engagementBarViews:{
        height:"100%",
        width:"20%",
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-around",
        alignItems:"center",
        // backgroundColor:"#468137ff"
    },

    engagementCount:{
        fontSize:13,
        // fontWeight:"bold",
        color:"#333"


    },

    ProfileContainer:{
        height:70,
        width:"100%",
    },


    ImageContainer:{
        height:50,
        width:"100%",
        borderRadius:50,
        backgroundColor:"#e9e9e9ff"
    },

    profileIconContainer:{
        height:20,
        width:20,
        borderRadius:50,
        right:0,
        bottom:20,
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        position:"absolute",
        backgroundColor:"#a38080ff"

    }

})


export default FeedCard;
import { Image, StyleSheet, Text, View } from "react-native"
import { useAuth } from "../../AuthContext";



const PostFeed = () => {

    const { token, user } = useAuth();

    

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
                    <Text style = {styles.containerTopTextContainer_Text}>What is on your mind? #Hashtag... {"\n"} @Mention.. Link..  </Text>
                </View>

            </View>
            <View style = {styles.containerBottom}></View>


        </View>
    )
}



const styles = StyleSheet.create({

    container:{
        marginHorizontal:10,
        height:200,
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
        backgroundColor:"#f0f0f0ff"
    }

})


export default PostFeed;



import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, TouchableOpacity } from "react-native";
import { StyleSheet, View } from "react-native";
import SvgIcon from "../../assl.js/svg/svg";


const ReelEngagementBar = ({ likesCount, commentCount }) => {



    return(
        <View style={styles.container}> 

            <TouchableOpacity activeOpacity={1} style={[styles.item]}>
                        <Ionicons name={'heart-outline'} size={27} color='#fff'/>
                        <Text style={styles.count}>{likesCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={1} style={[styles.item]} >
                {/* <SvgIcon name="comment" width={25} height={25} color="#fff" /> */}
                <Ionicons name={'chatbubble'} size={27} color='#fff'/>
                <Text style={styles.count}>{commentCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={1} style={[styles.item]} >
                {/* <SvgIcon name="share" width={25} height={25} color="#fff" /> */}
                <Ionicons name={"share-social"} size={27} color='#fff'/>
            </TouchableOpacity>

        </View>
    )        
}



const styles = StyleSheet.create({

    container:{
        height:"60%",
        width:"100%",
        flexDirection: 'column',
        // justifyContent: 'center',
        alignItems: 'center',
        // paddingVertical: 5,
        // backgroundColor:"#279a36ff"
    },

    item: {
        alignItems: 'center',
        marginVertical: 15,
    },

    count: {
        color: '#fff',
        fontFamily: "WorkSans_500Medium",
        fontSize: 12,
        marginTop: 2,
    }
})



const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelEngagementBar, handleMemomize);
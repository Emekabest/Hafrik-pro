import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import ReelEngagementBar from "./reelengagementbar";
import AppDetails from "../../helpers/appdetails";
import { TouchableOpacity } from "react-native";
import CalculateElapsedTime from "../../helpers/calculateelapsedtime";
import { Image as ExpoImage } from "expo-image";

const ReelInteractionContainer = ({ user, created, caption, likesCount, commentCount, views }) => {

    return (
        <View style={styles.container}>

            <View style ={styles.interactionContainer}>
                <View style={styles.interactionContainerLeft}>
                    <View style={styles.userInfo}>
                        <Text style={styles.username}>{user?.username}</Text>
                        <Text style={styles.time}> {CalculateElapsedTime(created)} </Text>
                    </View>

                    <View>
                        <Text style={styles.caption}>{caption}</Text>
                    </View>
                    
                </View>
                <View style={styles.interactionContainerRight}>
                    <View style={styles.profileIconWrapper}>
                        <View style={styles.profileIconContainer}>
                            <ExpoImage
                                source={{ uri: user?.avatar }}
                                style={{ width: "100%", height: "100%", }}
                                cachePolicy="memory-disk"
                                contentFit="cover"
                            />
                        </View>
                        <View style={styles.crossIconWrapper}>
                            <TouchableOpacity activeOpacity={1} style={styles.crossIconContainer}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <ReelEngagementBar likesCount={likesCount} commentCount={commentCount} views={views} />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({

    container:{
        height:"100%",
        width:"100%",
        position:"absolute",
        justifyContent:"flex-end"
        // backgroundColor: '#56cdc958',
    },

    interactionContainer:{
        height: '60%',
        width: '100%',
        display:"flex",
        flexDirection:"row",
        // backgroundColor:"#000000a0",

    },

    interactionContainerLeft:{
        height: '100%',
        width: '85%',
        // backgroundColor:"#fff",
        justifyContent: 'flex-end',
        paddingBottom: 20,
        paddingHorizontal: 10,
    },

    interactionContainerRight:{
        height: '100%',
        width: '15%',
    },

    profileIconWrapper: {
        height: "20%",
        width: "100%",
        justifyContent: 'center',
        alignItems: 'center',
        position:"relative",
    },

    profileIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 30,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },

    crossIconWrapper: {
        height: "20%",
        width: "100%",
        position: "absolute",
        bottom: 17,
        left: 11,
    },

    crossIconContainer: {
        width: 40,
        height: 25,
        borderRadius: 10,
        backgroundColor: AppDetails.primaryColor,
        justifyContent: 'center',
        alignItems: 'center',
    },

    username: {
        fontSize: 16,
        fontFamily:"ReadexPro_600SemiBold",
        color: '#fff',
        marginBottom: 5,
    },

    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },

    time: {
        paddingBottom: 5,
        fontSize: 12,
        color: '#a2a2a2ff',
        fontFamily: 'WorkSans_500Medium',
    },

    caption: {
        fontSize: 14,
        color: '#fff',
        fontFamily:"WorkSans_500Medium",
        lineHeight: 20,
    },

})

const handleMemomize = (prevProps, nextProps) => {

}

export default memo(ReelInteractionContainer, handleMemomize);
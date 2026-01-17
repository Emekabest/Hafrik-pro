import { memo } from "react";
import { StyleSheet, View } from "react-native";
import ReelEngagementBar from "./reelengagementbar";


const ReelInteractionContainer = () => {

    return (
        <View style={styles.container}>

            <View style ={styles.interactionContainer}>
                <View style={styles.interactionContainerLeft}>
                    
                </View>
                <View style={styles.interactionContainerRight}>
                    <View style={{height:"20%", width:"100%", backgroundColor:"#000000a0"}}>

                    </View>
                    <ReelEngagementBar />
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
        backgroundColor:"#000000a0",

    },

    interactionContainerLeft:{
        height: '100%',
        width: '85%',
        backgroundColor:"#fff",
    },

    interactionContainerRight:{
        height: '100%',
        width: '15%',
        backgroundColor:"#dcdcdcff",
    },


})

const handleMemomize = (prevProps, nextProps) => {

}

export default memo(ReelInteractionContainer, handleMemomize);
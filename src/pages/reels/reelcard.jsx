import { Dimensions, StyleSheet, View, StatusBar } from "react-native";
import ReelMedia from "./reelmedia";
import ReelInteractionContainer from "./reelinteractioncontainer";
import { memo } from "react";
// import { StatusBar } from "expo-status-bar";


const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const statusBarHeight = Math.floor(StatusBar.currentHeight) || 0;

console.log("Status Bar Height:", statusBarHeight);



const ReelCard = ({ reel }) => {





    return(
        <View style={styles.container}>
            <ReelMedia media={reel.media} />

            <ReelInteractionContainer />
        </View>
    )

}


const styles = StyleSheet.create({

    container:{
        height: SCREEN_HEIGHT - statusBarHeight + 1,
        width: '100%',
        backgroundColor: '#c7a391ff'
    }


})


const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelCard, handleMemomize);
import { Dimensions, StyleSheet, View, StatusBar, Platform } from "react-native";
import ReelMedia from "./reelmedia";
import ReelInteractionContainer from "./reelinteractioncontainer";
import { memo } from "react";
import AppDetails from "../../helpers/appdetails";
// import { StatusBar } from "expo-status-bar";


const { height: SCREEN_HEIGHT } = Dimensions.get("window");


const ReelCard = ({ reel }) => {



    


    return(
        <View style={styles.container}>
            <ReelMedia reelId={reel.id} media={ reel.media} />

            <ReelInteractionContainer />
        </View>
    )

}


const styles = StyleSheet.create({

    container:{
        height: Platform.OS === 'android' ? SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight : SCREEN_HEIGHT,
        width: '100%',
        backgroundColor: '#000000'
    }


})


const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelCard, handleMemomize);
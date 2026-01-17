import { StyleSheet, View } from "react-native";
import ReelMedia from "./reelmedia";
import ReelInteractionContainer from "./reelinteractioncontainer";
import { memo } from "react";


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
        height: "100%",
        width: '100%',
        backgroundColor: '#c7a391ff'
    }


})


const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelCard, handleMemomize);
import { StyleSheet, View } from "react-native";
import ReelMedia from "./reelmedia";
import ReelInteractionContainer from "./reelinteractioncontainer";
import { memo } from "react";


const ReelCard = () => {





    return(
        <View style={styles.container}>
            <ReelMedia />
            <ReelInteractionContainer />
        
        </View>
    )

}


const styles = StyleSheet.create({

    container:{
        height: "100%",
        width: '100%',
        backgroundColor: '#91c7b1ff'
    }


})


const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelCard, handleMemomize);
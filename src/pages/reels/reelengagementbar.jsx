import { memo } from "react";
import { StyleSheet, View } from "react-native";


const ReelEngagementBar = () => {



    return(
        <View style={styles.container}> 


        </View>
    )        
}



const styles = StyleSheet.create({

    container:{
        height:"80%",
        width:"100%",
        backgroundColor:"#279a36ff"
    }
})



const handleMemomize = (prevProps, nextProps) => {

}
export default memo(ReelEngagementBar, handleMemomize);
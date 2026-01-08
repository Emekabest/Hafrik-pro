import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { StyleSheet, Text, View } from "react-native";


const FeedsHeader = ()=>{



    


    return(
        <View style = {styles.containerHeader} >
            <View style = {styles.containerHeaderLeft}>
                <Text style ={{fontSize:17, fontFamily:"ReadexPro_500Medium"}}>Recent Updates</Text>
            </View>
            <View style = {styles.containerHeaderRight}>
                <TouchableOpacity style = {styles.containerHeaderRightExplore}>  
                    <Ionicons name="globe-outline" size={20} color="#000" />
                    <Text style = {{fontSize:12, fontFamily:"ReadexPro_500Medium"}}>Explore by cities</Text>
                </TouchableOpacity>
                <TouchableOpacity style = {styles.containerHeaderRightAll}>
                    <Ionicons name="apps" size={15} />
                    <Text style ={{fontSize:12, fontFamily:"ReadexPro_500Medium"}}>All</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}


const styles = StyleSheet.create({

    container:{
        // paddingHorizontal:10,        
    },

    containerHeader:{
        height:30,
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
        paddingVertical:35,
        paddingHorizontal:10,        

    },

    containerHeaderLeft:{

        width:"45%",
        height:30,

    },

    containerHeaderRight:{

        width:"55%",
        height:25,

        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between"
    },

    containerHeaderRightExplore:{
        height:25,
        width:"65%",
        paddingHorizontal:5,
        backgroundColor:"#e9e9e9ff",
        display:"flex",
        flexDirection:"row",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"space-around",

    },

    containerHeaderRightAll:{
        height:25,
        width:"25%",
        display:"flex",
        flexDirection:"row",
        backgroundColor:"#e9e9e9ff",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"space-around",
        paddingHorizontal:7,

    },

    containerFeeds:{

    }

})

export default FeedsHeader;
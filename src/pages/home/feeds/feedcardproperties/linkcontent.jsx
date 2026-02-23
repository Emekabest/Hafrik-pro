import { Linking, StyleSheet, View } from "react-native";
import { Text } from "react-native";
import pharseLinkFromText from "../../../../helpers/linkparser"
import { Link } from "@react-navigation/native";
import LinkPreview from "./linkpreview";
import AppDetails from "../../../../helpers/appdetails";


const LinkContent = ({feed}) => {


    const {text, url } = pharseLinkFromText(feed.text);

    return(
        
        <View>
             <Text style={styles.url} onPress={() => Linking.openURL(url)}>
                {url}
            </Text>
            {
            url && 
                
                <View style={{ height:200, width:"100%", backgroundColor:"lightgray", marginTop: 5, borderRadius: 8, overflow: 'hidden' }}>
                    <LinkPreview url={url}  />
                </View>
            }
        </View>
    )
}

const styles = StyleSheet.create({
    url:{
        paddingBottom:5,
        fontSize:15,
        fontFamily:AppDetails.fontFamily.body,
        color:AppDetails.linkColor,
    },
})

export default LinkContent; 
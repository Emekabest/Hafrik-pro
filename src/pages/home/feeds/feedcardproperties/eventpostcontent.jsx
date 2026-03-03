import { memo } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import {Image as ExpoImage} from 'expo-image';
import AppDetails from "../../../../helpers/appdetails";
import CleanText from "../../../../helpers/cleantext";
import { Colors } from '../../../../theme/colors';


const EventPostContent = ({ context }) => {

    const contextCover = context?.cover || null;
    const contextTitle = context?.title || "Untitled event";
    
    return(
        <View style = {styles.container}>
            <View style = {styles.eventCoverContainer}>
                <ExpoImage 
                    style={{height:"100%", width:"100%"}}
                    source={{uri: contextCover}}
                    cachePolicy="memory-disk"
                    contentFit="contain"
                />
            </View>


            <View style={styles.eventDetails}>
                <Text style={styles.eventTitle} numberOfLines={2}>{CleanText(contextTitle) || 'Untitled event'}</Text>

                <Text style={styles.eventSubtitle} numberOfLines={1}>{/* reserved for date/location if available */}</Text>

               
            </View>

        </View>
    )
}


const styles = StyleSheet.create({

    container:{
        height:200,
        width:"100%",
        // borderWidth:0.5,
        borderColor:Colors.neutral205,
        borderRadius:10,
    },

    eventCoverContainer:{
        height:"50%",
        width:"100%",
        backgroundColor:Colors.black,
        borderRadius:10,
        overflow:"hidden",
    },
    
    eventDetails: {
        // height: "60%",
        paddingVertical: 12,
        // justifyContent: 'space-between',
    },
    eventTitle: {
        fontSize: 15,
        fontFamily: AppDetails.fontFamily.heading,
        color: Colors.neutral900,
        marginBottom: 6,
    },
    eventSubtitle: {
        color: Colors.neutral500,
        fontSize: 13,
        marginBottom: 10,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
    },
    primaryButton: {
        backgroundColor: AppDetails.primaryColor || Colors.linkBlueAlt,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 22,
    },
    primaryButtonText: {
        color: Colors.white,
        fontFamily: AppDetails.fontFamily.body,
    },
    ghostButton: {
        borderWidth: 1,
        borderColor: Colors.neutral220,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 22,
        marginLeft: 8,
    },
    ghostButtonText: {
        color: Colors.neutral700,
        fontFamily: AppDetails.fontFamily.body,
    },

})


const handleMemomize = (prevProps, nextProps) => {
    if (prevProps?.context?.id !== nextProps?.context?.id) return false;
    if (prevProps?.context?.title !== nextProps?.context?.title) return false;
    return true;
}

export default memo(EventPostContent, handleMemomize);
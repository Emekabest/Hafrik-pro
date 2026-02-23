import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppDetails from "../../../../helpers/appdetails";
import SvgIcon from "../../../../assl.js/svg/svg";
import { Link } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CleanText from "../../../../helpers/cleantext";
import getActionText from "../../../../helpers/getactiontext";
import CalculateElapsedTime from "../../../../helpers/calculateelapsedtime";
import { memo, useMemo, useState, useCallback } from "react";
import OptionsModal from "../options.jsx";


const UserDetails = ({ feed, source, fullNameFontSize = 14,  }) => {
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);

    // Memoize expensive calculations
    const username = useMemo(() => CleanText(feed.user.username), [feed.user.username]);
    const elapsedTime = useMemo(() => CalculateElapsedTime(feed.created), [feed.created]);
    const actionText = useMemo(() => getActionText(feed), [feed]);
    const contextName = useMemo(() => {
        if (feed.context?.type === "group") return CleanText(feed.context.name);
        if (feed.context?.type === "event") return CleanText(feed.context.title);
        return null;
    }, [feed.context]);

    return (
        <View style={styles.firstSection}>
            <View style={styles.nameSection}>
                <Text style={styles.userDetails}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.userFullname, { fontSize: fullNameFontSize }]}>
                        {feed.user.full_name}
                        
                    </Text>
                    {feed.user.verified && (
                        <View style={styles.verifiedIconContainer}>
                            <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />
                        </View>
                    )}
                    <Text style={styles.userUsername}> @{username}</Text>
                    <Text style={styles.actionText}>{actionText}</Text>

                    {(feed.context?.type === "group" || feed.context?.type === "event") && (
                        <View style={styles.feedContextArrowContainer}>
                            <SvgIcon name="arrow_right" width={15} height={15} color="#787878ff" />
                        </View>
                    )}

                    {contextName && (
                        <Link to={{ screen: 'GroupScreen', params: { contextId: feed.context.id, contextType: feed.context.type } }} style={styles.feedContextContainer}>
                            <Text style={styles.feedContextText}>{contextName}</Text>
                        </Link>
                    )}
                </Text>
                <Text style={styles.elapsedTime}>{elapsedTime}</Text>
            </View>

            {source === "feedcard" && (
                <TouchableOpacity style={styles.options} activeOpacity={0.7} onPress={() => setOptionsModalVisible(true)}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#787878ff" />
                </TouchableOpacity>
            )}

            <OptionsModal
                visible={optionsModalVisible}
                postId={feed.id}
                onClose={() => setOptionsModalVisible(false)}
            />
        </View>
    );
};


const styles = StyleSheet.create({
        firstSection:{
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        marginBottom:5,
    },

        nameSection:{
        width:"93%",
        display:"flex",
        flexDirection:"column",
        justifyContent: "center",
        // backgroundColor:"green"
    },

    userFullname:{color:"#000", fontFamily:AppDetails.fontFamily.heading, fontSize:15 },

    verifiedIconContainer:{ transform: [{ translateY: 6}, { translateX: 2 }], marginHorizontal: 3, marginRight:5 },

    userUsername:{fontSize: 12, color: 'gray', fontFamily:AppDetails.fontFamily.bodyItalic},
    
    actionText:{color: "#333", fontFamily:AppDetails.fontFamily.body},

    feedContextArrowContainer:{
        height:10,
        width:15,
        paddingHorizontal:2,
        position:"absolute",
        top:10,
        
    },

    
    feedContextText:{
        fontSize: 14,
        marginLeft: 4,
        fontFamily:AppDetails.fontFamily.body,
        color:"#0b8557",
    },  

    elapsedTime:{color:"#787878ff", fontSize: 12, fontFamily:AppDetails.fontFamily.body},

        options:{
        width:"7%",
        alignItems:"flex-end",
    },

    optionsIcon:{
        color:"#333",
        fontWeight:"bold",
    },


})

export default memo(UserDetails, (prev, next) => {
    return (
        prev.feed.id === next.feed.id &&
        prev.feed.user.full_name === next.feed.user.full_name &&
        prev.source === next.source
    );
});
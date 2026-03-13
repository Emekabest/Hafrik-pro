import { Image, StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput } from "react-native";
import AppDetails from "../../helpers/appdetails";
import { useState, useEffect, memo } from "react";
import SvgIcon from "../../assl.js/svg/svg";
import useStore from "../../repository/store";
import { Colors } from '../../theme/colors';

const bottomContainerIcons = [
    { id: 1, name: "photos" },
    { id: 2, name: "album" },
    { id: 3, name: "music" },
    { id: 4, name: "poll" },
    { id: 5, name: "video" },
    { id: 6, name: "location" },
];

const bottomLeftIconsSize = 19;

const PostFeed = () => {
    const openCreateMenu = useStore((state) => state.openCreateMenu);
    const userAvatar     = useStore((state) => state.userAvatar);
    const [avatarUrl, setAvatarUrl] = useState(userAvatar);

    useEffect(() => { setAvatarUrl(userAvatar); }, [userAvatar]);

    return (
        <TouchableOpacity style={styles.container} activeOpacity={1} onPress={openCreateMenu}>
            {/* Avatar + placeholder text */}
            <View style={styles.containerTop}>
                <View style={styles.containerTopImage}>
                    <Image
                        source={{ uri: avatarUrl }}
                        style={{ height: "100%", width: "100%" }}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.containerTopTextContainer}>
                    <TextInput
                        style={styles.containerTopTextContainer_Input}
                        placeholder={`What is on your mind? #Hashtag.. \n @Mention.. Link..`}
                        placeholderTextColor={Colors.neutral405}
                        multiline={true}
                        editable={false}
                        pointerEvents="none"
                    />
                </View>
            </View>

            {/* Bottom toolbar — purely visual, non-interactive */}
            <View style={styles.containerBottom} pointerEvents="none">
                <View style={styles.containerBottomLeft}>
                    <FlatList
                        data={bottomContainerIcons}
                        horizontal
                        scrollEnabled={false}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.containerBottomLeftIcons}>
                                <SvgIcon
                                    name={item.name}
                                    width={bottomLeftIconsSize}
                                    height={bottomLeftIconsSize}
                                    color={AppDetails.primaryColor}
                                />
                            </View>
                        )}
                    />
                </View>
                <View style={styles.containerBottomRight}>
                    <View style={[styles.postButton, { opacity: 0.5 }]}>
                        <Text style={styles.postButtonText}>Post</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 10,
        minHeight: 180,
        backgroundColor: Colors.white,
        borderRadius: 10,
        overflow: "hidden",
    },
    containerTop: {
        flex: 1,
        flexDirection: "row",
        paddingHorizontal: 15,
        paddingTop: 15,
    },
    containerTopImage: {
        height: 50,
        width: 50,
        borderRadius: 50,
        overflow: "hidden",
    },
    containerTopTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    containerTopTextContainer_Input: {
        fontSize: 15,
        color: Colors.black,
        fontFamily: AppDetails.fontFamily.body,
        textAlignVertical: "center",
    },
    containerBottom: {
        height: 60,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral150,
    },
    containerBottomLeft: {
        height: "100%",
        width: "70%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    containerBottomLeftIcons: {
        marginLeft: 17,
    },
    containerBottomRight: {
        height: "100%",
        width: "30%",
        justifyContent: "center",
        alignItems: "center",
    },
    postButton: {
        backgroundColor: AppDetails.primaryColor,
        height: 40,
        width: "85%",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 50,
    },
    postButtonText: {
        color: Colors.white,
        fontFamily: "WorkSans_600SemiBold",
    },
});

export default memo(PostFeed);

import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";
import CalculateElapsedTime from "../../helpers/calculateelapsedtime";

const SearchPostCard = ({ item, onPress }) => {
    const MEDIA_HEIGHT = 400;
    const MEDIA_WIDTH = 250;
    
    const screenWidth = Dimensions.get("window").width;
    const leftOffset = 10 + ((screenWidth - 20) * 0.13) + 5;
    const rightOffset = 15;
    const imageWidth = screenWidth - leftOffset - rightOffset;

    const author = item?.meta?.author || {};
    const thumb = item?.thumbnail || item?.media?.thumbs?.[0] || item?.media?.thumb || null;
    const time = item?.meta?.time || item?.created || null;
    let timeStr = null;
    if (time !== null && time !== undefined) {
        if (typeof time === 'number') {
            // convert unix timestamp (seconds) to ISO string
            timeStr = new Date(time * 1000).toISOString();
        } else {
            timeStr = String(time);
        }
    }

    // scale media using provided media design size

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.container}>
            <View style={styles.containerLeft}>
                <View style={styles.ImageContainer}>
                    <Image
                        source={{ uri: author.avatar || thumb }}
                        style={{ height: "100%", width: "100%" }}
                    />
                </View>
            </View>

            <View style={styles.containerRight}>
                <View style={styles.firstSection}>
                    <View style={styles.nameSection}>
                        <Text numberOfLines={1} style={styles.nameText}>{author.name || item.title}</Text>
                        <Text style={styles.metaText} numberOfLines={1}>
                            {author.username ? `@${author.username}` : ''} {timeStr ? `· ${CalculateElapsedTime(timeStr)}` : ''}
                        </Text>
                    </View>
                </View>

                {item.title ? (
                    <Text style={styles.titleText} numberOfLines={2}>{item.title}</Text>
                ) : null}

                {item.subtitle ? (
                    <Text style={styles.subtitleText} numberOfLines={2}>{item.subtitle}</Text>
                ) : null}

                {thumb ? (
                    <Image source={{ uri: thumb }} style={[styles.thumbnail, { width: MEDIA_WIDTH, height: MEDIA_HEIGHT }]} />
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: "#efefefff",
        width: "100%",
        padding: 10,
        flexDirection: "row",
        backgroundColor: '#fff'
    },
    containerLeft: {
        height: "100%",
        width: "13%",
    },
    containerRight: {
        height: "100%",
        width: "87%",
        paddingHorizontal: 5,
    },
    ImageContainer: {
        height: 50,
        width: "100%",
        borderRadius: 50,
        overflow: "hidden",
        backgroundColor: "#e9e9e9ff"
    },
    firstSection: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    nameSection: {
        width: "100%",
        flexDirection: "column",
        justifyContent: "center",
    },
    nameText: {
        color: "#000",
        fontFamily: "WorkSans_600SemiBold",
        fontSize: 15,
    },
    metaText: {
        color: "#787878ff",
        fontSize: 12,
        fontFamily: "WorkSans_400Regular",
        marginTop: 2,
    },
    titleText: {
        fontSize: 14,
        color: "#000",
        fontFamily: "WorkSans_400Regular",
        marginTop: 6,
    },
    subtitleText: {
        fontSize: 13,
        color: "#888",
        fontFamily: "WorkSans_400Regular",
        marginTop: 4,
    },
    thumbnail: {
        height: 180,
        borderRadius: 8,
        marginTop: 10,
        backgroundColor: '#b1aaaaff'
    }
});

export default React.memo(SearchPostCard);

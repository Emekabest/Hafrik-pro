import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList } from "react-native";
import { Image as ExpoImage } from "expo-image";
import AppDetails from "../../../../../helpers/appdetails";

const { width } = Dimensions.get("window");

// Define layout constants for the carousel
const ITEM_SPACING = 10;
const ITEM_WIDTH = width * 0.9; // Each item will take up 90% of the screen width
const IMAGE_HEIGHT = ITEM_WIDTH; // Keep it square
const SIDECARD_SPACING = (width - ITEM_WIDTH) / 2; // Space on the sides to center the items




const CommentProductItem = ({ post }) => {
    const media = post?.media || [];

    let product = null;
    let images = [];

    if (post?.type === 'product' && media.length && media[0].images) {
        product = media[0];
        images = Array.isArray(product.images) ? product.images : [];
    } else {

        images = media
            .map((m) => (m && typeof m === 'object' ? (m.url || m.media || m.uri) : m))
            .filter(Boolean);
        product = product || (media[0] && media[0].type === 'product' ? media[0] : { name: post.text || '', location: '' });
    }



        if (!images || images.length === 0) return null;
            const [index, setIndex] = useState(0);

            const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length) {
            setIndex(viewableItems[0].index ?? 0);
        }
    });
    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });


    const productTitle = product.name || "Product";
    const productPrice = product.price || "0.00";
    const productQuantity = product.quantity || "0";
    const productLocation = product.location || "Unknown";



    return (




        <View style={styles.card}>
        
            <FlatList
                data={images}
                keyExtractor={(uri, i) => {
                    if (typeof uri === 'string') return `${post.id}-${i}-${uri.substring(uri.length-8)}`;
                    return `${post.id}-${i}`;
                }}
                horizontal
                // nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingHorizontal: SIDECARD_SPACING }} // Add padding to center first/last items
                onViewableItemsChanged={onViewRef.current}
                viewabilityConfig={viewConfigRef.current}
                snapToInterval={ITEM_WIDTH + ITEM_SPACING} // Snap to the width of an item + its margin
                decelerationRate="normal"
                renderItem={({ item }) => {
                    const uri = typeof item === 'string' ? item : item.url || item.uri || '';
                    return (
                        <ExpoImage
                            source={{ uri }}
                            style={styles.image}
                            contentFit="cover"

                        />
                    );
                }}
                style={styles.carousel}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                windowSize={3} // Increase window size for smoother scrolling
            />

            <View style={styles.dots} pointerEvents="none">
                {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>

            <View style={styles.body}>
                <Text numberOfLines={2} style={styles.title}>
                    {productTitle}
                </Text>
                <View style={styles.row}>
                    <Text style={styles.price}>${productPrice}</Text>
                    <Text style={styles.qty}>Stock: {productQuantity}</Text>
                </View>
                <Text numberOfLines={1} style={styles.location}>
                    {productLocation}
                </Text>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.buy}>
                    <Text style={styles.buyText}>Buy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.view}>
                    <Text style={styles.viewText}>View</Text>
                </TouchableOpacity>

                <View style={styles.flexSpacer} />

            </View>
        </View>
    );
};



const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginVertical: 8,
        width: '100%',
    },
    
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#eee",
    },
    headerText: {
        marginLeft: 10,
        flex: 1,
    },
    username: {
        fontWeight: "600",
        fontSize: 14,
        color: "#111",
    },
    usernameRow: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    usernameFull: {
        fontWeight: "700",
        fontSize: 16,
        color: "#111",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
    },
    headerMeta: {
        marginLeft: 10,
        flex: 1,
    },
    meta: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    carousel: {
        // backgroundColor: "#000",
    },
    image: {
        width: ITEM_WIDTH, // Use the calculated item width
        height: IMAGE_HEIGHT,
        backgroundColor: "#000",
        borderRadius: 8, // Add a slight border radius to the images
        marginHorizontal: ITEM_SPACING / 2, // Add half the spacing on each side
    },
    dots: {
        position: "absolute",
        alignSelf: 'center',
        bottom: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.4)",
        marginRight: 6,
    },
    dotActive: {
        backgroundColor: "#fff",
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    body: {
        padding: 12,
        paddingTop: 10,
    },
    title: {
        fontSize: 16,
        fontFamily:AppDetails.fontFamily.heading,
        
        marginBottom: 6,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    price: {
        fontSize: 16,
        fontWeight: "700",
        color: AppDetails.primaryColor,
    },
    qty: {
        fontSize: 12,
        color: "#666",
    },
    location: {
        marginTop: 6,
        fontSize: 12,
        color: "#777",
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#f2f2f2",
    },
    buy: {
        backgroundColor: AppDetails.primaryColor,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    buyText: {
        color: "#fff",
        fontWeight: "700",
    },
    view: {
        marginLeft: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    viewText: {
        color: "#333",
        fontWeight: "600",
    },
    flexSpacer: { flex: 1 },
    counts: {
        fontSize: 12,
        color: "#666",
    },
});

export default CommentProductItem;
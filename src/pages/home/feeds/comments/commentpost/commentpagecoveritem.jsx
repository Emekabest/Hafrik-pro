import React from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Image as ExpoImage } from "expo-image";

const { width } = Dimensions.get("window");
const COVER_HEIGHT = Math.round(width * 0.52);

const CommentPageCoverItem = ({ post }) => {
    const cover = (post?.media && post.media[0] && (post.media[0].url || post.media[0].source)) || null;
    const avatar = post?.user?.avatar || null;
    const name = post?.user?.full_name || post?.user?.username || '';

    return (
        // <View style={styles.container}>
        //     {cover ? (
        //         <ExpoImage source={{ uri: cover }} style={styles.cover} contentFit="contain" />
        //     ) : (
        //         <View style={[styles.cover, styles.coverPlaceholder]} />
        //     )}
        // </View>

        <View style={styles.container}>
            {cover ? (
                <ExpoImage source={{ uri: cover }} style={styles.cover} contentFit="contain" />
            ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
            )}
        </View>


    );
};

const styles = StyleSheet.create({
    container: { width:"100%" , height: COVER_HEIGHT, backgroundColor: '#000', borderRadius:10, overflow:'hidden' },
    cover: { width: "100%", height: COVER_HEIGHT, backgroundColor: '#000' },
    coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'space-between', padding: 12 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
    userText: { marginLeft: 10, maxWidth: width - 160 },
    name: { color: '#fff', fontSize: 16, fontWeight: '700' },
    meta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
    actionButton: { backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    actionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    bottomRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 14 },
    counts: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginRight: 12 },
});

export default CommentPageCoverItem;
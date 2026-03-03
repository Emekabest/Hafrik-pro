

import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import CleanText from '../../../../../helpers/cleantext';
import { Colors } from '../../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width } = Dimensions.get("window");
const COVER_HEIGHT = Math.round(width * 0.7);


const CommentEventPostCoverContent = ({ post }) => {
    if (!post) return null;

    const context = post.context || {};
    const rawTitle = context.title || "";
    const title = CleanText(rawTitle);

    const cover = post.media && post.media[0] && post.media[0].url;

    return (
        <View style={styles.card}>
            {cover ? (
                <ExpoImage source={{ uri: cover }} style={styles.cover} contentFit="cover" />
            ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
            )}

            <View style={styles.overlay} pointerEvents="none">
                <Text style={styles.title}>{title || 'Untitled event'}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        // width,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: Colors.black,
        // marginVertical: 8,
    },
    cover: {
        width,
        height: COVER_HEIGHT,
        backgroundColor: Colors.black,
    },
    coverPlaceholder: {
        backgroundColor: Colors.neutral900,
    },
    overlay: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: withOpacity(Colors.black, 0.35),
    },
    title: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 20,
        flexWrap: 'wrap',
    },
});

export default CommentEventPostCoverContent;
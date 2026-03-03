import React, { memo, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const ACCENT    = Colors.primary;
const BRAND     = Colors.primaryDark;
const TEXT_BODY = Colors.textBodyIndigo;
const TEXT_MUTED = Colors.mutedBlueGrayAlt;
const BORDER    = Colors.borderLight;

const ArticlePostContent = ({ feed }) => {
    const navigation = useNavigation();
    const payload = feed?.payload;
    if (!payload) return null;

    const coverUrl = payload.image || payload.cover;
    const title    = payload.title;
    const snippet  = payload.snippet;
    const tags     = payload.tags;

    const handlePress = useCallback(() => {
        navigation.navigate('ArticleDetails', { postId: feed.id, title: payload.title });
    }, [navigation, feed.id, payload.title]);

    return (
        <TouchableOpacity activeOpacity={0.88} onPress={handlePress} style={styles.card}>
            {/* Cover image */}
            <View style={styles.imageWrapper}>
                {coverUrl ? (
                    <ExpoImage
                        source={{ uri: coverUrl }}
                        style={styles.coverImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={180}
                    />
                ) : (
                    <View style={styles.imageFallback}>
                        <Ionicons name="document-text-outline" size={32} color={withOpacity(Colors.white, 0.5)} />
                    </View>
                )}
                {tags ? (
                    <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{tags}</Text>
                    </View>
                ) : null}
            </View>

            {/* Body */}
            <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{title}</Text>
                {snippet ? (
                    <Text style={styles.snippet} numberOfLines={2}>{snippet}</Text>
                ) : null}
                <View style={styles.cta}>
                    <Text style={styles.ctaText}>Read Article</Text>
                    <Ionicons name="arrow-forward" size={13} color={ACCENT} />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
        backgroundColor: Colors.white,
    },
    imageWrapper: {
        width: '100%',
        height: 180,
        backgroundColor: Colors.surfaceFrost,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    imageFallback: {
        flex: 1,
        backgroundColor: BRAND,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: ACCENT,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    tagText: {
        color: Colors.white,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    body: {
        padding: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_BODY,
        lineHeight: 21,
    },
    snippet: {
        fontSize: 13,
        color: TEXT_MUTED,
        lineHeight: 19,
        marginTop: 4,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 4,
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '600',
        color: ACCENT,
    },
});

const handleMemomize = (prevProps, nextProps) => {
    if (prevProps.feed?.id !== nextProps.feed?.id) return false;
    const prevPayload = prevProps.feed?.payload ?? {};
    const nextPayload = nextProps.feed?.payload ?? {};
    if (prevPayload.image !== nextPayload.image) return false;
    if (prevPayload.cover !== nextPayload.cover) return false;
    if (prevPayload.title !== nextPayload.title) return false;
    if (prevPayload.snippet !== nextPayload.snippet) return false;
    if (prevPayload.tags !== nextPayload.tags) return false;
    return true;
};

export default memo(ArticlePostContent, handleMemomize);

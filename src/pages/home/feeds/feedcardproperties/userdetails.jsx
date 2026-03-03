import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppDetails from "../../../../helpers/appdetails";
import SvgIcon from "../../../../assl.js/svg/svg";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CleanText from "../../../../helpers/cleantext";
import getActionText from "../../../../helpers/getactiontext";
import CalculateElapsedTime from "../../../../helpers/calculateelapsedtime";
import { memo, useMemo, useState, useCallback } from "react";
import OptionsModal from "../options.jsx";
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};



const UserDetails = ({ feed, source, fullNameFontSize = 14, onOwnerPress, postContext = null, onPostContextPress }) => {
    const navigation = useNavigation();
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);

    const elapsedTime = useMemo(() => CalculateElapsedTime(feed.created), [feed.created]);
    const actionText  = useMemo(() => getActionText(feed), [feed]);
    const contextName = useMemo(() => {
        if (feed.context?.type === "group") return CleanText(feed.context.name);
        if (feed.context?.type === "event") return CleanText(feed.context.title);
        return null;
    }, [feed.context]);

    const handleContextPress = useCallback(() => {
        if (!feed.context?.id) return;
        navigation.navigate('GroupScreen', {
            contextId:   feed.context.id,
            contextType: feed.context.type,
        });
    }, [navigation, feed.context]);

    return (
        <View style={styles.firstSection}>
            <View style={styles.nameSection}>
                {/* ── Author name row ─────────────────────────────────────── */}
                <TouchableOpacity activeOpacity={0.75} onPress={onOwnerPress}>
                    <View style={styles.nameRow}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.userFullname, { fontSize: fullNameFontSize }]}
                        >
                            {feed.user.full_name}
                        </Text>

                        {feed.user.verified && (
                            <View style={styles.verifiedIconContainer}>
                                <SvgIcon name="verified" width={15} height={15} color={AppDetails.primaryColor} />
                            </View>
                        )}

                        {!!actionText && (
                            <Text style={styles.actionText}>{actionText}</Text>
                        )}
                    </View>

                    {/* ── Old context (group / event from feed.context) ──── */}
                    {contextName ? (
                        <TouchableOpacity
                            style={styles.contextRow}
                            activeOpacity={0.75}
                            onPress={handleContextPress}
                        >
                            <Ionicons name="arrow-forward" size={11} color={MUTED} />
                            <Text style={styles.feedContextText}>{contextName}</Text>
                        </TouchableOpacity>
                    ) : null}
                </TouchableOpacity>

                {/* ── Modern "Posted in / Posted via" pill ─────────────── */}
                {!!postContext && (
                    <TouchableOpacity
                        style={styles.postedInRow}
                        activeOpacity={0.75}
                        onPress={onPostContextPress}
                    >
                        <Ionicons
                            name={postContext.type === 'page' ? 'storefront-outline' : 'people-outline'}
                            size={11}
                            color={ACCENT}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.postedInPrefix}>{postContext.label}</Text>
                        {postContext.avatar ? (
                            <Image source={{ uri: postContext.avatar }} style={styles.postedInAvatar} />
                        ) : (
                            <View style={[styles.postedInAvatar, styles.postedInAvatarFallback]}>
                                <Ionicons
                                    name={postContext.type === 'page' ? 'document-text-outline' : 'people-outline'}
                                    size={10}
                                    color={Colors.mutedBlueGray}
                                />
                            </View>
                        )}
                        <Text style={styles.postedInTitle} numberOfLines={1}>{postContext.title}</Text>
                        <Ionicons name="chevron-forward" size={10} color={ACCENT} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                )}

                <Text style={styles.elapsedTime}>{elapsedTime}</Text>
            </View>

            {source === "feedcard" && (
                <TouchableOpacity
                    style={styles.options}
                    activeOpacity={0.7}
                    onPress={() => setOptionsModalVisible(true)}
                >
                    <Ionicons name="ellipsis-horizontal" size={20} color={withOpacity(Colors.neutral430, 1.0)} />
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;

const styles = StyleSheet.create({
    firstSection: {
        flexDirection:    'row',
        justifyContent:   'space-between',
        marginBottom:     5,
    },

    nameSection: {
        width:          '93%',
        flexDirection:  'column',
        justifyContent: 'center',
    },

    // ── Name row (full name + verified + action) ─────────────────────────────
    nameRow: {
        flexDirection: 'row',
        alignItems:    'center',
        flexWrap:      'wrap',
        gap:           4,
    },

    userFullname: {
        color:      Colors.black,
        fontFamily: AppDetails.fontFamily.heading,
        fontSize:   15,
        flexShrink: 1,
    },

    verifiedIconContainer: {
        marginTop: 1,
    },

    actionText: {
        color:      Colors.neutral700,
        fontFamily: AppDetails.fontFamily.body,
        fontSize:   13,
    },

    // ── Old-style context row (group / event from feed.context) ──────────────
    contextRow: {
        flexDirection: 'row',
        alignItems:    'center',
        marginTop:     3,
        gap:           4,
    },

    feedContextText: {
        fontSize:   12,
        fontFamily: AppDetails.fontFamily.body,
        color:      Colors.greenDeep,
        fontWeight: '600',
    },

    // ── Modern "Posted in / via" pill ────────────────────────────────────────
    postedInRow: {
        marginTop:      4,
        flexDirection:  'row',
        alignItems:     'center',
        alignSelf:      'flex-start',
        backgroundColor: Colors.infoSurfaceAlt,
        borderRadius:   20,
        paddingHorizontal: 8,
        paddingVertical:   3,
        maxWidth:       '100%',
    },

    postedInPrefix: {
        color:      MUTED,
        fontSize:   11,
        fontFamily: AppDetails.fontFamily.body,
        marginRight: 5,
    },

    postedInAvatar: {
        width:        16,
        height:       16,
        borderRadius: 8,
        marginRight:  4,
    },

    postedInAvatarFallback: {
        backgroundColor: Colors.borderLight,
        alignItems:      'center',
        justifyContent:  'center',
    },

    postedInTitle: {
        color:      ACCENT,
        fontSize:   11,
        fontFamily: AppDetails.fontFamily.body,
        fontWeight: '700',
        flexShrink: 1,
    },

    elapsedTime: {
        color:      withOpacity(Colors.neutral430, 1.0),
        fontSize:   12,
        fontFamily: AppDetails.fontFamily.body,
        marginTop:  3,
    },

    options: {
        width:       '7%',
        alignItems: 'flex-end',
    },
});

export default memo(UserDetails, (prev, next) => {
    return (
        prev.feed.id                 === next.feed.id                 &&
        prev.feed.user.full_name     === next.feed.user.full_name     &&
        prev.feed.user.verified      === next.feed.user.verified      &&
        prev.source                  === next.source                  &&
        prev.postContext?.id         === next.postContext?.id         &&
        prev.postContext?.type       === next.postContext?.type       &&
        prev.postContext?.title      === next.postContext?.title      &&
        prev.postContext?.avatar     === next.postContext?.avatar     &&
        prev.onOwnerPress            === next.onOwnerPress            &&
        prev.onPostContextPress      === next.onPostContextPress
    );
});

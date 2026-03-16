import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppDetails from "../../../../helpers/appdetails";
import SvgIcon from "../../../../assl.js/svg/svg";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CalculateElapsedTime from "../../../../helpers/calculateelapsedtime";
import { memo, useMemo, useState } from "react";
import OptionsModal from "../options.jsx";
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;

const UserDetails = ({ feed, source, fullNameFontSize = 14, onOwnerPress, postContext = null, onPostContextPress, feelingText, privacyIcon }) => {
    const navigation = useNavigation();
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);

    const elapsedTime = useMemo(() => CalculateElapsedTime(feed.created), [feed.created]);

    // Context from feed.context (legacy group / event on same post object)
    const legacyContext = useMemo(() => {
        if (postContext) return null; // modern postContext takes priority
        if (feed.context?.type === "group") return { type: 'group', name: feed.context.name, id: feed.context.id };
        if (feed.context?.type === "event") return { type: 'event', name: feed.context.title, id: feed.context.id };
        return null;
    }, [feed.context, postContext]);

    const handleLegacyContextPress = () => {
        if (!legacyContext?.id) return;
        navigation.navigate('GroupScreen', {
            contextId:   legacyContext.id,
            contextType: legacyContext.type,
        });
    };

    // Resolve which context to show for the "posted in/via" sub-line
    const ctx = postContext || (legacyContext ? {
        type:  legacyContext.type,
        label: legacyContext.type === 'group' ? 'Posted in' : 'Posted in',
        title: legacyContext.name,
        id:    legacyContext.id,
        avatar: null,
    } : null);

    const handleCtxPress = postContext ? onPostContextPress : handleLegacyContextPress;

    return (
        <View style={styles.firstSection}>
            <View style={styles.nameSection}>

                {/* ── Line 1: Full name + verified badge ── */}
                <TouchableOpacity activeOpacity={0.75} onPress={onOwnerPress} style={styles.nameRow}>
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

                    {!!feelingText && (
                        <Text style={styles.actionText}>{feelingText}</Text>
                    )}
                </TouchableOpacity>

                {/* ── Line 2: "posted" / "posted in Group" / "posted via Page" ── */}
                <View style={styles.postedRow}>
                    <Text style={styles.postedText}>posted</Text>

                    {ctx && ctx.type !== 'page' && !!ctx.title && (
                        <>
                            <Text style={styles.postedText}>
                                {ctx.type === 'group' ? ' in ' : ' in '}
                            </Text>
                            <TouchableOpacity onPress={handleCtxPress} activeOpacity={0.75}>
                                <Text style={styles.contextTitle} numberOfLines={1}>{ctx.title}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* ── Line 3: Timestamp + privacy ── */}
                <View style={styles.elapsedRow}>
                    <Text style={styles.elapsedTime}>{elapsedTime}</Text>
                    {!!privacyIcon && (
                        <Ionicons name={privacyIcon} size={11} color={withOpacity(Colors.neutral430, 1.0)} style={{ marginLeft: 6 }} />
                    )}
                </View>
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

    // ── Line 1: name row ──────────────────────────────────────────────────────
    nameRow: {
        flexDirection: 'row',
        alignItems:    'center',
        flexWrap:      'wrap',
        gap:           4,
        flex:          1,
        minWidth:      0,
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

    // ── Line 2: "posted [in Group]" ───────────────────────────────────────────
    postedRow: {
        flexDirection: 'row',
        alignItems:    'center',
        flexWrap:      'wrap',
        marginTop:     2,
    },

    postedText: {
        color:      MUTED,
        fontSize:   12,
        fontFamily: AppDetails.fontFamily.body,
    },

    contextTitle: {
        color:      ACCENT,
        fontSize:   12,
        fontWeight: '700',
        fontFamily: AppDetails.fontFamily.body,
    },

    // ── Line 3: elapsed + privacy ─────────────────────────────────────────────
    elapsedRow: {
        flexDirection: 'row',
        alignItems:    'center',
        marginTop:     3,
    },

    elapsedTime: {
        color:      withOpacity(Colors.neutral430, 1.0),
        fontSize:   12,
        fontFamily: AppDetails.fontFamily.body,
    },

    options: {
        width:       '7%',
        alignItems: 'flex-end',
    },
});

export default memo(UserDetails, (prev, next) => {
    return (
        prev.feed.id                   === next.feed.id                   &&
        prev.feed.user.full_name       === next.feed.user.full_name       &&
        prev.feed.user.verified        === next.feed.user.verified        &&
        prev.source                    === next.source                    &&
        prev.postContext?.id           === next.postContext?.id           &&
        prev.postContext?.type         === next.postContext?.type         &&
        prev.postContext?.title        === next.postContext?.title        &&
        prev.onOwnerPress              === next.onOwnerPress              &&
        prev.onPostContextPress        === next.onPostContextPress        &&
        prev.feelingText               === next.feelingText               &&
        prev.privacyIcon               === next.privacyIcon
    );
});

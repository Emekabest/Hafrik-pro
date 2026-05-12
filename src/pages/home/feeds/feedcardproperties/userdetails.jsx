import { StyleSheet, Text, TouchableOpacity, View, Animated } from "react-native";
import AppDetails from "../../../../helpers/appdetails";
import SvgIcon from "../../../../assl.js/svg/svg";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import moment from 'moment';
import { memo, useMemo, useState, useRef, useCallback } from "react";
import OptionsModal from "../options.jsx";
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;

const UserDetails = ({ feed, source, fullNameFontSize = 14, onOwnerPress, postContext = null, onPostContextPress, hidePostContextLine = false, feelingText, privacyIcon, onEdit, onDelete, isOwner = false, onFollow }) => {
    const navigation = useNavigation();
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);

    const elapsedTime = useMemo(() => feed.created ? moment(feed.created).fromNow() : '', [feed.created]);

    // ── Follow state ────────────────────────────────────────────────────────────
    // Show "Follow" for real user posts not yet followed (API may return false or 0)
    const isUserEntity  = (feed?.user?.entity || 'user').toLowerCase() === 'user';
    const notFollowing  = feed?.user?.is_following === false || feed?.user?.is_following === 0;
    const showFollow    = (
        source === 'feedcard' &&
        !isOwner &&
        !!onFollow &&
        isUserEntity &&
        notFollowing
    );
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pressIn   = useCallback(() => Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, tension: 200, friction: 8 }).start(), [scaleAnim]);
    const pressOut  = useCallback(() => Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, tension: 200, friction: 8 }).start(), [scaleAnim]);

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
    const isBusinessPage = ctx?.type === 'page' || String(feed?.user?.entity || '').toLowerCase() === 'page';
    const showCommunityChip = !hidePostContextLine && ctx && ctx.type !== 'page' && !!ctx.title;

    // console.log(elapsedTime, feed.created, feed.id)

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

                    {isBusinessPage && (
                        <View style={styles.businessBadge}>
                            <Ionicons name="storefront-outline" size={10} color={Colors.white} />
                            <Text style={styles.businessBadgeText}>Business Page</Text>
                        </View>
                    )}

                    {!!feelingText && (
                        <Text style={styles.actionText}>{feelingText}</Text>
                    )}
                </TouchableOpacity>

                {/* ── Line 2: compact post context ───────────────────────────── */}
                <View style={styles.postedRow}>
                    <Text style={styles.postedText}>posted</Text>

                    {showCommunityChip && (
                        <>
                            <Text style={styles.postedText}> in </Text>
                            <TouchableOpacity onPress={handleCtxPress} activeOpacity={0.75} style={styles.contextChip}>
                                <Ionicons
                                    name={ctx.type === 'group' ? 'people-outline' : 'albums-outline'}
                                    size={10}
                                    color={ACCENT}
                                />
                                <Text style={styles.contextTitle} numberOfLines={1}>{ctx.title}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>



                {/* ── Line 3: Timestamp + privacy + Follow ── */}
                <View style={styles.elapsedRow}>
                    <Text style={styles.elapsedTime}>{elapsedTime}</Text>
                    {!!privacyIcon && (
                        <Ionicons name={privacyIcon} size={11} color={withOpacity(Colors.neutral430, 1.0)} style={{ marginLeft: 6 }} />
                    )}
                    {showFollow && (
                        <>
                            <Text style={styles.elapsedDot}>·</Text>
                            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                                <TouchableOpacity
                                    onPress={onFollow}
                                    onPressIn={pressIn}
                                    onPressOut={pressOut}
                                    activeOpacity={1}
                                    style={styles.followBtn}
                                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                                >
                                    <Ionicons name="person-add-outline" size={10} color={ACCENT} />
                                    <Text style={styles.followBtnTxt}>Follow</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </>
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
                userId={feed.user?.id}
                onClose={() => setOptionsModalVisible(false)}
                onEdit={onEdit}
                onDelete={onDelete}
                isOwner={isOwner}
                userFullname={feed.user.full_name}
                reportedUserId={feed.user.id ?? feed.user.user_id}
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

    businessBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: Colors.primary,
    },

    businessBadgeText: {
        color: Colors.white,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.15,
        fontFamily: AppDetails.fontFamily.heading,
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

    contextChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        maxWidth: 190,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: withOpacity(ACCENT, 0.08),
        borderWidth: 1,
        borderColor: withOpacity(ACCENT, 0.14),
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

    // ── Follow button ─────────────────────────────────────────────────────────
    elapsedDot: {
        color:      withOpacity(Colors.neutral430, 1.0),
        fontSize:   12,
        marginHorizontal: 4,
    },
    followBtn: {
        flexDirection:   'row',
        alignItems:      'center',
        gap:             4,
        paddingHorizontal: 8,
        paddingVertical:   3,
        borderRadius:    100,
        borderWidth:     1.2,
        borderColor:     ACCENT,
        backgroundColor: withOpacity(ACCENT, 0.07),
    },
    followBtnTxt: {
        fontSize:   11,
        fontWeight: '700',
        color:      ACCENT,
        fontFamily: AppDetails.fontFamily?.body,
    },
});

export default memo(UserDetails, (prev, next) => {
    return (
        prev.feed.id                    === next.feed.id                    &&
        prev.feed.user.full_name        === next.feed.user.full_name        &&
        prev.feed.user.verified         === next.feed.user.verified         &&
        !!prev.feed.user?.is_following   === !!next.feed.user?.is_following  &&
        prev.source                     === next.source                     &&
        prev.postContext?.id            === next.postContext?.id            &&
        prev.postContext?.type          === next.postContext?.type          &&
        prev.postContext?.title         === next.postContext?.title         &&
        prev.hidePostContextLine        === next.hidePostContextLine        &&
        prev.onOwnerPress               === next.onOwnerPress               &&
        prev.onPostContextPress         === next.onPostContextPress         &&
        prev.feelingText                === next.feelingText                &&
        prev.privacyIcon                === next.privacyIcon                &&
        prev.onEdit                     === next.onEdit                     &&
        prev.onDelete                   === next.onDelete                   &&
        prev.isOwner                    === next.isOwner                    &&
        prev.onFollow                   === next.onFollow
    );
});

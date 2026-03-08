import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../../../../helpers/appdetails";
import CleanText from "../../../../../helpers/cleantext";
import { Colors } from '../../../../../theme/colors';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT     = Colors.primary;
const TEXT_BODY  = Colors.textBodyIndigo;
const TEXT_MUTED = Colors.mutedBlueGrayAlt;
const BG         = Colors.surfaceCoolAlt;
const BORDER     = Colors.borderLightAlt;

// ─── CommentPollItem ──────────────────────────────────────────────────────────
const CommentPollItem = ({ post, onVote }) => {
    const payload  = post?.payload || {};
    const options  = payload.options || [];

    const totalVotes = useMemo(() => {
        if (typeof payload.votes === "number") return payload.votes;
        return options.reduce((s, o) => s + (o.votes || 0), 0);
    }, [payload, options]);

    const [selectedId, setSelectedId] = useState(null);
    const [localVotes, setLocalVotes] = useState(() => options.map(o => ({ ...o })));
    const [voted,      setVoted]      = useState(false);

    const handleVote = (opt) => {
        if (voted) return;
        setVoted(true);
        setSelectedId(opt.id);
        setLocalVotes(prev =>
            prev.map(p => p.id === opt.id ? { ...p, votes: (p.votes || 0) + 1 } : p)
        );
        if (typeof onVote === "function") {
            onVote({ postId: post?.id, pollId: payload.poll_id, optionId: opt.id });
        }
    };

    const cleanQuestion = CleanText(post?.text || "");

    return (
        <View style={styles.container}>

            {/* ── Question ── */}
            {!!cleanQuestion && (
                <Text style={styles.question}>{cleanQuestion}</Text>
            )}

            {/* ── Options ── */}
            <View style={styles.options}>
                {localVotes.map((opt) => {
                    const votes      = opt.votes || 0;
                    const pct        = totalVotes > 0
                        ? Math.round((votes / Math.max(totalVotes, 1)) * 100)
                        : 0;
                    const isSelected = selectedId === opt.id;

                    return (
                        <TouchableOpacity
                            key={opt.id}
                            style={[
                                styles.option,
                                isSelected && styles.optionSelected,
                                voted && !isSelected && styles.optionDimmed,
                            ]}
                            activeOpacity={0.75}
                            onPress={() => handleVote(opt)}
                        >
                            {/* Progress fill */}
                            {voted && (
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${pct}%`,
                                            backgroundColor: isSelected
                                                ? ACCENT + '28'
                                                : Colors.neutral170 + 'aa',
                                        },
                                    ]}
                                />
                            )}

                            {/* Row content */}
                            <View style={styles.optionRow}>
                                <View style={styles.optionLeft}>
                                    {voted && isSelected ? (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={16}
                                            color={ACCENT}
                                            style={styles.checkIcon}
                                        />
                                    ) : (
                                        <View style={styles.radioRing} />
                                    )}

                                    <Text
                                        numberOfLines={2}
                                        style={[
                                            styles.optionText,
                                            isSelected && styles.optionTextSelected,
                                            voted && !isSelected && styles.optionTextMuted,
                                        ]}
                                    >
                                        {CleanText(opt.text || "")}
                                    </Text>
                                </View>

                                {voted && (
                                    <Text style={[styles.pct, isSelected && styles.pctSelected]}>
                                        {pct}%
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <Ionicons name="stats-chart-outline" size={12} color={TEXT_MUTED} />
                <Text style={styles.footerText}>
                    {(voted
                        ? localVotes.reduce((s, o) => s + (o.votes || 0), 0)
                        : totalVotes
                    ).toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
                </Text>
                {!!post?.created && (
                    <>
                        <Text style={styles.footerDot}>·</Text>
                        <Text style={styles.footerText}>{post.created}</Text>
                    </>
                )}
            </View>

        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        backgroundColor: BG,
        borderTopWidth: 1,
        borderTopColor: BORDER,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 10,
    },

    question: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_BODY,
        lineHeight: 21,
        fontFamily: AppDetails.fontFamily?.heading,
    },

    options: {
        gap: 8,
    },

    // ── Option row ────────────────────────────────────────────────────────────
    option: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        backgroundColor: Colors.white,
        overflow: 'hidden',
        minHeight: 46,
        justifyContent: 'center',
    },
    optionSelected: {
        borderColor: ACCENT,
    },
    optionDimmed: {
        opacity: 0.85,
    },

    progressFill: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        borderRadius: 10,
    },

    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    optionLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },

    radioRing: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: Colors.neutral250,
        marginRight: 8,
        flexShrink: 0,
    },
    checkIcon: {
        marginRight: 8,
        flexShrink: 0,
    },

    optionText: {
        flex: 1,
        fontSize: 14,
        color: TEXT_BODY,
        fontFamily: AppDetails.fontFamily?.body,
        lineHeight: 19,
    },
    optionTextSelected: {
        fontWeight: '700',
        color: ACCENT,
    },
    optionTextMuted: {
        color: TEXT_MUTED,
    },

    pct: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '600',
        marginLeft: 8,
        minWidth: 34,
        textAlign: 'right',
        fontFamily: AppDetails.fontFamily?.body,
    },
    pctSelected: {
        color: ACCENT,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    footerText: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontFamily: AppDetails.fontFamily?.body,
    },
    footerDot: {
        fontSize: 12,
        color: TEXT_MUTED,
    },
});

export default CommentPollItem;

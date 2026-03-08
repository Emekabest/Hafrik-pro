import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../../helpers/appdetails';
import CleanText from '../../../../helpers/cleantext';
import { useAuth } from '../../../../AuthContext';
import { Colors } from '../../../../theme/colors';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT     = Colors.primary;
const TEXT_BODY  = Colors.textBodyIndigo;
const TEXT_MUTED = Colors.mutedBlueGrayAlt;
const BG         = Colors.surfaceCoolAlt;
const BORDER     = Colors.borderLightAlt;

const VOTE_URL = 'https://hafrik.com/api/v1/feed/vote_poll.php';

const resolveOptions = (feed) => {
    if (feed.payload && Array.isArray(feed.payload.options)) return feed.payload.options;
    const pollMedia = (feed.media && Array.isArray(feed.media) && feed.media.length > 0) ? feed.media[0] : null;
    if (pollMedia && Array.isArray(pollMedia.options) && pollMedia.options.length > 0) return pollMedia.options;
    return Array.isArray(feed.options) ? feed.options : [];
};

// ─── PollPostContent ──────────────────────────────────────────────────────────
const PollPostContent = ({ feed }) => {
    const { token } = useAuth();

    const options = resolveOptions(feed);

    const [votedId,   setVotedId]   = useState(feed.user_voted_id ?? null);
    const [localOpts, setLocalOpts] = useState(() => options.map(o => ({ ...o })));
    const [voting,    setVoting]    = useState(false);

    useEffect(() => {
        setVotedId(feed.user_voted_id ?? null);
        setLocalOpts(resolveOptions(feed).map(o => ({ ...o })));
    }, [feed.id, feed.user_voted_id]);

    if (!localOpts || localOpts.length === 0) return null;

    const totalVotes = localOpts.reduce((acc, opt) => acc + (opt.votes || 0), 0);

    const handleVote = useCallback(async (optionId) => {
        if (votedId || voting) return;

        setVotedId(optionId);
        setLocalOpts(prev => prev.map(o =>
            o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
        ));
        setVoting(true);

        try {
            const form = new FormData();
            form.append('post_id',   String(feed.id));
            form.append('option_id', String(optionId));

            const res  = await fetch(VOTE_URL, {
                method:  'POST',
                headers: { Authorization: `Bearer ${token}` },
                body:    form,
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok || json?.status === 'error') {
                setVotedId(null);
                setLocalOpts(resolveOptions(feed).map(o => ({ ...o })));
            }
        } catch {
            setVotedId(null);
            setLocalOpts(resolveOptions(feed).map(o => ({ ...o })));
        } finally {
            setVoting(false);
        }
    }, [votedId, voting, feed, token]);

    return (
        <View style={styles.container}>

            {/* ── Question ── */}
            {feed.text ? (
                <Text style={styles.question}>{CleanText(feed.text)}</Text>
            ) : null}

            {/* ── Options ── */}
            {localOpts.map((option, index) => {
                const isSelected  = votedId === option.id;
                const votes       = option.votes || 0;
                const percentage  = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

                return (
                    <TouchableOpacity
                        key={option.id || index}
                        onPress={() => handleVote(option.id)}
                        disabled={!!votedId || voting}
                        activeOpacity={0.75}
                        style={[
                            styles.option,
                            isSelected && styles.optionSelected,
                            votedId && !isSelected && styles.optionDimmed,
                        ]}
                    >
                        {/* Progress fill */}
                        {!!votedId && (
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${percentage}%`,
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
                                {voting && isSelected ? (
                                    <ActivityIndicator size="small" color={ACCENT} style={styles.checkIcon} />
                                ) : votedId && isSelected ? (
                                    <Ionicons name="checkmark-circle" size={16} color={ACCENT} style={styles.checkIcon} />
                                ) : (
                                    <View style={styles.radioRing} />
                                )}
                                <Text
                                    style={[
                                        styles.optionText,
                                        isSelected && styles.optionTextSelected,
                                        votedId && !isSelected && styles.optionTextMuted,
                                    ]}
                                    numberOfLines={2}
                                >
                                    {CleanText(option.text || '')}
                                </Text>
                            </View>

                            {!!votedId && (
                                <Text style={[styles.pct, isSelected && styles.pctSelected]}>
                                    {percentage}%
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                );
            })}

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <Ionicons name="stats-chart-outline" size={12} color={TEXT_MUTED} />
                <Text style={styles.footerText}>
                    {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
                </Text>
                <Text style={styles.footerDot}>·</Text>
                <Text style={styles.footerText}>
                    {feed.expires_at ? 'Ends soon' : 'Final results'}
                </Text>
            </View>

        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        backgroundColor: BG,
        padding: 12,
        gap: 8,
    },

    question: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_BODY,
        lineHeight: 20,
        fontFamily: AppDetails.fontFamily?.heading,
        marginBottom: 2,
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
        paddingTop: 2,
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

// ─── Memo ─────────────────────────────────────────────────────────────────────
const handleMemomize = (prevProps, nextProps) => {
    if (prevProps.feed?.id !== nextProps.feed?.id) return false;

    const resolveOpts = (f) => {
        if (!f) return [];
        if (f.payload && Array.isArray(f.payload.options)) return f.payload.options;
        if (Array.isArray(f.options)) return f.options;
        const pollMedia = (f.media && Array.isArray(f.media) && f.media.length > 0) ? f.media[0] : null;
        if (pollMedia && Array.isArray(pollMedia.options)) return pollMedia.options;
        return [];
    };

    const prev = resolveOpts(prevProps.feed);
    const next = resolveOpts(nextProps.feed);
    if ((prev?.length ?? 0) !== (next?.length ?? 0)) return false;

    for (let i = 0; i < (prev?.length ?? 0); i++) {
        const a = prev[i] ?? {};
        const b = next[i] ?? {};
        if (a.id !== b.id || (a.text ?? '') !== (b.text ?? '') || (a.votes ?? 0) !== (b.votes ?? 0)) return false;
    }

    if ((prevProps.feed?.user_voted_id ?? null) !== (nextProps.feed?.user_voted_id ?? null)) return false;
    if ((prevProps.feed?.expires_at    ?? '')   !== (nextProps.feed?.expires_at    ?? ''))   return false;

    return true;
};

export default memo(PollPostContent, handleMemomize);

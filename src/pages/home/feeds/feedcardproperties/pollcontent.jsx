import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import AppDetails from '../../../../helpers/appdetails';
import { useAuth } from '../../../../AuthContext';
import { Colors } from '../../../../theme/colors';

const VOTE_URL = 'https://hafrik.com/api/v1/feed/vote_poll.php';

const resolveOptions = (feed) => {
    if (feed.payload && Array.isArray(feed.payload.options)) return feed.payload.options;
    const pollMedia = (feed.media && Array.isArray(feed.media) && feed.media.length > 0) ? feed.media[0] : null;
    if (pollMedia && Array.isArray(pollMedia.options) && pollMedia.options.length > 0) return pollMedia.options;
    return Array.isArray(feed.options) ? feed.options : [];
};

const PollPostContent = ({ feed }) => {
    const { token } = useAuth();

    const options = resolveOptions(feed);

    // ── State ────────────────────────────────────────────────────────────────
    // votedId: which option the user picked (null = not voted)
    const [votedId,   setVotedId]   = useState(feed.user_voted_id ?? null);
    // localOpts: local copy of options so we can bump the vote count client-side
    const [localOpts, setLocalOpts] = useState(() => options.map(o => ({ ...o })));
    const [voting,    setVoting]    = useState(false);

    // Sync when FlatList recycles this cell for a different feed item
    useEffect(() => {
        setVotedId(feed.user_voted_id ?? null);
        setLocalOpts(resolveOptions(feed).map(o => ({ ...o })));
    }, [feed.id, feed.user_voted_id]);

    if (!localOpts || localOpts.length === 0) return null;

    const totalVotes = localOpts.reduce((acc, opt) => acc + (opt.votes || 0), 0);

    const handleVote = useCallback(async (optionId) => {
        if (votedId || voting) return;

        // Optimistic update
        setVotedId(optionId);
        setLocalOpts(prev => prev.map(o =>
            o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
        ));
        setVoting(true);

        try {
            const form = new FormData();
            form.append('post_id',   String(feed.id));
            form.append('option_id', String(optionId));

            const res = await fetch(VOTE_URL, {
                method:  'POST',
                headers: { Authorization: `Bearer ${token}` },
                body:    form,
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok || json?.status === 'error') {
                // Rollback on failure
                setVotedId(null);
                setLocalOpts(resolveOptions(feed).map(o => ({ ...o })));
            }
        } catch {
            // Network error — rollback
            setVotedId(null);
            setLocalOpts(resolveOptions(feed).map(o => ({ ...o })));
        } finally {
            setVoting(false);
        }
    }, [votedId, voting, feed, token]);

    return (
        <View style={{ marginTop: 5, paddingRight: 5, width: '100%' }}>
            {localOpts.map((option, index) => {
                const isSelected = votedId === option.id;
                const votes = option.votes || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const primaryColor = AppDetails.primaryColor || Colors.black;

                return (
                    <View key={option.id || index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity
                            onPress={() => handleVote(option.id)}
                            disabled={!!votedId || voting}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                height: 45,
                                justifyContent: 'center',
                                borderRadius: 50,
                                borderWidth: 1,
                                borderColor: isSelected ? primaryColor : Colors.neutral200,
                                backgroundColor: Colors.white,
                                overflow: 'hidden'
                            }}
                        >
                            {votedId && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    width: `${percentage}%`,
                                    backgroundColor: isSelected ? (primaryColor + '33') : Colors.neutral130,
                                }} />
                            )}

                            <View style={{ paddingHorizontal: 12 }}>
                                <Text style={{ fontWeight: isSelected ? '600' : '400', color: Colors.neutral700, fontSize: 14 }}>{option.text}</Text>
                            </View>
                        </TouchableOpacity>
                        {votedId ? (
                            <View style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: Colors.neutral150,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginLeft: 8
                            }}>
                                {voting && isSelected
                                    ? <ActivityIndicator size="small" color={primaryColor} />
                                    : <Text style={{ fontSize: 12, color: Colors.neutral500, fontWeight: 'bold' }}>{votes}</Text>
                                }
                            </View>
                        ) : null}
                    </View>
                )
            })}
            <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 2 }}>
                <Text style={{ color: Colors.neutral430, fontSize: 12, fontFamily:"WorkSans_400Regular" }}>{totalVotes} votes</Text>
                <Text style={{ color: Colors.neutral430, fontSize: 12, fontFamily:"WorkSans_400Regular" }}> • {feed.expires_at ? 'Ends soon' : 'Final results'}</Text>
            </View>
        </View>
    );
};





const handleMemomize = (prevProps, nextProps) => {
    if (prevProps.feed?.id !== nextProps.feed?.id) return false;

    const resolveOptions = (f) => {
        if (!f) return [];
        if (f.payload && Array.isArray(f.payload.options)) return f.payload.options;
        if (Array.isArray(f.options)) return f.options;
        const pollMedia = (f.media && Array.isArray(f.media) && f.media.length > 0) ? f.media[0] : null;
        if (pollMedia && Array.isArray(pollMedia.options)) return pollMedia.options;
        return [];
    }

    const prevOptions = resolveOptions(prevProps.feed);
    const nextOptions = resolveOptions(nextProps.feed);
    if ((prevOptions?.length ?? 0) !== (nextOptions?.length ?? 0)) return false;

    for (let i = 0; i < (prevOptions?.length ?? 0); i++){
        const a = prevOptions[i] ?? {};
        const b = nextOptions[i] ?? {};
        if (a.id !== b.id) return false;
        if ((a.text ?? '') !== (b.text ?? '')) return false;
        if ((a.votes ?? 0) !== (b.votes ?? 0)) return false;
    }

    if ((prevProps.feed?.user_voted_id ?? null) !== (nextProps.feed?.user_voted_id ?? null)) return false;
    if ((prevProps.feed?.expires_at ?? '') !== (nextProps.feed?.expires_at ?? '')) return false;

    return true;
}


export default memo(PollPostContent, handleMemomize);


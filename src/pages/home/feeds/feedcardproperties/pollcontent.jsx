import React, { memo, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../../helpers/appdetails';



const PollPostContent = ({ feed }) => {
    let options = [];


    if (feed.payload && Array.isArray(feed.payload.options)){
        options = feed.payload.options;
    } else {

        const pollMedia = (feed.media && Array.isArray(feed.media) && feed.media.length > 0) ? feed.media[0] : null;
        options = (pollMedia && Array.isArray(pollMedia.options) && pollMedia.options.length > 0)
            ? pollMedia.options
            : (Array.isArray(feed.options) ? feed.options : []);
    }

    const [votedId, setVotedId] = useState(feed.user_voted_id || null);

    if (!options || options.length === 0) return null;

    const totalVotes = options.reduce((acc, opt) => acc + (opt.votes || 0), 0) + (votedId && !feed.user_voted_id ? 1 : 0);

    const handleVote = (id) => {
        if (votedId) return;
        setVotedId(id);
    };

    return (
        <View style={{ marginTop: 5, paddingRight: 5, width: '100%' }}>
            {options.map((option, index) => {
                const isSelected = votedId === option.id;
                const votes = (option.votes || 0) + (isSelected && !feed.user_voted_id ? 1 : 0);
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const primaryColor = AppDetails.primaryColor || '#000000';

                return (
                    <View key={option.id || index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity
                            onPress={() => handleVote(option.id)}
                            disabled={!!votedId}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                height: 45,
                                justifyContent: 'center',
                                borderRadius: 50,
                                borderWidth: 1,
                                borderColor: isSelected ? primaryColor : '#e0e0e0',
                                backgroundColor: '#fff',
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
                                    backgroundColor: isSelected ? (primaryColor + '33') : '#f5f5f5',
                                }} />
                            )}

                            <View style={{ paddingHorizontal: 12 }}>
                                <Text style={{ fontWeight: isSelected ? '600' : '400', color: '#333', fontSize: 14 }}>{option.text}</Text>
                            </View>
                        </TouchableOpacity>
                        {votedId && (
                            <View style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: '#f0f0f0',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginLeft: 8
                            }}>
                                <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>{votes}</Text>
                            </View>
                        )}
                    </View>
                )
            })}
            <View style={{ flexDirection: 'row', marginTop: 4, paddingHorizontal: 2 }}>
                <Text style={{ color: '#787878ff', fontSize: 12, fontFamily:"WorkSans_400Regular" }}>{totalVotes} votes</Text>
                <Text style={{ color: '#787878ff', fontSize: 12, fontFamily:"WorkSans_400Regular" }}> • {feed.expires_at ? 'Ends soon' : 'Final results'}</Text>
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


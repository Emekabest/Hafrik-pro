import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;




const CommentVideoItem = ({ videoUrl, thumbnail }) => {
    const isFocused = useIsFocused();
    const [hasError, setHasError] = useState(false);

    const source = videoUrl || null;

    const player = useVideoPlayer(source, (p) => {
        if (p && source) {
            try { p.loop = true; } catch (e) {}
            if (isFocused) {
                try { p.play(); } catch (e) {}
            }
        }
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status } = useEvent(player, 'statusChange', { status: player?.status ?? {} });

    useEffect(() => {
        return () => {
            try { player?.release(); } catch (e) {}
        };
    }, [player]);

    if (hasError) {
        return (
            <View style={{ height: MEDIA_HEIGHT, width: MEDIA_WIDTH, borderRadius: 10, overflow: 'hidden', marginTop: 10, backgroundColor: '#202020', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={30} color="#fff" />
                <Text style={{color: '#fff', fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                <TouchableOpacity onPress={() => setHasError(false)} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 20}}>
                    <Text style={{color: '#fff', fontSize: 12}}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isBuffering = status?.isBuffering;
    const isFinished = status?.didJustFinish;

    return (
        <View style={{ height: MEDIA_HEIGHT, width: MEDIA_WIDTH, borderRadius: 10, overflow: 'hidden', marginTop: 10, backgroundColor: '#000' }}>
            {player ? (
                <VideoView
                    style={{ width: '100%', height: '100%' }}
                    player={player}
                    nativeControls={true}
                    contentFit="contain"
                    posterSource={{ uri: thumbnail }}
                    usePoster={false}
                    onError={(e) => { console.log('VideoView error', e); setHasError(true); }}
                />
            ) : (
                <Image source={{ uri: thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            )}

            {(isBuffering && !isPlaying) && (
                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2}]} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {(!isPlaying && !isBuffering) && (
                <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 1}]}>
                    <TouchableOpacity 
                        onPress={() => {
                            try {
                                if (!player) return;
                                if (isFinished) player.replay(); else player.play();
                            } catch (e) { console.log('player control error', e); }
                        }}
                        style={{backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, padding: 10}}
                    >
                        <Ionicons name="play" size={30} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default CommentVideoItem;

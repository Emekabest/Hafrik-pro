import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';

const Preview = ({ videoUri, onBack, onNext, isFocused, appState, primaryColor }) => {
    const [videoMounted, setVideoMounted] = useState(false);

    const player = useVideoPlayer(videoUri ? { uri: videoUri } : null, p => {
        if (p) { p.loop = true; }
    });

    // Delay mount so the player has time to initialise
    useEffect(() => {
        setVideoMounted(false);
        const timer = setTimeout(() => setVideoMounted(true), 300);
        return () => clearTimeout(timer);
    }, [videoUri]);

    // Update source when videoUri prop changes
    useEffect(() => {
        if (player && videoUri) {
            player.replaceAsync({ uri: videoUri }).catch(() => {});
        }
    }, [videoUri]); // eslint-disable-line

    // Play / pause based on focus + app state
    useEffect(() => {
        if (!player) return;
        if (isFocused && appState === 'active') {
            player.play();
        } else {
            player.pause();
        }
    }, [isFocused, appState]); // eslint-disable-line

    useEffect(() => {
        // Configure audio: DoNotMix so background music pauses
        setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'doNotMix',
            shouldDuckAndroid: false,
            staysActiveInBackground: false,
        }).catch(e => console.log('Audio mode setup error', e));

        return () => {
            if (player) player.pause();
            // Reset audio mode so background music resumes
            setAudioModeAsync({
                playsInSilentMode: false,
                interruptionMode: 'mixWithOthers',
                shouldDuckAndroid: true,
                staysActiveInBackground: false,
            }).catch(e => console.log('Audio mode reset error', e));
        };
    }, []); // eslint-disable-line

    return (
        <View style={styles.fullScreenContainer}>
            <View style={[styles.fullScreenPreview, { marginTop: 0 }]}>
                {videoMounted ? (
                    <VideoView
                        player={player}
                        style={styles.fullScreenVideo}
                        contentFit="cover"
                        nativeControls={false}
                    />
                ) : (
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}
                
                <TouchableOpacity style={styles.backButtonOverlay} onPress={onBack}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>

                <View style={styles.previewBottomBar}>
                    <TouchableOpacity 
                        activeOpacity={1}
                        style={[styles.nextButton, { backgroundColor: "#fff" }]} 
                        onPress={onNext}
                    >
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    fullScreenPreview: {
        flex: 1,
        backgroundColor: 'black',
    },
    fullScreenVideo: {
        width: '100%',
        height: '100%',
    },
    backButtonOverlay: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 40 : 20,
        left: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    previewBottomBar: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        left: 20,
        alignItems: 'flex-end',
    },
    nextButton: {
        height:60,
        width:"50%",
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    nextButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default Preview;
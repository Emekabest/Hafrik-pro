import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


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
            try { if (player) player.pause(); } catch (_) {}
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
                        <ActivityIndicator size="large" color={Colors.white} />
                    </View>
                )}
                
                <TouchableOpacity style={styles.backButtonOverlay} onPress={onBack}>
                    <View style={styles.backCircle}>
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </View>
                </TouchableOpacity>

                <View style={styles.previewBottomBar}>
                    <TouchableOpacity
                        activeOpacity={0.86}
                        style={styles.nextButton}
                        onPress={onNext}
                    >
                        <LinearGradient
                            colors={[Colors.tealAccent, Colors.tealAccentDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextGradient}
                        >
                            <Text style={styles.nextButtonText}>Next</Text>
                            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                        </LinearGradient>
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
        top: Platform.OS === 'android' ? 40 : 58,
        left: 16,
        zIndex: 10,
    },
    backCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: withOpacity(Colors.black, 0.5),
        borderWidth: 1,
        borderColor: withOpacity(Colors.white, 0.15),
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewBottomBar: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        left: 20,
        alignItems: 'flex-end',
    },
    nextButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
    },
    nextButtonText: {
        color: Colors.white,
        fontWeight: '900',
        fontSize: 17,
        letterSpacing: 0.3,
    },
});

export default Preview;
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

const Preview = ({ videoUri, onBack, onNext, isFocused, appState, primaryColor }) => {
    const [videoMounted, setVideoMounted] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        setVideoMounted(false);
        const timer = setTimeout(() => {
            setVideoMounted(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [videoUri]);

    useEffect(() => {
        // Configure audio to pause background music (DoNotMix)
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            staysActiveInBackground: false,
        }).catch(error => console.log("Audio mode setup error", error));

        return () => {
            if (videoRef.current) {
                videoRef.current.unloadAsync();
            }
            // Reset audio mode to ensure background music returns to normal volume
            Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
                playsInSilentModeIOS: false,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                staysActiveInBackground: false,
            }).catch(error => console.log("Audio mode reset error", error));
        };
    }, []);

    return (
        <View style={styles.fullScreenContainer}>
            <View style={[styles.fullScreenPreview, { marginTop: 0 }]}>
                {videoMounted ? (
                    <Video
                        ref={videoRef}
                        key={videoUri}
                        source={{ uri: videoUri }}
                        style={styles.fullScreenVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={isFocused && appState === 'active'}
                        isLooping
                        useNativeControls={false}
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
                        style={[styles.nextButton, { backgroundColor: primaryColor }]} 
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
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default Preview;
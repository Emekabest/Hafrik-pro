/**
 * GlobalUploadBanner
 * ──────────────────────────────────────────────────────────────────────────────
 * A small floating upload bubble anchored above the bottom tab bar. It avoids
 * headers and keeps the app usable while large videos upload in the background.
 *
 * States:
 *   uploading  → animated progress bar + percentage
 *   done       → green success flash, auto-dismisses after 2 s
 *   error      → red pill with dismiss tap
 */

import React, { useEffect, useRef, memo } from 'react';
import {
    Animated, Easing, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../repository/store';
import { Colors } from '../theme';
import AppDetails from '../helpers/appdetails';

const TAB_H         = AppDetails.mainTabNavigatorHeight ?? 60;
const ACCENT        = Colors.primary;
const BRAND         = Colors.primaryDark;
const WHITE         = Colors.white;
const SUCCESS       = '#22c55e';
const ERROR_C       = '#ef4444';
const BUBBLE_H      = 62;

const GlobalUploadBanner = () => {
    const { bottom } = useSafeAreaInsets();
    const activeUpload = useStore((s) => s.activeUpload);
    const clearUpload  = useStore((s) => s.clearUpload);

    // Slide up from bottom
    const slideY    = useRef(new Animated.Value(BUBBLE_H + 20)).current;
    // Progress bar width (0–100)
    const progAnim  = useRef(new Animated.Value(0)).current;
    // Subtle pulse on the icon while in-progress
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isVisible = useRef(false);
    const pulseLoop = useRef(null);

    // ── Show / hide ────────────────────────────────────────────────────────
    useEffect(() => {
        if (activeUpload && !isVisible.current) {
            isVisible.current = true;
            progAnim.setValue(0);
            Animated.timing(slideY, {
                toValue: 0,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else if (!activeUpload && isVisible.current) {
            isVisible.current = false;
            Animated.timing(slideY, {
                toValue: BUBBLE_H + 20,
                duration: 260,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start();
        }
    }, [activeUpload]);

    // ── Progress bar ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeUpload) return;
        Animated.timing(progAnim, {
            toValue: activeUpload.pct ?? 0,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    }, [activeUpload?.pct]);

    // ── Pulse while uploading ──────────────────────────────────────────────
    useEffect(() => {
        if (pulseLoop.current) { pulseLoop.current.stop(); pulseLoop.current = null; }
        if (!activeUpload || activeUpload.phase === 'done' || activeUpload.phase === 'error') {
            pulseAnim.setValue(1);
            return;
        }
        pulseLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.55, duration: 750, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,    duration: 750, useNativeDriver: true }),
            ]),
        );
        pulseLoop.current.start();
        return () => { if (pulseLoop.current) { pulseLoop.current.stop(); pulseLoop.current = null; } };
    }, [activeUpload?.phase]);

    if (!activeUpload) return null;

    const phase    = activeUpload.phase;
    const isDone   = phase === 'done';
    const isError  = phase === 'error';
    const pct      = Math.max(0, Math.min(100, Math.round(activeUpload.pct ?? 0)));

    const accentColor = isDone ? SUCCESS : isError ? ERROR_C : ACCENT;

    let label = activeUpload.label || 'Uploading…';
    if (isDone)  label = 'Posted!';
    if (isError) label = activeUpload.error || 'Upload failed';

    const iconName = isDone ? 'checkmark-circle' : isError ? 'alert-circle' : 'cloud-upload-outline';

    // Bottom offset: safe area + tab bar height + small gap
    const bottomOffset = bottom + TAB_H + 10;

    return (
        <Animated.View
            style={[
                styles.wrapper,
                { bottom: bottomOffset, transform: [{ translateY: slideY }] },
            ]}
            pointerEvents="box-none"
        >
            <TouchableOpacity
                activeOpacity={isError || isDone ? 0.8 : 1}
                onPress={isError || isDone ? clearUpload : undefined}
                style={[styles.bubble, isError && styles.bubbleError, isDone && styles.bubbleDone]}
            >
                <Animated.View style={[styles.iconWrap, { backgroundColor: accentColor + '22', opacity: !isDone && !isError ? pulseAnim : 1 }]}>
                    <Ionicons name={iconName} size={19} color={accentColor} />
                </Animated.View>

                {!isDone && !isError ? (
                    <Text style={[styles.pct, { color: accentColor }]}>{pct}%</Text>
                ) : (
                    <Ionicons name="close" size={13} color={Colors.secondaryText} style={styles.closeIcon} />
                )}

                <Text style={styles.label} numberOfLines={1}>{label}</Text>

                <View style={styles.track}>
                    <Animated.View
                        style={[
                            styles.fill,
                            { backgroundColor: accentColor },
                            {
                                width: isDone
                                    ? '100%'
                                    : progAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%'],
                                        extrapolate: 'clamp',
                                    }),
                            },
                        ]}
                    />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        right: 14,
        width: 92,
        zIndex: 9999,
        elevation: 9999,
        alignItems: 'flex-end',
    },
    bubble: {
        width: 92,
        minHeight: BUBBLE_H,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 7,
        backgroundColor: WHITE,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: ACCENT + '22',
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 10,
    },
    bubbleDone: {
        borderColor: SUCCESS + '44',
    },
    bubbleError: {
        borderColor: ERROR_C + '44',
        width: 150,
        alignItems: 'flex-start',
        paddingHorizontal: 12,
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    label: {
        fontSize: 9.5,
        fontWeight: '800',
        color: BRAND,
        marginTop: 3,
        maxWidth: '100%',
        textAlign: 'center',
        fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
    },
    pct: {
        position: 'absolute',
        top: 9,
        right: 8,
        fontSize: 10,
        fontWeight: '900',
        fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
    },
    closeIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    track: {
        height: 3,
        width: '100%',
        marginTop: 6,
        backgroundColor: Colors.surfaceTint ?? '#f0f4f8',
        borderRadius: 999,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 999,
    },
});

export default memo(GlobalUploadBanner);

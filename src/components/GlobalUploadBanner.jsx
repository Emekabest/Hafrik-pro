/**
 * GlobalUploadBanner
 * ──────────────────────────────────────────────────────────────────────────────
 * A slim, persistent progress bar rendered at the app root so users see
 * upload progress on every screen. Slides in from the top and auto-dismisses.
 */

import React, { useEffect, useRef, memo } from 'react';
import {
    StyleSheet, Text, View, Animated, TouchableOpacity,
    Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../repository/store';
import { Colors } from '../theme';

const SCREEN_W = Dimensions.get('window').width;

const ACCENT = Colors.primary;
const BRAND  = Colors.primaryDark;
const WHITE  = Colors.white;
const BG     = Colors.surfaceTint;
const BORDER = Colors.border;
const MUTED  = Colors.secondaryText;
const ERROR_COLOR = '#E53935';
const SUCCESS_COLOR = '#43A047';

const GlobalUploadBanner = () => {
    const activeUpload = useStore((s) => s.activeUpload);
    const clearUpload  = useStore((s) => s.clearUpload);

    const slideAnim    = useRef(new Animated.Value(-120)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim    = useRef(new Animated.Value(1)).current;
    const isVisible    = useRef(false);

    // ── Show / hide the banner ─────────────────────────────────────────────
    useEffect(() => {
        if (activeUpload && !isVisible.current) {
            isVisible.current = true;
            progressAnim.setValue(0);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 50,
            }).start();
        } else if (!activeUpload && isVisible.current) {
            isVisible.current = false;
            Animated.timing(slideAnim, {
                toValue: -120,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [activeUpload]);

    // ── Animate progress bar ───────────────────────────────────────────────
    useEffect(() => {
        if (!activeUpload) return;
        Animated.timing(progressAnim, {
            toValue: activeUpload.pct ?? 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [activeUpload?.pct]);

    // ── Pulse while uploading ──────────────────────────────────────────────
    useEffect(() => {
        if (!activeUpload || activeUpload.phase === 'done' || activeUpload.phase === 'error') {
            pulseAnim.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [activeUpload?.phase]);

    // Don't render DOM at all when idle (after slide-out finishes)
    if (!activeUpload) return null;

    const phase = activeUpload.phase;
    const isDone  = phase === 'done';
    const isError = phase === 'error';
    const pct     = activeUpload.pct ?? 0;

    // Icons per state
    const iconName  = isDone ? 'checkmark-circle' : isError ? 'alert-circle' : 'cloud-upload';
    const iconColor = isDone ? SUCCESS_COLOR : isError ? ERROR_COLOR : ACCENT;

    // Label
    let label = activeUpload.label || 'Uploading…';
    if (isDone)  label = 'Posted successfully!';
    if (isError) label = activeUpload.error || 'Upload failed';

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="box-none"
        >
            <View style={[
                styles.card,
                isDone && styles.cardDone,
                isError && styles.cardError,
            ]}>
                {/* Left icon */}
                <Animated.View style={{ opacity: pulseAnim }}>
                    <Ionicons name={iconName} size={22} color={iconColor} />
                </Animated.View>

                {/* Text + bar */}
                <View style={styles.body}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label} numberOfLines={1}>{label}</Text>
                        {!isDone && !isError && (
                            <Text style={styles.pct}>{Math.round(pct)}%</Text>
                        )}
                    </View>

                    {/* Progress bar */}
                    {!isDone && !isError && (
                        <View style={styles.barTrack}>
                            <Animated.View
                                style={[
                                    styles.barFill,
                                    {
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%'],
                                            extrapolate: 'clamp',
                                        }),
                                    },
                                ]}
                            />
                        </View>
                    )}

                    {/* Done bar — full green */}
                    {isDone && (
                        <View style={styles.barTrack}>
                            <View style={[styles.barFill, styles.barFillDone, { width: '100%' }]} />
                        </View>
                    )}
                </View>

                {/* Dismiss */}
                {(isDone || isError) && (
                    <TouchableOpacity onPress={clearUpload} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={18} color={MUTED} />
                    </TouchableOpacity>
                )}

                {/* Retry */}
                {isError && (
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={clearUpload}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.retryText}>Dismiss</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 54 : 12,
        left: 12,
        right: 12,
        zIndex: 9999,
        elevation: 9999,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHITE,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        // shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: BORDER,
    },
    cardDone: {
        borderColor: SUCCESS_COLOR + '44',
    },
    cardError: {
        borderColor: ERROR_COLOR + '44',
    },
    body: {
        flex: 1,
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: BRAND,
        flex: 1,
    },
    pct: {
        fontSize: 13,
        fontWeight: '800',
        color: ACCENT,
        marginLeft: 8,
    },
    barTrack: {
        height: 5,
        backgroundColor: BG,
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: ACCENT,
        borderRadius: 3,
    },
    barFillDone: {
        backgroundColor: SUCCESS_COLOR,
    },
    retryBtn: {
        marginLeft: 4,
    },
    retryText: {
        fontSize: 12,
        fontWeight: '700',
        color: ERROR_COLOR,
    },
});

export default memo(GlobalUploadBanner);

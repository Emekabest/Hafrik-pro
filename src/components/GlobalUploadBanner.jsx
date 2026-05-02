/**
 * GlobalUploadBanner
 * ──────────────────────────────────────────────────────────────────────────────
 * A slim, persistent progress bar rendered at the app root so users see
 * upload progress on every screen. Slides in from the top and auto-dismisses.
 */

import React, { useEffect, useRef, memo } from 'react';
import {
    StyleSheet, Text, View, Animated, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../repository/store';
import { Colors } from '../theme';

const ACCENT = Colors.primary;
const BRAND  = Colors.primaryDark;
const WHITE  = Colors.white;
const BG     = Colors.surfaceTint;
const MUTED  = Colors.secondaryText;
const ERROR_COLOR = '#E53935';
const SUCCESS_COLOR = '#43A047';

const GlobalUploadBanner = () => {
    const { top } = useSafeAreaInsets();
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
    const safePct = Math.max(0, Math.min(100, Math.round(pct)));

    // Icons per state
    const iconName  = isDone ? 'checkmark' : isError ? 'alert-circle' : 'cloud-upload';
    const iconColor = isDone ? SUCCESS_COLOR : isError ? ERROR_COLOR : WHITE;

    // Label
    let label = activeUpload.label || 'Uploading…';
    if (isDone)  label = 'Posted successfully!';
    if (isError) label = activeUpload.error || 'Upload failed';

    return (
        <Animated.View
            style={[
                styles.container,
                { top: Math.max(top + 8, 16) },
                { transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="box-none"
        >
            <View style={[
                styles.card,
                isDone && styles.cardDone,
                isError && styles.cardError,
            ]}>
                <LinearGradient
                    colors={isError ? [ERROR_COLOR, '#B91C1C'] : isDone ? [SUCCESS_COLOR, '#0F8A45'] : [ACCENT, BRAND]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.countRing}
                >
                    <Animated.View style={[styles.iconCircle, { opacity: pulseAnim }]}>
                        {isDone || isError ? (
                            <Ionicons name={iconName} size={20} color={iconColor} />
                        ) : (
                            <Text style={styles.countTxt}>{safePct}</Text>
                        )}
                    </Animated.View>
                </LinearGradient>

                {/* Text + bar */}
                <View style={styles.body}>
                    <View style={styles.labelRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label} numberOfLines={1}>{label}</Text>
                            <Text style={styles.subLabel} numberOfLines={1}>
                                {isError ? 'Tap dismiss and try again' : isDone ? 'Your content is now live' : 'Keep the app open while Hafrik uploads'}
                            </Text>
                        </View>
                        {!isDone && !isError && (
                            <Text style={styles.pct}>{safePct}%</Text>
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
                    <TouchableOpacity style={styles.closeBtn} onPress={clearUpload} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
        left: 12,
        right: 12,
        zIndex: 9999,
        elevation: 9999,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHITE,
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
        // shadow
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 22,
        elevation: 12,
        borderWidth: 1,
        borderColor: ACCENT + '18',
    },
    cardDone: {
        borderColor: SUCCESS_COLOR + '44',
    },
    cardError: {
        borderColor: ERROR_COLOR + '44',
    },
    body: {
        flex: 1,
        gap: 8,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '900',
        color: BRAND,
        flex: 1,
    },
    subLabel: {
        fontSize: 11,
        color: MUTED,
        marginTop: 2,
        fontWeight: '600',
    },
    pct: {
        fontSize: 13,
        fontWeight: '900',
        color: ACCENT,
        marginLeft: 8,
    },
    countRing: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WHITE + '22',
    },
    countTxt: {
        color: WHITE,
        fontSize: 15,
        fontWeight: '900',
    },
    barTrack: {
        height: 7,
        backgroundColor: BG,
        borderRadius: 999,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: ACCENT,
        borderRadius: 999,
    },
    barFillDone: {
        backgroundColor: SUCCESS_COLOR,
    },
    retryBtn: {
        marginLeft: 4,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
    },
    retryText: {
        fontSize: 12,
        fontWeight: '700',
        color: ERROR_COLOR,
    },
});

export default memo(GlobalUploadBanner);

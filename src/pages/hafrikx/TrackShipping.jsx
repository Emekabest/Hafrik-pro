import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const BG      = '#f7fff7';
const CARD    = '#ffffff';
const BORDER  = '#e4eeef';
const GOLD    = '#c9a84c';
const GOLD_LT = '#e8c87a';
const MUTED   = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';
const ACCENT  = '#3b82f6';

const { width: W } = Dimensions.get('window');

const MOCK_SHIPMENT = {
  trackingNumber: null,
  status: 'In Transit',
  location: 'Guangzhou, China',
  method: 'Sea Freight',
  weight: '45 kg',
  destination: 'Lagos, Nigeria',
  eta: 'Est. 18 April 2026',
};

const TIMELINE_STEPS = [
  { label: 'Received',   icon: 'cube-outline',          state: 'done'    },
  { label: 'Packed',     icon: 'archive-outline',        state: 'done'    },
  { label: 'Shipped',    icon: 'boat-outline',           state: 'done'    },
  { label: 'In Transit', icon: 'navigate-circle-outline', state: 'active' },
  { label: 'Delivered',  icon: 'checkmark-done-circle-outline', state: 'upcoming' },
];

const PulsingDot = memo(() => {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <View style={styles.pulseDotWrap}>
      <Animated.View style={[styles.pulseDotRing, { transform: [{ scale: anim }] }]} />
      <View style={styles.pulseDotCore} />
    </View>
  );
});

const TimelineStep = memo(({ step, index, isLast }) => {
  const isDone    = step.state === 'done';
  const isActive  = step.state === 'active';
  const isUpcoming = step.state === 'upcoming';

  return (
    <View style={styles.timelineRow}>
      {/* Left: dot + line */}
      <View style={styles.timelineTrack}>
        {isActive ? (
          <PulsingDot />
        ) : (
          <View style={[
            styles.timelineDot,
            isDone   && styles.timelineDotDone,
            isUpcoming && styles.timelineDotUpcoming,
          ]}>
            {isDone && <Ionicons name="checkmark" size={10} color={BG} />}
          </View>
        )}
        {!isLast && (
          <View style={[
            styles.timelineLine,
            (isDone || isActive) && styles.timelineLineActive,
          ]} />
        )}
      </View>

      {/* Right: label */}
      <View style={styles.timelineLabelWrap}>
        <View style={styles.timelineIconWrap}>
          <Ionicons
            name={step.icon}
            size={15}
            color={isUpcoming ? MUTED : GOLD}
          />
        </View>
        <Text style={[
          styles.timelineLabel,
          isUpcoming && styles.timelineLabelUpcoming,
          isActive   && styles.timelineLabelActive,
        ]}>
          {step.label}
        </Text>
        {isActive && (
          <View style={styles.activeTag}>
            <Text style={styles.activeTagText}>Active</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const DetailRow = memo(({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={15} color={GOLD} style={{ width: 22 }} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
));

export default function TrackShipping() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [trackingNumber, setTrackingNumber] = useState('');
  const [result, setResult]                 = useState(null);
  const [loading, setLoading]               = useState(false);

  const handleTrack = useCallback(() => {
    if (!trackingNumber.trim()) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult({ ...MOCK_SHIPMENT, trackingNumber: trackingNumber.trim().toUpperCase() });
      setLoading(false);
    }, 1000);
  }, [trackingNumber]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Shipment</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.trackInput}
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="Enter tracking number…"
            placeholderTextColor={MUTED}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleTrack}
          />
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={handleTrack}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient colors={[BRAND, TEAL]} style={styles.trackBtnGrad}>
              {loading
                ? <ActivityIndicator size="small" color={BG} />
                : <Text style={styles.trackBtnText}>Track</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Placeholder hint */}
        {!result && !loading && (
          <View style={styles.hintWrap}>
            <Ionicons name="barcode-outline" size={52} color={MUTED} style={{ marginBottom: 12 }} />
            <Text style={styles.hintText}>Enter your Hafrik tracking number above</Text>
            <Text style={styles.hintSub}>e.g. HFX2024-CN-NG-00412</Text>
          </View>
        )}

        {/* Result card */}
        {result && (
          <>
            <View style={styles.resultCard}>
              <LinearGradient colors={['#e8f5f5', '#ffffff']} style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultTrackNum}>{result.trackingNumber}</Text>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{result.status}</Text>
                  </View>
                </View>
                <Ionicons name="boat" size={32} color={GOLD} />
              </LinearGradient>

              <View style={styles.detailsWrap}>
                <DetailRow icon="location-sharp"      label="Current Location" value={result.location} />
                <DetailRow icon="layers-outline"      label="Method"           value={result.method} />
                <DetailRow icon="scale-outline"       label="Weight"           value={result.weight} />
                <DetailRow icon="flag-outline"        label="Destination"      value={result.destination} />
                <DetailRow icon="calendar-outline"    label="ETA"              value={result.eta} />
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>Shipment Timeline</Text>
              {TIMELINE_STEPS.map((step, i) => (
                <TimelineStep
                  key={step.label}
                  step={step}
                  index={i}
                  isLast={i === TIMELINE_STEPS.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 50,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  trackInput: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: BRAND,
  },
  trackBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  trackBtnGrad: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  trackBtnText: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 15,
    color: WHITE,
  },
  hintWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  hintText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
  hintSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
    marginTop: 6,
  },
  // Result card
  resultCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  resultTrackNum: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 15,
    color: BRAND,
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a3a1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4caf50',
  },
  statusText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: '#4caf50',
  },
  detailsWrap: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    width: 130,
  },
  detailValue: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: BRAND,
    flex: 1,
  },
  // Timeline
  timelineCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    marginBottom: 20,
  },
  timelineTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: BRAND,
    marginBottom: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 52,
  },
  timelineTrack: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: {
    backgroundColor: GOLD,
  },
  timelineDotUpcoming: {
    borderColor: MUTED,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: MUTED,
    marginTop: 2,
    minHeight: 30,
  },
  timelineLineActive: {
    backgroundColor: GOLD,
  },
  timelineLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingBottom: 18,
    gap: 8,
  },
  timelineIconWrap: {
    width: 26,
    alignItems: 'center',
  },
  timelineLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: BRAND,
  },
  timelineLabelUpcoming: {
    color: MUTED,
  },
  timelineLabelActive: {
    color: GOLD_LT,
    fontFamily: 'WorkSans_600SemiBold',
  },
  activeTag: {
    backgroundColor: '#2a1e00',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: GOLD,
  },
  activeTagText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 10,
    color: GOLD,
  },
  // Pulsing dot
  pulseDotWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pulseDotRing: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GOLD + '40',
  },
  pulseDotCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
  },
});

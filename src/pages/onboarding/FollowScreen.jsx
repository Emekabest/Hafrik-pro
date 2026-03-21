import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../theme/colors';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../AuthContext';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const DEFAULT_IMG = 'https://hafrik.com/default-avatar.png';

// ─── Horizontal card ─────────────────────────────────────────────────────────
const HCard = ({ item, selected, onToggle, round, actionLabel }) => {
  const isOn  = selected.has(item.id);
  const name  = item.name || item.title || item.username || '';
  const image = item.avatar || item.cover || item.logo || DEFAULT_IMG;

  return (
    <TouchableOpacity
      style={[styles.hCard, isOn && styles.hCardOn]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
    >
      <ExpoImage
        source={{ uri: image }}
        style={[styles.hImg, round && { borderRadius: 32 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <Text style={styles.hName} numberOfLines={2}>{name}</Text>
      <View style={[styles.hBtn, isOn && styles.hBtnOn]}>
        {isOn
          ? <Ionicons name="checkmark" size={13} color={WHITE} />
          : <Text style={styles.hBtnText}>{actionLabel}</Text>
        }
      </View>
    </TouchableOpacity>
  );
};

// ─── Section ─────────────────────────────────────────────────────────────────
const Section = ({ title, icon, items, selected, onToggle, round, actionLabel, loading }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={16} color={ACCENT} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading && <ActivityIndicator size="small" color={WHITE + '55'} />}
    </View>
    {!loading && items.length === 0 ? (
      <Text style={styles.emptyHint}>Nothing to show right now</Text>
    ) : (
      <FlatList
        data={items}
        horizontal
        keyExtractor={item => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        renderItem={({ item }) => (
          <HCard
            item={item}
            selected={selected}
            onToggle={onToggle}
            round={round}
            actionLabel={actionLabel}
          />
        )}
      />
    )}
  </View>
);

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function FollowScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const [people,      setPeople]      = useState([]);
  const [businesses,  setBusinesses]  = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loadingAll,  setLoadingAll]  = useState(true);

  const [selPeople,      setSelPeople]      = useState(new Set());
  const [selBusinesses,  setSelBusinesses]  = useState(new Set());
  const [selCommunities, setSelCommunities] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoadingAll(true);
    const [pplRes, bizRes, comRes] = await Promise.allSettled([
      apiClient.get('/people/list.php',      { params: { limit: 15 } }),
      apiClient.get('/business/list.php',    { params: { limit: 15 } }),
      apiClient.get('/communities/list.php', { params: { limit: 15 } }),
    ]);

    if (pplRes.status === 'fulfilled') {
      const d = pplRes.value.data?.data ?? pplRes.value.data ?? [];
      setPeople(Array.isArray(d) ? d : []);
    }
    if (bizRes.status === 'fulfilled') {
      const d = bizRes.value.data?.data?.data ?? bizRes.value.data?.data ?? bizRes.value.data ?? [];
      setBusinesses(Array.isArray(d) ? d : []);
    }
    if (comRes.status === 'fulfilled') {
      const d = comRes.value.data?.data ?? comRes.value.data ?? [];
      setCommunities(Array.isArray(d) ? d : []);
    }
    setLoadingAll(false);
  };

  const togglePeople      = useCallback(id => setSelPeople(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);
  const toggleBusinesses  = useCallback(id => setSelBusinesses(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);
  const toggleCommunities = useCallback(id => setSelCommunities(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);

  const totalSelected = selPeople.size + selBusinesses.size + selCommunities.size;

  const proceed = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (totalSelected > 0) {
        await apiClient.post('/onboarding/follow.php', {
          users:       Array.from(selPeople),
          pages:       Array.from(selBusinesses),
          communities: Array.from(selCommunities),
        });
      }
    } catch (e) {
      console.log('Onboarding follow error:', e);
    }
    setSubmitting(false);
    await updateOnboardingStep(4);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingCountry' }] });
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <View style={[styles.inner, { paddingTop: top + 20 }]}>
        {/* Progress */}
        <Text style={styles.stepLabel}>Step 2 of 4</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, i <= 2 && styles.progressDotOn]} />
          ))}
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>Find your people</Text>
          <Text style={styles.sub}>Follow people, businesses and communities you like</Text>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          <Section
            title="People you may know"
            icon="people-outline"
            items={people}
            selected={selPeople}
            onToggle={togglePeople}
            round
            actionLabel="Follow"
            loading={loadingAll}
          />
          <Section
            title="Businesses to follow"
            icon="storefront-outline"
            items={businesses}
            selected={selBusinesses}
            onToggle={toggleBusinesses}
            round={false}
            actionLabel="Like"
            loading={loadingAll}
          />
          <Section
            title="Communities to join"
            icon="people-circle-outline"
            items={communities}
            selected={selCommunities}
            onToggle={toggleCommunities}
            round={false}
            actionLabel="Join"
            loading={loadingAll}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: bottom + 16 }]}>
          {totalSelected > 0 && (
            <Text style={styles.count}>{totalSelected} selected</Text>
          )}
          <TouchableOpacity
            style={[styles.btn, submitting && { opacity: 0.7 }]}
            onPress={proceed}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={BRAND} />
              : <Text style={styles.btnText}>
                  {totalSelected > 0 ? `Continue with ${totalSelected}` : 'Continue'}
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={proceed} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
            <Ionicons name="chevron-forward" size={14} color={WHITE + 'AA'} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad:          { flex: 1 },
  inner:         { flex: 1, paddingHorizontal: 20 },
  stepLabel:     { fontSize: 12, color: WHITE + '88', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  progressRow:   { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center' },
  progressDot:   { width: 28, height: 4, borderRadius: 2, backgroundColor: WHITE + '33' },
  progressDotOn: { backgroundColor: WHITE },
  title:         { fontSize: 26, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 6 },
  sub:           { fontSize: 14, color: WHITE + 'CC', textAlign: 'center', marginBottom: 20, lineHeight: 21 },
  section:       { marginBottom: 24 },
  sectionHead:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: WHITE, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  emptyHint:     { color: WHITE + '44', fontSize: 13, paddingLeft: 4 },
  hCard:         { width: 110, marginRight: 10, alignItems: 'center', backgroundColor: WHITE + '0D', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'transparent' },
  hCardOn:       { backgroundColor: ACCENT + '22', borderColor: ACCENT + '55' },
  hImg:          { width: 64, height: 64, borderRadius: 8, backgroundColor: WHITE + '22', marginBottom: 8 },
  hName:         { fontSize: 12, fontWeight: '600', color: WHITE, textAlign: 'center', marginBottom: 8, lineHeight: 16 },
  hBtn:          { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: WHITE + '66' },
  hBtnOn:        { backgroundColor: ACCENT, borderColor: ACCENT },
  hBtnText:      { fontSize: 11, color: WHITE, fontWeight: '600' },
  footer:        { paddingTop: 8 },
  count:         { textAlign: 'center', color: WHITE + '88', fontSize: 13, marginBottom: 8 },
  btn:           { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnText:       { fontSize: 16, fontWeight: '700', color: BRAND },
  skipBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  skipText:      { fontSize: 14, color: WHITE + 'AA' },
});

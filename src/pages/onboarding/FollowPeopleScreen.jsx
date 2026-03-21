import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Animated,
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
const DEFAULT_AVATAR = 'https://hafrik.com/default-avatar.png';

const PersonCard = ({ item, selected, onToggle }) => {
  const isOn   = selected.has(item.id);
  const name   = item.name || item.username || '';
  const sub    = item.about || item.city || '';
  const avatar = item.avatar || DEFAULT_AVATAR;

  return (
    <TouchableOpacity
      style={[styles.card, isOn && styles.cardOn]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
    >
      <ExpoImage
        source={{ uri: avatar }}
        style={styles.avatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
        {!!sub && <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text>}
      </View>
      <View style={[styles.checkBox, isOn && styles.checkBoxOn]}>
        {isOn && <Ionicons name="checkmark" size={14} color={WHITE} />}
      </View>
    </TouchableOpacity>
  );
};

export default function FollowPeopleScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/suggestions.php', { params: { limit: 20 } });
      const d   = res.data?.data ?? res.data ?? [];
      setUsers(Array.isArray(d) ? d.slice(0, 20) : []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const proceed = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (selected.size > 0) {
        await apiClient.post('/onboarding/follow.php', {
          users: Array.from(selected),
        });
      }
    } catch (e) {
      console.log('Follow people error:', e);
    }
    setSubmitting(false);
    await updateOnboardingStep(4);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollowPages' }] });
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <View style={[styles.inner, { paddingTop: top + 20 }]}>
        {/* Progress */}
        <Text style={styles.stepLabel}>Step 2 of 3</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.progressDot, i <= 2 && styles.progressDotOn]} />
          ))}
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>Follow people</Text>
          <Text style={styles.sub}>Connect with people you may know or find interesting</Text>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={WHITE} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <PersonCard item={item} selected={selected} onToggle={toggle} />
            )}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
            ListEmptyComponent={
              <Text style={styles.empty}>No suggestions available</Text>
            }
          />
        )}

        <View style={[styles.footer, { paddingBottom: bottom + 16 }]}>
          {selected.size > 0 && (
            <Text style={styles.selectedCount}>{selected.size} selected</Text>
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
                  {selected.size > 0 ? `Follow ${selected.size} & Continue` : 'Continue'}
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
  progressRow:   { flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' },
  progressDot:   { width: 28, height: 4, borderRadius: 2, backgroundColor: WHITE + '33' },
  progressDotOn: { backgroundColor: WHITE },
  title:         { fontSize: 26, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 8 },
  sub:           { fontSize: 15, color: WHITE + 'CC', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  empty:         { color: WHITE + '55', fontSize: 14, textAlign: 'center', marginTop: 40 },
  card:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WHITE + '0D', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  cardOn:        { backgroundColor: ACCENT + '25', borderColor: ACCENT + '66' },
  avatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: WHITE + '22' },
  cardInfo:      { flex: 1 },
  cardName:      { fontSize: 15, fontWeight: '600', color: WHITE, marginBottom: 2 },
  cardSub:       { fontSize: 12, color: WHITE + '77' },
  checkBox:      { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: WHITE + '55', alignItems: 'center', justifyContent: 'center' },
  checkBoxOn:    { backgroundColor: ACCENT, borderColor: ACCENT },
  footer:        { paddingTop: 12 },
  selectedCount: { textAlign: 'center', color: WHITE + '99', fontSize: 13, marginBottom: 8 },
  btn:           { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnText:       { fontSize: 16, fontWeight: '700', color: BRAND },
  skipBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  skipText:      { fontSize: 14, color: WHITE + 'AA' },
});

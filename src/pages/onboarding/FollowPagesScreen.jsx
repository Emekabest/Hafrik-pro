import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated,
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
const DEFAULT_COVER = 'https://hafrik.com/default-avatar.png';

const ItemCard = ({ item, selected, onToggle, round }) => {
  const isOn   = selected.has(item.id);
  const name   = item.name || item.title || '';
  const sub    = item.about || item.category_name || item.city || '';
  const cover  = item.avatar || item.cover || DEFAULT_COVER;

  return (
    <TouchableOpacity
      style={[styles.card, isOn && styles.cardOn]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
    >
      <ExpoImage
        source={{ uri: cover }}
        style={[styles.avatar, round && { borderRadius: 24 }]}
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

const Section = ({ title, icon, items, selected, onToggle, round }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={ACCENT} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {items.map(item => (
      <ItemCard key={item.id} item={item} selected={selected} onToggle={onToggle} round={round} />
    ))}
  </View>
);

export default function FollowPagesScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const [pages,      setPages]      = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selPages,   setSelPages]   = useState(new Set());
  const [selGroups,  setSelGroups]  = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const [pagesRes, groupsRes] = await Promise.allSettled([
        apiClient.get('/business/list.php',  { params: { suggested: 1, limit: 10 } }),
        apiClient.get('/group/list.php',      { params: { suggested: 1, limit: 10 } }),
      ]);

      if (pagesRes.status === 'fulfilled') {
        const d = pagesRes.value.data?.data?.data ?? pagesRes.value.data?.data ?? pagesRes.value.data ?? [];
        setPages(Array.isArray(d) ? d.slice(0, 10) : []);
      }
      if (groupsRes.status === 'fulfilled') {
        const d = groupsRes.value.data?.data ?? groupsRes.value.data ?? [];
        setGroups(Array.isArray(d) ? d.slice(0, 10) : []);
      }
    } catch { }
    setLoading(false);
  };

  const togglePage  = useCallback(id => {
    setSelPages(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleGroup = useCallback(id => {
    setSelGroups(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const totalSelected = selPages.size + selGroups.size;

  const proceed = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (totalSelected > 0) {
        await apiClient.post('/onboarding/follow.php', {
          pages:  Array.from(selPages),
          groups: Array.from(selGroups),
        });
      }
    } catch (e) {
      console.log('Follow pages error:', e);
    }
    setSubmitting(false);
    await updateOnboardingStep(5);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingWelcome' }] });
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <View style={[styles.inner, { paddingTop: top + 20 }]}>
        {/* Progress */}
        <Text style={styles.stepLabel}>Step 3 of 3</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.progressDot, styles.progressDotOn]} />
          ))}
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>Join communities</Text>
          <Text style={styles.sub}>Follow pages and communities that match your interests</Text>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {loading ? (
            <ActivityIndicator size="large" color={WHITE} style={{ marginTop: 48 }} />
          ) : (
            <>
              {pages.length > 0 && (
                <Section
                  title="Business Pages"
                  icon="storefront-outline"
                  items={pages}
                  selected={selPages}
                  onToggle={togglePage}
                  round={false}
                />
              )}
              {groups.length > 0 && (
                <Section
                  title="Communities"
                  icon="people-circle-outline"
                  items={groups}
                  selected={selGroups}
                  onToggle={toggleGroup}
                  round={true}
                />
              )}
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: bottom + 16 }]}>
          {totalSelected > 0 && (
            <Text style={styles.selectedCount}>{totalSelected} selected</Text>
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
                  {totalSelected > 0 ? `Join ${totalSelected} & Continue` : 'Continue'}
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
  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: WHITE, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:          { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WHITE + '0D', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  cardOn:        { backgroundColor: ACCENT + '25', borderColor: ACCENT + '66' },
  avatar:        { width: 48, height: 48, borderRadius: 8, backgroundColor: WHITE + '22' },
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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../theme/colors';
import apiClient from '../../api/apiClient';
import useStore from '../../repository/store';
import { useAuth } from '../../AuthContext';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const MUTED  = Colors.secondaryText;

const STEP_LABEL = 'Step 4 of 4';
const DEFAULT_AVATAR = 'https://hafrik.com/default-avatar.png';

// ─── Card ─────────────────────────────────────────────────────────────────────
const SuggestionCard = ({ item, selected, onToggle, type }) => {
  const isOn = selected.has(item.id);
  const avatar = item.avatar || item.cover || DEFAULT_AVATAR;
  const name   = item.name || item.title || item.username || '';
  const sub    = item.about || item.category_name || item.city || '';

  return (
    <TouchableOpacity
      style={[styles.card, isOn && styles.cardOn]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
    >
      <ExpoImage
        source={{ uri: avatar }}
        style={type === 'user' ? styles.avatarCircle : styles.avatarSquare}
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

// ─── Section ──────────────────────────────────────────────────────────────────
const Section = ({ title, icon, items, selected, onToggle, type, loading }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={ACCENT} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading && <ActivityIndicator size="small" color={WHITE + '66'} />}
    </View>
    {items.map(item => (
      <SuggestionCard key={item.id} item={item} selected={selected} onToggle={onToggle} type={type} />
    ))}
    {!loading && items.length === 0 && (
      <Text style={styles.emptySection}>No suggestions available</Text>
    )}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function FollowSuggestionsScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const [users,       setUsers]       = useState([]);
  const [pages,       setPages]       = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [loadingAll,  setLoadingAll]  = useState(true);
  const [selectedUsers,  setSelectedUsers]  = useState(new Set());
  const [selectedPages,  setSelectedPages]  = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoadingAll(true);
    try {
      const [usersRes, pagesRes, groupsRes] = await Promise.allSettled([
        apiClient.get('/users/suggestions.php', { params: { limit: 8 } }),
        apiClient.get('/business/list.php',     { params: { suggested: 1, limit: 8 } }),
        apiClient.get('/group/list.php',         { params: { suggested: 1, limit: 8 } }),
      ]);

      if (usersRes.status === 'fulfilled') {
        const d = usersRes.value.data?.data ?? usersRes.value.data ?? [];
        setUsers(Array.isArray(d) ? d.slice(0, 8) : []);
      }
      if (pagesRes.status === 'fulfilled') {
        const d = pagesRes.value.data?.data?.data ?? pagesRes.value.data?.data ?? pagesRes.value.data ?? [];
        setPages(Array.isArray(d) ? d.slice(0, 8) : []);
      }
      if (groupsRes.status === 'fulfilled') {
        const d = groupsRes.value.data?.data ?? groupsRes.value.data ?? [];
        setGroups(Array.isArray(d) ? d.slice(0, 8) : []);
      }
    } catch (e) {
      console.log('Fetch suggestions error:', e);
    }
    setLoadingAll(false);
  };

  const toggle = useCallback((setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const totalSelected = selectedUsers.size + selectedPages.size + selectedGroups.size;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post('/onboarding/follow.php', {
        users:  Array.from(selectedUsers),
        pages:  Array.from(selectedPages),
        groups: Array.from(selectedGroups),
      });
    } catch (e) {
      console.log('Onboarding follow error:', e);
    }
    setSubmitting(false);
    // Show welcome modal then go to MainTabs
    await updateOnboardingStep(6);
    useStore.getState().setShowWelcomeModal?.(true);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const skip = async () => {
    await updateOnboardingStep(6);
    useStore.getState().setShowWelcomeModal?.(true);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <View style={[styles.inner, { paddingTop: top + 20 }]}>
        {/* Progress */}
        <Text style={styles.stepLabel}>{STEP_LABEL}</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, styles.progressDotOn]} />
          ))}
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>Follow to fill your feed</Text>
          <Text style={styles.sub}>Select people, pages and communities to follow. You can change these any time.</Text>
        </Animated.View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {loadingAll ? (
            <ActivityIndicator size="large" color={WHITE} style={{ marginTop: 40 }} />
          ) : (
            <>
              {users.length > 0 && (
                <Section
                  title="People you may know"
                  icon="people-outline"
                  items={users}
                  selected={selectedUsers}
                  onToggle={(id) => toggle(setSelectedUsers, id)}
                  type="user"
                  loading={false}
                />
              )}
              {pages.length > 0 && (
                <Section
                  title="Business Pages"
                  icon="storefront-outline"
                  items={pages}
                  selected={selectedPages}
                  onToggle={(id) => toggle(setSelectedPages, id)}
                  type="page"
                  loading={false}
                />
              )}
              {groups.length > 0 && (
                <Section
                  title="Communities"
                  icon="people-circle-outline"
                  items={groups}
                  selected={selectedGroups}
                  onToggle={(id) => toggle(setSelectedGroups, id)}
                  type="group"
                  loading={false}
                />
              )}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: bottom + 16 }]}>
          {totalSelected > 0 && (
            <Text style={styles.selectedCount}>
              {totalSelected} selected
            </Text>
          )}
          <TouchableOpacity
            style={[styles.btn, submitting && { opacity: 0.7 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={BRAND} />
              : <Text style={styles.btnText}>
                  {totalSelected > 0 ? `Follow ${totalSelected} & Continue` : 'Done'}
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
            <Ionicons name="chevron-forward" size={14} color={WHITE + 'AA'} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad:            { flex: 1 },
  inner:           { flex: 1, paddingHorizontal: 20 },
  stepLabel:       { fontSize: 12, color: WHITE + '88', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  progressRow:     { flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' },
  progressDot:     { width: 28, height: 4, borderRadius: 2, backgroundColor: WHITE + '33' },
  progressDotOn:   { backgroundColor: WHITE },
  title:           { fontSize: 24, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 8 },
  sub:             { fontSize: 14, color: WHITE + 'CC', textAlign: 'center', marginBottom: 20, lineHeight: 21 },
  section:         { marginBottom: 24 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle:    { fontSize: 14, fontWeight: '700', color: WHITE, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  emptySection:    { color: WHITE + '55', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  card:            { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: WHITE + '0D', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  cardOn:          { backgroundColor: ACCENT + '25', borderColor: ACCENT + '66' },
  avatarCircle:    { width: 44, height: 44, borderRadius: 22, backgroundColor: WHITE + '22' },
  avatarSquare:    { width: 44, height: 44, borderRadius: 8, backgroundColor: WHITE + '22' },
  cardInfo:        { flex: 1 },
  cardName:        { fontSize: 14, fontWeight: '600', color: WHITE, marginBottom: 2 },
  cardSub:         { fontSize: 12, color: WHITE + '77' },
  checkBox:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: WHITE + '55', alignItems: 'center', justifyContent: 'center' },
  checkBoxOn:      { backgroundColor: ACCENT, borderColor: ACCENT },
  footer:          { paddingTop: 12 },
  selectedCount:   { textAlign: 'center', color: WHITE + '99', fontSize: 13, marginBottom: 10 },
  btn:             { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnText:         { fontSize: 16, fontWeight: '700', color: BRAND },
  skipBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  skipText:        { fontSize: 14, color: WHITE + 'AA' },
});

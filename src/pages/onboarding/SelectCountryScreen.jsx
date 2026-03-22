import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  TextInput, ActivityIndicator, Animated, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../AuthContext';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;

export default function SelectCountryScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const [query,     setQuery]     = useState('');
  const [countries, setCountries] = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [saving,    setSaving]    = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const res  = await apiClient.get('/location/countries.php');
      const data = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setCountries(list);
      setFiltered(list);
    } catch {
      setCountries([]);
      setFiltered([]);
    }
    setLoading(false);
  };

  const onSearch = useCallback((text) => {
    setQuery(text);
    const q = text.toLowerCase().trim();
    setFiltered(
      q ? countries.filter(c => c.name?.toLowerCase().includes(q)) : countries
    );
  }, [countries]);

  const submit = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await apiClient.post('/profile/update.php', { user_country: selected.name });
    } catch (e) {
      console.log('Set country error:', e);
    }
    setSaving(false);
    await updateOnboardingStep(5);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingWelcome' }] });
  };

  const skip = async () => {
    await updateOnboardingStep(5);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingWelcome' }] });
  };

  const renderCountry = ({ item }) => {
    const isSelected = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => setSelected(isSelected ? null : item)}
        activeOpacity={0.75}
      >
        {item.emoji ? (
          <Text style={styles.flag}>{item.emoji}</Text>
        ) : (
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'earth-outline'}
            size={18}
            color={isSelected ? WHITE : WHITE + '88'}
          />
        )}
        <Text style={[styles.rowName, isSelected && { color: WHITE }]}>{item.name}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inner, { paddingTop: top + 20 }]}>
          {/* Progress */}
          <Text style={styles.stepLabel}>Step 4 of 4</Text>
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.progressDot, styles.progressDotOn]} />
            ))}
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
            <Text style={styles.title}>Where are you currently?</Text>
            <Text style={styles.sub}>This helps us show you relevant content and people near you</Text>
          </Animated.View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={WHITE + '88'} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country…"
              placeholderTextColor={WHITE + '55'}
              value={query}
              onChangeText={onSearch}
              returnKeyType="search"
            />
            {loading && <ActivityIndicator size="small" color={WHITE + '88'} />}
          </View>

          {/* Selected badge */}
          {selected && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={15} color={ACCENT} />
              <Text style={styles.badgeText}>{selected.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={15} color={WHITE + 'AA'} />
              </TouchableOpacity>
            </View>
          )}

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={renderCountry}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading && (
                <Text style={styles.empty}>{query ? 'No countries found' : 'Loading…'}</Text>
              )
            }
          />

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.btn, (!selected || saving) && styles.btnDisabled]}
              onPress={submit}
              disabled={!selected || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={BRAND} />
                : <Text style={styles.btnText}>Continue</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip for now</Text>
              <Ionicons name="chevron-forward" size={14} color={WHITE + 'AA'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  title:         { fontSize: 24, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 8 },
  sub:           { fontSize: 14, color: WHITE + 'CC', textAlign: 'center', marginBottom: 20, lineHeight: 21 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE + '1A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: WHITE + '33' },
  searchInput:   { flex: 1, fontSize: 15, color: WHITE, padding: 0 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT + '30', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: ACCENT + '66' },
  badgeText:     { fontSize: 14, color: WHITE, fontWeight: '600', flex: 1 },
  list:          { flex: 1 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4, backgroundColor: WHITE + '0D' },
  rowSelected:   { backgroundColor: ACCENT + '35', borderWidth: 1, borderColor: ACCENT + '88' },
  flag:          { fontSize: 20, width: 28, textAlign: 'center' },
  rowName:       { fontSize: 15, color: WHITE + 'BB', fontWeight: '500', flex: 1 },
  empty:         { color: WHITE + '55', fontSize: 14, textAlign: 'center', marginTop: 32 },
  footer:        { paddingTop: 12 },
  btn:           { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnDisabled:   { opacity: 0.45 },
  btnText:       { fontSize: 16, fontWeight: '700', color: BRAND },
  skipBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  skipText:      { fontSize: 14, color: WHITE + 'AA' },
});

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
const MUTED  = Colors.secondaryText;

const STEP_LABEL = 'Step 3 of 4';

export default function SelectCityScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { updateOnboardingStep } = useAuth();

  const [query,    setQuery]    = useState('');
  const [cities,   setCities]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const debounceRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    fetchCities('');
  }, []);

  const fetchCities = useCallback(async (search) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/location/cities.php', { params: { search, limit: 30 } });
      const data = res.data?.data ?? res.data ?? [];
      setCities(Array.isArray(data) ? data : []);
    } catch {
      setCities([]);
    }
    setLoading(false);
  }, []);

  const onSearch = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCities(text), 350);
  };

  const submit = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await apiClient.post('/profile/city.php', { city_id: selected.id });
    } catch (e) {
      console.log('Set city error:', e);
    }
    setSaving(false);
    await updateOnboardingStep(4);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
  };

  const skip = async () => {
    await updateOnboardingStep(4);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
  };

  const renderCity = ({ item }) => {
    const isSelected = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.cityRow, isSelected && styles.cityRowSelected]}
        onPress={() => setSelected(isSelected ? null : item)}
        activeOpacity={0.75}
      >
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'location-outline'}
          size={18}
          color={isSelected ? WHITE : WHITE + '88'}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cityName, isSelected && { color: WHITE }]}>{item.name}</Text>
          {!!item.country_name && (
            <Text style={styles.cityCountry}>{item.country_name}</Text>
          )}
        </View>
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
          <Text style={styles.stepLabel}>{STEP_LABEL}</Text>
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.progressDot, i <= 3 && styles.progressDotOn]} />
            ))}
          </View>

          <Animated.View style={[{ width: '100%', alignItems: 'center' }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>Where are you based?</Text>
            <Text style={styles.sub}>Choose your city to see local content, businesses and communities near you.</Text>
          </Animated.View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={WHITE + '88'} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city…"
              placeholderTextColor={WHITE + '66'}
              value={query}
              onChangeText={onSearch}
              returnKeyType="search"
            />
            {loading && <ActivityIndicator size="small" color={WHITE + '88'} />}
          </View>

          {/* City list */}
          {selected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
              <Text style={styles.selectedText}>{selected.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={WHITE + 'AA'} />
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={cities}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCity}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !loading && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{query ? 'No cities found' : 'Start typing to search'}</Text>
                </View>
              )
            }
          />

          {/* Buttons */}
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
  grad:             { flex: 1 },
  inner:            { flex: 1, paddingHorizontal: 20 },
  stepLabel:        { fontSize: 12, color: WHITE + '88', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  progressRow:      { flexDirection: 'row', gap: 8, marginBottom: 24, justifyContent: 'center' },
  progressDot:      { width: 28, height: 4, borderRadius: 2, backgroundColor: WHITE + '33' },
  progressDotOn:    { backgroundColor: WHITE },
  title:            { fontSize: 24, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 8 },
  sub:              { fontSize: 14, color: WHITE + 'CC', textAlign: 'center', marginBottom: 20, lineHeight: 21 },
  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE + '1A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: WHITE + '33' },
  searchInput:      { flex: 1, fontSize: 15, color: WHITE, padding: 0 },
  selectedBadge:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT + '33', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: ACCENT + '66' },
  selectedText:     { fontSize: 14, color: WHITE, fontWeight: '600', flex: 1 },
  list:             { flex: 1 },
  cityRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4, backgroundColor: WHITE + '0D' },
  cityRowSelected:  { backgroundColor: ACCENT + '40', borderWidth: 1, borderColor: ACCENT + '88' },
  cityName:         { fontSize: 15, color: WHITE + 'CC', fontWeight: '500' },
  cityCountry:      { fontSize: 12, color: WHITE + '66', marginTop: 1 },
  empty:            { alignItems: 'center', paddingTop: 40 },
  emptyText:        { color: WHITE + '66', fontSize: 14 },
  footer:           { width: '100%', paddingTop: 12 },
  btn:              { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnDisabled:      { opacity: 0.45 },
  btnText:          { fontSize: 16, fontWeight: '700', color: BRAND },
  skipBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  skipText:         { fontSize: 14, color: WHITE + 'AA' },
});

// src/pages/cityguide/CityGuideHomeScreen.jsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CITIES, FILTER_TAGS } from './citydata';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

// ── Palette ───────────────────────────────────────────────────────────────────
const BG      = '#f5f7fa';
const WHITE   = '#ffffff';
const DARK    = '#111827';
const MUTED   = '#6b7280';
const ACCENT  = '#1f8e93';
const BRAND   = '#0c3f44';
const BORDER  = '#e5e7eb';

// ── City Card ─────────────────────────────────────────────────────────────────
const CityCard = ({ city, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.88}
    onPress={() => onPress(city)}
    style={styles.card}
  >
    {city.image ? (
      <ImageBackground
        source={{ uri: city.image }}
        style={styles.cardGrad}
        imageStyle={styles.cardImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={styles.cardImageOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Text style={styles.cardEmoji}>{city.emoji}</Text>
          <View style={styles.cardOverlay}>
            <Text style={styles.cardName} numberOfLines={1}>{city.name}</Text>
            <Text style={styles.cardProvince} numberOfLines={1}>{city.province}</Text>
            <Text style={styles.cardPop} numberOfLines={1}>Pop. {city.population}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    ) : (
      <LinearGradient
        colors={city.headerGrad}
        style={styles.cardGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.cardEmoji}>{city.emoji}</Text>
        <View style={styles.cardOverlay}>
          <Text style={styles.cardName} numberOfLines={1}>{city.name}</Text>
          <Text style={styles.cardProvince} numberOfLines={1}>{city.province}</Text>
          <Text style={styles.cardPop} numberOfLines={1}>Pop. {city.population}</Text>
        </View>
      </LinearGradient>
    )}
    <View style={styles.cardBottom}>
      <View style={styles.cardTags}>
        {city.tags.slice(0, 2).map(tag => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
      <Ionicons name="chevron-forward" size={13} color={MUTED} />
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function CityGuideHomeScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [query,     setQuery]     = useState('');
  const [activeTag, setActiveTag] = useState('all');

  const filtered = useMemo(() => {
    let list = CITIES;
    if (activeTag !== 'all') {
      list = list.filter(c => c.tags.includes(activeTag));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q),
      );
    }
    return list;
  }, [query, activeTag]);

  const handleCityPress = useCallback((city) => {
    navigation.navigate('CityDetail', { cityId: city.id });
  }, [navigation]);

  const renderCity = useCallback(({ item }) => (
    <CityCard city={item} onPress={handleCityPress} />
  ), [handleCityPress]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent />

      {/* ── Header ── */}
      <LinearGradient colors={[BRAND, '#0f5060']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>City Guide</Text>
          <Text style={styles.headerSub}>China — Discover your city</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeTxt}>🇨🇳</Text>
        </View>
      </LinearGradient>

      {/* ── White content area ── */}
      <View style={styles.content}>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city (Beijing, Shanghai…)"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter chips ── */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TAGS.map(tag => {
            const active = activeTag === tag.key;
            return (
              <TouchableOpacity
                key={tag.key}
                activeOpacity={0.8}
                onPress={() => setActiveTag(tag.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Result count ── */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} {filtered.length === 1 ? 'city' : 'cities'}
        </Text>
        <Text style={styles.countSubText}>Tap a city for full details</Text>
      </View>

      {/* ── Grid ── */}
      <FlatList
        data={filtered}
        renderItem={renderCity}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No cities found</Text>
            <Text style={styles.emptySubText}>Try a different search or filter</Text>
          </View>
        }
      />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND,
  },
  content: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHITE + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: WHITE + 'aa',
    fontSize: 11,
    marginTop: 1,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeTxt: { fontSize: 22 },

  // ── Search ──
  searchWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: DARK,
    padding: 0,
  },

  // ── Filters ──
  filterContainer: {
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  filterRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  chipTextActive: {
    color: WHITE,
  },

  // ── Count ──
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 12.5,
    color: DARK,
    fontWeight: '700',
  },
  countSubText: {
    fontSize: 11,
    color: MUTED,
  },

  // ── Grid ──
  listContent: {
    paddingHorizontal: 14,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_W,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGrad: {
    height: 140,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardImage: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardImageOverlay: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardOverlay: {
    gap: 1,
  },
  cardName: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
    textShadowColor: '#00000055',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardProvince: {
    color: WHITE + 'dd',
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardPop: {
    color: WHITE + 'bb',
    fontSize: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: WHITE,
  },
  cardTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: ACCENT + '16',
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: ACCENT,
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: MUTED,
  },
});

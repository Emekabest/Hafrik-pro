import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import GetCountriesController from "../../controllers/countriescontroller/getcountriescontroller";
import { useAuth } from "../../AuthContext";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GetFeedsController from "../../controllers/getfeedscontroller.js";
import { Colors } from '../../theme/colors';
import { Image as ExpoImage } from 'expo-image';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

// ─── Design tokens ──────────────────────────────────────────────────────────────
const BRAND      = Colors.primaryDark;
const ACCENT     = Colors.primary;
const LIME       = Colors.brandLime;
const BORDER     = Colors.borderSoft;
const TEXT_MUTED = Colors.mutedBlueGrayDeep;

const ALL_COUNTRY = { country_id: 'all', name: 'All Countries' };

// ─── Normalise a country object to always use country_id ─────────────────────
const normaliseCountry = (c) => ({
  country_id: c?.country_id ?? c?.id ?? 'all',
  name: c?.name || c?.title || c?.country_name || c?.country || 'All Countries',
});

// ─── Compact Inline Ad Slot ─────────────────────────────────────────────────────
const InlineAdSlot = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [ad, setAd] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!token) return;
    fetch('https://hafrik.com/api/v1/ads/list.php', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const raw = d?.data;
        const list = Array.isArray(raw) ? raw : (raw?.id ? [raw] : []);
        if (list.length > 0) {
          setAd(list[Math.floor(Math.random() * list.length)]);
          Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        }
      })
      .catch(() => {});
  }, [token]);

  if (!ad) return null;

  const title = ad.title || ad.name || 'Sponsored';
  const desc  = ad.description || ad.text || ad.body || '';
  const image = ad.image || ad.cover || ad.banner || ad.media_url || null;
  const url   = ad.url || ad.link || ad.redirect_url || null;

  return (
    <Animated.View style={[styles.adSlot, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.adCard}
        activeOpacity={0.85}
        onPress={() => {
          if (url) navigation.navigate('WebView', { url, title });
        }}
      >
        {image ? (
          <ExpoImage source={{ uri: image }} style={styles.adImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.adImage, styles.adImageFallback]}>
            <Ionicons name="megaphone" size={14} color={ACCENT} />
          </View>
        )}
        <View style={styles.adTextWrap}>
          <View style={styles.adSponsoredRow}>
            <Ionicons name="megaphone-outline" size={9} color={ACCENT} />
            <Text style={styles.adSponsoredLabel}>Sponsored</Text>
          </View>
          <Text style={styles.adTitle} numberOfLines={1}>{title}</Text>
          {!!desc && <Text style={styles.adDesc} numberOfLines={1}>{desc}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={14} color={TEXT_MUTED} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── FeedsHeader ────────────────────────────────────────────────────────────────
const FeedsHeader = ({ name, id }) => {
  const { token } = useAuth();

  const [countries,           setCountries]           = useState([]);
  const [selectedCountry,     setSelectedCountry]     = useState(ALL_COUNTRY);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [search,              setSearch]              = useState('');
  const [loading,             setLoading]             = useState(false);

  const clearFeedsList_store  = useStore((state) => state.clearFeedsList);
  const addFeedsToList_store  = useStore((state) => state.addFeedsToList);
  const triggerRefresh        = useStore((state) => state.triggerRefresh);
  const setSelectedCountryId  = useStore((state) => state.setSelectedCountryId);

  // ── Load countries from API ──────────────────────────────────────────────
  useEffect(() => {
    GetCountriesController(token).then((response) => {
      if (response.status === 200) {
        const remote = Array.isArray(response.data?.countries)
          ? response.data.countries
          : Array.isArray(response.data)
          ? response.data
          : [];
        setCountries([ALL_COUNTRY, ...remote.map(normaliseCountry)]);
      } else {
        setCountries([ALL_COUNTRY]);
      }
    }).catch(() => setCountries([ALL_COUNTRY]));
  }, []);

  // ── Restore previously saved country ────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('selected_country').then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed) {
            const norm = normaliseCountry(parsed);
            setSelectedCountry(norm);
            // Sync into Zustand so all tabs build the right apiUrl immediately
            setSelectedCountryId(norm.country_id);
          }
        } catch {}
      }
    });
  }, []);

  // ── Select a country, wait for save, then reload ALL feeds ──────────────
  const handleSelectCountry = useCallback(async (country) => {
    const normalised = normaliseCountry(country);
    setSelectedCountry(normalised);
    setCountryModalVisible(false);
    setSearch('');
    setLoading(true);

    // ① Persist FIRST — GetFeedsController reads AsyncStorage, so we must await
    await AsyncStorage.setItem('selected_country', JSON.stringify(normalised));

    // ② Push to Zustand so apiUrl rebuilds reactively in all UnifiedFeedScreen tabs
    setSelectedCountryId(normalised.country_id);

    // ② Reload this tab's feed immediately
    let API;
    if (id === 'recentUpdateFeeds')    API = AppDetails.apis.recentUpdateApi;
    else if (id === 'trendingFeeds')   API = AppDetails.apis.trendingApi;
    else if (id === 'whatsNearbyFeeds') API = AppDetails.apis.whatsnearbyApi;
    // Unified feed tabs
    else if (id === 'forYouFeeds')     API = `${AppDetails.apis.feedApi}?get=newsfeed`;
    else if (id === 'discoverFeeds')   API = `${AppDetails.apis.feedApi}?get=discover`;
    else if (id === 'popularFeeds')    API = `${AppDetails.apis.feedApi}?get=popular`;
    else if (id === 'followingFeeds')  API = `${AppDetails.apis.feedApi}?get=following`;
    else if (id === 'reelsFeeds')      API = `${AppDetails.apis.feedApi}?get=reels`;
    else if (id === 'watchFeeds')      API = `${AppDetails.apis.feedApi}?get=watch`;

    if (API) {
      clearFeedsList_store(id);
      const response = await GetFeedsController(API, token, 1);
      if (response.status === 200) {
        addFeedsToList_store(id, response.data);
      }
    }

    setLoading(false);

    // ③ Trigger a global refresh so the other tabs also reload with the new filter
    triggerRefresh();
  }, [id, token, clearFeedsList_store, addFeedsToList_store, triggerRefresh, setSelectedCountryId]);

  // ── Filtered country list for the search box ─────────────────────────────
  const filteredCountries = search.trim()
    ? countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : countries;

  const isActive = selectedCountry?.country_id !== 'all';

  return (
    <View>
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        {/* Feed title */}
        <Text style={styles.headerName}>{name}</Text>

        {/* Filter pill */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.filterPill, isActive && styles.filterPillActive]}
          onPress={() => setCountryModalVisible(true)}
        >
          {loading
            ? <ActivityIndicator size={12} color={isActive ? Colors.white : BRAND} style={{ marginRight: 4 }} />
            : <Ionicons name="earth-outline" size={14} color={isActive ? Colors.white : BRAND} />
          }
          <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]} numberOfLines={1}>
            {isActive ? selectedCountry.name : 'All Countries'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={isActive ? Colors.white : BRAND} />
        </TouchableOpacity>
      </View>

      {/* ── Active filter indicator ── */}
      {isActive && (
        <View style={styles.filterIndicator}>
          <Ionicons name="funnel" size={10} color={ACCENT} />
          <Text style={styles.filterIndicatorText}>
            Posts from {selectedCountry.name}
          </Text>
          <TouchableOpacity onPress={() => handleSelectCountry(ALL_COUNTRY)} hitSlop={8}>
            <Ionicons name="close-circle" size={14} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Compact inline ad ── */}
      <InlineAdSlot />

      {/* ── Country Picker Modal ── */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setCountryModalVisible(false); setSearch(''); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => { setCountryModalVisible(false); setSearch(''); }} />
          <View style={styles.modalContainer}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Title */}
            <Text style={styles.modalTitle}>Filter by Country</Text>
            <Text style={styles.modalSubtitle}>
              Only posts from the selected country will appear in your feed.
            </Text>

            {/* Search */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={15} color={TEXT_MUTED} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries..."
                placeholderTextColor={TEXT_MUTED}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              )}
            </View>

            {/* Country list */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(c, i) => (c.country_id ? String(c.country_id) : String(i))}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedCountry?.country_id === item.country_id;
                return (
                  <Pressable
                    onPress={() => handleSelectCountry(item)}
                    style={({ pressed }) => [
                      styles.countryItem,
                      isSelected && styles.countryItemSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons
                      name={item.country_id === 'all' ? 'earth' : 'location-outline'}
                      size={16}
                      color={isSelected ? ACCENT : TEXT_MUTED}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.countryText, isSelected && styles.countryTextSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                    )}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No countries found</Text>
              }
            />

            {/* Close */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => { setCountryModalVisible(false); setSearch(''); }}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Header row ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerName: {
    fontSize: 18,
    fontFamily: 'ReadexPro_600SemiBold',
    color: BRAND,
    letterSpacing: -0.4,
    flex: 1,
  },

  // ── Filter pill ──────────────────────────────────────────────────────────────
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: Colors.surfaceCoolAlt,
    borderWidth: 1,
    borderColor: BORDER,
    maxWidth: 170,
  },
  filterPillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'ReadexPro_500Medium',
    color: BRAND,
    flexShrink: 1,
  },
  filterPillTextActive: {
    color: Colors.white,
  },

  // ── Active filter indicator ───────────────────────────────────────────────
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterIndicatorText: {
    fontSize: 11.5,
    color: ACCENT,
    fontFamily: 'ReadexPro_500Medium',
    flex: 1,
  },

  // ── Inline ad slot ────────────────────────────────────────────────────────
  adSlot: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  adCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCoolAlt ?? '#F4F6F8',
    borderRadius: 12,
    padding: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  adImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  adImageFallback: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  adTextWrap: {
    flex: 1,
  },
  adSponsoredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 1,
  },
  adSponsoredLabel: {
    fontSize: 9,
    fontFamily: 'ReadexPro_500Medium',
    color: ACCENT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  adTitle: {
    fontSize: 12,
    fontFamily: 'ReadexPro_600SemiBold',
    color: BRAND,
  },
  adDesc: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontFamily: 'ReadexPro_400Regular',
    marginTop: 1,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: withOpacity(Colors.black, 0.45),
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 10,
    maxHeight: '78%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'ReadexPro_600SemiBold',
    color: BRAND,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontFamily: 'ReadexPro_400Regular',
    marginBottom: 14,
    lineHeight: 17,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCoolAlt ?? '#F4F6F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BRAND,
    fontFamily: 'ReadexPro_400Regular',
  },

  // Country list
  countryItem: {
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  countryItemSelected: {
    backgroundColor: withOpacity(ACCENT, 0.07),
    paddingHorizontal: 8,
  },
  countryText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'ReadexPro_400Regular',
    color: BRAND,
  },
  countryTextSelected: {
    fontFamily: 'ReadexPro_600SemiBold',
    color: ACCENT,
  },
  separator: { height: 1, backgroundColor: Colors.surfaceTint ?? '#F5F5F5' },
  emptyText: {
    textAlign: 'center',
    color: TEXT_MUTED,
    fontSize: 13,
    paddingVertical: 24,
  },

  // Close / done button
  modalClose: {
    marginTop: 14,
    backgroundColor: BRAND,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
  },
  modalCloseText: {
    color: Colors.white,
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 14,
  },
});

export default FeedsHeader;

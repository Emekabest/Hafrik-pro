import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState, useRef } from "react";
import {
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Animated,
} from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GetCountriesController from "../../controllers/countriescontroller/getcountriescontroller";
import { useAuth } from "../../AuthContext";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GetFeedsController from "../../controllers/getfeedscontroller.js";
import SvgIcon from "../../assl.js/svg/svg.jsx";

// ─── Design tokens ──────────────────────────────────────────────────────────────
const BRAND      = "#0C3F44";
const ACCENT     = "#13C296";
const LIME       = "#A8E063";
const BORDER     = "#E4EEEF";
const TEXT_MUTED = "#6b7c7d";

// ─── CTA data ───────────────────────────────────────────────────────────────────
const CTAS = [
  {
    icon: "🌍",
    title: "Discover African Businesses",
    sub: "Shop products & services from the community",
    btn: "Explore",
    link: "https://hafrik.com/market",
    colors: [BRAND, "#0a5a62"],
  },
  {
    icon: "👥",
    title: "Join Hafrik Communities",
    sub: "Connect with Africans in your city",
    btn: "Find",
    link: "https://hafrik.com/groups",
    colors: [ACCENT, "#0fa882"],
  },
  {
    icon: "🏪",
    title: "Open a Business Page",
    sub: "Promote your brand to thousands",
    btn: "Create",
    link: "https://hafrik.com/pages/manage",
    colors: ["#0B8557", "#13C296"],
  },
  {
    icon: "✅",
    title: "Get Verified to Sell",
    sub: "Build trust and unlock selling features",
    btn: "Verify",
    link: "https://hafrik.com/settings/verification",
    colors: ["#F59E0B", "#F97316"],
  },
  {
    icon: "🛍️",
    title: "Start Selling on Hafrik",
    sub: "List your products in the marketplace",
    btn: "Sell",
    link: "https://hafrik.com/market/sales",
    colors: ["#8B5CF6", "#6D28D9"],
  },
  {
    icon: "📅",
    title: "Discover Events Near You",
    sub: "Find meetups, parties and community events",
    btn: "View",
    link: "https://hafrik.com/events",
    colors: ["#EC4899", "#BE185D"],
  },
  {
    icon: "⭐",
    title: "Upgrade to Hafrik Pro",
    sub: "Unlock premium features and more visibility",
    btn: "Upgrade",
    link: "https://hafrik.com/pro",
    colors: [BRAND, "#073b40"],
  },
];

// ─── Rotating CTA Banner ────────────────────────────────────────────────────────
const CTABanner = () => {
  const navigation = useNavigation();
  const [cta, setCta] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const random = CTAS[Math.floor(Math.random() * CTAS.length)];
    setCta(random);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!cta) return null;

  return (
    <Animated.View style={[styles.ctaWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate("WebView", { url: cta.link })}
        style={styles.ctaCard}
      >
        {/* Left icon bubble */}
        <LinearGradient
          colors={cta.colors}
          style={styles.ctaIconBubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.ctaEmoji}>{cta.icon}</Text>
        </LinearGradient>

        {/* Text */}
        <View style={styles.ctaText}>
          <Text style={styles.ctaTitle} numberOfLines={1}>{cta.title}</Text>
          <Text style={styles.ctaSub} numberOfLines={1}>{cta.sub}</Text>
        </View>

        {/* Button */}
        <LinearGradient
          colors={cta.colors}
          style={styles.ctaBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.ctaBtnText}>{cta.btn}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── FeedsHeader ────────────────────────────────────────────────────────────────
const FeedsHeader = ({ name, id }) => {
  const { token } = useAuth();

  const [countries,            setCountries]            = useState([]);
  const [selectedCountry,      setSelectedCountry]      = useState({ country_id: "all", name: "All" });
  const [countryModalVisible,  setCountryModalVisible]  = useState(false);

  const addFeedsToList_store = useStore((state) => state.addFeedsToList);
  const triggerRefresh       = useStore((state) => state.triggerRefresh);

  useEffect(() => {
    const getData = async () => {
      const response = await GetCountriesController(token);
      if (response.status === 200) {
        const remote = Array.isArray(response.data.countries) ? response.data.countries : [];
        setCountries([{ id: "all", name: "All" }, ...remote]);
      } else {
        setCountries([{ id: "all", name: "All" }]);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem("selected_country");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) setSelectedCountry(parsed);
        }
      } catch (e) {}
    };
    load();
  }, []);

  const handleSelectCountry = async (country) => {
    AsyncStorage.setItem("selected_country", JSON.stringify(country));

    let API;
    if (id === "recentUpdateFeeds")   API = AppDetails.apis.recentUpdateApi;
    else if (id === "trendingFeeds")  API = AppDetails.apis.trendingApi;
    else if (id === "whatsNearbyFeeds") API = AppDetails.apis.whatsnearbyApi;

    const response = await GetFeedsController(API, token);
    if (response.status === 200) {
      addFeedsToList_store(id, response.data);
      triggerRefresh();
    }

    setSelectedCountry(country);
    setCountryModalVisible(false);
  };

  const displayCountryName = selectedCountry
    ? selectedCountry.name || selectedCountry.title || selectedCountry.country || selectedCountry.country_name
    : null;

  const countryFontSize = displayCountryName && displayCountryName.length > 16 ? 11 : 12;

  return (
    <View>
      {/* ── Header row ── */}
      <View style={styles.containerHeader}>
        <View style={styles.containerHeaderLeft}>
          <Text style={styles.headerName}>{name}</Text>
        </View>
        <View style={styles.containerHeaderRight}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.countryPill}
            onPress={() => setCountryModalVisible(true)}
          >
            <SvgIcon name={"star"} width={15} height={15} color={BRAND} />
            <Text style={[styles.countryPillText, { fontSize: countryFontSize }]}>
              {displayCountryName || "Explore by country"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CTA Banner ── */}
      <CTABanner />

      {/* ── Country Modal ── */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Country</Text>
            <FlatList
              data={countries}
              keyExtractor={(c, i) => (c.id ? String(c.id) : String(i))}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectCountry(item)}
                  style={({ pressed }) => [styles.countryItem, pressed && { backgroundColor: "#f5fafa" }]}
                >
                  <Text style={styles.countryText}>
                    {item.name || item.title || item.country || item.country_name || "Unknown"}
                  </Text>
                  {(selectedCountry?.id === item.id || selectedCountry?.country_id === item.id) && (
                    <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                  )}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setCountryModalVisible(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header row
  containerHeader: {
    height: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  containerHeaderLeft: { flex: 1 },
  containerHeaderRight: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },

  headerName: {
    fontSize: 17,
    fontFamily: "ReadexPro_600SemiBold",
    color: BRAND,
    letterSpacing: -0.3,
  },

  countryPill: {
    height: 34,
    paddingHorizontal: 12,
    backgroundColor: "#eef5f5",
    flexDirection: "row",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    columnGap: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  countryPillText: {
    fontFamily: "ReadexPro_500Medium",
    color: BRAND,
  },

  // CTA Banner
  ctaWrapper: {
    marginHorizontal: 14,
    marginBottom: 10,
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    columnGap: 10,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ctaIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaEmoji: { fontSize: 20 },
  ctaText: { flex: 1 },
  ctaTitle: {
    fontSize: 13.5,
    fontFamily: "ReadexPro_600SemiBold",
    color: BRAND,
    letterSpacing: -0.2,
  },
  ctaSub: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
    fontFamily: "ReadexPro_400Regular",
  },
  ctaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "ReadexPro_600SemiBold",
    color: BRAND,
    marginBottom: 10,
  },
  countryItem: {
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  countryText: {
    fontSize: 14,
    fontFamily: "ReadexPro_400Regular",
    color: BRAND,
  },
  separator: { height: 1, backgroundColor: "#f0f5f5" },
  modalClose: {
    marginTop: 12,
    backgroundColor: BRAND,
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 14,
  },
  modalCloseText: {
    color: "#fff",
    fontFamily: "ReadexPro_600SemiBold",
    fontSize: 14,
  },
});

export default FeedsHeader;
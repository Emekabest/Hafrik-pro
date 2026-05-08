// src/components/navigation/DrawerNavigation.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, CommonActions } from "@react-navigation/native";
import apiClient from "../../api/apiClient";
import AppDetails from "../../helpers/appdetails";
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";
import { Colors } from "../../theme";

const { width: SCREEN_W } = Dimensions.get("window");

const BRAND   = Colors.primaryDark;
const ACCENT  = Colors.primary;
const CREAM   = Colors.background;
const DARK    = Colors.black;
const MUTED   = Colors.secondaryText;
const WHITE   = Colors.white;
const DANGER  = Colors.destructive;

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? "System";
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? "System";
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? "System";

const DRAWER_W = Math.min(SCREEN_W * 0.84, 340);

const HAFRIK_PLAY_STORE_LINKS = {
  ios: {
    app: "itms-apps://itunes.apple.com/app/id6741359890",
    web: "https://apps.apple.com/us/app/hafrikplay/id6741359890",
  },
  android: {
    app: "market://details?id=com.hafrikplay.webapp",
    web: "https://play.google.com/store/apps/details?id=com.hafrikplay.webapp",
  },
  web: "https://hafrikplay.com/myapp.php",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const safeTitle = (s = "") => String(s || "").trim();
const capName   = (n = "") => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "User";
const initials  = (name = "") => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "🙂";
};
const fmtBalance = (amount, currency = "NGN") => {
  const sym = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency === "GHS" ? "₵" : currency + " ";
  return `${sym}${Number(amount ?? 0).toLocaleString()}`;
};

// ── Quick action button ───────────────────────────────────────────────────────
const QuickBtn = ({ icon, label, gradient, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={qb.wrap}>
    <LinearGradient colors={gradient} style={qb.icon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={18} color={WHITE} />
    </LinearGradient>
    <Text style={qb.label} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);
const qb = StyleSheet.create({
  wrap:  { flex: 1, alignItems: "center", gap: 6, paddingVertical: 4 },
  icon:  { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10.5, fontWeight: "700", color: DARK, fontFamily: FONT_M, textAlign: "center" },
});

// ── Menu row ─────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sub, onPress, iconGrad, badge, last }) => (
  <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={[mi.row, last && { borderBottomWidth: 0 }]}>
    <LinearGradient colors={iconGrad} style={mi.iconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={16} color={WHITE} />
    </LinearGradient>
    <View style={mi.text}>
      <Text style={mi.label} numberOfLines={1}>{label}</Text>
      {!!sub && <Text style={mi.sub} numberOfLines={1}>{sub}</Text>}
    </View>
    {badge ? (
      <View style={mi.badge}><Text style={mi.badgeTxt}>{badge}</Text></View>
    ) : (
      <Ionicons name="chevron-forward" size={14} color={DARK + "28"} />
    )}
  </TouchableOpacity>
);
const mi = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSoft ?? "#e5e7eb",
  },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  text:  { flex: 1 },
  label: { fontSize: 13.5, fontWeight: "800", color: DARK, fontFamily: FONT_B },
  sub:   { fontSize: 11, color: MUTED, marginTop: 1, fontFamily: FONT_R },
  badge: { backgroundColor: DANGER, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeTxt: { fontSize: 10, fontWeight: "900", color: WHITE, fontFamily: FONT_B },
});

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Text style={sl.text}>{children}</Text>
);
const sl = StyleSheet.create({
  text: {
    fontSize: 10, fontWeight: "800", color: MUTED,
    letterSpacing: 1.5, textTransform: "uppercase",
    fontFamily: FONT_B, paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 8,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
const DrawerNavigation = ({ isVisible, onClose }) => {
  const navigation              = useNavigation();
  const { user, logout, token } = useAuth();
  const userAvatar              = useStore((s) => s.userAvatar);
  const insets                  = useSafeAreaInsets();

  const [showModal, setShowModal] = useState(false);
  const [wallet,    setWallet]    = useState(null);
  const [points,    setPoints]    = useState(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await apiClient.get("https://hafrik.com/api/v1/balance/balance.php");
      if (res.data?.status === "success") {
        setWallet(res.data.data.wallet);
        setPoints(res.data.data.points);
      }
    } catch { /* silent */ }
  }, [token]);

  const translateX     = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const fullName = useMemo(() => {
    const fn = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "";
    return fn || capName(user?.username || user?.user_name || "");
  }, [user]);

  const username = useMemo(() => {
    const u = user?.username || user?.user_name || "";
    return u ? `@${u}` : "";
  }, [user]);

  const avatarUrl = useMemo(
    () => userAvatar || user?.avatar || user?.user_picture,
    [userAvatar, user]
  );

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_W,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => { setShowModal(false); onClose?.(); });
  }, [onClose, overlayOpacity, translateX]);

  const open = useCallback(() => {
    setShowModal(true);
    // Reset position instantly before animating in (handles re-open edge case)
    translateX.setValue(-DRAWER_W);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 270,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, translateX]);

  useEffect(() => {
    if (isVisible) { open(); fetchBalance(); }
    else if (showModal) { close(); }
  }, [isVisible, open, fetchBalance, close, showModal]);

  useEffect(() => {
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const go = useCallback((screen, params) => {
    close();
    // Navigate once the close animation finishes (210ms) — no extra wait
    setTimeout(() => navigation.navigate(screen, params), 220);
  }, [close, navigation]);

  const openWeb = useCallback((title, url) => {
    close();
    setTimeout(() => navigation.navigate("InAppBrowser", { title, url }), 220);
  }, [close, navigation]);

  const openHafrikPlay = useCallback(() => {
    const target = Platform.OS === "ios"
      ? HAFRIK_PLAY_STORE_LINKS.ios
      : Platform.OS === "android"
        ? HAFRIK_PLAY_STORE_LINKS.android
        : { app: HAFRIK_PLAY_STORE_LINKS.web, web: HAFRIK_PLAY_STORE_LINKS.web };

    close();
    setTimeout(async () => {
      try {
        const canOpenStore = await Linking.canOpenURL(target.app);
        await Linking.openURL(canOpenStore ? target.app : target.web);
      } catch {
        Linking.openURL(target.web).catch(() => {
          Alert.alert("Unable to open Hafrikplay", "Please try again later.");
        });
      }
    }, 200);
  }, [close]);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Hafrik?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          close();
          await logout();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
        },
      },
    ]);
  }, [close, logout, navigation]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal animationType="none" transparent visible={showModal} onRequestClose={close} statusBarTranslucent>
      <View style={s.root}>

        {/* Dim overlay */}
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Drawer */}
        <Animated.View style={[s.drawer, { transform: [{ translateX }] }]}>

          {/* ══ HEADER ══ */}
          <LinearGradient
            colors={[BRAND, "#0d4f56", "#1a8a92"]}
            style={[s.header, { paddingTop: insets.top + 16 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Background orb */}
            <View style={s.headerOrb} pointerEvents="none" />

            {/* Top row */}
            <View style={s.headerTop}>
              <View style={s.appBadge}>
                <Text style={s.appBadgeTxt}>🌍</Text>
                <Text style={s.appBadgeLabel}>Hafrik</Text>
              </View>
              <TouchableOpacity onPress={close} style={s.closeBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={WHITE} />
              </TouchableOpacity>
            </View>

            {/* Profile */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => go("Profile")} style={s.profile}>
              <View style={s.avatarRing}>
                {avatarUrl ? (
                  <ExpoImage source={{ uri: avatarUrl }} style={s.avatar} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarInitials}>{initials(fullName)}</Text>
                  </View>
                )}
                <View style={s.onlineDot} />
              </View>
              <View style={s.profileInfo}>
                <Text style={s.name} numberOfLines={1}>{safeTitle(fullName)}</Text>
                {!!username && <Text style={s.handle} numberOfLines={1}>{username}</Text>}
                <View style={s.viewProfilePill}>
                  <Text style={s.viewProfileTxt}>View Profile</Text>
                  <Ionicons name="arrow-forward" size={9} color={WHITE + "cc"} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Wallet strip */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => go("WalletScreen")} style={s.walletStrip}>
              <View style={s.walletItem}>
                <View style={s.walletIconWrap}>
                  <Ionicons name="wallet" size={14} color="#fbbf24" />
                </View>
                <View>
                  <Text style={s.walletValue}>{wallet ? fmtBalance(wallet.available, wallet.currency) : "₦0"}</Text>
                  <Text style={s.walletLabel}>Wallet</Text>
                </View>
              </View>
              <View style={s.walletDivider} />
              <View style={s.walletItem}>
                <View style={[s.walletIconWrap, { backgroundColor: "#a78bfa22" }]}>
                  <Ionicons name="star" size={14} color="#a78bfa" />
                </View>
                <View>
                  <Text style={s.walletValue}>{points ? Number(points.available).toLocaleString() : "0"}</Text>
                  <Text style={s.walletLabel}>Points</Text>
                </View>
              </View>
              <LinearGradient colors={[ACCENT, "#0d5560"]} style={s.walletArrow}>
                <Ionicons name="arrow-forward" size={13} color={WHITE} />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {/* ══ BODY ══ */}
          <ScrollView
            style={s.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          >

            {/* HafrikX banner */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => go("HafrikXHome")} style={s.hafrikXWrap}>
              <LinearGradient colors={["#0a1428", "#132244", "#1a2e50"]} style={s.hafrikX} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={s.hafrikXOrb} pointerEvents="none" />
                <View style={s.hafrikXBadge}>
                  <Text style={s.hafrikXBadgeTxt}>X</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.hafrikXTitle}>HafrikX</Text>
                  <Text style={s.hafrikXSub}>Import · RMB Exchange · Suppliers</Text>
                </View>
                <View style={s.hafrikXArrow}>
                  <Ionicons name="arrow-forward" size={14} color="#c9a84c" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Quick actions */}
            <SectionLabel>Hafrik Products</SectionLabel>
            <View style={s.quickRow}>
              <QuickBtn icon="sparkles"      label="AI Chat"  gradient={[ACCENT, '#13c296']}                                    onPress={() => go("AIChat", { fresh: true })} />
              <QuickBtn icon="tv"            label="HafrikTV" gradient={[ACCENT, BRAND]}                                        onPress={() => go("HafrikTV")} />
              <QuickBtn icon="musical-notes" label="Play"     gradient={["#9c27b0", "#6d28d9"]}                                 onPress={openHafrikPlay} />
            </View>

            {/* Menu */}
            <SectionLabel>Menu</SectionLabel>
            <View style={s.card}>
              <MenuItem
                icon="bookmark"
                label="Saved Posts"
                sub="Your bookmarked content"
                iconGrad={[ACCENT, BRAND]}
                onPress={() => go("SavedPosts")}
              />
              <MenuItem
                icon="storefront"
                label="My Businesses"
                sub="Pages you manage or follow"
                iconGrad={["#f97316", "#c2410c"]}
                onPress={() => go("LikedBusinesses")}
              />
              <MenuItem
                icon="people"
                label="My Communities"
                sub="Groups you belong to"
                iconGrad={["#8b5cf6", "#5b21b6"]}
                onPress={() => go("JoinedCommunities")}
                last
              />
            </View>

            {/* Explore */}
            <SectionLabel>Explore</SectionLabel>
            <View style={s.card}>
              <MenuItem
                icon="bag-handle"
                label="Hafrik Shop"
                sub="Browse, buy & sell products"
                iconGrad={["#f97316", "#dc2626"]}
                onPress={() => go("MarketplaceScreen")}
              />
              <MenuItem
                icon="map"
                label="City Guide"
                sub="China cities — jobs, rent, markets"
                iconGrad={["#10b981", "#047857"]}
                onPress={() => go("CityGuide")}
              />
              <MenuItem
                icon="compass"
                label="Explore City"
                sub="Discover cities, places & services"
                iconGrad={[ACCENT, BRAND]}
                onPress={() => go("ExploreHome")}
              />
              <MenuItem
                icon="language"
                label="Translator"
                sub="Translate to & from any language"
                iconGrad={["#06b6d4", "#0e7490"]}
                onPress={() => go("TranslatorScreen")}
              />
              <MenuItem
                icon="school"
                label="Learn"
                sub="Import guides, sourcing tips & more"
                iconGrad={["#ef4444", "#b91c1c"]}
                onPress={() => go("HafrikXLearn")}
                last
              />
            </View>

            {/* Account */}
            <SectionLabel>Account</SectionLabel>
            <View style={s.card}>
              <MenuItem
                icon="settings"
                label="Settings"
                sub="Privacy & preferences"
                iconGrad={[BRAND, "#0d5560"]}
                onPress={() => go("Settings")}
              />
              <MenuItem
                icon="help-circle"
                label="Help & Support"
                sub="FAQs & support center"
                iconGrad={["#3b82f6", "#1d4ed8"]}
                onPress={() => openWeb("Help & Support", "https://hafrik.com/hafrikhelpcenter.html")}
                last
              />
            </View>

            {/* Sign out */}
            <TouchableOpacity activeOpacity={0.8} onPress={handleLogout} style={s.logoutBtn}>
              <Ionicons name="log-out-outline" size={16} color={DANGER} />
              <Text style={s.logoutTxt}>Sign Out</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerBrand}>Hafrik</Text>
              <Text style={s.footerTagline}>Built for Africans, everywhere 🌍</Text>
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default DrawerNavigation;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000aa",
  },

  drawer: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: DRAWER_W,
    backgroundColor: CREAM,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    overflow: "hidden",
  },
  headerOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: WHITE,
    opacity: 0.04,
    top: -80,
    right: -60,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  appBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: WHITE + "18",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: WHITE + "20",
  },
  appBadgeTxt:   { fontSize: 14 },
  appBadgeLabel: { fontSize: 12, fontWeight: "900", color: WHITE, fontFamily: FONT_B, letterSpacing: -0.2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: WHITE + "20",
    alignItems: "center", justifyContent: "center",
  },

  // Profile
  profile:    { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  avatarRing: { position: "relative" },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2.5, borderColor: WHITE + "55",
  },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: WHITE + "20",
    borderWidth: 2.5, borderColor: WHITE + "55",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { color: WHITE, fontSize: 18, fontWeight: "900", fontFamily: FONT_B },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2, borderColor: BRAND,
  },
  profileInfo: { flex: 1, gap: 2 },
  name:   { color: WHITE, fontSize: 17, fontWeight: "900", fontFamily: FONT_B, letterSpacing: -0.3 },
  handle: { color: WHITE + "99", fontSize: 12, fontFamily: FONT_R },
  viewProfilePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 4, alignSelf: "flex-start",
    backgroundColor: WHITE + "18",
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: WHITE + "20",
  },
  viewProfileTxt: { fontSize: 10, color: WHITE + "cc", fontWeight: "700", fontFamily: FONT_M },

  // Wallet strip
  walletStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE + "12",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WHITE + "1a",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  walletItem:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  walletIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: "#fbbf2422",
    alignItems: "center", justifyContent: "center",
  },
  walletValue: { fontSize: 14, fontWeight: "900", color: WHITE, fontFamily: FONT_B },
  walletLabel: { fontSize: 9.5, color: WHITE + "77", fontWeight: "600", fontFamily: FONT_R, textTransform: "uppercase", letterSpacing: 0.4 },
  walletDivider: { width: 1, height: 30, backgroundColor: WHITE + "22" },
  walletArrow: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },

  // ── Body ──
  body: { flex: 1, backgroundColor: CREAM },

  // HafrikX
  hafrikXWrap: {
    marginHorizontal: 14,
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#c9a84c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  hafrikX: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1e2d45",
    borderRadius: 18,
    overflow: "hidden",
  },
  hafrikXOrb: {
    position: "absolute",
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#c9a84c",
    opacity: 0.06,
    top: -40, right: -30,
  },
  hafrikXBadge: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: "#c9a84c",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  hafrikXBadgeTxt: { color: "#000", fontSize: 20, fontWeight: "900", fontFamily: FONT_B, letterSpacing: -1 },
  hafrikXTitle:    { color: WHITE, fontSize: 15, fontWeight: "900", fontFamily: FONT_B, letterSpacing: -0.2 },
  hafrikXSub:      { color: "#6b7f95", fontSize: 10.5, fontFamily: FONT_R, marginTop: 2 },
  hafrikXArrow: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: "#c9a84c22",
    alignItems: "center", justifyContent: "center",
  },

  // Quick row
  quickRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 4,
    marginBottom: 4,
  },

  // Card
  card: {
    backgroundColor: WHITE,
    marginHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderSoft ?? "#e5e7eb",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // Sign out
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: DANGER + "0d",
    borderWidth: 1,
    borderColor: DANGER + "25",
  },
  logoutTxt: { color: DANGER, fontSize: 13.5, fontWeight: "800", fontFamily: FONT_B },

  // Footer
  footer: { alignItems: "center", paddingTop: 20, paddingBottom: 4, gap: 3 },
  footerBrand:   { fontSize: 13, fontWeight: "900", color: BRAND, fontFamily: FONT_B, letterSpacing: -0.3 },
  footerTagline: { fontSize: 11, color: MUTED, fontFamily: FONT_R },
});

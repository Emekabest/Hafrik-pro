// src/components/navigation/DrawerNavigation.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, CommonActions } from "@react-navigation/native";
import axios from "axios";

import AppDetails from "../../helpers/appdetails";
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";
import { Colors } from "../../theme";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;
const DANGER = Colors.destructive;
const BLACK  = Colors.black;

const FONT_B = AppDetails?.fontFamily?.redex?.bold ?? "System";
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? "System";
const FONT_M = AppDetails?.fontFamily?.inter?.medium ?? "System";

const DRAWER_W = Math.min(SCREEN_W * 0.82, 340);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeTitle = (s = "") => String(s || "").trim();
const capName   = (name = "") =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "User";

const initials = (name = "") => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "🙂";
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "🙂";
};

const fmtBalance = (amount, currency = "NGN") => {
  const sym = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency === "GHS" ? "₵" : currency + " ";
  return `${sym}${Number(amount ?? 0).toLocaleString()}`;
};

// ─── Drawer Item ──────────────────────────────────────────────────────────────
const DrawerItem = ({ icon, title, subtitle, onPress, iconColor, iconBg, badge }) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.item}>
    <View style={[styles.itemIconWrap, iconBg && { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={17} color={iconColor || ACCENT} />
    </View>
    <View style={styles.itemTextWrap}>
      <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
      {!!subtitle && <Text style={styles.itemSub} numberOfLines={1}>{subtitle}</Text>}
    </View>
    {badge ? (
      <View style={styles.badgeWrap}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    ) : (
      <Ionicons name="chevron-forward" size={15} color={BLACK + "33"} />
    )}
  </TouchableOpacity>
);

// ─── Grid shortcut button ─────────────────────────────────────────────────────
const GridBtn = ({ icon, label, onPress, gradient }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.gridBtn}>
    <LinearGradient colors={gradient} style={styles.gridIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={17} color={WHITE} />
    </LinearGradient>
    <Text style={styles.gridLabel} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

// ─────────────────────────────────────────────────────────────────────────────
const DrawerNavigation = ({ isVisible, onClose }) => {
  const navigation  = useNavigation();
  const { user, logout, token } = useAuth();
  const userAvatar  = useStore((s) => s.userAvatar);
  const insets      = useSafeAreaInsets();

  const [showModal, setShowModal] = useState(false);

  // ── Balance state ───────────────────────────────────────────────────────────
  const [wallet, setWallet] = useState(null);
  const [points, setPoints] = useState(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get("https://hafrik.com/api/v1/balance/balance.php", {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  // ── Animation helpers ───────────────────────────────────────────────────────
  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX,     { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0,         duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowModal(false);
      onClose?.();
    });
  }, [onClose, overlayOpacity, translateX]);

  const open = useCallback(() => {
    setShowModal(true);
    Animated.parallel([
      Animated.timing(translateX,     { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [overlayOpacity, translateX]);

  useEffect(() => {
    if (isVisible) {
      open();
      fetchBalance();
    } else if (showModal) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (screen, params) => {
      close();
      setTimeout(() => navigation.navigate(screen, params), 180);
    },
    [close, navigation]
  );

  const openWeb = useCallback(
    (_title, url) => {
      close();
      Linking.openURL(url).catch(() => {});
    },
    [close]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of Hafrik?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            close();
            await logout();
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: "Login" }] })
            );
          },
        },
      ]
    );
  }, [close, logout, navigation]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      animationType="none"
      transparent
      visible={showModal}
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Dim overlay */}
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Drawer panel */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {/* ── Header ── */}
          <View style={[styles.drawerHeader, { paddingTop: insets.top + 12 }]}>
            {/* Top row */}
            <View style={styles.headerTopRow}>
              <TouchableOpacity onPress={close} activeOpacity={0.8} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={WHITE} />
              </TouchableOpacity>
            </View>

            {/* Profile area */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleNavigate("Profile")}
              style={styles.profileArea}
            >
              {avatarUrl ? (
                <ExpoImage
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials(fullName)}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.name} numberOfLines={1}>{safeTitle(fullName)}</Text>
                {!!username && <Text style={styles.handle} numberOfLines={1}>{username}</Text>}
              </View>
              <View style={styles.profileArrow}>
                <Ionicons name="chevron-forward" size={16} color={WHITE + "88"} />
              </View>
            </TouchableOpacity>

            {/* ── Finance strip — taps go to Earnings ── */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleNavigate("Earnings")}
              style={styles.financeStrip}
            >
              <View style={styles.financeItem}>
                <Ionicons name="wallet" size={15} color={WHITE} />
                <Text style={styles.financeValue}>
                  {wallet ? fmtBalance(wallet.available, wallet.currency) : "₦0"}
                </Text>
                <Text style={styles.financeLabel}>Wallet</Text>
              </View>
              <View style={styles.financeDivider} />
              <View style={styles.financeItem}>
                <Ionicons name="star" size={15} color={Colors.star ?? "#ffd700"} />
                <Text style={styles.financeValue}>
                  {points ? Number(points.available).toLocaleString() : "0"}
                </Text>
                <Text style={styles.financeLabel}>Points</Text>
              </View>
              <View style={styles.financeArrow}>
                <Ionicons name="arrow-forward" size={14} color={ACCENT} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Scrollable content ── */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Product grid ── */}
            <SectionTitle>Hafrik Products</SectionTitle>
            <View style={styles.gridRow}>
              <GridBtn icon="tv" label="HafrikTV" gradient={[ACCENT, BRAND]} onPress={() => openWeb("TV", "https://tv.hafrik.com")} />
              <GridBtn icon="musical-notes" label="Play" gradient={[Colors.purple ?? "#9c27b0", Colors.violetDeep ?? "#6d28d9"]} onPress={() => openWeb("Play", "https://hafrikplay.com/myapp.php")} />
              <GridBtn icon="cloud" label="Drive" gradient={[Colors.blueAccent ?? "#3b82f6", Colors.blueDeep ?? "#1d4ed8"]} onPress={() => openWeb("Drive", "https://drive.hafrik.com")} />
              <GridBtn icon="restaurant" label="Food" gradient={[Colors.orangeStrong ?? "#f97316", Colors.orangeDeep ?? "#ea580c"]} onPress={() => openWeb("Food", "https://food.hafrik.com")} />
            </View>

            {/* ── Main Menu ── */}
            <SectionTitle>Menu</SectionTitle>
            <View style={styles.card}>
              <DrawerItem icon="person-outline" title="My Profile" subtitle="View & edit your profile" onPress={() => handleNavigate("Profile")} />
              <DrawerItem icon="storefront-outline" title="Liked Businesses" subtitle="Businesses you follow" onPress={() => handleNavigate("LikedBusinesses")} />
              <DrawerItem icon="people-outline" title="Joined Communities" subtitle="Communities you belong to" onPress={() => handleNavigate("JoinedCommunities")} />
              <DrawerItem icon="wallet-outline" title="Earnings" subtitle="Wallet, points & transactions" iconColor={ACCENT} onPress={() => handleNavigate("Earnings")} />
            </View>

            {/* ── Account ── */}
            <SectionTitle>Account</SectionTitle>
            <View style={styles.card}>
              <DrawerItem icon="settings-outline" title="Settings" subtitle="Privacy & preferences" onPress={() => handleNavigate("Settings")} />
              <DrawerItem icon="help-circle-outline" title="Help & Support" subtitle="FAQs & support center" onPress={() => handleNavigate("InAppBrowser", { url: "https://hafrik.com/hafrikhelpcenter.html", title: "Help & Support" })} />
            </View>

            {/* ── Footer ── */}
            <View style={styles.footerMeta}>
              <Text style={styles.footerText}>Hafrik Media & Technology</Text>
              <Text style={styles.footerSub}>Built for Africans, everywhere.</Text>
            </View>

            {/* Sign out */}
            <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={17} color={DANGER} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: "transparent" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BLACK + "70",
  },

  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: CREAM,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    shadowColor: BLACK,
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },

  // ── Header ──
  drawerHeader: {
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  drawerLogo: {
    height: 26,
    width: 110,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WHITE + "20",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Profile ──
  profileArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WHITE + "30",
    borderWidth: 2.5,
    borderColor: WHITE + "44",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WHITE + "20",
    borderWidth: 2.5,
    borderColor: WHITE + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: FONT_B,
  },
  profileInfo: { flex: 1 },
  name: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "900",
    fontFamily: FONT_B,
    letterSpacing: -0.2,
  },
  handle: {
    color: WHITE + "99",
    fontSize: 12,
    fontFamily: FONT_R,
    marginTop: 2,
  },
  profileArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WHITE + "14",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Finance strip ──
  financeStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE + "14",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WHITE + "18",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  financeItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  financeValue: {
    fontSize: 15,
    fontWeight: "900",
    color: WHITE,
    fontFamily: FONT_B,
    marginTop: 3,
  },
  financeLabel: {
    fontSize: 10,
    color: WHITE + "88",
    fontWeight: "600",
    fontFamily: FONT_R,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  financeDivider: {
    width: 1,
    height: 32,
    backgroundColor: WHITE + "22",
    marginHorizontal: 12,
  },
  financeArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WHITE + "20",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  // ── Scroll body ──
  scrollBody: {
    flex: 1,
    backgroundColor: CREAM,
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    fontFamily: FONT_B,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },

  // ── Product grid ──
  gridRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 4,
  },
  gridBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: DARK,
    fontFamily: FONT_M,
    textAlign: "center",
  },

  // ── Card ──
  card: {
    backgroundColor: WHITE,
    marginHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSoft ?? Colors.border,
    overflow: "hidden",
  },

  // ── Item ──
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSoft ?? Colors.border,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: ACCENT + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTextWrap: { flex: 1 },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: DARK,
    fontFamily: FONT_B,
  },
  itemSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 1,
    fontFamily: FONT_R,
  },
  badgeWrap: {
    backgroundColor: DANGER,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: WHITE, fontFamily: FONT_B },

  // ── Footer ──
  footerMeta: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 4,
  },
  footerText: {
    color: DARK,
    fontSize: 11.5,
    fontWeight: "800",
    fontFamily: FONT_B,
  },
  footerSub: {
    color: MUTED,
    fontSize: 10.5,
    marginTop: 2,
    fontFamily: FONT_R,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: DANGER + "0C",
    borderWidth: 1,
    borderColor: DANGER + "22",
  },
  logoutText: {
    color: DANGER,
    fontSize: 13.5,
    fontWeight: "800",
    fontFamily: FONT_B,
  },
});

export default DrawerNavigation;

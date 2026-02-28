// src/components/navigation/DrawerNavigation.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
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
import { useNavigation, CommonActions } from "@react-navigation/native";
import axios from "axios";

import AppDetails from "../../helpers/appdetails";
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND  = "#0C3F44";
const ACCENT = "#13C296";
const CREAM  = "#F5F0E8";
const DARK   = "#0D1B1E";
const MUTED  = "#7A9198";

const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

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

// ─── Drawer Item ──────────────────────────────────────────────────────────────
const DrawerItem = ({ icon, title, subtitle, right, onPress, iconColor, iconBg }) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.item}>
    <View style={styles.itemLeft}>
      <View style={[styles.itemIconWrap, iconBg && { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor || BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.itemSub} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
    </View>
    <View style={styles.itemRight}>
      {right ?? <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.35)" />}
    </View>
  </TouchableOpacity>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <View style={styles.sectionTitleWrap}>
    <Text style={styles.sectionTitle}>{children}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const DrawerNavigation = ({ isVisible, onClose }) => {
  const navigation  = useNavigation();
  const { user, logout, token } = useAuth();
  const userAvatar  = useStore((s) => s.userAvatar);
  const insets      = useSafeAreaInsets();

  const [showModal, setShowModal] = useState(false);

  // ── Balance state ───────────────────────────────────────────────────────────
  const [wallet, setWallet] = useState(null); // { available, currency }
  const [points, setPoints] = useState(null); // { available }

  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get('https://hafrik.com/api/v1/balance/balance.php', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.status === 'success') {
        setWallet(res.data.data.wallet);
        setPoints(res.data.data.points);
      }
    } catch { /* silent */ }
  }, [token]);

  const translateX     = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const username = useMemo(() => {
    const u = user?.username || user?.user_name || "";
    return capName(u);
  }, [user]);

  const email     = useMemo(() => user?.email || user?.user_email || "", [user]);
  const avatarUrl = useMemo(
    () => userAvatar || user?.avatar || user?.user_picture,
    [userAvatar, user]
  );

  // ── Animation helpers ───────────────────────────────────────────────────────
  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX,     { toValue: -DRAWER_W, duration: 160, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0,         duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setShowModal(false);
      onClose?.();
    });
  }, [onClose, overlayOpacity, translateX]);

  const open = useCallback(() => {
    setShowModal(true);
    Animated.parallel([
      Animated.timing(translateX,     { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
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
      setTimeout(() => navigation.navigate(screen, params), 160);
    },
    [close, navigation]
  );

  /** Open any URL in the device's default external browser. */
  const openWeb = useCallback(
    (_title, url) => {
      close();
      Linking.openURL(url).catch(() => {});
    },
    [close]
  );

  // ── Menu data ───────────────────────────────────────────────────────────────

  /** Social/community screens */
  const mainMenu = [
    {
      key: "profile",
      icon: "person-outline",
      title: "My Profile",
      subtitle: "View and edit your profile",
      onPress: () => handleNavigate("Profile"),
    },
    {
      key: "pages",
      icon: "business-outline",
      title: "My Pages",
      subtitle: "Manage your business pages",
      onPress: () => handleNavigate("InAppBrowser", { url: "https://hafrik.com/pages/manage", title: "My Pages" }),
    },
    {
      key: "groups",
      icon: "people-outline",
      title: "My Communities",
      subtitle: "Groups & communities you manage",
      onPress: () => handleNavigate("InAppBrowser", { url: "https://hafrik.com/groups/manage", title: "My Communities" }),
    },
  ];

  /** Hafrik product tools — all external browser except Exchange (search) */
  const tools = [
    {
      key: "tv",
      icon: "tv-outline",
      title: "HafrikTV",
      subtitle: "Watch stories, interviews & original African content",
      onPress: () => openWeb("HafrikTV", "https://tv.hafrik.com"),
    },
    {
      key: "play",
      icon: "musical-notes-outline",
      title: "HafrikPlay",
      subtitle: "Stream music, podcasts & audio experiences",
      onPress: () => openWeb("HafrikPlay", "https://hafrikplay.com/myapp.php"),
    },
    {
      key: "drive",
      icon: "cloud-outline",
      title: "HafrikDrive",
      subtitle: "Secure cloud storage for your files",
      onPress: () => openWeb("HafrikDrive", "https://drive.hafrik.com"),
    },
    {
      key: "food",
      icon: "restaurant-outline",
      title: "HafrikFood",
      subtitle: "Order African meals wherever you are",
      onPress: () => openWeb("HafrikFood", "https://food.hafrik.com"),
    },
    {
      key: "exchange",
      icon: "swap-horizontal-outline",
      title: "HafrikExchange",
      subtitle: "Buy, sell & exchange currencies globally",
      onPress: () => handleNavigate("SearchScreen", { initialQuery: "HafrikExchange", initialTab: "pages" }),
    },
  ];

  /** Account items */
  const accountItems = [
    {
      key: "settings",
      icon: "settings-outline",
      title: "Settings",
      subtitle: "Account, privacy & preferences",
      onPress: () => handleNavigate("Settings"),
    },
    {
      key: "help",
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "FAQs, contact & support center",
      onPress: () => handleNavigate("InAppBrowser", { url: "https://hafrik.com/hafrikhelpcenter.html", title: "Help & Support" }),
    },
  ];

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
          {/* ── Header — padded for safe area / notch ── */}
          <View style={[styles.drawerHeader, { paddingTop: insets.top + 14 }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.brandPill}>
                <View style={styles.brandDot} />
                <Text style={styles.brandPillText}>HAFRIK</Text>
              </View>
              <TouchableOpacity onPress={close} activeOpacity={0.85} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={DARK} />
              </TouchableOpacity>
            </View>

            {/* Profile row */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleNavigate("Profile")}
              style={styles.profileRow}
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
                  <Text style={styles.avatarInitials}>{initials(username)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{safeTitle(username)}</Text>
                <Text style={styles.email} numberOfLines={1}>{safeTitle(email)}</Text>
                <View style={styles.viewProfileRow}>
                  <Text style={styles.viewProfileText}>View profile</Text>
                  <Ionicons name="arrow-forward" size={14} color={ACCENT} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Quick actions */}
            <View style={styles.quickActions}>
              {/* Wallet */}
              <TouchableOpacity
                style={styles.quickBtn}
                activeOpacity={0.88}
                onPress={() => handleNavigate("InAppBrowser", { url: "https://hafrik.com/wallet", title: "Wallet" })}
              >
                <Ionicons name="wallet-outline" size={18} color="#fff" />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.quickBtnText}>Wallet</Text>
                  {wallet && (
                    <Text style={styles.quickBtnBalance}>
                      {wallet.currency} {wallet.available.toLocaleString()}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Points */}
              <TouchableOpacity
                style={[styles.quickBtn, styles.quickBtnAlt]}
                activeOpacity={0.88}
                onPress={() => handleNavigate("InAppBrowser", { url: "https://hafrik.com/settings/points", title: "Points" })}
              >
                <Ionicons name="star-outline" size={18} color="#fff" />
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.quickBtnText}>Points</Text>
                  {points && (
                    <Text style={styles.quickBtnBalance}>
                      {points.available.toLocaleString()} pts
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Scrollable content ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 26 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Menu ── */}
            <SectionTitle>Menu</SectionTitle>
            <View style={styles.card}>
              {mainMenu.map((m) => (
                <DrawerItem
                  key={m.key}
                  icon={m.icon}
                  title={m.title}
                  subtitle={m.subtitle}
                  onPress={m.onPress}
                />
              ))}
            </View>

            {/* ── Hafrik Tools ── */}
            <SectionTitle>More from Hafrik
            </SectionTitle>
            <View style={styles.card}>
              {tools.map((t) => (
                <DrawerItem
                  key={t.key}
                  icon={t.icon}
                  title={t.title}
                  subtitle={t.subtitle}
                  onPress={t.onPress}
                />
              ))}
            </View>

            {/* ── Account ── */}
            <SectionTitle>Account</SectionTitle>
            <View style={styles.card}>
              {accountItems.map((a) => (
                <DrawerItem
                  key={a.key}
                  icon={a.icon}
                  title={a.title}
                  subtitle={a.subtitle}
                  onPress={a.onPress}
                />
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footerMeta}>
              <Text style={styles.footerText}>Hafrik Media & Technology</Text>
              <Text style={styles.footerSub}>Built for Africans everywhere</Text>
            </View>

            {/* Sign out */}
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.85}
              onPress={handleLogout}
            >
              <View style={styles.logoutIconWrap}>
                <Ionicons name="log-out-outline" size={18} color="#b00020" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logoutText}>Sign Out</Text>
                <Text style={styles.logoutSub}>Log out of your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(176,0,32,0.4)" />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: CREAM,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 12,
  },

  drawerHeader: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  brandPillText: {
    color: "#fff",
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  profileRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(19,194,150,0.9)",
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2,
    borderColor: "rgba(19,194,150,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },

  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  email: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginTop: 2,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },
  viewProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  viewProfileText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "800",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },

  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  quickBtnAlt: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  quickBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  quickBtnBalance: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },

  sectionTitleWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: MUTED,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
    textTransform: "uppercase",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(12,63,68,0.08)",
    overflow: "hidden",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(12,63,68,0.06)",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(19,194,150,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  itemSub: {
    marginTop: 2,
    fontSize: 11.5,
    color: "rgba(0,0,0,0.45)",
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },
  itemRight: {
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  footerMeta: {
    marginTop: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  footerText: {
    color: DARK,
    fontSize: 12,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  footerSub: {
    marginTop: 3,
    color: "rgba(0,0,0,0.45)",
    fontSize: 11,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },

  logoutBtn: {
    marginTop: 14,
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(176,0,32,0.18)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(176,0,32,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#b00020",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  logoutSub: {
    marginTop: 2,
    color: "rgba(176,0,32,0.55)",
    fontSize: 11,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },
});

export default DrawerNavigation;

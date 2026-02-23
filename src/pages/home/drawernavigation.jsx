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
  Platform,
  StatusBar,
  Share,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import AppDetails from "../../helpers/appdetails";
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND = "#0C3F44";
const ACCENT = "#13C296";
const CREAM = "#F5F0E8";
const DARK = "#0D1B1E";
const MUTED = "#7A9198";

const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const safeTitle = (s = "") => String(s || "").trim();
const capName = (name = "") =>
  name
    ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    : "User";

const initials = (name = "") => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "🙂";
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  const out = (a + b).toUpperCase();
  return out || "🙂";
};

// ─── Drawer Item ─────────────────────────────────────────────────────────────
const DrawerItem = ({ icon, title, subtitle, right, onPress }) => (
  <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.item}>
    <View style={styles.itemLeft}>
      <View style={styles.itemIconWrap}>
        <Ionicons name={icon} size={18} color={BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.itemSub} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>

    <View style={styles.itemRight}>
      {right ? (
        right
      ) : (
        <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.35)" />
      )}
    </View>
  </TouchableOpacity>
);

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <View style={styles.sectionTitleWrap}>
    <Text style={styles.sectionTitle}>{children}</Text>
  </View>
);

const DrawerNavigation = ({ isVisible, onClose }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const userAvatar = useStore((s) => s.userAvatar);

  const [showModal, setShowModal] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const username = useMemo(() => {
    const u = user?.username || user?.user_name || "";
    return capName(u);
  }, [user]);

  const email = useMemo(() => user?.email || user?.user_email || "", [user]);

  const avatarUrl = useMemo(() => userAvatar || user?.avatar || user?.user_picture, [userAvatar, user]);

  const close = useCallback(() => {
    // animate close, then fully hide modal, then call onClose
    Animated.parallel([
      Animated.timing(translateX, { toValue: -DRAWER_W, duration: 160, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setShowModal(false);
      onClose?.();
    });
  }, [onClose, overlayOpacity, translateX]);

  const open = useCallback(() => {
    setShowModal(true);
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [overlayOpacity, translateX]);

  useEffect(() => {
    if (isVisible) open();
    else if (showModal) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleNavigate = (screen, params) => {
    close();
    // small delay so the drawer closes smoothly before navigation
    setTimeout(() => navigation.navigate(screen, params), 160);
  };

  const openTool = (title, url) => {
    // You should have an in-app webview screen.
    // If you already use a screen name different from "InAppBrowser", change it here.
    handleNavigate("InAppBrowser", { title, url });
  };

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
      title: "Pages",
      subtitle: "Businesses & public pages",
      onPress: () => handleNavigate("PagesScreen"),
    },
    {
      key: "groups",
      icon: "people-outline",
      title: "Groups",
      subtitle: "Communities you follow",
      onPress: () => handleNavigate("GroupScreen"),
    },
  ];

const tools = [
  {
    key: "tv",
    icon: "tv-outline",
    title: "HafrikTV",
    subtitle: "Watch stories, interviews & original African content",
    url: "https://tv.hafrik.com",
  },
  {
    key: "play",
    icon: "musical-notes-outline",
    title: "HafrikPlay",
    subtitle: "Stream music, podcasts & audio experiences",
    url: "https://hafrikplay.com/myapp.php",
  },
  {
    key: "exchange",
    icon: "swap-horizontal-outline",
    title: "HafrikExchange",
    subtitle: "Send, receive & exchange currencies globally",
    url: "https://exchange.hafrik.com",
  },
  {
    key: "drive",
    icon: "cloud-outline",
    title: "HafrikDrive",
    subtitle: "Secure cloud storage for your files",
    url: "https://drive.hafrik.com",
  },
  {
    key: "food",
    icon: "restaurant-outline",
    title: "HafrikFood",
    subtitle: "Order African meals wherever you are",
    url: "https://food.hafrik.com",
  },
];

  const handleInvite = async () => {
    try {
      await Share.share({
        message: "Join me on Hafrik — the global platform for Africans abroad. https://hafrik.com",
        url: "https://hafrik.com",
      });
    } catch {}
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={showModal}
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Dim overlay (tap to close) */}
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Drawer panel */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerTopRow}>
              <View style={styles.brandPill}>
                <View style={styles.brandDot} />
                <Text style={styles.brandPillText}>HAFRIK</Text>
              </View>

              <TouchableOpacity onPress={close} activeOpacity={0.85} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={DARK} />
              </TouchableOpacity>
            </View>

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
                <Text style={styles.name} numberOfLines={1}>
                  {safeTitle(username)}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {safeTitle(email)}
                </Text>

                <View style={styles.viewProfileRow}>
                  <Text style={styles.viewProfileText}>View profile</Text>
                  <Ionicons name="arrow-forward" size={14} color={ACCENT} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickBtn}
                activeOpacity={0.88}
                onPress={() => handleNavigate("SearchScreen")}
              >
                <Ionicons name="search-outline" size={18} color="#fff" />
                <Text style={styles.quickBtnText}>Search</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "rgba(255,255,255,0.14)" }]}
                activeOpacity={0.88}
                onPress={() => handleNavigate("Notifications")}
              >
                <Ionicons name="notifications-outline" size={18} color="#fff" />
                <Text style={styles.quickBtnText}>Alerts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "rgba(255,255,255,0.14)" }]}
                activeOpacity={0.88}
                onPress={() => handleNavigate("Inbox")}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={styles.quickBtnText}>Inbox</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 26 }}
            showsVerticalScrollIndicator={false}
          >
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

           <SectionTitle>Other Tools</SectionTitle>
<View style={styles.card}>
  {tools.map((t) => (
    <DrawerItem
      key={t.key}
      icon={t.icon}
      title={t.title}
      subtitle={t.subtitle}
      onPress={() => openTool(t.title, t.url)}
    />
  ))}
</View>

            <SectionTitle>More</SectionTitle>
            <View style={styles.card}>

              {/* Upgrade to Pro — highlighted */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.item, styles.proItem]}
                onPress={() => openTool("Upgrade to Pro", "https://hafrik.com/packages")}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.itemIconWrap, { backgroundColor: `${ACCENT}22` }]}>
                    <Ionicons name="rocket-outline" size={18} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: ACCENT }]}>Upgrade to Pro</Text>
                    <Text style={styles.itemSub}>Unlock exclusive features</Text>
                  </View>
                </View>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </TouchableOpacity>

              <DrawerItem
                icon="help-circle-outline"
                title="Help Center"
                subtitle="FAQs and support"
                onPress={() => openTool("Help Center", "https://hafrik.com/hafrikhelpcenter.html")}
              />

              <DrawerItem
                icon="settings-outline"
                title="Settings"
                subtitle="Account & preferences"
                onPress={() => handleNavigate("Settings")}
              />

              <DrawerItem
                icon="share-social-outline"
                title="Invite Friends"
                subtitle="Invite people to Hafrik"
                onPress={() => { close(); setTimeout(handleInvite, 200); }}
                right={<Ionicons name="share-outline" size={18} color={MUTED} />}
              />

            </View>

            <View style={styles.footerMeta}>
              <Text style={styles.footerText}>Hafrik Media & Technology</Text>
              <Text style={styles.footerSub}>Built for Africans everywhere</Text>
            </View>

            {/* Optional: Log out area (only if you already have a logout handler) */}
            {/* 
            <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={() => { close(); logout(); }}>
              <Ionicons name="log-out-outline" size={18} color="#b00020" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
            */}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
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
    paddingTop: 14,
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
  quickBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
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

  proItem: {
    backgroundColor: `${ACCENT}08`,
    borderBottomColor: `${ACCENT}18`,
  },
  proBadge: {
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },
  proBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
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

  // Optional logout
  logoutBtn: {
    marginTop: 14,
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(176,0,32,0.18)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  logoutText: {
    color: "#b00020",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
});

export default DrawerNavigation;
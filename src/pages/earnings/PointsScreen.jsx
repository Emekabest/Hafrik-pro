// src/pages/earnings/PointsScreen.jsx
import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useAuth } from "../../AuthContext";
import { Colors } from "../../theme";
import AppDetails from "../../helpers/appdetails";
import { withdrawPoints, getWalletBalance } from "../../api/walletApi";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? "#F7F8FA";
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const ORANGE = Colors.warm ?? "#f4a535";
const GOLD   = Colors.star ?? "#ffd700";

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? "System";
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? "System";
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? "System";

// ─────────────────────────────────────────────────────────────────────────────
export default function PointsScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  const [points,     setPoints]     = useState(route.params?.points ?? 0);
  const [converting, setConverting] = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [amount,     setAmount]     = useState("");
  const [error,      setError]      = useState("");

  // Re-fetch points balance from API
  const refreshPoints = useCallback(async () => {
    try {
      const json = await getWalletBalance(token);
      if (json?.status === "success") setPoints(json.data?.points ?? points);
    } catch { /* silent */ }
  }, [token, points]);

  const handleConvert = useCallback(async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError("Enter a valid amount."); return; }
    if (num > Number(points))   { setError("Insufficient points."); return; }
    setConverting(true); setError("");
    try {
      const json = await withdrawPoints(token, num);
      if (json?.status === "success") {
        setModalOpen(false);
        setAmount("");
        Alert.alert("Done!", json.message ?? "Points converted to wallet balance.");
        refreshPoints();
      } else {
        setError(json?.message ?? "Conversion failed.");
      }
    } catch (e) {
      setError(e?.message ?? "Network error.");
    }
    setConverting(false);
  }, [token, amount, points, refreshPoints]);

  return (
    <View style={[ps.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={ps.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={ps.backBtn}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={ps.topTitle}>Hafrik Points</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={ps.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[GOLD + "EE", ORANGE]}
          style={ps.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={ps.heroCircle1} />
          <View style={ps.heroCircle2} />
          <Ionicons name="star" size={28} color={WHITE} style={{ marginBottom: 8 }} />
          <Text style={ps.heroLabel}>Your Points Balance</Text>
          <Text style={ps.heroPoints}>{Number(points).toLocaleString()}</Text>
          <Text style={ps.heroPts}>pts</Text>
          <TouchableOpacity
            style={ps.convertBtn}
            activeOpacity={0.85}
            onPress={() => { setError(""); setModalOpen(true); }}
          >
            <Ionicons name="swap-horizontal" size={16} color={ORANGE} />
            <Text style={ps.convertBtnText}>Convert to Wallet</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* How to earn */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <View style={ps.cardIconWrap}>
              <Ionicons name="flash" size={16} color={GOLD} />
            </View>
            <Text style={ps.cardTitle}>How to Earn Points</Text>
          </View>
          {[
            { icon: "thumbs-up",       text: "Like, comment & share posts daily" },
            { icon: "people",          text: "Refer friends — earn points per sign-up" },
            { icon: "videocam",        text: "Post trending reels & articles for bonuses" },
            { icon: "chatbubbles",     text: "Engage in communities & events" },
            { icon: "storefront",      text: "Get your business page verified" },
          ].map((item, i) => (
            <View key={i} style={ps.row}>
              <View style={ps.rowIcon}>
                <Ionicons name={item.icon} size={14} color={ACCENT} />
              </View>
              <Text style={ps.rowText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Conversion rules */}
        <View style={ps.card}>
          <View style={ps.cardHeader}>
            <View style={ps.cardIconWrap}>
              <Ionicons name="information-circle" size={16} color={ACCENT} />
            </View>
            <Text style={ps.cardTitle}>Conversion & Rules</Text>
          </View>
          {[
            { icon: "swap-horizontal", text: "Minimum 500 pts required to convert" },
            { icon: "cash",            text: "Conversion rate set by Hafrik (varies)" },
            { icon: "time",            text: "Points expire after 12 months of inactivity" },
            { icon: "shield-checkmark",text: "Points cannot be transferred to other users" },
          ].map((item, i) => (
            <View key={i} style={ps.row}>
              <View style={[ps.rowIcon, { backgroundColor: ACCENT + "14" }]}>
                <Ionicons name={item.icon} size={14} color={ACCENT} />
              </View>
              <Text style={ps.rowText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Convert modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={ps.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={ps.modalSheet}>
                <View style={ps.modalHandle} />
                <View style={ps.modalHeader}>
                  <LinearGradient colors={[GOLD, ORANGE]} style={ps.modalIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="swap-horizontal" size={20} color={WHITE} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={ps.modalTitle}>Convert Points</Text>
                    <Text style={ps.modalSubtitle}>Move points to your wallet balance</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={22} color={TEXT_M} />
                  </TouchableOpacity>
                </View>

                <View style={ps.availRow}>
                  <Text style={ps.availLabel}>Available Points</Text>
                  <Text style={ps.availValue}>{Number(points).toLocaleString()} pts</Text>
                </View>

                <Text style={ps.inputLabel}>Points to Convert</Text>
                <TextInput
                  style={ps.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 500"
                  placeholderTextColor={TEXT_M}
                  keyboardType="numeric"
                  autoFocus
                />

                {!!error && <Text style={ps.errorText}>{error}</Text>}

                <View style={ps.modalActions}>
                  <TouchableOpacity style={ps.cancelBtn} onPress={() => setModalOpen(false)} activeOpacity={0.75}>
                    <Text style={ps.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ps.confirmBtn, converting && { opacity: 0.6 }]}
                    onPress={handleConvert}
                    disabled={converting}
                    activeOpacity={0.85}
                  >
                    {converting
                      ? <ActivityIndicator size="small" color={WHITE} />
                      : <Text style={ps.confirmText}>Convert</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  root:  { flex: 1, backgroundColor: ORANGE },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + "1A", alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, fontWeight: "900", color: WHITE, fontFamily: FONT_B },
  scroll:   { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  // Hero
  hero: {
    margin: 16, borderRadius: 24, padding: 28,
    alignItems: "center", overflow: "hidden",
  },
  heroCircle1: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: WHITE + "0A", top: -50, right: -40,
  },
  heroCircle2: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: WHITE + "0A", bottom: -20, left: -20,
  },
  heroLabel:  { fontSize: 12, color: WHITE + "CC", fontWeight: "600", fontFamily: FONT_R, letterSpacing: 1 },
  heroPoints: { fontSize: 56, fontWeight: "900", color: WHITE, fontFamily: FONT_B, lineHeight: 62 },
  heroPts:    { fontSize: 14, color: WHITE + "CC", fontWeight: "600", fontFamily: FONT_M, marginTop: -4, marginBottom: 20 },
  convertBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: WHITE, borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 11,
  },
  convertBtnText: { fontSize: 14, fontWeight: "800", color: ORANGE, fontFamily: FONT_B },

  // Card
  card: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: CARD, borderRadius: 18, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: GOLD + "22", alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: TEXT_H, fontFamily: FONT_B },
  row:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: GOLD + "22", alignItems: "center", justifyContent: "center",
  },
  rowText: { flex: 1, fontSize: 13, color: TEXT_H, fontFamily: FONT_R, lineHeight: 18 },

  // Convert modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: BORDER, alignSelf: "center", marginBottom: 16,
  },
  modalHeader:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  modalIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalTitle:   { fontSize: 16, fontWeight: "800", color: TEXT_H, fontFamily: FONT_B },
  modalSubtitle:{ fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  availRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: GOLD + "14", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  availLabel: { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  availValue: { fontSize: 13, fontWeight: "800", color: ORANGE, fontFamily: FONT_B },
  inputLabel: {
    fontSize: 11, fontWeight: "700", color: TEXT_M, fontFamily: FONT_M,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: TEXT_H, fontFamily: FONT_R,
    backgroundColor: BG,
  },
  errorText: { fontSize: 12.5, color: Colors.destructive ?? "#d32f2f", marginTop: 8, fontFamily: FONT_R },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER, alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: TEXT_M, fontFamily: FONT_M },
  confirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: ORANGE, alignItems: "center", justifyContent: "center",
  },
  confirmText: { fontSize: 14, fontWeight: "800", color: WHITE, fontFamily: FONT_B },
});

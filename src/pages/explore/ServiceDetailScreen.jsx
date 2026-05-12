import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Linking, Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const GREEN  = '#1a9e5c';
const BG     = '#f4f9fa';
const CARD   = '#ffffff';
const BORDER = '#ddeaec';
const DARK   = '#0d2b2e';
const MUTED  = '#5f7275';
const WHITE  = '#ffffff';

const a = (hex, alpha) => {
  const n = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
};

const TYPE_LABEL = {
  translator:          'Translator',
  shipping_agent:      'Shipping Agent',
  sourcing_agent:      'Sourcing Agent',
  airport_pickup:      'Airport Pickup',
  tour_guide:          'Tour Guide',
  business_assistant:  'Business Assistant',
};

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color = TEAL, last }) {
  if (!value) return null;
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={[s.infoIcon, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ServiceDetailScreen() {
  const navigation  = useNavigation();
  const route       = useRoute();
  const insets      = useSafeAreaInsets();
  const { service } = route.params ?? {};

  if (!service) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={44} color={MUTED} />
        <Text style={s.noDataTxt}>Service data not found.</Text>
      </View>
    );
  }

  const img     = service.display_image ?? service.profile_picture;
  const name    = service.display_name  ?? service.provider_name ?? service.business_name ?? 'Provider';
  const type    = TYPE_LABEL[service.type] ?? service.type?.replace(/_/g, ' ') ?? 'Service';
  const rating  = service.rating ? parseFloat(service.rating).toFixed(1) : null;
  const langs   = Array.isArray(service.languages) ? service.languages : (service.languages ? [service.languages] : []);
  const verified = service.verification_status === 'verified';

  const phone   = service.phone   ?? service.contact_phone;
  const whatsapp= service.whatsapp ?? phone;
  const wechat  = service.wechat;

  const callPhone = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {});
  };

  const openWhatsApp = () => {
    if (!whatsapp) return;
    const num = whatsapp.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  };

  const copyWeChat = () => {
    if (!wechat) return;
    Clipboard.setString(wechat);
    Alert.alert('Copied', `WeChat ID "${wechat}" copied to clipboard.`);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[BRAND, '#144f55', TEAL]}
          style={[s.header, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={s.blob} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>

          {/* Profile */}
          <View style={s.profileWrap}>
            {img ? (
              <Image source={{ uri: img }} style={s.avatar} />
            ) : (
              <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={s.avatarFallback}>
                <Text style={s.avatarInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
              </LinearGradient>
            )}
            {verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={TEAL} />
              </View>
            )}
          </View>

          <Text style={s.providerName}>{name}</Text>
          <View style={s.typePill}>
            <Text style={s.typePillTxt}>{type}</Text>
          </View>

          <View style={s.headerMeta}>
            {rating && (
              <View style={s.headerMetaItem}>
                <Ionicons name="star" size={13} color={GOLD} />
                <Text style={s.headerMetaTxt}>{rating}</Text>
              </View>
            )}
            {verified && (
              <View style={s.headerMetaItem}>
                <Ionicons name="shield-checkmark" size={13} color="#4ade80" />
                <Text style={[s.headerMetaTxt, { color: '#4ade80' }]}>Verified</Text>
              </View>
            )}
            {langs.length > 0 && (
              <View style={s.headerMetaItem}>
                <Ionicons name="language-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.headerMetaTxt}>{langs.slice(0, 2).join(' · ')}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ── Contact buttons ── */}
          <View style={s.contactRow}>
            {whatsapp && (
              <TouchableOpacity style={[s.contactBtn, { backgroundColor: a('#25d366', 0.1), borderColor: a('#25d366', 0.3) }]} onPress={openWhatsApp} activeOpacity={0.8}>
                <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
                <Text style={[s.contactTxt, { color: '#25d366' }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {phone && (
              <TouchableOpacity style={[s.contactBtn, { backgroundColor: a(TEAL, 0.1), borderColor: a(TEAL, 0.3) }]} onPress={callPhone} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={20} color={TEAL} />
                <Text style={[s.contactTxt, { color: TEAL }]}>Call</Text>
              </TouchableOpacity>
            )}
            {wechat && (
              <TouchableOpacity style={[s.contactBtn, { backgroundColor: a('#07c160', 0.1), borderColor: a('#07c160', 0.3) }]} onPress={copyWeChat} activeOpacity={0.8}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#07c160" />
                <Text style={[s.contactTxt, { color: '#07c160' }]}>WeChat</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Description ── */}
          {!!service.description && (
            <View style={s.card}>
              <Text style={s.cardTitle}>About</Text>
              <Text style={s.descTxt}>{service.description}</Text>
            </View>
          )}

          {/* ── Languages ── */}
          {langs.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Languages</Text>
              <View style={s.langRow}>
                {langs.map((lang, i) => (
                  <View key={i} style={s.langPill}>
                    <Ionicons name="language-outline" size={12} color={TEAL} />
                    <Text style={s.langTxt}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Service info ── */}
          <View style={s.infoCard}>
            <InfoRow icon="pricetag-outline"   label="Price Range"   value={service.price_range}        color={GOLD}  />
            <InfoRow icon="location-outline"   label="Address"       value={service.address}             color={TEAL}  />
            <InfoRow icon="navigate-outline"   label="Area"          value={service.city_area}           color={TEAL}  />
            <InfoRow icon="time-outline"       label="Availability"  value={service.availability}        color={TEAL}  />
            <InfoRow icon="briefcase-outline"  label="Experience"    value={service.experience}          color={BRAND} />
            <InfoRow icon="call-outline"       label="Phone"         value={phone}                       color={GREEN} last />
          </View>

          {/* ── Verification note ── */}
          {verified && (
            <View style={s.verifiedNote}>
              <Ionicons name="shield-checkmark" size={16} color={TEAL} style={{ marginTop: 1 }} />
              <Text style={s.verifiedNoteTxt}>
                This provider has been verified by Hafrik. Their identity, credentials, and service quality have been reviewed.
              </Text>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header:       { paddingHorizontal: 20, paddingBottom: 30, overflow: 'hidden', alignItems: 'center' },
  blob:         { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', right: -40, top: -40 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  profileWrap:  { position: 'relative', marginBottom: 14 },
  avatar:       { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarFallback:{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial:{ color: WHITE, fontSize: 32, fontWeight: '800' },
  verifiedBadge:{ position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  providerName: { color: WHITE, fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  typePill:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', marginBottom: 14 },
  typePillTxt:  { color: WHITE, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  headerMeta:   { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  headerMetaItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerMetaTxt:{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },

  body: { padding: 16 },

  // Contact buttons
  contactRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
  contactBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: 14, borderWidth: 1 },
  contactTxt:  { fontSize: 13, fontWeight: '700' },

  // Cards
  card:        { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  cardTitle:   { color: DARK, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  descTxt:     { color: MUTED, fontSize: 13.5, lineHeight: 21 },

  // Languages
  langRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: a(TEAL, 0.09), borderRadius: 20, borderWidth: 1, borderColor: a(TEAL, 0.2), paddingHorizontal: 12, paddingVertical: 6 },
  langTxt:     { color: TEAL, fontSize: 12, fontWeight: '600' },

  // Info card
  infoCard:    { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 12 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER },
  infoIcon:    { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoLabel:   { color: MUTED, fontSize: 11, marginBottom: 2 },
  infoValue:   { color: DARK, fontSize: 13, fontWeight: '700' },

  // Verified note
  verifiedNote:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: a(TEAL, 0.07), borderRadius: 14, borderWidth: 1, borderColor: a(TEAL, 0.2), padding: 14, marginBottom: 8 },
  verifiedNoteTxt: { flex: 1, color: '#1a5f63', fontSize: 12.5, lineHeight: 18 },

  noDataTxt:   { color: MUTED, fontSize: 15, marginTop: 12 },
});

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, StatusBar, Image, Linking, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

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

const TYPE_COLOR = {
  attraction:  TEAL,
  restaurant:  '#e67e22',
  african_food:GREEN,
  market:      GOLD,
  hotel:       '#8b5cf6',
  nightlife:   '#e91e8c',
  transport:   '#3b82f6',
  emergency:   '#ef4444',
};

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, color = TEAL, last }) {
  if (!value) return null;
  return (
    <View style={[s.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={[s.detailIcon, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Pill list ────────────────────────────────────────────────────────────────
function PillList({ items, color }) {
  if (!items || items.length === 0) return null;
  const list = Array.isArray(items) ? items : [items];
  return (
    <View style={s.pillRow}>
      {list.map((item, i) => (
        <View key={i} style={[s.pill, { backgroundColor: a(color, 0.1), borderColor: a(color, 0.25) }]}>
          <Text style={[s.pillTxt, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PlaceDetailScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { place }  = route.params ?? {};

  const [imgIndex, setImgIndex] = useState(0);

  if (!place) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={44} color={MUTED} />
        <Text style={s.noDataTxt}>Place data not found.</Text>
      </View>
    );
  }

  const images   = Array.isArray(place.images) ? place.images : (place.images ? [place.images] : []);
  const rating   = place.rating ? parseFloat(place.rating).toFixed(1) : null;
  const typeColor = TYPE_COLOR[place.type] ?? TEAL;
  const highlights= Array.isArray(place.highlights) ? place.highlights : (place.highlights ? [place.highlights] : []);
  const bestFor   = Array.isArray(place.best_for)   ? place.best_for   : (place.best_for   ? [place.best_for]   : []);
  const tips      = Array.isArray(place.tips)        ? place.tips       : (place.tips       ? [place.tips]       : []);

  const hasCoords     = place.latitude && place.longitude;
  const hasExternalLink = !!place.external_link;

  const openDirections = () => {
    const url = `https://maps.google.com/?q=${place.latitude},${place.longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  const openExternal = () => {
    Linking.openURL(place.external_link).catch(() => {});
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>

        {/* ── Image gallery ── */}
        <View style={s.galleryWrap}>
          {images.length > 0 ? (
            <>
              <FlatList
                data={images}
                keyExtractor={(uri, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
                renderItem={({ item: uri }) => (
                  <Image source={{ uri }} style={[s.galleryImg, { width: W }]} resizeMode="cover" />
                )}
              />
              {images.length > 1 && (
                <View style={s.dotRow}>
                  {images.map((_, i) => (
                    <View key={i} style={[s.dot, i === imgIndex && s.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <LinearGradient colors={[typeColor, BRAND]} style={[s.galleryImg, { width: W, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="image-outline" size={60} color={WHITE} />
            </LinearGradient>
          )}

          {/* Overlay back button */}
          <View style={[s.galleryOverlay, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>
            {place.is_featured == 1 && (
              <View style={s.featuredBadge}>
                <Ionicons name="star" size={11} color={GOLD} />
                <Text style={s.featuredTxt}>Featured</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>

          {/* ── Name & meta ── */}
          <View style={s.nameSection}>
            <View style={s.nameRow}>
              <Text style={s.placeName}>{place.name}</Text>
              {place.type && (
                <View style={[s.typeBadge, { backgroundColor: a(typeColor, 0.12), borderColor: a(typeColor, 0.3) }]}>
                  <Text style={[s.typeTxt, { color: typeColor }]}>{place.type.replace(/_/g, ' ')}</Text>
                </View>
              )}
            </View>
            <View style={s.metaRow}>
              {rating && (
                <View style={s.ratingPill}>
                  <Ionicons name="star" size={13} color={GOLD} />
                  <Text style={s.ratingTxt}>{rating}</Text>
                </View>
              )}
              {place.city_area && (
                <View style={s.areaPill}>
                  <Ionicons name="location-outline" size={13} color={MUTED} />
                  <Text style={s.areaTxt}>{place.city_area}</Text>
                </View>
              )}
              {(place.price_range || place.ticket_price) && (
                <View style={s.pricePill}>
                  <Ionicons name="pricetag-outline" size={13} color={TEAL} />
                  <Text style={s.priceTxt}>{place.price_range ?? place.ticket_price}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Description ── */}
          {!!place.description && (
            <View style={s.card}>
              <Text style={s.cardTitle}>About</Text>
              <Text style={s.descTxt}>{place.description}</Text>
            </View>
          )}

          {/* ── Highlights ── */}
          {highlights.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Highlights</Text>
              {highlights.map((h, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={[s.bulletDot, { backgroundColor: typeColor }]} />
                  <Text style={s.bulletTxt}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Best for ── */}
          {bestFor.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Best For</Text>
              <PillList items={bestFor} color={typeColor} />
            </View>
          )}

          {/* ── Tips ── */}
          {tips.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Tips</Text>
              {tips.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={[s.tipIconBox, { backgroundColor: a(GOLD, 0.1) }]}>
                    <Ionicons name="bulb-outline" size={13} color={GOLD} />
                  </View>
                  <Text style={s.tipTxt}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Info rows ── */}
          <View style={s.infoCard}>
            <DetailRow icon="time-outline"      label="Opening Hours"  value={place.opening_hours}    color={TEAL}  />
            <DetailRow icon="pricetag-outline"  label="Price / Ticket" value={place.price_range ?? place.ticket_price} color={GOLD} />
            <DetailRow icon="location-outline"  label="Address"        value={place.address}           color={TEAL}  />
            <DetailRow icon="navigate-outline"  label="Area"           value={place.city_area}         color={TEAL}  last />
          </View>

          {/* ── Action buttons ── */}
          {(hasCoords || hasExternalLink) && (
            <View style={s.actionsRow}>
              {hasCoords && (
                <TouchableOpacity style={s.actionBtn} onPress={openDirections} activeOpacity={0.85}>
                  <LinearGradient colors={[BRAND, TEAL]} style={s.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="navigate" size={18} color={WHITE} />
                    <Text style={s.actionTxt}>Get Directions</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {hasExternalLink && (
                <TouchableOpacity style={[s.actionBtn, hasCoords && { flex: 0.9 }]} onPress={openExternal} activeOpacity={0.85}>
                  <View style={s.actionOutline}>
                    <Ionicons name="open-outline" size={17} color={TEAL} />
                    <Text style={s.actionOutlineTxt}>Book / View</Text>
                  </View>
                </TouchableOpacity>
              )}
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

  // Gallery
  galleryWrap:    { height: 280, position: 'relative' },
  galleryImg:     { height: 280 },
  galleryOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16 },
  backBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  featuredBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  featuredTxt:    { color: GOLD, fontSize: 11, fontWeight: '700' },
  dotRow:         { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:      { backgroundColor: WHITE, width: 18 },

  body: { padding: 16 },

  // Name section
  nameSection: { marginBottom: 16 },
  nameRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  placeName:   { flex: 1, color: DARK, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  typeBadge:   { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  typeTxt:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: a(GOLD, 0.1), borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  ratingTxt:   { color: GOLD, fontSize: 13, fontWeight: '800' },
  areaPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: a(TEAL, 0.08), borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  areaTxt:     { color: TEAL, fontSize: 12, fontWeight: '600' },
  pricePill:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: a(TEAL, 0.08), borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  priceTxt:    { color: TEAL, fontSize: 12, fontWeight: '600' },

  // Cards
  card:        { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  cardTitle:   { color: DARK, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  descTxt:     { color: MUTED, fontSize: 13.5, lineHeight: 21 },

  // Bullet list
  bulletRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bulletDot:   { width: 7, height: 7, borderRadius: 3.5, marginTop: 6 },
  bulletTxt:   { flex: 1, color: DARK, fontSize: 13, lineHeight: 20 },

  // Tips
  tipRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipIconBox:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tipTxt:      { flex: 1, color: MUTED, fontSize: 13, lineHeight: 19 },

  // Pills
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:        { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  pillTxt:     { fontSize: 12, fontWeight: '600' },

  // Info card
  infoCard:    { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER },
  detailIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  detailValue: { color: DARK, fontSize: 13, fontWeight: '700' },

  // Actions
  actionsRow:  { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn:   { flex: 1 },
  actionGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },
  actionTxt:   { color: WHITE, fontSize: 14, fontWeight: '800' },
  actionOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, borderWidth: 1.5, borderColor: a(TEAL, 0.3), backgroundColor: a(TEAL, 0.07) },
  actionOutlineTxt: { color: TEAL, fontSize: 14, fontWeight: '800' },

  noDataTxt:   { color: MUTED, fontSize: 15, marginTop: 12 },
});

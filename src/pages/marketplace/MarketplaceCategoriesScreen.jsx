import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import { getCategories } from './marketplaceApi';

const BRAND  = Colors.primaryDark;
const TEAL   = '#1f8e93';
const BG     = '#F7F8FA';
const WHITE  = '#FFFFFF';
const DARK   = Colors.deepSlate ?? '#0F1923';
const MUTED  = Colors.secondaryText ?? '#8A96A3';
const BORDER = '#EAECF0';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return `#${h}${Math.round(op * 255).toString(16).padStart(2, '0')}`;
};

const catMeta = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('electron') || n.includes('phone') || n.includes('gadget')) return { icon: 'phone-portrait-outline', color: '#0284c7' };
  if (n.includes('cloth') || n.includes('fashion') || n.includes('wear'))    return { icon: 'shirt-outline',          color: '#db2777' };
  if (n.includes('bag') || n.includes('shoe'))                               return { icon: 'bag-handle-outline',     color: '#7c3aed' };
  if (n.includes('home') || n.includes('furni') || n.includes('decor'))      return { icon: 'home-outline',           color: '#059669' };
  if (n.includes('beauty') || n.includes('cosmetic'))                        return { icon: 'color-wand-outline',     color: '#ec4899' };
  if (n.includes('tool') || n.includes('industrial'))                        return { icon: 'construct-outline',      color: '#b45309' };
  if (n.includes('sport') || n.includes('fitness'))                          return { icon: 'football-outline',       color: '#16a34a' };
  if (n.includes('baby') || n.includes('kid'))                               return { icon: 'happy-outline',          color: '#f97316' };
  if (n.includes('jewel') || n.includes('watch') || n.includes('access'))     return { icon: 'diamond-outline',        color: '#9333ea' };
  return { icon: 'storefront-outline', color: BRAND };
};

function CategoryCard({ item, onPress }) {
  const meta = catMeta(item.name);
  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardTop} onPress={() => onPress(item)} activeOpacity={0.84}>
        <View style={[s.iconWrap, { backgroundColor: a(meta.color, 0.1), borderColor: a(meta.color, 0.18) }]}>
          <Ionicons name={meta.icon} size={23} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={s.cardSub}>{Number(item.count ?? 0).toLocaleString()} product{Number(item.count ?? 0) === 1 ? '' : 's'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={MUTED} />
      </TouchableOpacity>
    </View>
  );
}

export default function MarketplaceCategoriesScreen({ navigation }) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const parents = await getCategories(token);
      setCategories(parents);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const openCategory = useCallback((category, parentCategory = null) => {
    navigation.navigate('MarketplaceCategoryProducts', {
      category,
      parentCategory: parentCategory ?? category,
    });
  }, [navigation]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        style={[s.header, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.blob} />
        <View style={s.headerBadge}>
          <Ionicons name="grid-outline" size={12} color={WHITE} />
          <Text style={s.headerBadgeTxt}>SHOP BY CATEGORY</Text>
        </View>
        <Text style={s.headerTitle}>Find Products Faster</Text>
        <Text style={s.headerSub}>Browse Hafrik Shop categories sourced through our China buying and shipping network.</Text>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={BRAND} />
          <Text style={s.centerTxt}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item, index) => `category-parent-${item.id}-${index}`}
          renderItem={({ item }) => <CategoryCard item={item} onPress={openCategory} />}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
          ListHeaderComponent={
            <View style={s.listHead}>
              <Text style={s.sectionLabel}>{categories.length} CATEGORIES</Text>
              <TouchableOpacity style={s.allBtn} onPress={() => navigation.navigate('MktShop', { categoryId: 0 })} activeOpacity={0.82}>
                <Ionicons name="sparkles-outline" size={14} color={BRAND} />
                <Text style={s.allBtnTxt}>View all products</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="grid-outline" size={42} color={a(MUTED, 0.5)} />
              <Text style={s.emptyTitle}>No categories found</Text>
              <Text style={s.emptySub}>Pull down to refresh the shop categories.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  blob: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: a(WHITE, 0.05), right: -60, top: -70 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: a(WHITE, 0.14), borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: a(WHITE, 0.2), marginBottom: 16 },
  headerBadgeTxt: { color: WHITE, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, fontFamily: FONT_B },
  headerTitle: { color: WHITE, fontSize: 25, fontWeight: '900', fontFamily: FONT_B, marginBottom: 8, letterSpacing: -0.4 },
  headerSub: { color: a(WHITE, 0.72), fontSize: 12.5, lineHeight: 19, fontFamily: FONT_R, maxWidth: 330 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerTxt: { color: MUTED, marginTop: 10, fontSize: 13, fontFamily: FONT_R },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  listHead: { marginBottom: 14 },
  sectionLabel: { color: MUTED, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, fontFamily: FONT_B, marginBottom: 10 },
  allBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: a(BRAND, 0.07), borderWidth: 1, borderColor: a(BRAND, 0.14), borderRadius: 15, paddingVertical: 13 },
  allBtnTxt: { color: BRAND, fontSize: 13, fontWeight: '900', fontFamily: FONT_B },
  card: { backgroundColor: WHITE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 15, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cardTitle: { color: DARK, fontSize: 15, fontWeight: '900', fontFamily: FONT_B, marginBottom: 3 },
  cardSub: { color: MUTED, fontSize: 12, fontFamily: FONT_M },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyTitle: { color: DARK, fontSize: 18, fontWeight: '900', fontFamily: FONT_B, marginTop: 12 },
  emptySub: { color: MUTED, fontSize: 13, fontFamily: FONT_R, marginTop: 5, textAlign: 'center' },
});

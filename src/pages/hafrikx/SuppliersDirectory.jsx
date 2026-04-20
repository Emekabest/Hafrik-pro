import React, { useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const BG     = '#f7fff7';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';
const ACCENT = '#3b82f6';

const { width: W } = Dimensions.get('window');

const CATEGORIES = [
  'All',
  'Furniture',
  'Lighting',
  'Electronics',
  'Clothing',
  'Bags',
  'Shoes',
  'Building Materials',
  'Tiles',
  'Phones',
  'Home Appliances',
  'Machines',
  'Packaging',
  'Beauty Products',
  'Kitchen Equipment',
];

const MOCK_SUPPLIERS = [
  {
    id: '1',
    name: 'GZ Premier Furniture Co.',
    city: 'Guangzhou',
    category: 'Furniture',
    products: ['Office chairs', 'Dining sets', 'Wardrobes'],
    verified: true,
    rating: 4.8,
    minOrder: '50 pcs',
  },
  {
    id: '2',
    name: 'Foshan Bright Lights Ltd',
    city: 'Foshan',
    category: 'Lighting',
    products: ['LED panels', 'Outdoor lights', 'Chandeliers'],
    verified: true,
    rating: 4.6,
    minOrder: '100 pcs',
  },
  {
    id: '3',
    name: 'Yiwu Fashion Hub',
    city: 'Yiwu',
    category: 'Clothing',
    products: ['T-shirts', 'Ankara-style prints', 'Sportswear'],
    verified: true,
    rating: 4.5,
    minOrder: '200 pcs',
  },
  {
    id: '4',
    name: 'Guangzhou Tech Zone',
    city: 'Guangzhou',
    category: 'Electronics',
    products: ['Smartphones', 'Tablets', 'Accessories'],
    verified: false,
    rating: 4.3,
    minOrder: '20 pcs',
  },
  {
    id: '5',
    name: 'Foshan Tile Palace',
    city: 'Foshan',
    category: 'Tiles',
    products: ['Floor tiles', 'Wall tiles', 'Mosaic tiles'],
    verified: true,
    rating: 4.7,
    minOrder: '100 sqm',
  },
];

const CategoryPill = memo(({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.categoryPill, active && styles.categoryPillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
));

const SupplierCard = memo(({ item }) => (
  <View style={styles.supplierCard}>
    <View style={styles.cardLeftStrip} />
    <View style={styles.cardContent}>
      {/* Top row */}
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.supplierName}>{item.name}</Text>
          <View style={styles.cityRow}>
            <Ionicons name="location-sharp" size={12} color={MUTED} />
            <Text style={styles.cityText}>{item.city}, China</Text>
          </View>
        </View>
        <View style={styles.badgeWrap}>
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="star" size={10} color={WHITE} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={TEAL} />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </View>

      {/* Products */}
      <View style={styles.productsWrap}>
        {item.products.map((p, i) => (
          <View key={i} style={styles.productTag}>
            <Text style={styles.productTagText}>{p}</Text>
          </View>
        ))}
      </View>

      {/* Min order */}
      <Text style={styles.minOrderText}>Min. order: {item.minOrder}</Text>

      {/* Action buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={ACCENT} />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quoteBtn} activeOpacity={0.8}>
          <LinearGradient colors={[BRAND, TEAL]} style={styles.quoteBtnGrad}>
            <Ionicons name="document-text-outline" size={14} color={WHITE} />
            <Text style={styles.quoteBtnText}>Get Quote</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </View>
));

export default function SuppliersDirectory() {
  const insets    = useSafeAreaInsets();
  const navigation = useNavigation();

  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? MOCK_SUPPLIERS
    : MOCK_SUPPLIERS.filter(s => s.category === activeCategory);

  const renderItem = useCallback(({ item }) => <SupplierCard item={item} />, []);
  const keyExtractor = useCallback(item => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suppliers</Text>
        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color={WHITE} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Category scroll */}
      <View style={styles.categoryWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => (
            <CategoryPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Suppliers list */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="storefront-outline" size={44} color={MUTED} />
            <Text style={styles.emptyText}>No suppliers in this category yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryWrap: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  categoryScroll: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryPillActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  categoryPillText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 13,
    color: MUTED,
  },
  categoryPillTextActive: {
    color: WHITE,
    fontFamily: 'WorkSans_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  supplierCard: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardLeftStrip: {
    width: 4,
    backgroundColor: TEAL,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  supplierName: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 15,
    color: BRAND,
    marginBottom: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  badgeWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEAL,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  verifiedText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 10,
    color: WHITE,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: TEAL,
  },
  productsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  productTag: {
    backgroundColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  productTagText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: BRAND,
  },
  minOrderText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: MUTED,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    paddingVertical: 9,
  },
  chatBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: ACCENT,
  },
  quoteBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  quoteBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  quoteBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: WHITE,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: MUTED,
  },
});

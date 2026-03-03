import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width } = Dimensions.get('window');
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;
const CREAM  = Colors.background;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

const API_BASE = 'https://hafrik.com';

export default function MyListingsScreen({ navigation }) {
  const { token, user } = useAuth();
  const { top } = useSafeAreaInsets();

  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadListings = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/marketplace/my_listings.php?user_id=${user?.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json?.data) setListings(json.data);
    } catch (e) {
      console.log('MyListings error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => { loadListings(); }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Listing',
      `Remove "${item.title}" from the marketplace?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/api/v1/marketplace/delete_listing.php`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ listing_id: item.id }),
              });
              setListings(prev => prev.filter(l => l.id !== item.id));
            } catch (e) {
              Alert.alert('Error', 'Could not delete listing. Try again.');
            }
          },
        },
      ]
    );
  };

  const openListing = (item) => {
    navigation.navigate('MarketplaceWebview', {
      url: `${API_BASE}/posts/${item.post_id}`,
      title: item.title,
    });
  };

  const renderItem = ({ item }) => {
    const image = item.thumbnail || `${API_BASE}/default-avatar.png`;
    const isActive = item.status !== 'inactive' && item.status !== 'sold';

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardInner} onPress={() => openListing(item)} activeOpacity={0.85}>
          <Image source={{ uri: image }} style={styles.productImage} />
          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={[styles.statusBadge, !isActive && styles.statusBadgeInactive]}>
                <Text style={[styles.statusText, !isActive && styles.statusTextInactive]}>
                  {item.status ?? 'Active'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardPrice}>¥{item.price}</Text>
            <View style={styles.cardMeta}>
              {!!item.location && (
                <View style={styles.metaChip}>
                  <Ionicons name="location-outline" size={11} color={MUTED} />
                  <Text style={styles.metaText}>{item.location}</Text>
                </View>
              )}
              {!!item.posted_at && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={11} color={MUTED} />
                  <Text style={styles.metaText}>{item.posted_at}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('MarketplaceWebview', {
              url: `${API_BASE}/marketplace/edit/${item.id}`,
              title: 'Edit Listing',
            })}
          >
            <Ionicons name="pencil-outline" size={15} color={BRAND} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity style={styles.actionBtn} onPress={() => openListing(item)}>
            <Ionicons name="eye-outline" size={15} color={BRAND} />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity style={[styles.actionBtn, { flex: 0.7 }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={15} color={Colors.coral} />
            <Text style={[styles.actionText, { color: Colors.coral }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient colors={[BRAND, Colors.tealHeader]} style={[styles.header, { paddingTop: top + 4 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSub}>{listings.length} item{listings.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: ACCENT }]}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add" size={20} color={BRAND} />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="storefront-outline" size={56} color={MUTED} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Tap the + button to post your first item.</Text>
              <TouchableOpacity
                style={styles.postBtn}
                onPress={() => navigation.navigate('CreateListing')}
              >
                <LinearGradient
                  colors={[BRAND, Colors.tealHeader]}
                  style={styles.postGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                  <Text style={styles.postBtnText}>Post a Listing</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.15),
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 11, color: withOpacity(Colors.white, 0.7), marginTop: 2 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { padding: 14, gap: 12 },

  card: {
    backgroundColor: Colors.white, borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardInner: { flexDirection: 'row', padding: 12, gap: 12 },
  productImage: { width: 80, height: 80, borderRadius: 12 },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: 4,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: DARK },
  statusBadge: {
    backgroundColor: `${ACCENT}18`, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0,
  },
  statusBadgeInactive: { backgroundColor: withOpacity(Colors.coral, 0.12) },
  statusText: { fontSize: 10, fontWeight: '700', color: Colors.successStrong, textTransform: 'uppercase' },
  statusTextInactive: { color: Colors.coral },
  cardPrice: { fontSize: 16, fontWeight: '900', color: ACCENT, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceBase, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  metaText: { fontSize: 10, color: MUTED },

  actionRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: BRAND },
  actionDivider: { width: 1, backgroundColor: BORDER, marginVertical: 8 },

  emptyWrap: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center' },
  postBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  postGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 13,
  },
  postBtnText: { fontSize: 14, fontWeight: '800', color: Colors.white },
});

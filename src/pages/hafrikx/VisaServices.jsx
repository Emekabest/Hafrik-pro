import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG      = '#f7fff7';
const CARD    = '#ffffff';
const BORDER  = '#e4eeef';
const GOLD    = '#c9a84c';
const GOLD_LT = '#e8c87a';
const MUTED   = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';
const ACCENT  = '#3b82f6';

const { width: W } = Dimensions.get('window');

const ServiceCard = memo(({ service, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => onPress(service)}
      activeOpacity={0.85}
    >
      {/* Icon */}
      <View style={styles.cardIconWrap}>
        <LinearGradient colors={['#e8f5f5', '#ffffff']} style={styles.cardIconGrad}>
          <Ionicons name="checkmark-circle-outline" size={22} color={TEAL} />
        </LinearGradient>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.serviceTitle}>{service.name}</Text>
        <Text style={styles.serviceDesc}>{service.description}</Text>

        <View style={styles.cardMetaRow}>
          {service.processing_time && (
            <View style={styles.cardMetaItem}>
              <Ionicons name="time-outline" size={12} color={MUTED} />
              <Text style={styles.cardMetaText}>{service.processing_time}</Text>
            </View>
          )}
          {(service.price_label || service.price) && (
            <View style={styles.cardMetaItem}>
              <Ionicons name="pricetag-outline" size={12} color={MUTED} />
              <Text style={styles.cardMetaText}>{service.price_label || service.price}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow indicator */}
      <Ionicons name="chevron-forward" size={20} color={MUTED} />
    </TouchableOpacity>
  );
});

export default function VisaServices() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/services/list.php');
      const data = res.data?.data ?? res.data ?? [];
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? 'Failed to load services');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServicePress = useCallback((service) => {
    const name = service.name ?? '';

    if (name === 'Arrival Pickup') {
      navigation.navigate('ArrivalConcierge');
      return;
    }

    if (name === 'Tour Guide') {
      navigation.navigate('TourGuideScreen');
      return;
    }

    navigation.navigate('ServiceApplyScreen', {
      service_id:      service.id,
      service_name:    service.name,
      description:     service.description,
      price:           service.price_label || service.price,
      processing_time: service.processing_time,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Services</Text>
          <Text style={styles.headerSub}>Everything you need for your China visit</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyApplications')} style={styles.myAppsBtn} activeOpacity={0.7}>
          <Ionicons name="clipboard-outline" size={22} color={WHITE} />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchServices}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero banner */}
          <LinearGradient colors={['#e8f5f5', '#ffffff']} style={styles.heroBanner}>
            <Ionicons name="airplane" size={28} color={GOLD} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroTitle}>Plan Your China Trip</Text>
              <Text style={styles.heroSubtitle}>
                From visa to factory visits — we handle it all for you.
              </Text>
            </View>
          </LinearGradient>

          {/* Section label */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Available Services</Text>
          </View>

          {/* Service cards */}
          {services.length > 0 ? (
            services.map((service, idx) => (
              <ServiceCard 
                key={service.id ?? idx} 
                service={service}
                onPress={handleServicePress}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={40} color={MUTED} />
              <Text style={styles.emptyText}>No services available</Text>
            </View>
          )}

          {/* Contact footer */}
          <View style={styles.contactCard}>
            <Ionicons name="chatbubbles-outline" size={20} color={TEAL} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.contactTitle}>Need custom assistance?</Text>
              <Text style={styles.contactSub}>
                Chat with our China team directly on WhatsApp or via the app.
              </Text>
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      )}
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
  myAppsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroTitle: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 15,
    color: BRAND,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  sectionTitle: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 16,
    color: BRAND,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  cardIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardIconGrad: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TEAL + '40',
    borderRadius: 12,
  },
  cardBody: {
    flex: 1,
  },
  serviceTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: BRAND,
    marginBottom: 3,
    lineHeight: 18,
  },
  serviceDesc: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: MUTED,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TEAL,
    alignItems: 'center',
    minWidth: 56,
    backgroundColor: TEAL + '12',
  },
  actionBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: TEAL,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  contactTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: BRAND,
    marginBottom: 4,
  },
  contactSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  errorText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: MUTED,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: TEAL,
  },
  retryBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: WHITE,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: MUTED,
    marginTop: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
});

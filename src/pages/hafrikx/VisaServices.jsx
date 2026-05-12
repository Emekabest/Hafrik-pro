import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
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

const serviceMeta = (name = '') => {
  const n = String(name).toLowerCase();
  if (n.includes('visa')) return { icon: 'document-text-outline', color: '#06b6d4', label: 'Travel' };
  if (n.includes('admission') || n.includes('school') || n.includes('student')) return { icon: 'school-outline', color: '#8b5cf6', label: 'Study' };
  if (n.includes('tour') || n.includes('guide')) return { icon: 'map-outline', color: '#10b981', label: 'Guide' };
  if (n.includes('business')) return { icon: 'briefcase-outline', color: '#f59e0b', label: 'Business' };
  if (n.includes('document')) return { icon: 'folder-open-outline', color: '#3b82f6', label: 'Docs' };
  return { icon: 'sparkles-outline', color: TEAL, label: 'Service' };
};

const ServiceCard = memo(({ service, onPress }) => {
  const meta = serviceMeta(service.name);
  return (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => onPress(service)}
      activeOpacity={0.85}
    >
      <View style={styles.cardIconWrap}>
        <LinearGradient colors={[meta.color + '1F', '#ffffff']} style={styles.cardIconGrad}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </LinearGradient>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.serviceTopRow}>
          <Text style={styles.serviceTitle} numberOfLines={1}>{service.name}</Text>
          <View style={[styles.serviceTypePill, { backgroundColor: meta.color + '14' }]}>
            <Text style={[styles.serviceTypeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.serviceDesc} numberOfLines={2}>{service.description}</Text>

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

      <View style={styles.serviceArrow}>
        <Ionicons name="arrow-forward" size={14} color={BRAND} />
      </View>
    </TouchableOpacity>
  );
});

export default function VisaServices() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const featuredServices = useMemo(() => services.slice(0, 2), [services]);
  const serviceCountText = useMemo(() => {
    const count = services.length;
    return `${count} available service${count === 1 ? '' : 's'}`;
  }, [services.length]);

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

    // School Admission gets its own dedicated screen
    if (name.toLowerCase().includes('admission') || name.toLowerCase().includes('school')) {
      navigation.navigate('SchoolAdmissionScreen', {
        service_id:      service.id,
        service_name:    service.name,
        description:     service.description,
        price:           service.price_label || service.price,
        processing_time: service.processing_time,
      });
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
          <LinearGradient
            colors={['#0c3f44', '#155f66', '#1f8e93']}
            style={styles.heroBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroOrb} />
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="sparkles" size={22} color={GOLD_LT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>HAFRIK SERVICES</Text>
                <Text style={styles.heroTitle}>Get help faster in China</Text>
              </View>
            </View>
            <Text style={styles.heroSubtitle}>
              Visa, admission, tour guide, documents and arrival support handled from one place.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Ionicons name="flash-outline" size={13} color={GOLD_LT} />
                <Text style={styles.heroStatText}>{serviceCountText}</Text>
              </View>
              <TouchableOpacity style={styles.heroTrackBtn} activeOpacity={0.85} onPress={() => navigation.navigate('MyApplications')}>
                <Text style={styles.heroTrackText}>Track requests</Text>
                <Ionicons name="arrow-forward" size={12} color={BRAND} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={styles.arrivalCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('ArrivalConcierge')}
          >
            <LinearGradient
              colors={['#0c3f44', '#1f8e93']}
              style={styles.arrivalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.arrivalOrb} />
              <View style={styles.arrivalIconWrap}>
                <Ionicons name="airplane" size={22} color={GOLD_LT} />
              </View>
              <View style={styles.arrivalBody}>
                <Text style={styles.arrivalKicker}>ARRIVAL SUPPORT</Text>
                <Text style={styles.arrivalTitle}>Book Arrival Concierge</Text>
                <Text style={styles.arrivalSub}>Airport pickup, SIM card, hotel help and city guidance.</Text>
              </View>
              <View style={styles.arrivalArrow}>
                <Ionicons name="arrow-forward" size={15} color={BRAND} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {featuredServices.length > 0 && (
            <View style={styles.featuredStrip}>
              <Text style={styles.featuredLabel}>POPULAR SERVICES</Text>
              <View style={styles.featuredRow}>
                {featuredServices.map((service, idx) => {
                  const meta = serviceMeta(service.name);
                  return (
                    <TouchableOpacity
                      key={service.id ?? idx}
                      style={styles.featuredMini}
                      activeOpacity={0.85}
                      onPress={() => handleServicePress(service)}
                    >
                      <View style={[styles.featuredMiniIcon, { backgroundColor: meta.color + '16' }]}>
                        <Ionicons name={meta.icon} size={16} color={meta.color} />
                      </View>
                      <Text style={styles.featuredMiniTitle} numberOfLines={2}>{service.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section label */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>LIVE FROM ENDPOINT</Text>
              <Text style={styles.sectionTitle}>Available Services</Text>
            </View>
            <Text style={styles.sectionCount}>{serviceCountText}</Text>
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
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: WHITE,
    opacity: 0.06,
    right: -60,
    top: -70,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroKicker: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.62)',
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 22,
    color: WHITE,
    marginTop: 3,
  },
  heroSubtitle: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.76)',
    lineHeight: 19,
    marginTop: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.84)',
  },
  heroTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: GOLD_LT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroTrackText: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 11,
    color: BRAND,
  },
  arrivalCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },
  arrivalGradient: {
    minHeight: 122,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  arrivalOrb: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: WHITE,
    opacity: 0.07,
    right: -42,
    top: -54,
  },
  arrivalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalBody: {
    flex: 1,
  },
  arrivalKicker: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.62)',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  arrivalTitle: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 16,
    color: WHITE,
  },
  arrivalSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 17,
    marginTop: 4,
  },
  arrivalArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GOLD_LT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredStrip: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 20,
  },
  featuredLabel: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 10,
    color: MUTED,
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  featuredRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featuredMini: {
    flex: 1,
    minHeight: 94,
    borderRadius: 16,
    backgroundColor: '#f3fbfb',
    borderWidth: 1,
    borderColor: TEAL + '1F',
    padding: 12,
  },
  featuredMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredMiniTitle: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 12,
    color: BRAND,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 9,
    color: MUTED,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 18,
    color: BRAND,
  },
  sectionCount: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 11,
    color: TEAL,
    backgroundColor: TEAL + '12',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
    marginBottom: 12,
    gap: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardIconWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardIconGrad: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TEAL + '40',
    borderRadius: 12,
  },
  cardBody: {
    flex: 1,
  },
  serviceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  serviceTitle: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: BRAND,
    lineHeight: 18,
    flex: 1,
  },
  serviceTypePill: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  serviceTypeText: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 9,
  },
  serviceDesc: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
    marginBottom: 10,
    lineHeight: 17,
  },
  serviceArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GOLD_LT,
    alignItems: 'center',
    justifyContent: 'center',
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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const PINK   = '#EC4899';
const MUTED  = '#7A9198';
const BORDER = 'rgba(12,63,68,0.09)';
const CREAM  = '#F5F0E8';

const filters = ['All', 'Full-time', 'Part-time', 'Remote', 'Internship'];

const jobs = [
  {
    id: '1',
    title: 'Trade Liaison Coordinator',
    company: 'SinoAfrica Import Co.',
    location: 'Guangzhou',
    type: 'Full-time',
    salary: '¥15,000 / mo',
    tags: ['Bilingual', 'Sourcing', 'On-site'],
    posted: '2h ago',
    urgent: true,
    color: ['#EC4899', '#BE185D'],
    icon: 'briefcase-outline',
  },
  {
    id: '2',
    title: 'African Market Sales Rep',
    company: 'Yiwu Global Trade',
    location: 'Yiwu',
    type: 'Full-time',
    salary: '¥12,000 / mo',
    tags: ['Sales', 'French', 'On-site'],
    posted: '5h ago',
    urgent: false,
    color: ['#F59E0B', '#F97316'],
    icon: 'trending-up-outline',
  },
  {
    id: '3',
    title: 'Freelance Interpreter (Mandarin–English)',
    company: 'Independent',
    location: 'Shenzhen / Remote',
    type: 'Part-time',
    salary: '¥300–500 / day',
    tags: ['Language', 'Freelance', 'Flexible'],
    posted: '1d ago',
    urgent: false,
    color: ['#13C296', '#0a8a68'],
    icon: 'language-outline',
  },
  {
    id: '4',
    title: 'Logistics & Shipping Agent',
    company: 'AfriShip Cargo Ltd.',
    location: 'Guangzhou',
    type: 'Full-time',
    salary: '¥10,000 / mo',
    tags: ['Logistics', 'English', 'On-site'],
    posted: '2d ago',
    urgent: false,
    color: ['#3B82F6', '#1D4ED8'],
    icon: 'cube-outline',
  },
  {
    id: '5',
    title: 'Social Media Manager (Africa Brands)',
    company: 'HafrikMedia',
    location: 'Remote',
    type: 'Remote',
    salary: '¥8,000 / mo',
    tags: ['Content', 'Design', 'Remote'],
    posted: '3d ago',
    urgent: false,
    color: ['#8B5CF6', '#6D28D9'],
    icon: 'megaphone-outline',
  },
  {
    id: '6',
    title: 'Quality Control Inspector',
    company: 'GZ Garments Factory',
    location: 'Guangzhou',
    type: 'Full-time',
    salary: '¥9,000 / mo',
    tags: ['QC', 'Fashion', 'On-site'],
    posted: '4d ago',
    urgent: true,
    color: ['#EC4899', '#BE185D'],
    icon: 'checkmark-circle-outline',
  },
  {
    id: '7',
    title: 'Business Development Intern',
    company: 'Pan-Africa Trading Hub',
    location: 'Beijing',
    type: 'Internship',
    salary: '¥3,000 / mo',
    tags: ['Internship', 'BD', 'Mandarin+'],
    posted: '5d ago',
    urgent: false,
    color: ['#F59E0B', '#F97316'],
    icon: 'school-outline',
  },
];

const JobsScreen = ({ navigation }) => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? jobs
    : jobs.filter(j => j.type === activeFilter);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardHeader}>
        <LinearGradient colors={item.color} style={styles.companyIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={item.icon} size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.jobMeta}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.companyName}>{item.company}</Text>
        </View>

        {item.urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}
      </View>

      {/* Details row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailChip}>
          <Ionicons name="location-outline" size={13} color={MUTED} />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailChip}>
          <Ionicons name="time-outline" size={13} color={MUTED} />
          <Text style={styles.detailText}>{item.type}</Text>
        </View>
        <View style={styles.detailChip}>
          <MaterialCommunityIcons name="cash" size={13} color={MUTED} />
          <Text style={styles.detailText}>{item.salary}</Text>
        </View>
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {item.tags.map(tag => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        <Text style={styles.postedTime}>{item.posted}</Text>
      </View>

      {/* Apply button */}
      <TouchableOpacity style={styles.applyBtn} activeOpacity={0.82}>
        <LinearGradient colors={item.color} style={styles.applyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.applyText}>Apply Now</Text>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PINK} />

      {/* Header */}
      <LinearGradient colors={['#EC4899', '#BE185D']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Jobs</Text>
          <Text style={styles.headerSub}>{jobs.length} openings near you</Text>
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filter pills */}
      <View style={styles.filterWrap}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterPillText, activeFilter === item && styles.filterPillTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Jobs list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="briefcase-outline" size={48} color={MUTED} />
            <Text style={styles.emptyText}>No jobs in this category yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F8',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filter
  filterWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  filterPillActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
  },
  filterPillTextActive: {
    color: '#fff',
  },

  // List
  list: {
    padding: 14,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  jobMeta: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
    marginBottom: 2,
  },
  companyName: {
    fontSize: 12,
    color: MUTED,
  },
  urgentBadge: {
    backgroundColor: 'rgba(232,93,74,0.12)',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E85D4A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Details
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F7F8',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  detailText: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '500',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(19,194,150,0.1)',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
  },
  postedTime: {
    fontSize: 11,
    color: MUTED,
    marginLeft: 'auto',
  },

  // Apply
  applyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },
  applyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
  },
});

export default JobsScreen;

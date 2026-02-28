// SearchEmptyState — discovery mode (no query) + no-results state (has query, no matches).
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonCard } from './SearchCards';
import AppDetails from '../../helpers/appdetails';

const PRIMARY = '#0C3F44';
const ACCENT  = '#13C296';
const DARK    = '#0D1B1E';

const TRENDING = [
  { label: 'Africans in China',  icon: 'trending-up'  },
  { label: 'Hafrik Events',      icon: 'calendar'     },
  { label: 'Diaspora Jobs',      icon: 'briefcase'    },
  { label: 'African Food',       icon: 'restaurant'   },
  { label: 'Study Abroad',       icon: 'school'       },
  { label: 'Business Network',   icon: 'business'     },
  { label: 'Visa & Immigration', icon: 'airplane'     },
  { label: 'African Community',  icon: 'people'       },
];

const TrendingChips = ({ onPress }) => (
  <View style={styles.chipsWrap}>
    {TRENDING.map(t => (
      <TouchableOpacity
        key={t.label}
        style={styles.chip}
        activeOpacity={0.78}
        onPress={() => onPress(t.label)}
      >
        <Ionicons name={t.icon} size={13} color={ACCENT} style={{ marginRight: 5 }} />
        <Text style={styles.chipText}>{t.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const SearchEmptyState = ({
  query,
  onTrendingPress,
  recentSearches,
  onRecentPress,
  onRemoveRecent,
  suggestedPeople,
  onPersonPress,
  followedIds,
  onFollowToggle,
}) => {
  // ── No results for a query ─────────────────────────────────────────────────
  if (query?.trim()) {
    return (
      <View style={styles.wrap}>
        <View style={styles.iconBg}>
          <Ionicons name="search-outline" size={36} color={ACCENT} />
        </View>
        <Text style={styles.emptyTitle}>No results for "{query}"</Text>
        <Text style={styles.emptySub}>
          Try different keywords or check the spelling
        </Text>

        <View style={styles.sectionRow}>
          <Ionicons name="flame-outline" size={15} color={ACCENT} style={{ marginRight: 6 }} />
          <Text style={styles.sectionLabel}>Try searching for</Text>
        </View>
        <TrendingChips onPress={onTrendingPress} />
      </View>
    );
  }

  // ── Discovery mode (no query) ──────────────────────────────────────────────
  return (
    <View style={styles.wrap}>

      {/* Recent searches */}
      {recentSearches?.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Ionicons name="time-outline" size={15} color="#aaa" style={{ marginRight: 6 }} />
            <Text style={styles.sectionLabel}>Recent</Text>
          </View>
          {recentSearches.map((q, i) => (
            <TouchableOpacity
              key={`recent_${i}`}
              style={styles.recentRow}
              activeOpacity={0.75}
              onPress={() => onRecentPress(q)}
            >
              <View style={styles.recentIcon}>
                <Ionicons name="time-outline" size={15} color="#bbb" />
              </View>
              <Text style={styles.recentText} numberOfLines={1}>{q}</Text>
              <TouchableOpacity
                onPress={() => onRemoveRecent(q)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color="#ccc" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Trending chips */}
      <View style={styles.sectionRow}>
        <Ionicons name="flame-outline" size={15} color={ACCENT} style={{ marginRight: 6 }} />
        <Text style={styles.sectionLabel}>Trending on Hafrik</Text>
      </View>
      <TrendingChips onPress={onTrendingPress} />

      {/* Suggested people */}
      {suggestedPeople?.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Ionicons name="people-outline" size={15} color={PRIMARY} style={{ marginRight: 6 }} />
            <Text style={styles.sectionLabel}>People you may know</Text>
          </View>
          {suggestedPeople.map(person => (
            <PersonCard
              key={`suggested_${person.id ?? person.user_id}`}
              item={{
                id: person.id ?? person.user_id,
                title: person.name ?? person.title ?? person.username,
                subtitle: person.subtitle ?? person.username ?? person.bio,
                thumbnail: person.avatar ?? person.thumbnail ?? person.profile_photo,
                verified: person.verified,
              }}
              onPress={() => onPersonPress && onPersonPress(person)}
              isFollowed={followedIds?.has(person.id ?? person.user_id)}
              onFollowToggle={onFollowToggle}
            />
          ))}
        </>
      )}

      {/* Footer hint */}
      <View style={styles.hintRow}>
        <Ionicons name="globe-outline" size={14} color="#ccc" />
        <Text style={styles.hintText}>Explore the Hafrik community worldwide</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 16 },

  // No-results empty
  iconBg: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(12,63,68,0.07)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 30, marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(19,194,150,0.2)',
  },
  emptyTitle: {
    fontSize: 19, fontFamily: AppDetails.fontFamily.inter.semiBold,
    color: '#1a1a1a', textAlign: 'center', marginBottom: 8,
  },
  emptySub: {
    fontSize: 14, color: '#aaa',
    fontFamily: AppDetails.fontFamily.inter.regular,
    textAlign: 'center', lineHeight: 21, marginBottom: 28,
  },

  // Section label
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, marginTop: 6,
  },
  sectionLabel: {
    fontSize: 12, fontFamily: AppDetails.fontFamily.redex.bold,
    color: '#666', letterSpacing: 0.7, textTransform: 'uppercase',
  },

  // Trending chips
  chipsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(19,194,150,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chipText: {
    fontSize: 13, color: DARK,
    fontFamily: AppDetails.fontFamily.inter.semiBold,
  },

  // Recent row
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  recentIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  recentText: {
    flex: 1, fontSize: 14, color: '#333',
    fontFamily: AppDetails.fontFamily.inter.regular,
  },

  // Footer hint
  hintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 12, marginBottom: 30, opacity: 0.6,
  },
  hintText: {
    fontSize: 12, color: '#aaa',
    fontFamily: AppDetails.fontFamily.inter.regular,
  },
});

export default SearchEmptyState;

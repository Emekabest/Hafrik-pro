import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CARD   = Colors.white;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;

const hex2 = (hex, op) => {
  const h = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

// ─── Single person chip ────────────────────────────────────────────────────────
const PersonChip = memo(({ person, onPress }) => {
  const avatar = person.avatar ?? person.profile_picture ?? null;
  const name   = (person.first_name ?? person.full_name ?? person.username ?? 'User').split(' ')[0];

  return (
    <TouchableOpacity style={s.chip} onPress={() => onPress(person)} activeOpacity={0.82}>
      <View style={s.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.avatar} resizeMode="cover" />
        ) : (
          <View style={[s.avatar, s.avatarFb]}>
            <Text style={s.avatarInitial}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        {/* Green online dot */}
        <View style={s.onlineDot} />
      </View>
      <Text style={s.chipName} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
});

// ─── OnlineNowStrip ────────────────────────────────────────────────────────────
const OnlineNowStrip = ({ people = [] }) => {
  const navigation = useNavigation();

  const visible = people
    .filter(p => p.avatar || p.profile_picture)
    .slice(0, 8);

  if (!visible.length) return null;

  const handlePress = useCallback((person) => {
    const id = person.id ?? person.user_id;
    if (id) navigation.navigate('UserProfile', { userId: id, username: person.username ?? '' });
  }, [navigation]);

  return (
    <View style={s.wrap}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.liveDot} />
          <Text style={s.headerTxt}>Active Now</Text>
        </View>
        <View style={s.countPill}>
          <Text style={s.countTxt}>{visible.length}+ online</Text>
        </View>
      </View>

      {/* Horizontal people row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {visible.map((person, i) => (
          <PersonChip
            key={person.id ?? person.user_id ?? i}
            person={person}
            onPress={handlePress}
          />
        ))}

        {/* "See all" chip */}
        <TouchableOpacity
          style={s.seeAllChip}
          onPress={() => navigation.navigate('PeopleYouMayKnow')}
          activeOpacity={0.8}
        >
          <View style={s.seeAllIcon}>
            <Ionicons name="people" size={16} color={ACCENT} />
          </View>
          <Text style={s.seeAllTxt}>See all</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: hex2(BRAND, 0.07),
    paddingBottom: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: DARK,
    fontFamily: AppDetails.fontFamily?.heading ?? 'System',
  },
  countPill: {
    backgroundColor: hex2('#22c55e', 0.1),
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
  },
  countTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    fontFamily: AppDetails.fontFamily?.body ?? 'System',
  },

  scroll: { paddingHorizontal: 14, gap: 14, alignItems: 'flex-start' },

  // Person chip
  chip: { alignItems: 'center', width: 58, gap: 5 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: hex2(ACCENT, 0.25),
    backgroundColor: hex2(BRAND, 0.1),
  },
  avatarFb: { alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND },
  avatarInitial: { fontSize: 20, fontWeight: '900', color: WHITE },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2, borderColor: CARD,
  },
  chipName: {
    fontSize: 11,
    fontWeight: '600',
    color: DARK,
    textAlign: 'center',
    fontFamily: AppDetails.fontFamily?.body ?? 'System',
  },

  // See all chip
  seeAllChip: { alignItems: 'center', width: 58, gap: 5 },
  seeAllIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: hex2(ACCENT, 0.08),
    borderWidth: 2, borderColor: hex2(ACCENT, 0.2),
    alignItems: 'center', justifyContent: 'center',
  },
  seeAllTxt: {
    fontSize: 11, fontWeight: '600', color: ACCENT,
    textAlign: 'center',
    fontFamily: AppDetails.fontFamily?.body ?? 'System',
  },
});

export default memo(OnlineNowStrip);

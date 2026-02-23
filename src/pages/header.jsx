import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import useStore from '../repository/store';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';

const Header = ({ onOpenDrawer }) => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  
  const notificationCount = useStore((s) => s.notificationCount ?? 0);
  const messageCount      = useStore((s) => s.messageCount ?? 0);
  const setSearchQuery    = useStore((s) => s.setSearchQuery);

  const goSearchScreen = useCallback((query) => {
    const q = String(query ?? '').trim();
    try { setSearchQuery?.(q); } catch {}
    navigation.navigate('SearchScreen', { initialQuery: q });
  }, [navigation, setSearchQuery]);

  return (
    <LinearGradient
      colors={[BRAND, '#0A5A62']}
      style={[ss.header, { paddingTop: top + 6 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={ss.headerInner}>
        {/* Hamburger — opens DrawerNavigation */}
        <TouchableOpacity
          style={ss.iconBtn}
          activeOpacity={0.85}
          onPress={onOpenDrawer}
        >
          <Ionicons name="menu-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={ss.headerRight}>
          {/* Notifications */}
          <TouchableOpacity
            style={ss.iconBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {notificationCount > 0 && (
              <View style={ss.badge}>
                <Text style={ss.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Messages */}
          <TouchableOpacity
            style={ss.iconBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Inbox')}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
            {messageCount > 0 && (
              <View style={ss.badge}>
                <Text style={ss.badgeText}>{messageCount > 99 ? '99+' : messageCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Search */}
          <TouchableOpacity
            style={ss.iconBtn}
            activeOpacity={0.85}
            onPress={() => goSearchScreen('')}
          >
            <Ionicons name="search-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const ss = StyleSheet.create({

    // ── Fixed header ─────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 12,
  },
  headerInner:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: BRAND,
  },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '900' },
  countryDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT,
  },
 
});
export default Header;
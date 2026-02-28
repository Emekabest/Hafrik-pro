// Shared app header — matches Explore/PagesScreen style.
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import useStore from '../repository/store';
import AppDetails from '../helpers/appdetails';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const BASE_URL = 'https://hafrik.com';

/**
 * AppHeader — consistent top header used on Home & Profile screens.
 *
 * Props:
 *   onOpenDrawer  — opens the side drawer
 *   title         — if set, shows a text title in the centre instead of the logo
 */
const AppHeader = ({ onOpenDrawer, title }) => {
  const { top }       = useSafeAreaInsets();
  const navigation    = useNavigation();
  const { token }     = useAuth();

  const notifCount    = useStore((s) => s.notificationCount ?? 0);
  const msgCount      = useStore((s) => s.messageCount ?? 0);
  const setNotifCount = useStore((s) => s.setNotificationCount);
  const setMsgCount   = useStore((s) => s.setMessageCount);

  // pulse animation for notification bell when count changes
  const bellPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (notifCount > 0) {
      Animated.sequence([
        Animated.spring(bellPulse, { toValue: 1.25, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(bellPulse, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 5 }),
      ]).start();
    }
  }, [notifCount]);

  // poll notification & message counts
  useEffect(() => {
    if (!token) return;
    const fetchCounts = async () => {
      try {
        const [nRes, mRes] = await Promise.all([
          fetch(`${BASE_URL}/api/v1/notifications/unread_count.php`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/v1/messages/inbox.php?page=1&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const nJson = await nRes.json().catch(() => ({}));
        const mJson = await mRes.json().catch(() => ({}));
        setNotifCount(Number(nJson?.count ?? nJson?.data?.count ?? notifCount));
        const items = Array.isArray(mJson?.data?.items) ? mJson.data.items
                    : Array.isArray(mJson?.data) ? mJson.data : [];
        const unreadMsg = items.filter((c) => !c.seen || c.seen === 0 || c.seen === '0').length;
        if (unreadMsg > 0) setMsgCount(unreadMsg);
      } catch { /* silent */ }
    };
    fetchCounts();
    const id = setInterval(fetchCounts, 15_000);
    return () => clearInterval(id);
  }, [token]);

  const Badge = ({ count }) =>
    count > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    ) : null;

  return (
    <LinearGradient
      colors={[BRAND, '#0A5A62']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: top + 6 }]}
    >
      <View style={styles.inner}>

        {/* LEFT — hamburger */}
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.85}
          onPress={onOpenDrawer}
        >
          <Ionicons name="menu-outline" size={22} color="#fff" />
        </TouchableOpacity>


        {/* RIGHT — search · notifications · messages shortcut */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SearchScreen')}
          >
            <Ionicons name="search-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Notifications bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Animated.View style={{ transform: [{ scale: bellPulse }] }}>
              <Ionicons
                name={notifCount > 0 ? 'notifications' : 'notifications-outline'}
                size={21}
                color="#fff"
              />
            </Animated.View>
            <Badge count={notifCount} />
          </TouchableOpacity>


        </View>

      </View>
      {/* subtle accent underline */}
      <View style={styles.borderBottom} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    zIndex: 10,
    elevation: 6,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  inner: {
    height: 54,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  borderBottom: {
    height: 1,
    backgroundColor: 'rgba(19,194,150,0.20)',
  },
});

export default AppHeader;

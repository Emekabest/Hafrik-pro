import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const WHITE = Colors.white;

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const TABS = [
  { key: 'discover', label: 'Discover' },
  { key: 'for_you',  label: 'Latest'  },
];

const ReelHeader = ({ mode = 'for_you', onModeChange, onSearchPress }) => {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.header, { paddingTop: top + 8 }]}>
      <LinearGradient
        colors={[alpha('#020F12', 0.86), alpha('#020F12', 0.34), 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.82} onPress={handleBack}>
          <Ionicons name="chevron-back" size={23} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.centerBlock}>
          <Text style={styles.kicker}>HAFRIK REELS</Text>
          <View style={styles.tabDock}>
            {TABS.map((tab) => {
              const active = mode === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tab}
                  activeOpacity={0.84}
                  onPress={() => onModeChange?.(tab.key)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.tabLine, active && styles.tabLineActive]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.82} onPress={onSearchPress}>
          <Ionicons name="search-outline" size={21} color={WHITE} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha('#000000', 0.26),
    borderWidth: 1,
    borderColor: alpha(WHITE, 0.18),
  },
  centerBlock: {
    position: 'absolute',
    left: 58,
    right: 58,
    alignItems: 'center',
  },
  kicker: {
    color: alpha(WHITE, 0.52),
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  tabDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabText: {
    color: alpha(WHITE, 0.58),
    fontSize: 16,
    fontWeight: '900',
  },
  tabTextActive: {
    color: WHITE,
  },
  tabLine: {
    width: 14,
    height: 3,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  tabLineActive: {
    width: 30,
    backgroundColor: Colors.primary,
  },
});

export default ReelHeader;

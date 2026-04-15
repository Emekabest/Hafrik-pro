import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const n = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${n}${a}`;
};

const ReelHeader = ({ onSearchPress, onMorePress }) => {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.header, { paddingTop: top + 10 }]}>
      <LinearGradient
        colors={[withOpacity(Colors.black, 0.60), 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Back button */}
      <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={handleBack}>
        <Ionicons name="arrow-back" size={23} color={Colors.white} />
      </TouchableOpacity>

      {/* Right icons */}
      <View style={styles.rightRow}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={onSearchPress}>
          <Ionicons name="search-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={onMorePress}>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.white} />
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
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity('#000', 0.22),
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default ReelHeader;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BG = '#070d1a'; const CARD = '#0f1a2e'; const BORDER = '#1e2d45';
const GOLD = '#c9a84c'; const MUTED = '#6b7f95'; const WHITE = '#f5f6fa';

const MyOrders = () => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
      </View>
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={54} color={MUTED} />
        <Text style={styles.emptyTitle}>No orders yet</Text>
        <Text style={styles.emptyS}>Your import orders will appear here</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE + '12', alignItems: 'center', justifyContent: 'center' },
  title: { color: WHITE, fontSize: 18, fontFamily: 'ReadexPro_600SemiBold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: WHITE, fontSize: 16, fontFamily: 'WorkSans_600SemiBold' },
  emptyS: { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular' },
});

export default MyOrders;

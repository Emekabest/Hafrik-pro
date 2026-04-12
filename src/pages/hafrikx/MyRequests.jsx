import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BG = '#f7fff7'; const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93'; const MUTED = '#5f6b6d';

const MyRequests = () => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>My Requests</Text>
      </LinearGradient>
      <View style={styles.empty}>
        <Ionicons name="clipboard-outline" size={54} color={MUTED} />
        <Text style={styles.emptyTitle}>No requests yet</Text>
        <Text style={styles.emptyS}>Product requests you submit will appear here</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE + '12', alignItems: 'center', justifyContent: 'center' },
  title: { color: BRAND, fontSize: 18, fontFamily: 'ReadexPro_600SemiBold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: BRAND, fontSize: 16, fontFamily: 'WorkSans_600SemiBold' },
  emptyS: { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular' },
});

export default MyRequests;

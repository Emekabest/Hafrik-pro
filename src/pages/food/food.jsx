// src/pages/food/food.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme';

export default function Food() {
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Coming Soon</Text>
      <Text style={styles.subtitle}>Food — ordering & delivery is coming soon.</Text>

      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.btnTxt}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.background ?? '#fff' },
  title: { fontSize: 28, fontWeight: '900', color: Colors.primaryDark ?? '#0b3b5b', marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.secondaryText ?? '#6b7280', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: Colors.primary ?? '#0ea5a9', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  btnTxt: { color: Colors.white ?? '#fff', fontWeight: '800', fontSize: 15 },
});

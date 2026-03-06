import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { createBusiness } from '../../api/create';
import { Colors } from '../../theme/colors';

const ACCENT = Colors.primary;
const BRAND  = Colors.primaryDark;

export default function CreateBusinessScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();

  const [logo,     setLogo]     = useState<{ uri: string; fileName: string; type: string } | null>(null);
  const [name,     setName]     = useState('');
  const [about,    setAbout]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [address,  setAddress]  = useState('');
  const [website,  setWebsite]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setLogo({ uri: a.uri, fileName: a.fileName || 'logo.jpg', type: a.type || 'image' });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a business name.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('about', about);
      fd.append('phone', phone);
      fd.append('address', address);
      fd.append('website', website);
      if (logo) {
        fd.append('avatar', {
          uri: logo.uri,
          type: 'image/jpeg',
          name: logo.fileName,
        } as any);
      }
      const res = await createBusiness(fd as any, token!);
      if (res?.status === 'success') {
        Alert.alert('Created!', 'Your business page is live.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res?.message || 'Something went wrong.');
      }
    } catch {
      Alert.alert('Error', 'Failed to create business page.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* ── Logo Picker ── */}
        <TouchableOpacity style={styles.logoPicker} activeOpacity={0.8} onPress={pickLogo}>
          {logo ? (
            <ExpoImage source={{ uri: logo.uri }} style={styles.logoImage} contentFit="cover" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="storefront-outline" size={32} color={ACCENT} />
              <Text style={styles.logoPlaceholderText}>Add Logo</Text>
            </View>
          )}
          <View style={styles.logoCameraBadge}>
            <Ionicons name="camera" size={13} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* ── Section: Details ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={15} color={ACCENT} />
            <Text style={styles.sectionTitle}>Business Details</Text>
          </View>

          <Text style={styles.label}>Business Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Acme Ltd." placeholderTextColor={Colors.mutedBlueGrayPlaceholder} />

          <Text style={styles.label}>About</Text>
          <TextInput style={[styles.input, styles.multiline]} value={about} onChangeText={setAbout} placeholder="Describe your business…" placeholderTextColor={Colors.mutedBlueGrayPlaceholder} multiline numberOfLines={4} textAlignVertical="top" />
        </View>

        {/* ── Section: Contact ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={15} color={ACCENT} />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" placeholderTextColor={Colors.mutedBlueGrayPlaceholder} keyboardType="phone-pad" />

          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Full address" placeholderTextColor={Colors.mutedBlueGrayPlaceholder} />

          <Text style={styles.label}>Website</Text>
          <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://example.com" placeholderTextColor={Colors.mutedBlueGrayPlaceholder} keyboardType="url" autoCapitalize="none" />
        </View>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.btnTxt}>Create Business Page</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
    backgroundColor: Colors.surfaceBase,
  },

  // ── Logo picker ─────────────────────────
  logoPicker: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 10,
    marginBottom: 18,
    overflow: 'visible',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceCool,
    borderWidth: 2,
    borderColor: Colors.borderSoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    marginTop: 4,
  },
  logoCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: ACCENT,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
  },

  // ── Sections ────────────────────────────
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textBodyIndigo,
    letterSpacing: -0.1,
  },

  // ── Fields ──────────────────────────────
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.mutedBlueGray,
    marginBottom: 4,
    marginTop: 10,
    letterSpacing: 0.15,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    backgroundColor: Colors.surfaceCool,
    color: Colors.textBodyIndigo,
  },
  multiline: {
    minHeight: 90,
    paddingTop: 10,
  },

  // ── Button ──────────────────────────────
  btn: {
    marginTop: 20,
    backgroundColor: ACCENT,
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnTxt: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, Share, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const CARD = Colors.white;
const BG = '#F3F8F8';

const FONT_B = AppDetails?.fontFamily?.redex?.bold ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium ?? 'System';

const profileName = (user) =>
  user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Hafrik User';

export default function ProfileQrScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const qrCardRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const username = user?.username || user?.user_name || '';
  const displayName = profileName(user);
  const avatar = user?.avatar || user?.user_picture || user?.picture || null;
  const profileUrl = useMemo(() => username ? `https://hafrik.com/${username}` : 'https://hafrik.com', [username]);
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&data=${encodeURIComponent(profileUrl)}`,
    [profileUrl],
  );

  const copyLink = async () => {
    await Clipboard.setStringAsync(profileUrl);
    Alert.alert('Copied', 'Profile link copied to clipboard.');
  };

  const shareProfile = async () => {
    await Share.share({ message: `${displayName} on Hafrik\n${profileUrl}`, url: profileUrl });
  };

  const captureQr = async () => {
    if (!qrCardRef.current) return null;
    return captureRef(qrCardRef.current, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  };

  const saveQr = async () => {
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to save your QR code.');
        setSaving(false);
        return;
      }
      const uri = await captureQr();
      if (!uri) throw new Error('Could not capture QR');
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Your Hafrik profile QR was saved to your gallery.');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
    setSaving(false);
  };

  const shareQr = async () => {
    try {
      const uri = await captureQr();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share Hafrik QR' });
      } else {
        await shareProfile();
      }
    } catch {
      await shareProfile();
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[BRAND, '#0f5060', ACCENT]}
        style={[s.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Profile QR Code</Text>
          <Text style={s.headerSub}>Let people scan and find you inside Hafrik</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('ProfileQrScanner')} activeOpacity={0.85}>
          <Ionicons name="scan-outline" size={20} color={WHITE} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 28 }]}
      >
        <View ref={qrCardRef} collapsable={false} style={s.qrCard}>
          <View style={s.avatarWrap}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={s.avatar} />
            ) : (
              <LinearGradient colors={[BRAND, ACCENT]} style={s.avatar}>
                <Ionicons name="person" size={34} color={WHITE} />
              </LinearGradient>
            )}
          </View>
          <Text style={s.name}>{displayName}</Text>
          <Text style={s.username}>@{username || 'username'}</Text>

          <View style={s.qrFrame}>
            <Image source={{ uri: qrUrl }} style={s.qrImage} resizeMode="contain" />
          </View>

          <View style={s.urlPill}>
            <Ionicons name="link-outline" size={14} color={ACCENT} />
            <Text style={s.urlText} numberOfLines={1}>{profileUrl}</Text>
          </View>
        </View>

        <View style={s.actionsGrid}>
          <Action icon="copy-outline" label="Copy link" onPress={copyLink} />
          <Action icon="share-social-outline" label="Share QR" onPress={shareQr} />
          <Action icon="download-outline" label="Save QR" onPress={saveQr} loading={saving} />
          <Action icon="scan-outline" label="Scan QR" onPress={() => navigation.navigate('ProfileQrScanner')} />
        </View>

        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={ACCENT} />
          <Text style={s.infoText}>
            Your QR only contains your public profile link. Hafrik fetches fresh profile data after scanning.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const Action = ({ icon, label, onPress, loading }) => (
  <TouchableOpacity style={s.action} onPress={onPress} activeOpacity={0.84} disabled={loading}>
    <View style={s.actionIcon}>
      {loading ? <ActivityIndicator size="small" color={ACCENT} /> : <Ionicons name={icon} size={20} color={ACCENT} />}
    </View>
    <Text style={s.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingBottom: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 21, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  headerSub: { fontSize: 12.5, color: WHITE + 'C8', fontFamily: FONT_R, marginTop: 3 },
  scroll: { padding: 16 },
  qrCard: {
    backgroundColor: CARD, borderRadius: 30, padding: 22, alignItems: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.09, shadowRadius: 20, elevation: 5,
  },
  avatarWrap: { padding: 4, borderRadius: 40, backgroundColor: WHITE, marginBottom: 10 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, textAlign: 'center' },
  username: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R, marginTop: 3 },
  qrFrame: { marginTop: 18, padding: 14, borderRadius: 26, backgroundColor: '#F7FBFB', borderWidth: 1, borderColor: '#DCEAEA' },
  qrImage: { width: 250, height: 250 },
  urlPill: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, backgroundColor: ACCENT + '10', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, maxWidth: '100%' },
  urlText: { flex: 1, fontSize: 12.5, color: ACCENT, fontWeight: '800', fontFamily: FONT_M },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  action: { width: '48.5%', backgroundColor: CARD, borderRadius: 20, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#DCEAEA' },
  actionIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12.5, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: CARD, borderRadius: 18, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#DCEAEA' },
  infoText: { flex: 1, fontSize: 12.5, color: TEXT_M, fontFamily: FONT_R, lineHeight: 18 },
});

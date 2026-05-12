import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Share, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';
import {
  extractHafrikUsername,
  followUserById,
  getProfileByUsername,
  startConversationWithUser,
} from '../../api/profileQrApi';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const GREEN = Colors.success ?? '#22c55e';

const FONT_B = AppDetails?.fontFamily?.redex?.bold ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium ?? 'System';

const profileName = (user) =>
  user?.full_name || user?.name || user?.username || 'Hafrik User';

export default function ProfileQrScannerScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedProfile, setScannedProfile] = useState(null);

  const resetScan = () => {
    setLocked(false);
    setLoading(false);
    setScannedProfile(null);
  };

  const openProfile = useCallback((profile = scannedProfile) => {
    if (!profile) return;
    const authUsername = (authUser?.username || authUser?.user_name || '').toLowerCase();
    const scannedUsername = String(profile.username || '').toLowerCase();
    const isSelf =
      String(profile.id || profile.user_id || '') === String(authUser?.id || authUser?.user_id || '') ||
      (!!authUsername && authUsername === scannedUsername);

    if (isSelf) {
      navigation.replace('Profile');
      return;
    }
    navigation.replace('UserProfile', {
      userId: profile.id || profile.user_id,
      username: profile.username,
    });
  }, [authUser, navigation, scannedProfile]);

  const handleBarcode = useCallback(async ({ data }) => {
    if (locked || loading || scannedProfile) return;
    console.log('[ProfileQR] handleBarcode received:', data);
    setLocked(true);
    setLoading(true);

    const username = extractHafrikUsername(data);
    if (!username) {
      console.log('[ProfileQR] no username extracted from scan');
      setLoading(false);
      Alert.alert('Invalid Hafrik QR code', 'Only Hafrik profile QR codes can be opened here.', [
        { text: 'Scan Again', onPress: () => setLocked(false) },
      ]);
      return;
    }

    try {
      const profile = await getProfileByUsername(username);
      console.log('[ProfileQR] scanner lookup final profile:', {
        scannedUsername: username,
        id: profile?.id,
        user_id: profile?.user_id,
        username: profile?.username,
        full_name: profile?.full_name,
        avatar: profile?.avatar,
      });
      if (!profile?.id && !profile?.user_id) {
        setLoading(false);
        Alert.alert('User not found', 'We could not find this Hafrik profile.', [
          { text: 'Scan Again', onPress: () => setLocked(false) },
        ]);
        return;
      }
      setScannedProfile(profile);
    } catch (error) {
      console.log('[ProfileQR] scanner lookup error:', error?.response?.data ?? error?.message ?? error);
      Alert.alert('User not found', 'We could not find this Hafrik profile.', [
        { text: 'Scan Again', onPress: () => setLocked(false) },
      ]);
      setLocked(false);
    }
    setLoading(false);
  }, [locked, loading, scannedProfile]);

  const handleFollow = async () => {
    if (!scannedProfile?.id && !scannedProfile?.user_id) return;
    setLoading(true);
    try {
      await followUserById(scannedProfile.id || scannedProfile.user_id);
      setScannedProfile(prev => prev ? { ...prev, is_following: !prev.is_following } : prev);
    } catch {
      Alert.alert('Could not update follow', 'Please try again.');
    }
    setLoading(false);
  };

  const handleMessage = async () => {
    if (!scannedProfile?.id && !scannedProfile?.user_id) return;
    setLoading(true);
    try {
      const json = await startConversationWithUser(scannedProfile.id || scannedProfile.user_id);
      const conversationId = json?.data?.conversation_id ?? json?.data?.id ?? json?.conversation_id ?? json?.id;
      if (conversationId) {
        navigation.replace('Thread', {
          conversationId,
          otherUser: {
            id: scannedProfile.id || scannedProfile.user_id,
            user_id: scannedProfile.id || scannedProfile.user_id,
            full_name: profileName(scannedProfile),
            username: scannedProfile.username,
            avatar: scannedProfile.avatar,
          },
        });
      } else {
        Alert.alert('Could not start chat', json?.message ?? 'Please try again.');
      }
    } catch {
      Alert.alert('Could not start chat', 'Please try again.');
    }
    setLoading(false);
  };

  const shareProfile = async () => {
    if (!scannedProfile?.username) return;
    await Share.share({
      message: `${profileName(scannedProfile)} on Hafrik\nhttps://hafrik.com/${scannedProfile.username}`,
      url: `https://hafrik.com/${scannedProfile.username}`,
    });
  };

  if (!permission) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.permissionRoot, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={s.permissionCard}>
          <Ionicons name="camera-outline" size={44} color={ACCENT} />
          <Text style={s.permissionTitle}>Camera access needed</Text>
          <Text style={s.permissionText}>Allow camera access to scan Hafrik profile QR codes.</Text>
          <TouchableOpacity style={s.permissionBtn} onPress={requestPermission} activeOpacity={0.86}>
            <Text style={s.permissionBtnTxt}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={locked ? undefined : handleBarcode}
      />
      <LinearGradient colors={['rgba(0,0,0,0.72)', 'transparent']} style={[s.topOverlay, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Scan Hafrik QR</Text>
          <Text style={s.sub}>Only `https://hafrik.com/username` links are accepted</Text>
        </View>
      </LinearGradient>

      <View style={s.scanFrame}>
        <View style={[s.corner, s.cornerTl]} />
        <View style={[s.corner, s.cornerTr]} />
        <View style={[s.corner, s.cornerBl]} />
        <View style={[s.corner, s.cornerBr]} />
      </View>

      {loading && (
        <View style={s.loadingPill}>
          <ActivityIndicator size="small" color={WHITE} />
          <Text style={s.loadingTxt}>Checking profile...</Text>
        </View>
      )}

      {scannedProfile && (
        <View style={[s.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={s.sheetHandle} />
          <LinearGradient colors={[BRAND, '#0f5060', ACCENT]} style={s.resultHero}>
            <View style={s.resultGlow} />
            <TouchableOpacity onPress={resetScan} style={s.closeBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={19} color={WHITE} />
            </TouchableOpacity>
            <View style={s.foundBadge}>
              <Ionicons name="checkmark-circle" size={14} color={GREEN} />
              <Text style={s.foundBadgeTxt}>Hafrik profile found</Text>
            </View>
            <View style={s.avatarRing}>
              {scannedProfile.avatar ? (
                <Image source={{ uri: scannedProfile.avatar }} style={s.avatar} />
              ) : (
                <LinearGradient colors={[ACCENT, '#13c296']} style={s.avatar}>
                  <Ionicons name="person" size={32} color={WHITE} />
                </LinearGradient>
              )}
            </View>
            <Text style={s.profileName} numberOfLines={1}>{profileName(scannedProfile)}</Text>
            <Text style={s.profileUser} numberOfLines={1}>@{scannedProfile.username}</Text>
          </LinearGradient>

          <View style={s.profileMetaCard}>
            <View style={s.metaRow}>
              <View style={s.metaIcon}>
                <Ionicons name="link-outline" size={16} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.metaLabel}>Profile link</Text>
                <Text style={s.metaValue} numberOfLines={1}>https://hafrik.com/{scannedProfile.username}</Text>
              </View>
            </View>
            <View style={s.metaDivider} />
            <View style={s.metaRow}>
              <View style={s.metaIcon}>
                <Ionicons name="shield-checkmark-outline" size={16} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.metaLabel}>Verified by scan</Text>
                <Text style={s.metaValue} numberOfLines={1}>Fresh profile data loaded inside Hafrik</Text>
              </View>
            </View>
          </View>

          <View style={s.actions}>
            <QrAction icon="person-circle-outline" label="View Profile" onPress={() => openProfile()} />
            <QrAction
              icon={scannedProfile.is_following ? 'checkmark-circle-outline' : 'person-add-outline'}
              label={scannedProfile.is_following ? 'Following' : 'Follow'}
              onPress={handleFollow}
            />
            <QrAction icon="chatbubble-outline" label="Message" onPress={handleMessage} />
            <QrAction icon="share-social-outline" label="Share" onPress={shareProfile} />
          </View>
        </View>
      )}
    </View>
  );
}

const QrAction = ({ icon, label, onPress }) => (
  <TouchableOpacity style={s.qrAction} onPress={onPress} activeOpacity={0.85}>
    <View style={s.qrActionIcon}>
      <Ionicons name={icon} size={19} color={ACCENT} />
    </View>
    <Text style={s.qrActionTxt}>{label}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  topOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 80,
  },
  backBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: WHITE + '20', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  sub: { fontSize: 12, color: WHITE + 'B8', fontFamily: FONT_R, marginTop: 2 },
  scanFrame: { position: 'absolute', width: 260, height: 260, alignSelf: 'center', top: '30%' },
  corner: { position: 'absolute', width: 58, height: 58, borderColor: WHITE, borderWidth: 5 },
  cornerTl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 22 },
  cornerTr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 22 },
  cornerBl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 22 },
  cornerBr: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 22 },
  loadingPill: { position: 'absolute', alignSelf: 'center', top: '64%', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(0,0,0,0.64)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  loadingTxt: { fontSize: 13, color: WHITE, fontWeight: '800', fontFamily: FONT_M },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#F4F8F8', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 10 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#D7E2E2', marginBottom: 16 },
  resultHero: { borderRadius: 28, padding: 18, alignItems: 'center', overflow: 'hidden' },
  resultGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: WHITE + '12', top: -74, right: -40 },
  closeBtn: { position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 13, backgroundColor: WHITE + '1E', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  foundBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WHITE, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 12 },
  foundBadgeTxt: { fontSize: 11.5, fontWeight: '900', color: BRAND, fontFamily: FONT_B },
  avatarRing: { padding: 4, borderRadius: 45, backgroundColor: WHITE + 'F2', marginBottom: 10 },
  avatar: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 21, fontWeight: '900', color: WHITE, fontFamily: FONT_B, maxWidth: '90%' },
  profileUser: { fontSize: 13, color: WHITE + 'CC', fontFamily: FONT_R, marginTop: 3, maxWidth: '90%' },
  profileMetaCard: { backgroundColor: WHITE, borderRadius: 22, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#DCEAEA' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  metaIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: ACCENT + '10', alignItems: 'center', justifyContent: 'center' },
  metaLabel: { fontSize: 11, color: TEXT_M, fontFamily: FONT_R },
  metaValue: { fontSize: 12.5, fontWeight: '800', color: TEXT_H, fontFamily: FONT_M, marginTop: 2 },
  metaDivider: { height: 1, backgroundColor: '#EEF3F3', marginVertical: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  qrAction: { flex: 1, alignItems: 'center', gap: 7, backgroundColor: WHITE, borderRadius: 18, paddingVertical: 12, borderWidth: 1, borderColor: '#DCEAEA' },
  qrActionIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center' },
  qrActionTxt: { fontSize: 11.5, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, textAlign: 'center' },
  permissionRoot: { flex: 1, backgroundColor: BRAND, paddingHorizontal: 18 },
  permissionCard: { marginTop: 80, backgroundColor: WHITE, borderRadius: 28, padding: 24, alignItems: 'center' },
  permissionTitle: { fontSize: 20, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, marginTop: 12 },
  permissionText: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  permissionBtn: { marginTop: 18, backgroundColor: ACCENT, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 13 },
  permissionBtnTxt: { color: WHITE, fontWeight: '900', fontFamily: FONT_B },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/apiClient';

const BG     = '#070d1a';
const CARD   = '#0f1a2e';
const BORDER = '#1e2d45';
const GOLD   = '#c9a84c';
const MUTED  = '#6b7f95';
const WHITE  = '#f5f6fa';
const GREEN  = '#10b981';

export default function ExchangeUploadQR() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const { order_id, from, amount, converted_amount } = route.params ?? {};

  const [image,     setImage]     = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to upload your QR code.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]) setImage(result.assets[0]);
  }, []);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 });
    if (!result.canceled && result.assets?.[0]) setImage(result.assets[0]);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!image) {
      Alert.alert('No Image', 'Please select or take a photo of your Alipay / WeChat QR code.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('order_id', order_id);
      formData.append('qr_code', {
        uri:  image.uri,
        type: 'image/jpeg',
        name: `qr_${order_id}.jpg`,
      });

      const res = await apiClient.post('/hafrikx/exchange/upload-qr.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.status === 'success') {
        navigation.navigate('ExchangeOrderStatus', { order_id });
      } else {
        Alert.alert('Upload Failed', res.data?.message ?? 'Could not upload QR code. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }, [image, order_id, navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Alipay / WeChat QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress steps */}
      <View style={styles.stepsRow}>
        {['Order', 'Pay', 'Receipt', 'QR', 'Done'].map((s, i) => (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= 3 && styles.stepCircleActive]}>
                {i < 3
                  ? <Ionicons name="checkmark" size={12} color={BG} />
                  : <Text style={[styles.stepNum, i <= 3 && styles.stepNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, i <= 3 && styles.stepLabelActive]}>{s}</Text>
            </View>
            {i < 4 && <View style={[styles.stepLine, i < 3 && styles.stepLineDone]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Why we need QR */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconRow}>
            <View style={styles.infoIcon}>
              <Text style={{ fontSize: 22 }}>💸</Text>
            </View>
            <View style={styles.infoIcon}>
              <Text style={{ fontSize: 22 }}>📲</Text>
            </View>
          </View>
          <Text style={styles.infoTitle}>Why do we need your QR code?</Text>
          <Text style={styles.infoDesc}>
            We need your Alipay or WeChat Pay QR code so we can send your RMB directly to your account once payment is confirmed.
          </Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoOrderId}>Order: <Text style={{ color: GOLD }}>{order_id}</Text></Text>
        </View>

        {/* Image picker */}
        {image ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="contain" />
            <TouchableOpacity style={styles.rePickBtn} onPress={pickImage} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={WHITE} />
              <Text style={styles.rePickTxt}>Change QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickWrap}>
            <View style={styles.pickIconCircle}>
              <Ionicons name="qr-code-outline" size={44} color={MUTED} />
            </View>
            <Text style={styles.pickTitle}>No QR code selected</Text>
            <Text style={styles.pickSub}>
              Open Alipay or WeChat Pay, go to{'\n'}
              <Text style={{ color: GOLD }}>Receive Money → Save QR Code</Text>
            </Text>

            <View style={styles.pickBtnsRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={20} color={GOLD} />
                <Text style={styles.pickBtnTxt}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={pickImage} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={20} color={GOLD} />
                <Text style={styles.pickBtnTxt}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* How to get QR */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>How to get your QR code</Text>
          {[
            { app: 'Alipay',    step: 'Open Alipay → Me → Receive Money → Save QR to gallery' },
            { app: 'WeChat Pay',step: 'Open WeChat → Me → Wallet → Receive Money → Save QR' },
          ].map((g, i) => (
            <View key={i} style={styles.guideRow}>
              <View style={styles.guideBadge}><Text style={styles.guideBadgeTxt}>{g.app}</Text></View>
              <Text style={styles.guideTxt}>{g.step}</Text>
            </View>
          ))}
        </View>

        {/* Upload button */}
        <TouchableOpacity
          onPress={handleUpload}
          activeOpacity={0.87}
          disabled={uploading || !image}
          style={[styles.uploadBtnWrap, (!image || uploading) && { opacity: 0.5 }]}
        >
          <LinearGradient colors={[GOLD, '#e8c87a', GOLD]} style={styles.uploadBtn}>
            {uploading
              ? <ActivityIndicator size="small" color={BG} />
              : <><Ionicons name="cloud-upload-outline" size={20} color={BG} /><Text style={styles.uploadBtnTxt}>Submit QR & Track Order</Text></>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  headerTitle: { flex: 1, textAlign: 'center', color: WHITE, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold' },

  stepsRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  stepItem:         { alignItems: 'center', gap: 4 },
  stepCircle:       { width: 26, height: 26, borderRadius: 13, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: GOLD },
  stepNum:          { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold' },
  stepNumActive:    { color: BG },
  stepLabel:        { color: MUTED, fontSize: 9, fontFamily: 'WorkSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepLabelActive:  { color: GOLD },
  stepLine:         { flex: 1, height: 2, backgroundColor: BORDER, marginBottom: 12 },
  stepLineDone:     { backgroundColor: GOLD },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  infoCard:     { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20, marginBottom: 16, alignItems: 'center' },
  infoIconRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  infoIcon:     { width: 50, height: 50, borderRadius: 14, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  infoTitle:    { color: WHITE, fontSize: 15, fontFamily: 'ReadexPro_600SemiBold', marginBottom: 8, textAlign: 'center' },
  infoDesc:     { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 19, textAlign: 'center', marginBottom: 14 },
  infoDivider:  { width: '100%', height: 1, backgroundColor: BORDER, marginBottom: 14 },
  infoOrderId:  { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_500Medium' },

  previewWrap:    { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16 },
  previewImage:   { width: '100%', height: 260 },
  rePickBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  rePickTxt:      { color: WHITE, fontFamily: 'WorkSans_600SemiBold', fontSize: 13 },

  pickWrap:       { backgroundColor: CARD, borderRadius: 16, borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed', padding: 36, alignItems: 'center', marginBottom: 16 },
  pickIconCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pickTitle:      { color: WHITE, fontSize: 15, fontFamily: 'WorkSans_600SemiBold', marginBottom: 8 },
  pickSub:        { color: MUTED, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', textAlign: 'center', lineHeight: 19, marginBottom: 22 },
  pickBtnsRow:    { flexDirection: 'row', gap: 14 },
  pickBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GOLD + '14', borderRadius: 12, borderWidth: 1, borderColor: GOLD + '44', paddingHorizontal: 20, paddingVertical: 11 },
  pickBtnTxt:     { color: GOLD, fontFamily: 'WorkSans_600SemiBold', fontSize: 13 },

  guideCard:    { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20 },
  guideTitle:   { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  guideRow:     { marginBottom: 12 },
  guideBadge:   { backgroundColor: GOLD + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 5 },
  guideBadgeTxt:{ color: GOLD, fontSize: 11, fontFamily: 'WorkSans_700Bold' },
  guideTxt:     { color: WHITE, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },

  uploadBtnWrap: { marginBottom: 10 },
  uploadBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, gap: 10 },
  uploadBtnTxt:  { fontFamily: 'WorkSans_700Bold', fontSize: 15, color: BG },
});

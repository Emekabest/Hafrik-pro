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

const BG     = '#f7fff7';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';
const GREEN  = '#10b981';

export default function ExchangeUploadReceipt() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const { order_id, from, amount, converted_amount } = route.params ?? {};

  const [image,     setImage]     = useState(null);   // { uri, width, height }
  const [uploading, setUploading] = useState(false);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to upload your receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImage(result.assets[0]);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImage(result.assets[0]);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!image) {
      Alert.alert('No Image', 'Please select or take a photo of your payment receipt.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('order_id', order_id);
      formData.append('receipt', {
        uri:  image.uri,
        type: 'image/jpeg',
        name: `receipt_${order_id}.jpg`,
      });

      const res = await apiClient.post('/hafrikx/exchange/upload-receipt.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.status === 'success') {
        navigation.navigate('ExchangeUploadQR', {
          order_id,
          from,
          amount,
          converted_amount,
        });
      } else {
        Alert.alert('Upload Failed', res.data?.message ?? 'Could not upload receipt. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }, [image, order_id, from, amount, converted_amount, navigation]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Receipt</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Progress steps */}
      <View style={styles.stepsRow}>
        {['Order', 'Pay', 'Receipt', 'QR', 'Done'].map((s, i) => (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, i <= 2 && styles.stepCircleActive]}>
                {i < 2
                  ? <Ionicons name="checkmark" size={12} color={WHITE} />
                  : <Text style={[styles.stepNum, i <= 2 && styles.stepNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, i <= 2 && styles.stepLabelActive]}>{s}</Text>
            </View>
            {i < 4 && <View style={[styles.stepLine, i < 2 && styles.stepLineDone]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Instruction */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={20} color={TEAL} />
          <Text style={styles.instructionTxt}>
            Upload a clear screenshot or photo of your bank payment confirmation for order{' '}
            <Text style={{ color: TEAL, fontFamily: 'WorkSans_700Bold' }}>{order_id}</Text>.
          </Text>
        </View>

        {/* Image preview / picker */}
        {image ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity style={styles.rePickBtn} onPress={pickImage} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={BRAND} />
              <Text style={styles.rePickTxt}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickWrap}>
            <View style={styles.pickIconCircle}>
              <Ionicons name="receipt-outline" size={40} color={MUTED} />
            </View>
            <Text style={styles.pickTitle}>No image selected</Text>
            <Text style={styles.pickSub}>Take a photo or choose from your gallery</Text>

            <View style={styles.pickBtnsRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={20} color={TEAL} />
                <Text style={styles.pickBtnTxt}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtn} onPress={pickImage} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={20} color={TEAL} />
                <Text style={styles.pickBtnTxt}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for a good receipt photo</Text>
          {[
            'Make sure the amount and date are visible',
            'Ensure the transaction reference is clear',
            'Photo should be well-lit, not blurry',
            'Accepted: PNG, JPG, screenshot',
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={14} color={GREEN} />
              <Text style={styles.tipTxt}>{t}</Text>
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
          <LinearGradient colors={[BRAND, TEAL]} style={styles.uploadBtn}>
            {uploading
              ? <ActivityIndicator size="small" color={WHITE} />
              : <><Ionicons name="cloud-upload-outline" size={20} color={WHITE} /><Text style={styles.uploadBtnTxt}>Upload Receipt & Continue</Text></>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },

  stepsRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  stepItem:         { alignItems: 'center', gap: 4 },
  stepCircle:       { width: 26, height: 26, borderRadius: 13, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: TEAL },
  stepNum:          { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold' },
  stepNumActive:    { color: WHITE },
  stepLabel:        { color: MUTED, fontSize: 9, fontFamily: 'WorkSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepLabelActive:  { color: TEAL },
  stepLine:         { flex: 1, height: 2, backgroundColor: BORDER, marginBottom: 12 },
  stepLineDone:     { backgroundColor: TEAL },

  scrollContent:   { paddingHorizontal: 16, paddingTop: 8 },
  instructionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: TEAL + '10', borderRadius: 12, borderWidth: 1, borderColor: TEAL + '2a', padding: 14, marginBottom: 18 },
  instructionTxt:  { flex: 1, color: BRAND, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 19 },

  previewWrap:   { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16 },
  previewImage:  { width: '100%', height: 220 },
  rePickBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  rePickTxt:     { color: BRAND, fontFamily: 'WorkSans_600SemiBold', fontSize: 13 },

  pickWrap:       { backgroundColor: CARD, borderRadius: 16, borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed', padding: 36, alignItems: 'center', marginBottom: 16 },
  pickIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pickTitle:      { color: BRAND, fontSize: 15, fontFamily: 'WorkSans_600SemiBold', marginBottom: 6 },
  pickSub:        { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular', textAlign: 'center', marginBottom: 22 },
  pickBtnsRow:    { flexDirection: 'row', gap: 14 },
  pickBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: TEAL + '14', borderRadius: 12, borderWidth: 1, borderColor: TEAL + '44', paddingHorizontal: 20, paddingVertical: 11 },
  pickBtnTxt:     { color: TEAL, fontFamily: 'WorkSans_600SemiBold', fontSize: 13 },

  tipsCard:  { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 20 },
  tipsTitle: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  tipRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipTxt:    { color: BRAND, fontSize: 12.5, fontFamily: 'WorkSans_400Regular', flex: 1 },

  uploadBtnWrap: { marginBottom: 10 },
  uploadBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, gap: 10 },
  uploadBtnTxt:  { fontFamily: 'WorkSans_700Bold', fontSize: 15, color: WHITE },
});

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Image, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../AuthContext';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/apiClient';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;

const STEP_LABEL = 'Step 1 of 4';

export default function UploadAvatarScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { token, user, updateUser, updateOnboardingStep } = useAuth();

  const [avatarUri,  setAvatarUri]  = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [statusText, setStatusText] = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Step 1: Upload image file ──────────────────────────────────
  const uploadImage = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });
    formData.append('type', 'photo');

    // Do NOT set Content-Type — let fetch handle the multipart boundary
    const res = await fetch('https://hafrik.com/api/v1/uploads/media.php', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    console.log('Upload response:', data);
    return data;
  };

  // ── Step 2: Save URL to profile ────────────────────────────────
  const saveAvatar = async (path) => {
    const res = await apiClient.post('https://hafrik.com/api/v1/users/update_avatar.php', {
      avatar: path,
    });
    console.log('Save avatar response:', res.data);
    return res.data;
  };

  const submit = async () => {
    if (!avatarUri || uploading) return;
    setUploading(true);
    try {
      setStatusText('Uploading image...');
      const uploadData = await uploadImage(avatarUri);

      const filePath =
        uploadData?.data?.path  ||
        uploadData?.data?.url   ||
        uploadData?.path        ||
        uploadData?.url         ||
        uploadData?.file_path   ||
        uploadData?.file        ||
        null;

      if (!filePath) {
        console.log('Upload failed — no file path returned:', uploadData);
        setStatusText('');
        setUploading(false);
        await updateOnboardingStep(3);
        navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
        return;
      }

      setStatusText('Saving avatar...');
      await saveAvatar(filePath);
      await updateUser({ ...(user || {}), avatar: filePath });

    } catch (e) {
      console.log('Avatar upload error:', e);
    }

    setStatusText('');
    setUploading(false);
    await updateOnboardingStep(3);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
  };

  // ── Image picking ──────────────────────────────────────────────
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Access Required',
          'Please allow access to your photo library in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Gallery picker error:', e);
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Required',
          'Please allow camera access in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Camera picker error:', e);
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  };

  const pickImage = () => {
    Alert.alert(
      'Add Profile Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Take Photo',          onPress: pickFromCamera  },
        { text: 'Choose from Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const skip = async () => {
    await updateOnboardingStep(3);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
  };

  return (
    <LinearGradient
      colors={[Colors.brandDeep ?? BRAND, Colors.primaryDark, Colors.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
      style={styles.grad}
    >
      <View style={[styles.inner, { paddingTop: top + 20, paddingBottom: bottom + 24 }]}>
        {/* Progress */}
        <Text style={styles.stepLabel}>{STEP_LABEL}</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressDot, i <= 1 && styles.progressDotOn]} />
          ))}
        </View>

        <Animated.View style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Add a profile picture</Text>
          <Text style={styles.sub}>Help people recognize you on Hafrik</Text>

          {/* Avatar preview */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.85} disabled={uploading}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={52} color={WHITE + '66'} />
              </View>
            )}
            {uploading ? (
              <View style={styles.avatarUploadOverlay}>
                <ActivityIndicator color={WHITE} />
              </View>
            ) : (
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={18} color={WHITE} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.chooseBtn} onPress={pickImage} activeOpacity={0.8} disabled={uploading}>
            <Ionicons name="images-outline" size={17} color={WHITE} />
            <Text style={styles.chooseBtnText}>{avatarUri ? 'Change photo' : 'Choose from gallery'}</Text>
          </TouchableOpacity>

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.btn, (!avatarUri || uploading) && styles.btnDisabled]}
            onPress={submit}
            disabled={!avatarUri || uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={BRAND} size="small" />
                <Text style={styles.loadingText}>{statusText || 'Uploading...'}</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7} disabled={uploading}>
            <Text style={styles.skipText}>Skip for now</Text>
            <Ionicons name="chevron-forward" size={14} color={WHITE + 'AA'} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad:               { flex: 1 },
  inner:              { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  stepLabel:          { fontSize: 12, color: WHITE + '88', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  progressRow:        { flexDirection: 'row', gap: 8, marginBottom: 36 },
  progressDot:        { width: 28, height: 4, borderRadius: 2, backgroundColor: WHITE + '33' },
  progressDotOn:      { backgroundColor: WHITE },
  body:               { width: '100%', alignItems: 'center' },
  title:              { fontSize: 26, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 10 },
  sub:                { fontSize: 15, color: WHITE + 'CC', textAlign: 'center', marginBottom: 36, lineHeight: 22 },
  avatarWrap:         { width: 130, height: 130, borderRadius: 65, marginBottom: 20, position: 'relative' },
  avatar:             { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: WHITE + '55' },
  avatarPlaceholder:  { width: 130, height: 130, borderRadius: 65, backgroundColor: WHITE + '1A', borderWidth: 2, borderColor: WHITE + '33', alignItems: 'center', justifyContent: 'center' },
  cameraOverlay:      { position: 'absolute', bottom: 4, right: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BRAND },
  avatarUploadOverlay:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 65, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  chooseBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: WHITE + '55', marginBottom: 32 },
  chooseBtnText:      { fontSize: 14, color: WHITE, fontWeight: '500' },
  btn:                { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnDisabled:        { opacity: 0.45 },
  btnText:            { fontSize: 16, fontWeight: '700', color: BRAND },
  loadingRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText:        { fontSize: 14, fontWeight: '600', color: BRAND },
  skipBtn:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10 },
  skipText:           { fontSize: 14, color: WHITE + 'AA' },
});

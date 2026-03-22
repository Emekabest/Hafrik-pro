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
import UploadMediaController from '../../controllers/uploadmediacontroller';
import apiClient from '../../api/apiClient';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const MUTED  = Colors.secondaryText;

const STEP_LABEL = 'Step 1 of 4';

export default function UploadAvatarScreen({ navigation }) {
  const { top, bottom } = useSafeAreaInsets();
  const { token, user, updateOnboardingStep } = useAuth();

  const [avatarUri, setAvatarUri] = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Photo Access Required',
          'Please allow access to your photo library in Settings to add a profile picture.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Image picker error:', e);
      Alert.alert('Error', 'Could not open photo library. Please try again.');
    }
  };

  const submit = async () => {
    if (!avatarUri || uploading || saving) return;
    setUploading(true);
    try {
      const asset = { uri: avatarUri, fileName: 'avatar.jpg', type: 'image/jpeg' };
      const up = await UploadMediaController(asset, token, null, 'photo');
      if (up?.status === 'success' && up?.data?.url) {
        setSaving(true);
        await apiClient.post('/profile/avatar.php', { avatar: up.data.url });
      }
    } catch (e) {
      console.log('Upload avatar error:', e);
    }
    setUploading(false);
    setSaving(false);
    await updateOnboardingStep(3);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
  };

  const skip = async () => {
    await updateOnboardingStep(3);
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingFollow' }] });
  };

  const isLoading = uploading || saving;

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

          {/* Avatar picker */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={52} color={WHITE + '66'} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={18} color={WHITE} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chooseBtn} onPress={pickImage} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={17} color={WHITE} />
            <Text style={styles.chooseBtnText}>{avatarUri ? 'Change photo' : 'Choose from gallery'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, (!avatarUri || isLoading) && styles.btnDisabled]}
            onPress={submit}
            disabled={!avatarUri || isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={BRAND} />
              : <Text style={styles.btnText}>Continue</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip for now</Text>
            <Ionicons name="chevron-forward" size={14} color={WHITE + 'AA'} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad:             { flex: 1 },
  inner:            { flex: 1, alignItems: 'center', paddingHorizontal: 28 },
  stepLabel:        { fontSize: 12, color: WHITE + '88', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  progressRow:      { flexDirection: 'row', gap: 8, marginBottom: 36 },
  progressDot:      { width: 28, height: 4, borderRadius: 2, backgroundColor: WHITE + '33' },
  progressDotOn:    { backgroundColor: WHITE },
  body:             { width: '100%', alignItems: 'center' },
  title:            { fontSize: 26, fontWeight: '700', color: WHITE, textAlign: 'center', marginBottom: 10 },
  sub:              { fontSize: 15, color: WHITE + 'CC', textAlign: 'center', marginBottom: 36, lineHeight: 22 },
  avatarWrap:       { width: 130, height: 130, borderRadius: 65, marginBottom: 20, position: 'relative' },
  avatar:           { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: WHITE + '55' },
  avatarPlaceholder:{ width: 130, height: 130, borderRadius: 65, backgroundColor: WHITE + '1A', borderWidth: 2, borderColor: WHITE + '33', alignItems: 'center', justifyContent: 'center' },
  cameraOverlay:    { position: 'absolute', bottom: 4, right: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BRAND },
  chooseBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: WHITE + '55', marginBottom: 32 },
  chooseBtnText:    { fontSize: 14, color: WHITE, fontWeight: '500' },
  btn:              { width: '100%', height: 52, borderRadius: 14, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  btnDisabled:      { opacity: 0.45 },
  btnText:          { fontSize: 16, fontWeight: '700', color: BRAND },
  skipBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10 },
  skipText:         { fontSize: 14, color: WHITE + 'AA' },
});

/**
 * SaveAsImageModal
 * ─────────────────
 * Renders an off-screen BrandedPostCard (full height, no clipping),
 * captures it at full resolution via ViewShot, saves to gallery
 * and/or opens the native share sheet.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Dimensions, Platform,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';
import BrandedPostCard from './BrandedPostCard';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const { width: SCREEN_W } = Dimensions.get('window');
// Card fills the full screen width so the capture is maximum resolution
const CARD_W = SCREEN_W;

const SHARE_APPS = [
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#C13584' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: 'logo-whatsapp',  color: '#25D366' },
  { key: 'tiktok',    label: 'TikTok',    icon: 'musical-notes',  color: '#010101' },
  { key: 'wechat',    label: 'WeChat',    icon: 'chatbubbles',    color: '#07C160' },
  { key: 'more',      label: 'More',      icon: 'share-outline',  color: BRAND     },
];

const SaveAsImageModal = ({ visible, onClose, feed }) => {
  const shotRef    = useRef(null);
  const [saving,   setSaving]   = useState(false);
  const [savedUri, setSavedUri] = useState(null);

  // ── Capture ────────────────────────────────────────────────────────────────
  const capture = useCallback(async () => {
    if (!shotRef.current) return null;
    return shotRef.current.capture();
  }, []);

  // ── Save to gallery ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow access to your photos to save the image.');
        return;
      }
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      setSavedUri(uri);
      Alert.alert('Saved! 🎉', 'Post image saved to your gallery.');
    } catch {
      Alert.alert('Error', 'Could not save the image. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [capture]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    setSaving(true);
    try {
      let uri = savedUri;
      if (!uri) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Allow access to your photos to share.');
          return;
        }
        uri = await capture();
        if (!uri) return;
      }
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share via' });
      } else {
        Alert.alert('Not Available', 'Sharing is not supported on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not share the image. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [capture, savedUri]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>

          {/* ── Handle ── */}
          <View style={s.handle} />

          {/* ── Title row ── */}
          <View style={s.titleRow}>
            <View style={s.titleLeft}>
              <View style={s.titleIcon}>
                <Ionicons name="image" size={18} color={ACCENT} />
              </View>
              <Text style={s.title}>Save as Image</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={18} color={Colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* ── Preview (scrollable) ── */}
          <ScrollView
            style={s.previewScroll}
            contentContainerStyle={s.previewContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ViewShot wraps BrandedPostCard at natural height — no clipping */}
            <ViewShot
              ref={shotRef}
              options={{ format: 'png', quality: 1 }}
              style={s.viewShot}
            >
              <BrandedPostCard feed={feed} width={CARD_W} />
            </ViewShot>
          </ScrollView>

          {/* ── Quick-share apps ── */}
          <View style={s.appSection}>
            <Text style={s.appSectionLabel}>Share to</Text>
            <View style={s.appRow}>
              {SHARE_APPS.map((app) => (
                <TouchableOpacity
                  key={app.key}
                  style={s.appBtn}
                  activeOpacity={0.8}
                  onPress={handleShare}
                >
                  <View style={[s.appBubble, { backgroundColor: app.color + '15' }]}>
                    <Ionicons name={app.icon} size={22} color={app.color} />
                  </View>
                  <Text style={s.appLabel}>{app.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Action buttons ── */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.btn, s.btnSave]}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={Colors.white} />
                  <Text style={s.btnSaveTxt}>Save to Gallery</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, s.btnShare]}
              activeOpacity={0.85}
              onPress={handleShare}
              disabled={saving}
            >
              <Ionicons name="share-outline" size={18} color={BRAND} />
              <Text style={s.btnShareTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* ── Hint ── */}
          <Text style={s.hint}>Hafrik watermark is always included in the exported image</Text>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000080',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: Platform.OS === 'ios' ? 38 : 26,
    paddingTop: 10,
    maxHeight: '90%',
  },

  // Handle
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral200 ?? '#ddd',
    alignSelf: 'center',
    marginBottom: 14,
  },

  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: ACCENT + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: Colors.neutral130 ?? '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
  },

  // Preview — scrollable area showing the card
  previewScroll: {
    maxHeight: 320,
    marginBottom: 14,
  },
  previewContent: {
    alignItems: 'center',
  },
  viewShot: {
    // No borderRadius here — keep edges sharp for capture quality.
    // The sheet scroll provides the visual container.
    overflow: 'hidden',
    width: CARD_W,
  },

  // Share apps
  appSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  appSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryText ?? '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  appBubble: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  appLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondaryText ?? '#888',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnSave: {
    backgroundColor: BRAND,
  },
  btnSaveTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  btnShare: {
    backgroundColor: BRAND + '0E',
    borderWidth: 1.5,
    borderColor: BRAND + '28',
  },
  btnShareTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: BRAND,
  },

  // Hint
  hint: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.secondaryText ?? '#888',
    paddingHorizontal: 24,
  },
});

export default SaveAsImageModal;

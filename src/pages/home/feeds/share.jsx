import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  TextInput, StyleSheet, ActivityIndicator, Share, Alert,
  ScrollView, Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from "@expo/vector-icons";
import RepostController from '../../../controllers/repostcontroller';
import { useAuth } from '../../../AuthContext';
import { Colors } from '../../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

// ─── Target chip ──────────────────────────────────────────────────────────────
const TargetChip = ({ item, isSelected, onPress }) => {
  const name = item.title || item.name || item.username || 'Me';
  const icon = item._type === 'group' ? 'people' : item._type === 'page' ? 'storefront' : 'person';
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.chipIconWrap, isSelected && styles.chipIconWrapSelected]}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.chipAvatar} />
        ) : (
          <Ionicons name={icon} size={16} color={isSelected ? Colors.white : BRAND} />
        )}
      </View>
      <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]} numberOfLines={1}>
        {name}
      </Text>
      {item._type === 'group' && (
        <Text style={styles.chipMeta}>{Number(item.members ?? 0).toLocaleString()} members</Text>
      )}
      {item._type === 'page' && (
        <Text style={styles.chipMeta}>{Number(item.likes ?? 0).toLocaleString()} likes</Text>
      )}
    </TouchableOpacity>
  );
};

// ─── ShareModal ───────────────────────────────────────────────────────────────
const ShareModal = ({ visible, onClose, feed, onSaveAsImage }) => {
  const { token } = useAuth();

  const [targets,         setTargets]         = useState([]);
  const [targetsLoading,  setTargetsLoading]  = useState(false);
  const [selectedTarget,  setSelectedTarget]  = useState(null);
  const [caption,         setCaption]         = useState('');
  const [loading,         setLoading]         = useState(false);

  const cancelledRef = useRef(false);

  // ── Fetch share targets when modal opens ──────────────────────────────────
  useEffect(() => {
    if (!visible || !token) return;

    cancelledRef.current = false;
    setTargetsLoading(true);
    setSelectedTarget(null);
    setCaption('');

    fetch('https://hafrik.com/api/v1/feed/my_target.php', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (cancelledRef.current) return;
        const data    = json?.data ?? {};
        const profile = data.profile ? [{ ...data.profile, _type: 'profile' }] : [];
        const pages   = (Array.isArray(data.pages)  ? data.pages  : []).map(p => ({ ...p, _type: 'page'  }));
        const groups  = (Array.isArray(data.groups) ? data.groups : []).map(g => ({ ...g, _type: 'group' }));
        const list    = [...profile, ...pages, ...groups];
        setTargets(list);
        if (list.length > 0) setSelectedTarget(list[0]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelledRef.current) setTargetsLoading(false); });

    return () => { cancelledRef.current = true; };
  }, [visible, token]);

  // ── Share handler ─────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!selectedTarget) return;
    setLoading(true);

    const postData = {
      post_id:  feed.id,
      text:     caption.trim(),
      privacy:  'public',
    };

    if (selectedTarget._type === 'page') {
      postData.target  = 'page';
      postData.page_id = selectedTarget.id ?? selectedTarget.page_id;
    } else if (selectedTarget._type === 'group') {
      postData.target   = 'group';
      postData.group_id = selectedTarget.id ?? selectedTarget.group_id;
    }
    // profile → no extra fields needed

    try {
      const response = await RepostController(postData, token);
      if (response.status === 200) {
        const store = require('../../../repository/store').default;
        const { feeds, updateFeedById } = store.getState();
        const currentFeed = feeds.feedsById[feed.id];
        if (currentFeed) {
          const newCount = response.data?.shares_count_new
            ?? (Number(currentFeed.shares_count ?? currentFeed.shares ?? 0) + 1);
          updateFeedById(feed.id, { ...currentFeed, shares_count: newCount, shares: newCount });
        }
        setCaption('');
        setSelectedTarget(null);
        onClose();
        store.getState().showToast('Post shared', '📤');
      } else {
        require('../../../repository/store').default.getState().showToast('Could not share. Try again.', '⚠️');
      }
    } catch (error) {
      console.warn("Share error:", error?.message);
      require('../../../repository/store').default.getState().showToast('Something went wrong. Try again.', '⚠️');
    } finally {
      setLoading(false);
    }
  };

  const postUrl = `https://hafrik.com/post/${feed?.id}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(postUrl);
      Alert.alert('Copied', 'Link copied to clipboard');
    } catch {}
  }, [postUrl]);

  const handleNativeShare = useCallback(async () => {
    try {
      await Share.share({ message: `Check this out on Hafrik! ${postUrl}`, url: postUrl });
    } catch {}
  }, [postUrl]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.title}>Share</Text>

              {/* Copy link */}
              <View style={styles.copyRow}>
                <Text style={styles.linkText} numberOfLines={1}>{postUrl}</Text>
                <TouchableOpacity onPress={handleCopyLink} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="clipboard-outline" size={20} color={Colors.neutral500} />
                </TouchableOpacity>
              </View>

              {/* External social icons */}
              <View style={styles.socialRow}>
                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-facebook"  size={28} color="#1877F2" /></TouchableOpacity>
                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-twitter"   size={28} color="#1DA1F2" /></TouchableOpacity>
                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-linkedin"  size={28} color="#0A66C2" /></TouchableOpacity>
                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-whatsapp"  size={28} color="#25D366" /></TouchableOpacity>
                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-reddit"    size={28} color="#FF4500" /></TouchableOpacity>
                <TouchableOpacity onPress={handleNativeShare}><Ionicons name="logo-pinterest" size={28} color="#E60023" /></TouchableOpacity>
              </View>

              {/* Save as Image */}
              {onSaveAsImage && (
                <TouchableOpacity style={styles.saveImageRow} activeOpacity={0.82} onPress={() => { onClose(); setTimeout(onSaveAsImage, 280); }}>
                  <View style={styles.saveImageIcon}>
                    <Ionicons name="image-outline" size={20} color={BRAND} />
                  </View>
                  <View style={styles.saveImageText}>
                    <Text style={styles.saveImageTitle}>Save as Image</Text>
                    <Text style={styles.saveImageSub}>Export a branded post to your gallery</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={BRAND + '60'} />
                </TouchableOpacity>
              )}

              {/* Post to section header */}
              <Text style={styles.sectionLabel}>Post to</Text>

              {/* Target chips */}
              {targetsLoading ? (
                <View style={styles.targetsLoader}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.targetsLoaderText}>Loading targets…</Text>
                </View>
              ) : targets.length === 0 ? (
                <Text style={styles.noTargets}>No targets available.</Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {targets.map((item, idx) => (
                    <TargetChip
                      key={`${item._type}-${item.id ?? idx}`}
                      item={item}
                      isSelected={selectedTarget?.id === item.id && selectedTarget?._type === item._type}
                      onPress={() => setSelectedTarget(item)}
                    />
                  ))}
                </ScrollView>
              )}

              {/* Caption */}
              <TextInput
                style={styles.captionInput}
                placeholder="Say something about this…"
                placeholderTextColor={Colors.neutral350}
                value={caption}
                onChangeText={setCaption}
                multiline
              />

              {/* Share button */}
              <TouchableOpacity
                style={[styles.shareBtn, (!selectedTarget || loading) && styles.shareBtnDisabled]}
                disabled={!selectedTarget || loading}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.shareBtnText}>Share</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: withOpacity(Colors.black, 0.5),
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "WorkSans_600SemiBold",
    color: BRAND,
    textAlign: 'center',
    marginBottom: 18,
  },

  // Copy link
  copyRow: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral130,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  linkText: {
    color: Colors.neutral500,
    fontSize: 13,
    flex: 1,
    marginRight: 10,
    fontFamily: "WorkSans_400Regular",
  },

  // Social icons
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  // Save as Image row
  saveImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND + '08',
    borderRadius: 14,
    padding: 13,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BRAND + '14',
    gap: 12,
  },
  saveImageIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: BRAND + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  saveImageText: { flex: 1 },
  saveImageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
  saveImageSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },

  // Section header
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Targets loader / empty
  targetsLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  targetsLoaderText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  noTargets: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginBottom: 16,
  },

  // Chips scroll
  chipsScroll: {
    paddingBottom: 16,
    gap: 10,
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight ?? Colors.neutral200,
    backgroundColor: Colors.white,
    maxWidth: 120,
    minWidth: 72,
  },
  chipSelected: {
    borderColor: BRAND,
    backgroundColor: BRAND + '10',
  },
  chipIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  chipIconWrapSelected: {
    backgroundColor: BRAND,
  },
  chipAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND,
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: BRAND,
  },
  chipMeta: {
    fontSize: 10,
    color: Colors.secondaryText,
    marginTop: 2,
    textAlign: 'center',
  },

  // Caption
  captionInput: {
    backgroundColor: Colors.neutral110,
    borderRadius: 10,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    color: Colors.neutral700,
    fontFamily: "WorkSans_400Regular",
  },

  // Share button
  shareBtn: {
    backgroundColor: BRAND,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnDisabled: {
    opacity: 0.45,
  },
  shareBtnText: {
    color: Colors.white,
    fontFamily: "WorkSans_600SemiBold",
    fontSize: 16,
  },
});

export default ShareModal;

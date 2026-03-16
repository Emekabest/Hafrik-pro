import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../AuthContext';
import ToggleSaveController from '../../../../controllers/tooglesavecontroller';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;

const COLLECTIONS = [
  { id: 'favorites', label: 'Favorites',       icon: 'star-outline',      color: '#F59E0B' },
  { id: 'business',  label: 'Business Ideas',  icon: 'briefcase-outline', color: '#6366F1' },
  { id: 'china',     label: 'China Tips',      icon: 'globe-outline',     color: '#EF4444' },
  { id: 'travel',    label: 'Travel',          icon: 'airplane-outline',  color: '#10B981' },
];

const SaveCollectionsModal = ({ visible, postId, isSaved, onClose, onSaved }) => {
  const { token } = useAuth();
  const [loadingId, setLoadingId] = useState(null);

  const handleSelect = useCallback(async (collectionId) => {
    if (loadingId) return;
    setLoadingId(collectionId);
    try {
      // TODO: pass collection_id once backend supports it
      const response = await ToggleSaveController(postId, token);
      if (response.status === 200) {
        const { feeds, updateFeedById, showToast } = useStore.getState();
        const current = feeds.feedsById[postId];
        if (current) {
          updateFeedById(postId, { ...current, is_saved: !isSaved });
        }
        onSaved?.(!isSaved);
        onClose();
        showToast('Saved to collection', '⭐');
      } else {
        useStore.getState().showToast('Could not save post. Try again.', '⚠️');
      }
    } catch {
      useStore.getState().showToast('Could not save post. Try again.', '⚠️');
    } finally {
      setLoadingId(null);
    }
  }, [postId, token, isSaved, loadingId, onSaved, onClose]);

  const handleCreateNew = useCallback(() => {
    Alert.alert('Create Collection', 'Collection creation coming soon!', [{ text: 'OK' }]);
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback>
            <View style={s.sheet}>
              <View style={s.handle} />
              <Text style={s.title}>Save to Collection</Text>
              <Text style={s.subtitle}>Choose where to save this post</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {COLLECTIONS.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    style={s.row}
                    activeOpacity={0.75}
                    onPress={() => handleSelect(col.id)}
                    disabled={!!loadingId}
                  >
                    <View style={[s.iconWrap, { backgroundColor: col.color + '18' }]}>
                      {loadingId === col.id ? (
                        <ActivityIndicator size="small" color={col.color} />
                      ) : (
                        <Ionicons name={col.icon} size={20} color={col.color} />
                      )}
                    </View>
                    <Text style={s.rowLabel}>{col.label}</Text>
                    {isSaved && (
                      <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[s.row, s.createRow]}
                  activeOpacity={0.75}
                  onPress={handleCreateNew}
                  disabled={!!loadingId}
                >
                  <View style={[s.iconWrap, { backgroundColor: ACCENT + '15' }]}>
                    <Ionicons name="add-outline" size={22} color={ACCENT} />
                  </View>
                  <Text style={[s.rowLabel, { color: ACCENT }]}>Create New Collection</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000060',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17, fontWeight: '800', color: BRAND,
    textAlign: 'center', marginBottom: 4,
  },
  subtitle: {
    fontSize: 12, color: Colors.secondaryText ?? '#888',
    textAlign: 'center', marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral200 ?? '#f0f0f0',
  },
  createRow: { borderBottomWidth: 0, marginTop: 4 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: BRAND },
});

export default SaveCollectionsModal;

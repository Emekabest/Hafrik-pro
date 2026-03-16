import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../AuthContext';
import RepostController from '../../../../controllers/repostcontroller';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;

const RepostModal = ({ visible, postId, onClose, onRepostWithComment }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRepost = useCallback(async () => {
    if (!postId || loading) return;
    setLoading(true);
    try {
      const response = await RepostController({ post_id: postId, privacy: 'public' }, token);
      if (response.status === 200) {
        const { feeds, updateFeedById, showToast } = useStore.getState();
        const current = feeds.feedsById[postId];
        if (current) {
          const newCount = response.data?.data?.shares_count_new
            ?? (Number(current.shares_count ?? current.shares ?? 0) + 1);
          updateFeedById(postId, { ...current, shares_count: newCount, shares: newCount });
        }
        onClose();
        showToast('Reposted to your timeline', '🔁');
      } else {
        useStore.getState().showToast('Could not repost. Try again.', '⚠️');
      }
    } catch {
      useStore.getState().showToast('Could not repost. Try again.', '⚠️');
    } finally {
      setLoading(false);
    }
  }, [postId, token, loading, onClose]);

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
              <Text style={s.title}>Repost</Text>

              <TouchableOpacity
                style={s.row}
                activeOpacity={0.75}
                onPress={handleRepost}
                disabled={loading}
              >
                <View style={s.iconWrap}>
                  {loading ? (
                    <ActivityIndicator size="small" color={BRAND} />
                  ) : (
                    <Ionicons name="repeat-outline" size={22} color={BRAND} />
                  )}
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowTitle}>Repost</Text>
                  <Text style={s.rowSub}>Share instantly to your timeline</Text>
                </View>
              </TouchableOpacity>

              <View style={s.divider} />

              <TouchableOpacity
                style={s.row}
                activeOpacity={0.75}
                onPress={() => { onClose(); setTimeout(onRepostWithComment, 250); }}
                disabled={loading}
              >
                <View style={[s.iconWrap, { backgroundColor: ACCENT + '14' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={ACCENT} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowTitle}>Repost with comment</Text>
                  <Text style={s.rowSub}>Add your thoughts before sharing</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.75}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
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
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND,
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: Colors.neutral130 ?? '#f4f4f4',
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: BRAND },
  rowSub: { fontSize: 12, color: Colors.secondaryText ?? '#888', marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.neutral200 ?? '#eee' },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.neutral200 ?? '#eee',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 15, fontWeight: '700', color: Colors.neutral500 ?? '#888' },
});

export default RepostModal;

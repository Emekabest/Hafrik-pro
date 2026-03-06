import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, Image,
  ActivityIndicator, StyleSheet, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const n = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${n}${a}`;
};

const API_URL = 'https://hafrik.com/api/v1/feed/reactions.php';

const TABS = [
  { key: 'all',   label: 'All',  emoji: null },
  { key: 'like',  label: '👍',   emoji: '👍' },
  { key: 'love',  label: '❤️',   emoji: '❤️' },
  { key: 'haha',  label: '😂',   emoji: '😂' },
  { key: 'yay',   label: '🎉',   emoji: '🎉' },
  { key: 'wow',   label: '😮',   emoji: '😮' },
  { key: 'sad',   label: '😢',   emoji: '😢' },
  { key: 'angry', label: '😡',   emoji: '😡' },
];

/**
 * ReactionsModal — shows paginated list of users who reacted.
 *
 * Props:
 *  - visible  : boolean
 *  - postId   : number
 *  - token    : string
 *  - reactions: { like: n, love: n, … } — used to show counts on tabs
 *  - onClose  : () => void
 */
const ReactionsModal = ({ visible, postId, token, reactions, onClose }) => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('all');
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);

  const fetchReactions = useCallback(async (tab, pg = 1) => {
    if (!postId || !token) return;
    setLoading(true);
    try {
      const params = { post_id: postId, page: pg, limit: 20 };
      if (tab !== 'all') params.reaction = tab;

      const res = await axios.get(API_URL, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      if (pg === 1) {
        setData(items);
      } else {
        setData(prev => [...prev, ...items]);
      }
      setHasMore(items.length >= 20);
    } catch {
      if (pg === 1) setData([]);
    }
    setLoading(false);
  }, [postId, token]);

  // Reset and fetch when tab changes or modal opens
  useEffect(() => {
    if (visible && postId) {
      setPage(1);
      setHasMore(true);
      fetchReactions(activeTab, 1);
    }
  }, [visible, activeTab, postId]);

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchReactions(activeTab, next);
  }, [loading, hasMore, page, activeTab]);

  const handleTabPress = useCallback((tabKey) => {
    setActiveTab(tabKey);
  }, []);

  const handleUserPress = useCallback((user) => {
    onClose();
    if (user?.id) {
      navigation.navigate('UserProfile', { userId: user.id, username: user.username ?? '' });
    }
  }, [navigation, onClose]);

  const totalCount = reactions
    ? Object.values(reactions).reduce((a, b) => a + Number(b || 0), 0)
    : 0;

  const getTabCount = (key) => {
    if (key === 'all') return totalCount;
    return Number(reactions?.[key] || 0);
  };

  const renderTab = useCallback(({ key, label }) => {
    const count = getTabCount(key);
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => handleTabPress(key)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}{count > 0 ? ` ${count}` : ''}
        </Text>
      </TouchableOpacity>
    );
  }, [activeTab, reactions]);

  const renderUser = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => handleUserPress(item.user ?? item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: (item.user ?? item)?.avatar }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {(item.user ?? item)?.full_name || (item.user ?? item)?.username || 'User'}
          </Text>
          {(item.user ?? item)?.verified && (
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>
        {(item.user ?? item)?.username && (
          <Text style={styles.userHandle} numberOfLines={1}>@{(item.user ?? item).username}</Text>
        )}
      </View>
      {item.reaction && (
        <Text style={styles.reactionBadge}>
          {{ like: '👍', love: '❤️', haha: '😂', yay: '🎉', wow: '😮', sad: '😢', angry: '😡' }[item.reaction] || '👍'}
        </Text>
      )}
    </TouchableOpacity>
  ), [handleUserPress]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* Handle */}
              <View style={styles.handle} />
              <Text style={styles.title}>Reactions</Text>

              {/* Tabs */}
              <FlatList
                horizontal
                data={TABS}
                keyExtractor={(t) => t.key}
                renderItem={({ item }) => renderTab(item)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBar}
                style={styles.tabBarWrap}
              />

              {/* Users list */}
              <FlatList
                data={data}
                keyExtractor={(item, i) => String(item?.user?.id ?? item?.id ?? i)}
                renderItem={renderUser}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                  loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 30 }} />
                  ) : (
                    <Text style={styles.emptyText}>No reactions yet</Text>
                  )
                }
                ListFooterComponent={
                  loading && data.length > 0
                    ? <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: 12 }} />
                    : null
                }
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
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
    backgroundColor: withOpacity(Colors.black, 0.45),
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: 300,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: Colors.neutral200,
    alignSelf: 'center', marginBottom: 10,
  },
  title: {
    fontSize: 16, fontWeight: '800', textAlign: 'center',
    color: Colors.primaryDark, marginBottom: 10,
  },
  tabBarWrap: {
    maxHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral200,
  },
  tabBar: {
    paddingHorizontal: 12,
    gap: 4,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: Colors.primary + '18',
  },
  tabText: {
    fontSize: 13, fontWeight: '600', color: Colors.neutral500,
  },
  tabTextActive: {
    color: Colors.primary, fontWeight: '700',
  },
  list: { flex: 1 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: withOpacity(Colors.black, 0.05),
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.neutral200,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  userHandle: { fontSize: 12, color: Colors.neutral500, marginTop: 1 },
  reactionBadge: { fontSize: 20, marginLeft: 8 },
  emptyText: {
    textAlign: 'center', marginTop: 30,
    fontSize: 14, color: Colors.neutral400,
  },
});

export default memo(ReactionsModal);

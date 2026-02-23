import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import AppDetails from '../../helpers/appdetails';

const BASE_URL = 'https://hafrik.com';
const BRAND    = '#0C3F44';
const ACCENT   = '#13C296';
const CREAM    = '#F5F7F7';
const DARK     = '#0D1B1E';
const MUTED    = '#7A9198';
const BUBBLE_ME    = BRAND;
const BUBBLE_THEM  = '#fff';

const apiFetch = async (path, token, opts = {}) => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers ?? {}),
      },
      ...opts,
    });
    return await res.json();
  } catch { return null; }
};

const formatTime = (raw) => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch { return ''; }
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = ({ w, h, r = 8, alignSelf }) => {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{ width: w, height: h, borderRadius: r, backgroundColor: 'rgba(12,63,68,0.09)', opacity: anim, alignSelf }}
    />
  );
};

// ─── Single bubble ─────────────────────────────────────────────────────────────
const Bubble = ({ item, isMe, otherAvatar, otherIsDefault }) => {
  const text = item.message_text ?? item.message ?? item.text ?? '';
  const t    = formatTime(item.created_at ?? item.time);
  const isTemp = !!item._temp;

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      {/* Avatar (only for their messages) */}
      {!isMe && (
        <View style={styles.bubbleAvatarWrap}>
          {!otherIsDefault ? (
            <Image source={{ uri: otherAvatar }} style={styles.bubbleAvatar} />
          ) : (
            <View style={[styles.bubbleAvatar, styles.bubbleAvatarFb]}>
              <Ionicons name="person" size={14} color={BRAND} />
            </View>
          )}
        </View>
      )}

      <View style={styles.bubbleContent}>
        <View style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleThem,
          isTemp && { opacity: 0.6 },
        ]}>
          {/* Media placeholder */}
          {item.media_type === 'image' && item.media_url && (
            <Image
              source={{ uri: item.media_url }}
              style={styles.bubbleImage}
              resizeMode="cover"
            />
          )}
          {item.media_type === 'video' && (
            <View style={styles.bubbleVideoPlaceholder}>
              <Ionicons name="play-circle" size={32} color={isMe ? 'rgba(255,255,255,0.8)' : BRAND} />
              <Text style={[styles.bubbleVideoText, { color: isMe ? 'rgba(255,255,255,0.7)' : MUTED }]}>Video</Text>
            </View>
          )}
          {item.media_type === 'voice' && (
            <View style={styles.bubbleVoicePlaceholder}>
              <Ionicons name="mic" size={18} color={isMe ? 'rgba(255,255,255,0.8)' : BRAND} />
              <Text style={[styles.bubbleVideoText, { color: isMe ? 'rgba(255,255,255,0.7)' : MUTED }]}>Voice message</Text>
            </View>
          )}
          {!!text && (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
              {text}
            </Text>
          )}
        </View>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
          {isTemp ? 'Sending…' : t}
          {isMe && !isTemp && (
            <Text>  <Ionicons name="checkmark-done" size={11} color={isMe ? `${ACCENT}cc` : MUTED} /></Text>
          )}
        </Text>
      </View>
    </View>
  );
};

// ─── Day separator ─────────────────────────────────────────────────────────────
const DaySep = ({ label }) => (
  <View style={styles.daySep}>
    <View style={styles.daySepLine} />
    <Text style={styles.daySepText}>{label}</Text>
    <View style={styles.daySepLine} />
  </View>
);

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ThreadScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { top, bottom } = useSafeAreaInsets();
  const { token, user } = useAuth();
  const refreshBadges   = useStore((s) => s.refreshBadges);
  const setMessageCount = useStore((s) => s.setMessageCount);

  const { conversationId, otherUser = {} } = route.params ?? {};

  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [text,       setText]       = useState('');
  const flatRef = useRef(null);
  const myId    = user?.id ?? user?.user_id;

  const otherAvatar       = otherUser.avatar ?? otherUser.user_picture ?? null;
  const otherIsDefault    = !otherAvatar || String(otherAvatar).includes('blank_profile') || String(otherAvatar).includes('/default.');
  const otherName         = otherUser.username ?? otherUser.full_name ?? otherUser.name ?? 'User';

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/v1/messages/thread.php?conversation_id=${conversationId}`, token);
    const list = Array.isArray(res?.data) ? res.data : [];
    setMessages(list);
    setLoading(false);
  }, [conversationId, token]);

  // Mark as seen + refresh badges on open
  useEffect(() => {
    load();
    (async () => {
      await apiFetch('/api/v1/messages/mark_seen.php', token, {
        method: 'POST',
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      refreshBadges(token);
    })();
  }, []);

  // Scroll to bottom when messages load / change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 120);
    }
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);

    // Optimistic bubble
    const tempId = `tmp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      _temp: true,
      sender_id: myId,
      message_text: msg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

    const res = await apiFetch('/api/v1/messages/send.php', token, {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, message: msg }),
    });

    const sent = res?.data ?? { ...tempMsg, _temp: false };
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...sent, _temp: false } : m)));
    setSending(false);
    refreshBadges(token);
  }, [text, sending, myId, conversationId, token, refreshBadges]);

  // Build render-ready list (inject day separators)
  const renderList = (() => {
    const out = [];
    let lastDay = '';
    for (const m of messages) {
      const day = m.created_at ? new Date(m.created_at).toDateString() : '';
      if (day && day !== lastDay) {
        lastDay = day;
        const now = new Date().toDateString();
        const label = day === now ? 'Today' : day;
        out.push({ _sep: true, key: `sep_${day}`, label });
      }
      out.push(m);
    }
    return out;
  })();

  const renderItem = ({ item }) => {
    if (item._sep) return <DaySep key={item.key} label={item.label} />;
    const isMe = String(item.sender_id) === String(myId);
    return (
      <Bubble
        key={item.id}
        item={item}
        isMe={isMe}
        otherAvatar={otherAvatar}
        otherIsDefault={otherIsDefault}
      />
    );
  };

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUser}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('UserProfile', { userId: otherUser.id, username: otherName })}
        >
          {!otherIsDefault ? (
            <Image source={{ uri: otherAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFb]}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            <Text style={styles.headerStatus}>Active recently</Text>
          </View>
        </TouchableOpacity>

        <View style={{ width: 36 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ padding: 20, gap: 16 }}>
            {[1, 2, 3, 4].map((i, idx) => (
              <Skel key={i} w={`${40 + (idx % 3) * 20}%`} h={40} r={16} alignSelf={idx % 2 === 0 ? 'flex-end' : 'flex-start'} />
            ))}
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={renderList}
            keyExtractor={(item, i) => `${item._sep ? item.key : (item.id ?? i)}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'ios' ? 8 : 10 + bottom }]}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Type a message…"
              placeholderTextColor={MUTED}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              selectionColor={ACCENT}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            activeOpacity={0.85}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 10,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerUser: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: ACCENT },
  headerAvatarFb: { backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerName: {
    fontSize: 15, fontWeight: '800', color: '#fff',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerStatus: {
    fontSize: 11, color: 'rgba(255,255,255,0.55)',
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  listContent: { paddingHorizontal: 12, paddingVertical: 16, gap: 4 },

  // Day separator
  daySep: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 8 },
  daySepLine: { flex: 1, height: 1, backgroundColor: 'rgba(12,63,68,0.1)' },
  daySepText: {
    fontSize: 11, color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
    paddingHorizontal: 4,
  },

  // Bubbles
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
  bubbleRowMe:   { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },

  bubbleAvatarWrap: { marginRight: 6 },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14 },
  bubbleAvatarFb: { backgroundColor: `${BRAND}14`, alignItems: 'center', justifyContent: 'center' },

  bubbleContent: { maxWidth: '75%' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    overflow: 'hidden',
  },
  bubbleMe: {
    backgroundColor: BUBBLE_ME,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: BUBBLE_THEM,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMe:   { color: '#fff', fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  bubbleTextThem: { color: DARK,  fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  bubbleTime: { fontSize: 10, marginTop: 3 },
  bubbleTimeMe:   { color: MUTED, textAlign: 'right',  fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  bubbleTimeThem: { color: MUTED, textAlign: 'left',   fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },

  bubbleImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
  bubbleVideoPlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  bubbleVoicePlaceholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  bubbleVideoText: { fontSize: 13 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(12,63,68,0.08)',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: CREAM,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
    padding: 0,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: `${BRAND}60`, shadowOpacity: 0 },
});

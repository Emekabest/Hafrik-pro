import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TouchableWithoutFeedback,
  Image, TextInput, KeyboardAvoidingView, Platform, Modal,
  Animated, ActivityIndicator, RefreshControl, Alert, Share,
  PanResponder, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import { useTheme } from '../../theme/ThemeContext';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme';

const BASE_URL    = 'https://hafrik.com';
const BRAND       = Colors.primaryDark;
const ACCENT      = Colors.primary;
const CREAM       = Colors.surfaceTint;
const DARK        = Colors.black;
const MUTED       = Colors.secondaryText;
const WHITE       = Colors.white;
const BLACK       = Colors.black;
const BUBBLE_ME   = BRAND;
const BUBBLE_THEM = WHITE;
const POLL_MS     = 3000;
const GROUP_GAP   = 120_000; // 2 min gap breaks a group

/* ─── API helper ─────────────────────────────────────────────────────────── */
const api = async (path, token, opts = {}) => {
  const { headers: extraHeaders, ...rest } = opts;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(extraHeaders ?? {}),
      },
      ...rest,
    });
    return await res.json();
  } catch { return null; }
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtTime = (raw) => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return ''; }
};

const fmtDuration = (ms) => {
  const s = Math.floor((ms ?? 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const resolveUrl = (raw) => {
  if (!raw) return null;
  const s = String(raw);
  if (s.startsWith('http')) return s;
  return `${BASE_URL}/${s}`;
};

const avatarUri = (u = {}, name = 'U') => {
  const raw = u.avatar ?? u.user_picture ?? u.profile_picture ?? null;
  const av  = resolveUrl(raw);
  if (av && !av.includes('blank_profile') && !av.includes('/default.')) return av;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=${BRAND.replace('#', '')}&color=fff`;
};

/* ─── Build grouped render list ──────────────────────────────────────────── */
const buildRenderList = (messages, myId) => {
  const out = [];
  let lastDay     = '';
  let lastSenderId = null;
  let lastTime     = 0;

  for (let i = 0; i < messages.length; i++) {
    const m   = messages[i];
    const raw = m.time ?? m.created_at ?? '';
    const day = raw ? new Date(raw).toDateString() : '';

    if (day && day !== lastDay) {
      lastDay      = day;
      lastSenderId = null;
      lastTime     = 0;
      out.push({ _sep: true, key: `sep_${day}`, label: day === new Date().toDateString() ? 'Today' : day });
    }

    const sid       = String(m.sender_id ?? m.user_id ?? '');
    const ts        = raw ? new Date(raw).getTime() : 0;
    const timeGap   = ts - lastTime;
    const grouped   = lastSenderId === sid && timeGap < GROUP_GAP;

    // look ahead to know if we're the last in this group
    const next      = messages[i + 1];
    const nextSid   = next ? String(next.sender_id ?? next.user_id ?? '') : null;
    const nextTs    = next && (next.time ?? next.created_at) ? new Date(next.time ?? next.created_at).getTime() : 0;
    const lastInGrp = !next || nextSid !== sid || (nextTs - ts) >= GROUP_GAP;

    out.push({ ...m, _grouped: grouped, _lastInGroup: lastInGrp });
    lastSenderId = sid;
    lastTime     = ts;
  }
  return out;
};

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
const Skel = ({ w, h, r = 8, alignSelf }) => {
  const a = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1,    duration: 800, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.35, duration: 800, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);
  return <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: BRAND + '17', opacity: a, alignSelf }} />;
};

/* ─── Status icon ────────────────────────────────────────────────────────── */
const StatusIcon = ({ item, isMe }) => {
  if (!isMe) return null;
  if (item._temp || item._uploading)
    return <Ionicons name="time-outline" size={11} color={MUTED} style={{ marginLeft: 2 }} />;
  return <Ionicons name="checkmark" size={11} color={MUTED} style={{ marginLeft: 2 }} />;
};

/* ─── Voice player bubble ────────────────────────────────────────────────── */
const VoicePlayer = ({ url, isMe, uploading }) => {
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const soundRef = useRef(null);

  const toggle = async () => {
    if (uploading) return;
    try {
      if (playing) {
        await soundRef.current?.pauseAsync();
        setPlaying(false);
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded) {
                const pct = status.durationMillis
                  ? status.positionMillis / status.durationMillis : 0;
                setProgress(pct);
                if (status.didJustFinish) {
                  setPlaying(false);
                  setProgress(0);
                  soundRef.current?.unloadAsync();
                  soundRef.current = null;
                }
              }
            }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setPlaying(true);
      }
    } catch (_) {}
  };

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  const iconColor  = isMe ? WHITE : ACCENT;
  const trackColor = isMe ? WHITE + '44' : BRAND + '30';
  const fillColor  = isMe ? WHITE + 'CC' : ACCENT;

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={s.voicePill}>
      <Ionicons
        name={uploading ? 'hourglass-outline' : playing ? 'pause' : 'play'}
        size={20}
        color={iconColor}
      />
      <View style={[s.voiceTrack, { backgroundColor: trackColor }]}>
        <View style={[s.voiceFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: fillColor }]} />
      </View>
    </TouchableOpacity>
  );
};

/* ─── Bubble ─────────────────────────────────────────────────────────────── */
const Bubble = React.memo(({ item, isMe, otherAv, myAv, onLongPress, onImagePress }) => {
  const text      = item.message ?? item.message_text ?? item.text ?? '';
  const imgUrl    = item.image   ?? (item.media_type === 'image' ? item.media_url : null);
  const vidUrl    = item.video   ?? (item.media_type === 'video' ? item.media_url : null);
  const voiceUrl  = item.voice_note ?? (item.media_type === 'voice' ? item.media_url : null);
  const timeStr   = fmtTime(item.time ?? item.created_at);
  const isTemp    = !!item._temp || !!item._uploading;
  const grouped   = !!item._grouped;
  const lastInGrp = item._lastInGroup !== false;
  const av        = isMe ? myAv : otherAv;

  const avatarSlot = (
    <View style={[isMe ? s.avWrapMe : s.avWrap]}>
      {lastInGrp
        ? <Image source={{ uri: av }} style={s.bubbleAv} />
        : <View style={s.avPlaceholder} />}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => onLongPress(item)}
      delayLongPress={380}
    >
      <View style={[
        s.bubbleRow,
        isMe ? s.bubbleRowMe : s.bubbleRowThem,
        grouped ? s.bubbleRowGrouped : s.bubbleRowFirst,
      ]}>
        {/* Avatar on LEFT for "them", RIGHT for "me" */}
        {!isMe && avatarSlot}

        <View style={[s.bubbleContent, isMe && { alignItems: 'flex-end' }]}>
          <View style={[
            s.bubble,
            isMe ? s.bubbleMe : s.bubbleThem,
            isTemp && !item._uploading && { opacity: 0.65 },
            grouped && (isMe ? s.bubbleMeGrouped : s.bubbleThemGrouped),
          ]}>
            {/* Image — uploading shows preview with overlay, not blank box */}
            {imgUrl ? (
              item._uploading ? (
                <View>
                  <Image
                    source={{ uri: imgUrl }}
                    style={[s.bubbleImg, { opacity: 0.55 }]}
                    resizeMode="cover"
                    blurRadius={3}
                  />
                  <View style={s.uploadOverlay}>
                    <ActivityIndicator color={WHITE} size="small" />
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => onImagePress(imgUrl)} activeOpacity={0.9}>
                  <Image source={{ uri: imgUrl }} style={s.bubbleImg} resizeMode="cover" />
                </TouchableOpacity>
              )
            ) : null}

            {/* Video */}
            {vidUrl ? (
              <View style={s.mediaPill}>
                <Ionicons name="play-circle" size={28} color={isMe ? WHITE + 'CC' : BRAND} />
                <Text style={[s.mediaLbl, { color: isMe ? WHITE + 'B3' : MUTED }]}>Video</Text>
              </View>
            ) : null}

            {/* Voice note */}
            {voiceUrl ? (
              <VoicePlayer url={voiceUrl} isMe={isMe} uploading={!!item._uploading} />
            ) : null}

            {/* Text */}
            {!!text && (
              <Text style={[s.bubbleTxt, isMe ? s.bubbleTxtMe : s.bubbleTxtThem]}>{text}</Text>
            )}
          </View>

          {/* Time + status — only on last in group */}
          {lastInGrp && (
            <View style={s.bubbleMeta}>
              <Text style={[s.bubbleTime, isMe ? s.bubbleTimeMe : s.bubbleTimeThem]}>
                {isTemp ? 'Sending' : timeStr}
              </Text>
              <StatusIcon item={item} isMe={isMe} />
            </View>
          )}
        </View>

        {/* Avatar on RIGHT for "me" */}
        {isMe && avatarSlot}
      </View>
    </TouchableOpacity>
  );
});

/* ─── Typing dots ────────────────────────────────────────────────────────── */
const TypingDots = ({ av }) => {
  const [d1, d2, d3] = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const dot = (v, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: -5, duration: 220, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0,  duration: 220, useNativeDriver: true }),
      Animated.delay(500),
    ]));
    Animated.parallel([dot(d1, 0), dot(d2, 130), dot(d3, 260)]).start();
  }, []);
  return (
    <View style={[s.bubbleRow, s.bubbleRowThem, s.bubbleRowFirst]}>
      <View style={s.avWrap}><Image source={{ uri: av }} style={s.bubbleAv} /></View>
      <View style={[s.bubble, s.bubbleThem, { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 13 }]}>
        {[d1, d2, d3].map((d, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: MUTED, transform: [{ translateY: d }] }} />
        ))}
      </View>
    </View>
  );
};

/* ─── Day separator ──────────────────────────────────────────────────────── */
const DaySep = ({ label }) => (
  <View style={s.daySep}>
    <View style={s.dayLine} />
    <Text style={s.dayTxt}>{label}</Text>
    <View style={s.dayLine} />
  </View>
);

/* ─── Image fullscreen viewer ────────────────────────────────────────────── */
const ImageViewer = ({ uri, onClose }) => (
  <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={iv.backdrop}>
        <TouchableOpacity style={iv.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color={WHITE} />
        </TouchableOpacity>
        {uri && <Image source={{ uri }} style={iv.img} resizeMode="contain" />}
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

/* ─── Recording pulse ────────────────────────────────────────────────────── */
const RecordingPulse = ({ duration }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.3, duration: 400, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 400, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={rec.wrap}>
      <Animated.View style={[rec.ring, { transform: [{ scale: pulse }] }]} />
      <Ionicons name="mic" size={18} color={WHITE} />
      <Text style={rec.dur}>{fmtDuration(duration)}</Text>
      <Text style={rec.hint}>Release to send</Text>
    </View>
  );
};

/* ─── Main screen ─────────────────────────────────────────────────────────── */
export default function ThreadScreen() {
  const navigation      = useNavigation();
  const route           = useRoute();
  const { top, bottom } = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc }  = useTheme();
  const refreshBadges   = useStore((st) => st.refreshBadges);
  const userAvatar      = useStore((st) => st.userAvatar);

  const { conversationId, otherUser = {} } = route.params ?? {};

  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [text,         setText]         = useState('');
  const [otherTyping,  setOtherTyping]  = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isRecording,  setIsRecording]  = useState(false);
  const [recordMs,     setRecordMs]     = useState(0);
  const [replyTo,      setReplyTo]      = useState(null);   // { message_id, message, user_name } | null
  const [isOnline,     setIsOnline]     = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [showGallery,  setShowGallery]  = useState(false);

  const flatRef        = useRef(null);
  const pollRef        = useRef(null);
  const recordingRef   = useRef(null);
  const recordTimer    = useRef(null);
  const typingTimer    = useRef(null);
  const myId           = user?.id ?? user?.user_id ?? null;

  const otherName = otherUser.username ?? otherUser.full_name ?? otherUser.name ?? 'User';
  const otherAv   = avatarUri(otherUser, otherName);
  const myName    = user?.username ?? user?.full_name ?? 'Me';
  const myAv      = userAvatar || avatarUri(user ?? {}, myName);

  /* ── Load messages (page 1 = latest) ────────────────────────────────── */
  const load = useCallback(async (silent = false) => {
    const res  = await api(`/api/v1/messages/get.php?conversation_id=${conversationId}&page=1&limit=30`, token);
    const list = Array.isArray(res?.data) ? res.data : [];

    setMessages((prev) => {
      const tempMsgs     = prev.filter((m) => m._temp || m._uploading);
      const confirmedIds = new Set(list.map((m) => String(m.message_id ?? m.id)));
      const kept         = tempMsgs.filter((m) => !confirmedIds.has(String(m.message_id ?? m.id)));
      return [...list, ...kept];
    });

    setOtherTyping((res?.typing ?? 0) === 1);
    setPage(1);
    setHasMore(list.length >= 30);
    if (!silent) { setLoading(false); setRefreshing(false); }
  }, [conversationId, token]);

  /* ── Load older messages (infinite scroll up) ────────────────────────── */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res  = await api(`/api/v1/messages/get.php?conversation_id=${conversationId}&page=${nextPage}&limit=30`, token);
    const list = Array.isArray(res?.data) ? res.data : [];
    if (list.length === 0) {
      setHasMore(false);
    } else {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => String(m.message_id ?? m.id)));
        const newMsgs = list.filter((m) => !existingIds.has(String(m.message_id ?? m.id)));
        return [...newMsgs, ...prev]; // prepend older messages
      });
      setPage(nextPage);
      setHasMore(list.length >= 30);
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, conversationId, token]);

  /* ── Mark seen ───────────────────────────────────────────────────────── */
  const markSeen = useCallback(async () => {
    await api('/api/v1/messages/mark-seen.php', token, {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    });
    refreshBadges(token);
  }, [conversationId, token, refreshBadges]);

  /* ── Init ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    load();
    markSeen();
    pollRef.current = setInterval(() => load(true), POLL_MS);

    // Online status — check once then every 30s
    const otherId = otherUser.id ?? otherUser.user_id;
    if (otherId) {
      const checkOnline = async () => {
        const res = await api(`/api/v1/messages/online.php?user_id=${otherId}`, token);
        setIsOnline(res?.data?.online === 1 || res?.online === 1);
      };
      checkOnline();
      const onlineInterval = setInterval(checkOnline, 30000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        clearInterval(onlineInterval);
      };
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  /* ── Scroll to bottom on new messages ─────────────────────────────────── */
  useEffect(() => {
    if (messages.length > 0 && !showScrollBtn) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  /* ── Typing indicator ────────────────────────────────────────────────── */
  const handleTextChange = useCallback((val) => {
    setText(val);
    if (val.trim()) {
      // Notify server user is typing (debounced — clear after 3s silence)
      clearTimeout(typingTimer.current);
      api('/api/v1/messages/typing.php', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `conversation_id=${encodeURIComponent(conversationId)}&typing=1`,
      });
      typingTimer.current = setTimeout(() => {
        api('/api/v1/messages/typing.php', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `conversation_id=${encodeURIComponent(conversationId)}&typing=0`,
        });
      }, 3000);
    }
  }, [conversationId, token]);

  /* ── Send text ───────────────────────────────────────────────────────── */
  const sendMessage = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);

    const tempId = `tmp_${Date.now()}`;
    setMessages((prev) => [...prev, {
      message_id: tempId, id: tempId, _temp: true,
      sender_id: myId, user_id: myId,
      message: msg, time: new Date().toISOString(),
    }]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

    const replyParam = replyTo?.message_id ? `&reply_to=${encodeURIComponent(replyTo.message_id)}` : '';
    const res  = await api('/api/v1/messages/send.php', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `conversation_id=${encodeURIComponent(conversationId)}&message=${encodeURIComponent(msg)}${replyParam}`,
    });
    setReplyTo(null);
    const sent = res?.data ?? null;
    setMessages((prev) => prev.map((m) =>
      (m.message_id === tempId || m.id === tempId)
        ? sent ? { ...sent, _temp: false } : { ...m, _temp: false }
        : m
    ));
    setSending(false);
    load(true);
    refreshBadges(token);
  }, [text, sending, myId, conversationId, token, load, refreshBadges]);

  /* ── Upload helper (media.php → returns URL) ─────────────────────────── */
  const uploadMedia = useCallback(async (uri, name, type) => {
    const fd = new FormData();
    fd.append('file', { uri, name, type });
    try {
      const res = await fetch(`${BASE_URL}/api/v1/uploads/media.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: fd,
      });
      const data = await res.json();
      return data?.data?.url ?? null;
    } catch { return null; }
  }, [token]);

  /* ── Send image ──────────────────────────────────────────────────────── */
  const pickAndSendImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset  = result.assets[0];
    const tempId = `tmp_img_${Date.now()}`;

    // Optimistic bubble with local preview while uploading
    setMessages((prev) => [...prev, {
      message_id: tempId, id: tempId, _temp: true, _uploading: true,
      sender_id: myId, user_id: myId,
      image: asset.uri, time: new Date().toISOString(),
    }]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

    // Step 1 — upload to media.php
    const imageUrl = await uploadMedia(asset.uri, 'photo.jpg', 'image/jpeg');

    // Step 2 — send-image.php with the uploaded URL
    await api('/api/v1/messages/send-image.php', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `conversation_id=${encodeURIComponent(conversationId)}&image=${encodeURIComponent(imageUrl ?? asset.uri)}`,
    });

    setMessages((prev) => prev.map((m) =>
      (m.message_id === tempId || m.id === tempId)
        ? { ...m, _uploading: false, _temp: false, image: imageUrl ?? asset.uri }
        : m
    ));
    load(true);
    refreshBadges(token);
  }, [myId, conversationId, token, uploadMedia, load, refreshBadges]);

  /* ── Voice recording ─────────────────────────────────────────────────── */
  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordMs(0);
      Vibration.vibrate(40);
      recordTimer.current = setInterval(() => setRecordMs((p) => p + 100), 100);
    } catch (_) {}
  }, []);

  const stopAndSendRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    clearInterval(recordTimer.current);
    setIsRecording(false);

    try {
      // Get URI BEFORE unloading
      const uri = recordingRef.current.getURI();
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setRecordMs(0);
      if (!uri) return;

      // Optimistic bubble
      const tempId = `tmp_voice_${Date.now()}`;
      setMessages((prev) => [...prev, {
        message_id: tempId, id: tempId, _temp: true, _uploading: true,
        sender_id: myId, user_id: myId,
        voice_note: uri, time: new Date().toISOString(),
      }]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

      // Step 1 — upload actual file to media.php
      const formData = new FormData();
      formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' });

      const uploadRes = await fetch(`${BASE_URL}/api/v1/uploads/media.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const voiceUrl = uploadData?.data?.url;

      if (!voiceUrl) {
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        return;
      }

      // Step 2 — send-voice.php with the uploaded URL
      await api('/api/v1/messages/send-voice.php', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `conversation_id=${encodeURIComponent(conversationId)}&voice_note=${encodeURIComponent(voiceUrl)}`,
      });

      setMessages((prev) => prev.map((m) =>
        m.message_id === tempId
          ? { ...m, _uploading: false, _temp: false, voice_note: voiceUrl }
          : m
      ));
      load(true);
      refreshBadges(token);
    } catch (_) {
      recordingRef.current = null;
      setRecordMs(0);
    }
  }, [myId, conversationId, token, load, refreshBadges]);

  /* ── Long press menu ─────────────────────────────────────────────────── */
  const handleLongPress = useCallback((item) => {
    Vibration.vibrate(30);
    const msgId  = item.message_id ?? item.id;
    const isMine = myId != null && String(item.sender_id ?? item.user_id) === String(myId);
    const text_  = item.message ?? item.message_text ?? item.text ?? '';
    const options = [];

    options.push({
      text: 'Reply',
      onPress: () => setReplyTo({ message_id: msgId, message: text_, user_name: item.user_name ?? (isMe ? 'You' : otherName) }),
    });

    if (text_) {
      options.push({
        text: 'Copy',
        onPress: () => Share.share({ message: text_ }),
      });
    }
    if (isMine) {
      options.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setMessages((prev) => prev.filter((m) => (m.message_id ?? m.id) !== msgId));
          api('/api/v1/messages/delete-message.php', token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `message_id=${encodeURIComponent(msgId)}`,
          });
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  }, [myId, token]);

  /* ── Scroll detection ────────────────────────────────────────────────── */
  const onScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollBtn(distFromBottom > 220);
    // Load older messages when near top
    if (contentOffset.y < 80) loadMore();
  }, [loadMore]);

  const scrollToBottom = () => flatRef.current?.scrollToEnd({ animated: true });

  /* ── Render list ─────────────────────────────────────────────────────── */
  const renderList = useMemo(() => buildRenderList(messages, myId), [messages, myId]);

  const renderItem = ({ item }) => {
    if (item._sep) return <DaySep label={item.label} />;
    const senderId = item.sender_id ?? item.user_id ?? null;
    const isMe     = myId != null && senderId != null && String(senderId) === String(myId);
    return (
      <Bubble
        item={item}
        isMe={isMe}
        otherAv={otherAv}
        myAv={myAv}
        onLongPress={handleLongPress}
        onImagePress={setFullscreenImg}
      />
    );
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={[s.root, { paddingTop: top, backgroundColor: tc.background }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.headerUser}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('UserProfile', { userId: otherUser.id ?? otherUser.user_id, username: otherName })}
        >
          <Image source={{ uri: otherAv }} style={s.headerAv} />
          <View>
            <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
            <Text style={s.headerStatus}>
            {otherTyping ? 'typing…' : isOnline ? '● Online' : 'Active recently'}
          </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.backBtn}
          onPress={() => setShowGallery(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={20} color={WHITE} />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
        <View style={{ flex: 1 }}>
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
              keyExtractor={(item, i) => item._sep ? item.key : String(item.message_id ?? item.id ?? i)}
              renderItem={renderItem}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                if (!showScrollBtn) flatRef.current?.scrollToEnd({ animated: false });
              }}
              onScroll={onScroll}
              scrollEventThrottle={100}
              keyboardShouldPersistTaps="handled"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
              ListHeaderComponent={loadingMore ? <ActivityIndicator color={ACCENT} style={{ padding: 12 }} /> : null}
              ListFooterComponent={otherTyping ? <TypingDots av={otherAv} /> : null}
            />
          )}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <TouchableOpacity style={s.scrollBtn} onPress={scrollToBottom} activeOpacity={0.85}>
              <Ionicons name="chevron-down" size={20} color={WHITE} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Recording UI ── */}
        {isRecording && <RecordingPulse duration={recordMs} />}

        {/* ── Reply banner ── */}
        {replyTo && (
          <View style={s.replyBanner}>
            <View style={s.replyLine} />
            <View style={{ flex: 1 }}>
              <Text style={s.replyLabel}>{replyTo.user_name}</Text>
              <Text style={s.replyPreview} numberOfLines={1}>{replyTo.message || 'Media'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={[s.inputArea, { paddingBottom: Platform.OS === 'ios' ? 8 : 10 + bottom }]}>
          <View style={s.inputBar}>
            {/* Image button */}
            <TouchableOpacity style={s.iconBtn} onPress={pickAndSendImage} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={22} color={ACCENT} />
            </TouchableOpacity>

            {/* Text input */}
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="Type a message…"
                placeholderTextColor={MUTED}
                value={text}
                onChangeText={handleTextChange}
                multiline
                maxLength={2000}
                selectionColor={ACCENT}
              />
            </View>

            {/* Send / Mic */}
            {hasText ? (
              <TouchableOpacity
                style={[s.sendBtn, sending && s.sendBtnOff]}
                onPress={sendMessage}
                activeOpacity={0.85}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <Ionicons name="send" size={18} color={WHITE} />
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.sendBtn, { backgroundColor: isRecording ? Colors.destructive : ACCENT }]}
                onPressIn={startRecording}
                onPressOut={stopAndSendRecording}
                activeOpacity={0.85}
              >
                <Ionicons name="mic" size={18} color={WHITE} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Image fullscreen viewer ── */}
      <ImageViewer uri={fullscreenImg} onClose={() => setFullscreenImg(null)} />

      {/* ── Media gallery modal ── */}
      <Modal visible={showGallery} animationType="slide" onRequestClose={() => setShowGallery(false)}>
        <View style={[gal.root, { paddingTop: top + 10 }]}>
          <View style={gal.header}>
            <Text style={gal.title}>Shared Media</Text>
            <TouchableOpacity onPress={() => setShowGallery(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={WHITE} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={messages.filter((m) => !!(m.image ?? m.media_url))}
            numColumns={3}
            keyExtractor={(m, i) => String(m.message_id ?? i)}
            renderItem={({ item: m }) => {
              const uri = m.image ?? m.media_url;
              return (
                <TouchableOpacity onPress={() => { setShowGallery(false); setFullscreenImg(uri); }} activeOpacity={0.8}>
                  <Image source={{ uri }} style={gal.thumb} resizeMode="cover" />
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ padding: 2 }}
            ListEmptyComponent={<View style={gal.empty}><Text style={gal.emptyTxt}>No shared images yet</Text></View>}
          />
        </View>
      </Modal>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // Header
  header: {
    backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, gap: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: WHITE + '21', alignItems: 'center', justifyContent: 'center' },
  headerUser:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAv:     { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: ACCENT },
  headerName:   { fontSize: 15, fontWeight: '800', color: WHITE, fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System' },
  headerStatus: { fontSize: 11, color: WHITE + '8C', fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },

  listContent: { paddingHorizontal: 8, paddingVertical: 12 },

  // Day separator
  daySep:  { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 8, gap: 8 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BRAND + '30' },
  dayTxt:  { fontSize: 11, color: MUTED, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: CREAM, borderRadius: 10, overflow: 'hidden', fontWeight: '600' },

  // Bubble rows
  bubbleRow:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4 },
  bubbleRowMe:      { justifyContent: 'flex-end' },
  bubbleRowThem:    { justifyContent: 'flex-start' },
  bubbleRowFirst:   { marginTop: 8 },
  bubbleRowGrouped: { marginTop: 2 },

  avWrap:       { width: 32, alignItems: 'center', justifyContent: 'flex-end', marginRight: 6 },
  avWrapMe:     { width: 32, alignItems: 'center', justifyContent: 'flex-end', marginLeft: 6 },
  bubbleAv:     { width: 28, height: 28, borderRadius: 14 },
  avPlaceholder:{ width: 28, height: 28 }, // invisible spacer keeps alignment

  bubbleContent: { maxWidth: '72%' },
  bubble: {
    borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, overflow: 'hidden',
  },
  bubbleMe:          { backgroundColor: BUBBLE_ME, borderBottomRightRadius: 4 },
  bubbleThem:        { backgroundColor: BUBBLE_THEM, borderBottomLeftRadius: 4, shadowColor: BLACK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 1 },
  bubbleMeGrouped:   { borderTopRightRadius: 4 },
  bubbleThemGrouped: { borderTopLeftRadius: 4 },

  bubbleTxt:     { fontSize: 15, lineHeight: 22 },
  bubbleTxtMe:   { color: WHITE, fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  bubbleTxtThem: { color: DARK,  fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },

  bubbleMeta:     { flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingHorizontal: 2 },
  bubbleTime:     { fontSize: 10 },
  bubbleTimeMe:   { color: MUTED, textAlign: 'right',  fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  bubbleTimeThem: { color: MUTED, textAlign: 'left',   fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },

  bubbleImg:      { width: 210, height: 165, borderRadius: 13, marginBottom: 2 },
  imgPlaceholder: { width: 210, height: 165, borderRadius: 13, backgroundColor: WHITE + '18', alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 13 },
  mediaPill:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  mediaLbl:       { fontSize: 13 },

  voicePill:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, minWidth: 160 },
  voiceTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  voiceFill:  { height: '100%', borderRadius: 2 },

  // Scroll to bottom
  scrollBtn: {
    position: 'absolute', right: 14, bottom: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },

  // Input
  inputArea: {
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BRAND + '18',
    paddingTop: 8,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingBottom: 4, gap: 6,
  },
  iconBtn:  { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  inputWrap: {
    flex: 1, backgroundColor: CREAM, borderRadius: 22,
    borderWidth: 1, borderColor: BRAND + '20',
    paddingHorizontal: 14, paddingVertical: 9, maxHeight: 120,
  },
  input: { fontSize: 15, color: DARK, padding: 0, fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  sendBtnOff: { backgroundColor: BRAND + '60', shadowOpacity: 0 },

  // Reply banner
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CREAM, borderTopWidth: 1, borderTopColor: BRAND + '18',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  replyLine:   { width: 3, height: '100%', minHeight: 32, borderRadius: 2, backgroundColor: ACCENT },
  replyLabel:  { fontSize: 12, fontWeight: '700', color: ACCENT },
  replyPreview:{ fontSize: 12, color: MUTED, marginTop: 1 },
});

/* ─── Image viewer styles ─────────────────────────────────────────────────── */
const iv = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000E', justifyContent: 'center', alignItems: 'center' },
  img:      { width: '100%', height: '80%' },
  closeBtn: {
    position: 'absolute', top: 54, right: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
});

/* ─── Recording UI styles ────────────────────────────────────────────────── */
const rec = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.destructive, paddingHorizontal: 16, paddingVertical: 10,
  },
  ring: {
    position: 'absolute', left: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: WHITE + '22',
  },
  dur:  { color: WHITE, fontSize: 14, fontWeight: '700', minWidth: 40 },
  hint: { color: WHITE + 'BB', fontSize: 12 },
});

/* ─── Gallery styles ──────────────────────────────────────────────────────── */
const gal = StyleSheet.create({
  root:     { flex: 1, backgroundColor: BRAND },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  title:    { fontSize: 17, fontWeight: '700', color: WHITE },
  thumb:    { width: '33%', aspectRatio: 1, margin: 1, borderRadius: 4 },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTxt: { color: WHITE + '88', fontSize: 14 },
});

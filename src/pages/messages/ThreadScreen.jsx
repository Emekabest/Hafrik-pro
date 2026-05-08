import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TouchableWithoutFeedback,
  Image, TextInput, KeyboardAvoidingView, Platform, Modal,
  Animated, ActivityIndicator, Alert, Share, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import { useTheme } from '../../theme/ThemeContext';
import { Colors } from '../../theme';

const BASE_URL  = 'https://hafrik.com';
const BRAND     = Colors.primaryDark;
const ACCENT    = Colors.primary;
const CREAM     = Colors.surfaceTint;
const DARK      = Colors.black;
const MUTED     = Colors.secondaryText;
const WHITE     = Colors.white;
const BLACK     = Colors.black;
const RECV_BG   = '#f0f2f5';
const POLL_MS   = 3000;
const GROUP_GAP = 120_000;
const HAFRIK_REEL_RE = /https?:\/\/(?:www\.)?hafrik\.com\/reels\/(\d+)/i;
const HAFRIK_POST_RE = /https?:\/\/(?:www\.)?hafrik\.com\/posts\/(\d+)/i;

const getHafrikPostId = (text = '') => {
  const match = String(text || '').match(HAFRIK_REEL_RE) || String(text || '').match(HAFRIK_POST_RE);
  return match?.[1] ?? null;
};

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtTime = (raw) => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ''; }
};

const fmtDuration = (ms) => {
  const s = Math.floor((ms ?? 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`;
};

const resolveUrl = (raw) => {
  if (!raw) return null;
  const s = String(raw);
  return s.startsWith('http') ? s : `${BASE_URL}/${s}`;
};

const avatarUri = (u = {}, name = 'U') => {
  const raw = u.avatar ?? u.user_picture ?? u.profile_picture ?? null;
  const av  = resolveUrl(raw);
  if (av && !av.includes('blank_profile') && !av.includes('/default.')) return av;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=${BRAND.replace('#','')}&color=fff`;
};

const getDayLabel = (raw) => {
  if (!raw) return '';
  const d    = new Date(raw).toDateString();
  const now  = new Date().toDateString();
  const yday = new Date(Date.now() - 86400000).toDateString();
  if (d === now)  return 'Today';
  if (d === yday) return 'Yesterday';
  return d;
};

/* ─── Build grouped render list (oldest→newest; reversed for inverted FlatList) */
const buildRenderList = (messages, myId) => {
  const out = [];
  let lastDay = '', lastSid = null, lastTs = 0;

  for (let i = 0; i < messages.length; i++) {
    const m   = messages[i];
    const raw = m.time ?? m.created_at ?? '';
    const day = raw ? new Date(raw).toDateString() : '';

    if (day && day !== lastDay) {
      lastDay = day; lastSid = null; lastTs = 0;
      out.push({ _sep: true, key: `sep_${day}`, label: getDayLabel(raw) });
    }

    const sid     = String(m.sender_id ?? m.user_id ?? '');
    const ts      = raw ? new Date(raw).getTime() : 0;
    const grouped = lastSid === sid && (ts - lastTs) < GROUP_GAP;

    const next      = messages[i + 1];
    const nextSid   = next ? String(next.sender_id ?? next.user_id ?? '') : null;
    const nextTs    = next && (next.time ?? next.created_at) ? new Date(next.time ?? next.created_at).getTime() : 0;
    const nextDay   = next && (next.time ?? next.created_at) ? new Date(next.time ?? next.created_at).toDateString() : '';
    const lastInGrp = !next || nextSid !== sid || (nextTs - ts) >= GROUP_GAP || (nextDay && nextDay !== day);

    out.push({ ...m, _grouped: grouped, _lastInGroup: lastInGrp });
    lastSid = sid; lastTs = ts;
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

/* ─── Status ticks ───────────────────────────────────────────────────────── */
const StatusTick = ({ item, isMe, convSeen }) => {
  if (!isMe) return null;
  if (item._temp || item._uploading)
    return <Ionicons name="time-outline" size={11} color={MUTED} style={{ marginLeft: 3 }} />;
  if (convSeen)
    return <Ionicons name="checkmark-done" size={12} color={ACCENT} style={{ marginLeft: 3 }} />;
  return <Ionicons name="checkmark-done" size={12} color={MUTED} style={{ marginLeft: 3 }} />;
};

/* ─── Voice player ───────────────────────────────────────────────────────── */
const VoicePlayer = React.memo(({ url, isMe, uploading }) => {
  const [status,   setStatus]   = useState('idle'); // idle | loading | playing | paused
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef  = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  // Unload if url changes
  useEffect(() => {
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    if (mountedRef.current) { setStatus('idle'); setProgress(0); setDuration(0); }
  }, [url]);

  const onPlaybackStatus = useCallback((st) => {
    if (!mountedRef.current) return;
    if (!st.isLoaded) return;
    const dur = st.durationMillis ?? 0;
    const pos = st.positionMillis ?? 0;
    setDuration(dur);
    setProgress(dur > 0 ? pos / dur : 0);
    if (st.didJustFinish) {
      setStatus('idle');
      setProgress(0);
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (uploading || status === 'loading') return;
    try {
      if (status === 'playing') {
        await soundRef.current?.pauseAsync();
        if (mountedRef.current) setStatus('paused');
      } else if (status === 'paused' && soundRef.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        await soundRef.current.playAsync();
        if (mountedRef.current) setStatus('playing');
      } else {
        if (mountedRef.current) setStatus('loading');
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, progressUpdateIntervalMillis: 100 },
          onPlaybackStatus,
        );
        if (!mountedRef.current) { sound.unloadAsync(); return; }
        soundRef.current = sound;
        setStatus('playing');
      }
    } catch (_) {
      if (mountedRef.current) setStatus('idle');
    }
  }, [url, status, uploading, onPlaybackStatus]);

  const ic   = isMe ? WHITE : BRAND;
  const trk  = isMe ? WHITE + '33' : BRAND + '22';
  const fill = isMe ? WHITE + 'CC' : ACCENT;
  const durationStr = duration > 0 ? fmtDuration(duration) : '0:00';
  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={s.voicePill}>
      {uploading || isLoading
        ? <ActivityIndicator size="small" color={ic} style={{ width: 20 }} />
        : <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={ic} />
      }
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <View style={[s.voiceTrack, { backgroundColor: trk }]}>
          <View style={[s.voiceFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: fill }]} />
        </View>
      </View>
      <Text style={{ fontSize: 11, color: ic, opacity: 0.8, minWidth: 32, textAlign: 'right' }}>
        {durationStr}
      </Text>
    </TouchableOpacity>
  );
});

/* ─── Image with loading shimmer ────────────────────────────────────────── */
const ImageWithLoader = React.memo(({ uri, style }) => {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const onLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <View style={style}>
      {!loaded && (
        <Skel w={style?.width ?? '100%'} h={style?.height ?? 200} r={0} />
      )}
      <Animated.Image
        source={{ uri }}
        style={[style, { opacity, position: loaded ? 'relative' : 'absolute' }]}
        resizeMode="cover"
        onLoad={onLoad}
      />
    </View>
  );
});

/* ─── Translate helper ───────────────────────────────────────────────────── */
const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

/* ─── Bubble ─────────────────────────────────────────────────────────────── */
const Bubble = React.memo(({ item, isMe, otherAv, myAv, onLongPress, onImagePress, onOpenReel, convSeen }) => {
  const text      = item.message ?? item.message_text ?? item.text ?? '';
  const reelPostId = getHafrikPostId(text);
  const displayText = reelPostId
    ? text
        .replace(HAFRIK_REEL_RE, '')
        .replace(HAFRIK_POST_RE, '')
        .replace(/Sent you a reel on Hafrik/i, '')
        .trim()
    : text;
  const imgUrl    = resolveUrl(item.image ?? item.image_url ?? (item.media_type === 'image' ? item.media_url : null));
  const vidUrl    = resolveUrl(item.video ?? item.video_url ?? (item.media_type === 'video' ? item.media_url : null));
  const voiceUrl  = resolveUrl(item.voice_note ?? item.voice_url ?? item.audio_url ?? (item.media_type === 'voice' ? item.media_url : null));
  const timeStr   = fmtTime(item.time ?? item.created_at);
  const isTemp    = !!item._temp || !!item._uploading;
  const grouped   = !!item._grouped;
  const lastInGrp = item._lastInGroup !== false;
  const av        = isMe ? myAv : otherAv;
  const replyMsg  = item.reply_to_message ?? item.replied_message ?? null;

  const [xlText, setXlText] = useState('');
  const [xling,  setXling]  = useState(false);

  const handleTranslate = useCallback(async () => {
    if (xlText) { setXlText(''); return; }
    if (!displayText)  return;
    setXling(true);
    try {
      const params = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: 'en', dt: 't', q: displayText });
      const res  = await fetch(`${TRANSLATE_URL}?${params}`);
      const json = await res.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        setXlText(json[0].map(c => (Array.isArray(c) ? c[0] : '')).join(''));
      }
    } catch {}
    finally { setXling(false); }
  }, [displayText, xlText]);

  const avatarSlot = (
    <View style={isMe ? s.avSlotMe : s.avSlot}>
      {lastInGrp
        ? <Image source={{ uri: av }} style={s.bubbleAv} />
        : <View style={s.avPlaceholder} />}
    </View>
  );

  return (
    <TouchableOpacity activeOpacity={0.85} onLongPress={() => onLongPress(item)} delayLongPress={350}>
      <View style={[
        s.bubbleRow,
        isMe ? s.bubbleRowMe : s.bubbleRowThem,
        grouped ? s.bubbleRowGrouped : s.bubbleRowFirst,
      ]}>
        {!isMe && avatarSlot}

        <View style={[s.bubbleContent, isMe && { alignItems: 'flex-end' }]}>
          {/* Reply preview */}
          {replyMsg ? (
            <View style={[s.replyBox, isMe ? s.replyBoxMe : s.replyBoxThem]}>
              <View style={[s.replyBar, { backgroundColor: isMe ? WHITE + 'AA' : ACCENT }]} />
              <Text style={[s.replyBoxTxt, { color: isMe ? WHITE + 'CC' : MUTED }]} numberOfLines={1}>
                {replyMsg.message || 'Media'}
              </Text>
            </View>
          ) : null}

          <View style={[
            s.bubble,
            isMe ? s.bubbleMe : s.bubbleThem,
            isTemp && !item._uploading && { opacity: 0.7 },
            grouped && (isMe ? s.bubbleMeGrouped : s.bubbleThemGrouped),
          ]}>
            {/* Image */}
            {imgUrl ? (
              item._uploading ? (
                <View style={[s.bubbleImg, { backgroundColor: BRAND + '22', alignItems: 'center', justifyContent: 'center' }]}>
                  <ActivityIndicator color={isMe ? WHITE : ACCENT} size="large" />
                  <Text style={{ color: isMe ? WHITE + 'AA' : MUTED, fontSize: 11, marginTop: 6 }}>Sending…</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => onImagePress(imgUrl)} activeOpacity={0.9}>
                  <ImageWithLoader uri={imgUrl} style={s.bubbleImg} />
                </TouchableOpacity>
              )
            ) : null}

            {/* Video */}
            {vidUrl ? (
              <View style={s.mediaPill}>
                <Ionicons name="play-circle" size={30} color={isMe ? WHITE + 'CC' : BRAND} />
                <Text style={[s.mediaLbl, { color: isMe ? WHITE + 'B3' : MUTED }]}>Video</Text>
              </View>
            ) : null}

            {/* Voice */}
            {voiceUrl ? (
              <VoicePlayer url={voiceUrl} isMe={isMe} uploading={!!item._uploading} />
            ) : item._uploading && !imgUrl ? (
              <View style={s.voicePill}>
                <ActivityIndicator size="small" color={isMe ? WHITE : ACCENT} style={{ width: 20 }} />
                <Text style={{ color: isMe ? WHITE + 'AA' : MUTED, fontSize: 12, marginLeft: 10 }}>Sending voice…</Text>
              </View>
            ) : null}

            {/* Text */}
            {!!displayText && (
              <Text style={[s.bubbleTxt, isMe ? s.bubbleTxtMe : s.bubbleTxtThem]}>{displayText}</Text>
            )}

            {!!reelPostId && (
              <TouchableOpacity
                style={[s.reelLinkCard, isMe ? s.reelLinkCardMe : s.reelLinkCardThem]}
                activeOpacity={0.84}
                onPress={() => onOpenReel?.(reelPostId)}
              >
                <LinearGradient
                  colors={isMe ? [WHITE + '2E', WHITE + '18'] : [ACCENT + '20', BRAND + '10']}
                  style={s.reelLinkIcon}
                >
                  <Ionicons name="play" size={18} color={isMe ? WHITE : ACCENT} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.reelLinkTitle, isMe ? s.reelLinkTitleMe : s.reelLinkTitleThem]}>
                    Hafrik Reel
                  </Text>
                  <Text style={[s.reelLinkSub, isMe ? s.reelLinkSubMe : s.reelLinkSubThem]}>
                    Tap to watch in Reels
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isMe ? WHITE + 'BB' : MUTED} />
              </TouchableOpacity>
            )}

            {/* Translate */}
            {!!displayText && (
              <View>
                <TouchableOpacity onPress={handleTranslate} activeOpacity={0.7} style={s.xlBtn}>
                  {xling
                    ? <ActivityIndicator size={10} color={isMe ? WHITE + 'BB' : ACCENT} />
                    : <Ionicons name="language-outline" size={11} color={isMe ? WHITE + 'BB' : ACCENT} />}
                  <Text style={[s.xlBtnTxt, isMe ? s.xlBtnTxtMe : s.xlBtnTxtThem]}>
                    {xling ? 'Translating…' : xlText ? 'See original' : 'Translate'}
                  </Text>
                </TouchableOpacity>
                {!!xlText && (
                  <View style={[s.xlBox, isMe ? s.xlBoxMe : s.xlBoxThem]}>
                    <Text style={[s.xlText, isMe ? s.xlTextMe : s.xlTextThem]}>{xlText}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {lastInGrp && (
            <View style={[s.metaRow, isMe && { justifyContent: 'flex-end' }]}>
              <Text style={s.metaTime}>{isTemp ? 'Sending' : timeStr}</Text>
              <StatusTick item={item} isMe={isMe} convSeen={convSeen} />
            </View>
          )}
        </View>

        {isMe && avatarSlot}
      </View>
    </TouchableOpacity>
  );
});

/* ─── Day separator ──────────────────────────────────────────────────────── */
const DaySep = ({ label }) => (
  <View style={s.daySep}>
    <View style={s.dayLine} />
    <Text style={s.dayTxt}>{label}</Text>
    <View style={s.dayLine} />
  </View>
);

/* ─── Typing dots ────────────────────────────────────────────────────────── */
const TypingDots = ({ av }) => {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 150),
      Animated.timing(v, { toValue: -5, duration: 200, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0,  duration: 200, useNativeDriver: true }),
      Animated.delay(500),
    ])));
    Animated.parallel(anims).start();
  }, []);
  return (
    <View style={[s.bubbleRow, s.bubbleRowThem, s.bubbleRowFirst]}>
      <View style={s.avSlot}><Image source={{ uri: av }} style={s.bubbleAv} /></View>
      <View style={[s.bubble, s.bubbleThem, { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12 }]}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: MUTED, transform: [{ translateY: d }] }} />
        ))}
      </View>
    </View>
  );
};

/* ─── Image fullscreen viewer ────────────────────────────────────────────── */
const ImageViewer = ({ uri, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uri) { setLoaded(false); opacity.setValue(0); }
  }, [uri]);

  const onLoad = useCallback(() => {
    setLoaded(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={iv.backdrop}>
        <TouchableOpacity style={iv.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={WHITE} />
        </TouchableOpacity>
        {uri && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Thumbnail shown immediately from cache while full image renders */}
            <Image
              source={{ uri }}
              style={iv.img}
              resizeMode="contain"
              blurRadius={loaded ? 0 : 4}
            />
            {/* Full-res overlay fades in */}
            <Animated.Image
              source={{ uri }}
              style={[iv.img, { position: 'absolute', opacity }]}
              resizeMode="contain"
              onLoad={onLoad}
            />
            {!loaded && (
              <ActivityIndicator
                color={WHITE}
                size="large"
                style={{ position: 'absolute' }}
              />
            )}
          </View>
        )}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} />
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

/* ─── Recording pulse ────────────────────────────────────────────────────── */
const RecordingPulse = ({ duration }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.4, duration: 400, useNativeDriver: true }),
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

/* ─── Main screen ────────────────────────────────────────────────────────── */
export default function ThreadScreen() {
  const navigation      = useNavigation();
  const route           = useRoute();
  const { top }         = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc }  = useTheme();
  const refreshBadges   = useStore((st) => st.refreshBadges);
  const setMessageCount = useStore((st) => st.setMessageCount);
  const messageCount    = useStore((st) => st.messageCount);
  const userAvatar      = useStore((st) => st.userAvatar);

  const { conversationId, otherUser = {} } = route.params ?? {};

  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [text,         setText]         = useState('');
  const [otherTyping,  setOtherTyping]  = useState(false);
  const [fullscreenImg,setFullscreenImg]= useState(null);
  const [showScrollBtn,setShowScrollBtn]= useState(false);
  const [isRecording,  setIsRecording]  = useState(false);
  const [recordMs,     setRecordMs]     = useState(0);
  const [replyTo,      setReplyTo]      = useState(null);
  const [isOnline,     setIsOnline]     = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [showGallery,  setShowGallery]  = useState(false);
  const [convSeen,     setConvSeen]     = useState(false);

  const flatRef      = useRef(null);
  const pollRef      = useRef(null);
  const recordingRef = useRef(null);
  const recordTimer  = useRef(null);
  const typingTimer  = useRef(null);
  const myId         = user?.id ?? user?.user_id ?? null;

  const otherName = otherUser.full_name ?? otherUser.name ?? otherUser.username ?? otherUser.user_name ?? 'User';
  const otherAv   = avatarUri(otherUser, otherName);
  const myName    = user?.username ?? user?.full_name ?? 'Me';
  const myAv      = userAvatar || avatarUri(user ?? {}, myName);

  /* ── Load messages (page 1) ──────────────────────────────────────────── */
  const load = useCallback(async (silent = false) => {
    const res  = await api(`/api/v1/messages/get.php?conversation_id=${conversationId}&page=1&limit=30`, token);
    const list = Array.isArray(res?.data) ? res.data : [];

    setMessages((prev) => {
      const tempMsgs     = prev.filter((m) => m._temp || m._uploading);
      const confirmedIds = new Set(list.map((m) => String(m.message_id ?? m.id)));
      const kept         = tempMsgs.filter((m) => !confirmedIds.has(String(m.message_id ?? m.id)));
      return [...list, ...kept];
    });

    // Prefetch all image URLs so they are cached before user taps them
    list.forEach((m) => {
      const imgUrl = m.image ?? m.image_url ?? (m.media_type === 'image' ? m.media_url : null);
      if (imgUrl) {
        const full = imgUrl.startsWith('http') ? imgUrl : `${BASE_URL}/${imgUrl}`;
        Image.prefetch(full).catch(() => {});
      }
    });

    setOtherTyping((res?.typing ?? 0) === 1);
    setConvSeen(!!(res?.seen));
    setPage(1);
    setHasMore(list.length >= 30);
    if (!silent) { setLoading(false); setRefreshing(false); }
  }, [conversationId, token]);

  /* ── Load older messages (infinite scroll) ───────────────────────────── */
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
        const newer = list.filter((m) => !existingIds.has(String(m.message_id ?? m.id)));
        return [...newer, ...prev];
      });
      setPage(nextPage);
      setHasMore(list.length >= 30);
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, conversationId, token]);

  /* ── Mark seen ───────────────────────────────────────────────────────── */
  const markSeen = useCallback(async () => {
    // Immediately decrement badge — don't wait for server
    setMessageCount((prev) => Math.max(0, (prev ?? 1) - 1));
    try {
      await fetch(`${BASE_URL}/api/v1/messages/mark-seen.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `conversation_id=${encodeURIComponent(conversationId)}`,
      });
    } catch (_) {}
    // Delay refresh so backend has time to process before we re-fetch count
    setTimeout(() => refreshBadges(token), 3000);
  }, [conversationId, token, refreshBadges, setMessageCount]);

  /* ── Init ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    load();
    markSeen();
    pollRef.current = setInterval(() => load(true), POLL_MS);

    const otherId = otherUser.id ?? otherUser.user_id;
    if (otherId) {
      const checkOnline = async () => {
        const res = await api(`/api/v1/messages/online.php?user_id=${otherId}`, token);
        setIsOnline(res?.data?.online === 1 || res?.online === 1);
      };
      checkOnline();
      const onlineInterval = setInterval(checkOnline, 30000);
      return () => { clearInterval(pollRef.current); clearInterval(onlineInterval); };
    }
    return () => clearInterval(pollRef.current);
  }, []);

  /* ── Typing indicator ────────────────────────────────────────────────── */
  const handleTextChange = useCallback((val) => {
    setText(val);
    if (val.trim()) {
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

  /* ── Upload helper ───────────────────────────────────────────────────── */
  const uploadMedia = useCallback(async (uri, name, type, mediaType = 'photo') => {
    const fd = new FormData();
    fd.append('file', { uri, name, type });
    fd.append('type', mediaType);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/uploads/media.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const raw = await res.text();
      console.log('[uploadMedia] status:', res.status, '| body:', raw);
      let data = null;
      try { data = JSON.parse(raw); } catch { return null; }
      return data?.data?.url ?? data?.data?.path ?? data?.url ?? data?.path ?? null;
    } catch (e) {
      console.log('[uploadMedia] error:', e);
      return null;
    }
  }, [token]);

  /* ── Send text ───────────────────────────────────────────────────────── */
  const sendMessage = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);
    clearTimeout(typingTimer.current);

    const tempId = `tmp_${Date.now()}`;
    setMessages((prev) => [...prev, {
      message_id: tempId, id: tempId, _temp: true,
      sender_id: myId, user_id: myId,
      message: msg, time: new Date().toISOString(),
      ...(replyTo ? { reply_to_message: { message: replyTo.message } } : {}),
    }]);
    const savedReply = replyTo;
    setReplyTo(null);

    const replyParam = savedReply?.message_id ? `&reply_to=${encodeURIComponent(savedReply.message_id)}` : '';
    const body = `conversation_id=${encodeURIComponent(conversationId)}&message=${encodeURIComponent(msg)}${replyParam}`;

    console.log('[sendMessage] →', {
      url: `${BASE_URL}/api/v1/messages/send.php`,
      conversationId,
      message: msg,
      body,
      token: token ? token.slice(0, 20) + '…' : 'MISSING',
    });

    try {
      const rawRes = await fetch(`${BASE_URL}/api/v1/messages/send.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const rawText = await rawRes.text();
      console.log('[sendMessage] ← status:', rawRes.status, '| raw:', rawText);
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
        console.log('[sendMessage] ← parsed:', parsed);
      } catch {
        console.warn('[sendMessage] response is not JSON');
      }
      const sent = parsed?.data ?? null;
      setMessages((prev) => prev.map((m) =>
        (m.message_id === tempId || m.id === tempId)
          ? sent ? { ...sent, _temp: false } : { ...m, _temp: false }
          : m
      ));
    } catch (err) {
      console.error('[sendMessage] fetch error:', err);
      setMessages((prev) => prev.map((m) =>
        (m.message_id === tempId || m.id === tempId) ? { ...m, _temp: false } : m
      ));
    }

    setSending(false);
    load(true);
    refreshBadges(token);
  }, [text, sending, myId, conversationId, token, replyTo, load, refreshBadges]);

  /* ── Send image ──────────────────────────────────────────────────────── */
  const pickAndSendImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset  = result.assets[0];
    const tempId = `tmp_img_${Date.now()}`;

    setMessages((prev) => [...prev, {
      message_id: tempId, id: tempId, _temp: true, _uploading: true,
      sender_id: myId, user_id: myId,
      image: asset.uri, time: new Date().toISOString(),
    }]);

    const imageUrl = await uploadMedia(asset.uri, 'image.jpg', 'image/jpeg', 'photo');
    if (!imageUrl) {
      setMessages((prev) => prev.filter((m) => m.message_id !== tempId && m.id !== tempId));
      Alert.alert('Upload failed', 'Could not upload image. Please try again.');
      return;
    }
    console.log('[sendImage] imageUrl:', imageUrl);

    const sendRes = await fetch(`${BASE_URL}/api/v1/messages/send-image.php`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `conversation_id=${encodeURIComponent(conversationId)}&image=${encodeURIComponent(imageUrl)}`,
    });
    const sendRaw = await sendRes.text();
    console.log('[sendImage] send-image.php response:', sendRaw);

    setMessages((prev) => prev.map((m) =>
      (m.message_id === tempId || m.id === tempId)
        ? { ...m, _uploading: false, _temp: false, image: imageUrl }
        : m
    ));
    load(true);
    refreshBadges(token);
  }, [myId, conversationId, token, uploadMedia, load, refreshBadges]);

  /* ── Voice recording ─────────────────────────────────────────────────── */
  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access in Settings to send voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
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
      const uri = recordingRef.current.getURI();
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setRecordMs(0);
      if (!uri) return;

      const tempId = `tmp_voice_${Date.now()}`;
      setMessages((prev) => [...prev, {
        message_id: tempId, id: tempId, _temp: true, _uploading: true,
        sender_id: myId, user_id: myId,
        voice_note: uri, time: new Date().toISOString(),
      }]);

      const fd = new FormData();
      fd.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' });
      fd.append('type', 'photo');
      const uploadRes = await fetch(`${BASE_URL}/api/v1/uploads/media.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const uploadRaw = await uploadRes.text();
      console.log('[sendVoice] upload response:', uploadRaw);
      let uploadData = null;
      try { uploadData = JSON.parse(uploadRaw); } catch { /* not JSON */ }
      const voiceUrl = uploadData?.data?.url ?? uploadData?.data?.path ?? uploadData?.url ?? uploadData?.path ?? null;

      if (!voiceUrl) {
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        Alert.alert('Upload failed', 'Could not upload voice message. Please try again.');
        return;
      }
      console.log('[sendVoice] voiceUrl:', voiceUrl);

      const sendRes = await fetch(`${BASE_URL}/api/v1/messages/send-voice.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `conversation_id=${encodeURIComponent(conversationId)}&voice_note=${encodeURIComponent(voiceUrl)}`,
      });
      const sendRaw = await sendRes.text();
      console.log('[sendVoice] send-voice.php response:', sendRaw);

      setMessages((prev) => prev.map((m) =>
        m.message_id === tempId
          ? { ...m, _uploading: false, _temp: false, voice_note: voiceUrl }
          : m
      ));
      load(true);
      refreshBadges(token);
    } catch (e) {
      console.log('[sendVoice] error:', e);
      recordingRef.current = null;
      setRecordMs(0);
      setMessages((prev) => prev.filter((m) => !m.message_id?.toString().startsWith('tmp_voice_')));
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    }
  }, [myId, conversationId, token, load, refreshBadges]);

  /* ── Long press menu ─────────────────────────────────────────────────── */
  const handleLongPress = useCallback((item) => {
    Vibration.vibrate(30);
    const msgId  = item.message_id ?? item.id;
    const isMine = myId != null && String(item.sender_id ?? item.user_id) === String(myId);
    const txt    = item.message ?? item.message_text ?? item.text ?? '';
    const opts   = [];

    opts.push({ text: 'Reply', onPress: () => setReplyTo({
      message_id: msgId, message: txt,
      user_name: item.user_name ?? (isMine ? 'You' : otherName),
    })});
    if (txt) opts.push({ text: 'Copy', onPress: () => Share.share({ message: txt }) });
    if (isMine) opts.push({
      text: 'Delete', style: 'destructive',
      onPress: () => {
        setMessages((prev) => prev.filter((m) => (m.message_id ?? m.id) !== msgId));
        api('/api/v1/messages/delete-message.php', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `message_id=${encodeURIComponent(msgId)}`,
        });
      },
    });
    opts.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, opts);
  }, [myId, token, otherName]);

  const handleOpenReel = useCallback((postId) => {
    if (!postId) return;
    navigation.navigate('Reels2', {
      mode: 'discover',
      initialReelId: Number(postId),
    });
  }, [navigation]);

  /* ── Scroll (inverted: y=0 is the bottom / newest) ───────────────────── */
  const onScroll = useCallback((e) => {
    setShowScrollBtn(e.nativeEvent.contentOffset.y > 220);
  }, []);

  const scrollToBottom = () => flatRef.current?.scrollToOffset({ offset: 0, animated: true });

  /* ── Render list (reversed for inverted FlatList) ────────────────────── */
  const renderList = useMemo(() => {
    const built = buildRenderList(messages, myId);
    return [...built].reverse();
  }, [messages, myId]);

  const renderItem = useCallback(({ item }) => {
    if (item._sep) return <DaySep label={item.label} />;
    const senderId = item.sender_id ?? item.user_id ?? null;
    const isMe     = myId != null && senderId != null && String(senderId) === String(myId);
    return (
      <Bubble
        item={item} isMe={isMe}
        otherAv={otherAv} myAv={myAv}
        onLongPress={handleLongPress}
        onImagePress={setFullscreenImg}
        onOpenReel={handleOpenReel}
        convSeen={convSeen}
      />
    );
  }, [myId, otherAv, myAv, handleLongPress, handleOpenReel, convSeen]);

  const hasText = text.trim().length > 0;
  const sharedMedia = useMemo(() => messages
    .map((m) => {
      const uri = resolveUrl(m.image ?? m.image_url ?? (m.media_type === 'image' ? m.media_url : null));
      if (!uri) return null;
      return {
        id: String(m.message_id ?? m.id ?? uri),
        uri,
        time: m.time ?? m.created_at,
      };
    })
    .filter(Boolean), [messages]);

  return (
    <View style={[s.root, { backgroundColor: '#EEF7F7' }]}>

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#10545B', ACCENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: top + 8 }]}
      >
        <View style={s.headerGlowOne} pointerEvents="none" />
        <View style={s.headerGlowTwo} pointerEvents="none" />
        <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.headerInfo}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('UserProfile', {
            userId: otherUser.id ?? otherUser.user_id, username: otherName,
          })}
        >
          <View style={s.headerAvWrap}>
            <Image source={{ uri: otherAv }} style={s.headerAv} />
            <View style={[s.headerPresence, isOnline && s.headerPresenceOn]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
            <View style={s.headerStatusRow}>
              <View style={[s.statusDot, otherTyping || isOnline ? s.statusDotOn : null]} />
              <Text style={s.headerSub}>
                {otherTyping ? 'typing…' : isOnline ? 'Online now' : 'Active recently'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerBtn} activeOpacity={0.8} onPress={() => setShowGallery(true)}>
            <Ionicons name="images-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Chat body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading ? (
          <View style={s.skeletonWrap}>
            {[80, 55, 70, 45, 90].map((w, i) => (
              <Skel key={i} w={`${w}%`} h={44} r={18} alignSelf={i % 2 === 0 ? 'flex-end' : 'flex-start'} />
            ))}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatRef}
              data={renderList}
              inverted
              keyExtractor={(item, i) => item._sep ? item.key : String(item.message_id ?? item.id ?? i)}
              renderItem={renderItem}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={100}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListHeaderComponent={otherTyping ? <TypingDots av={otherAv} /> : null}
              ListFooterComponent={loadingMore ? <ActivityIndicator color={ACCENT} style={{ padding: 16 }} /> : null}
            />

            {showScrollBtn && (
              <TouchableOpacity style={s.scrollBtn} onPress={scrollToBottom} activeOpacity={0.85}>
                <Ionicons name="chevron-down" size={20} color={WHITE} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recording banner */}
        {isRecording && <RecordingPulse duration={recordMs} />}

        {/* Reply banner */}
        {replyTo && (
          <View style={s.replyBanner}>
            <View style={s.replyBannerBar} />
            <View style={{ flex: 1 }}>
              <Text style={s.replyBannerName}>{replyTo.user_name}</Text>
              <Text style={s.replyBannerMsg} numberOfLines={1}>{replyTo.message || 'Media'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[s.inputArea, { paddingBottom: Platform.OS === 'ios' ? 12 : 8 }]}>
          <View style={s.inputRow}>
            <TouchableOpacity style={s.inputIconBtn} onPress={pickAndSendImage} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={22} color={ACCENT} />
            </TouchableOpacity>

            <TextInput
              style={s.input}
              placeholder="Message"
              placeholderTextColor={MUTED}
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={2000}
              selectionColor={ACCENT}
            />

            {hasText ? (
              <TouchableOpacity
                style={[s.sendBtn, sending && { opacity: 0.6 }]}
                onPress={sendMessage}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <Ionicons name="send" size={18} color={WHITE} />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.sendBtn, isRecording && { backgroundColor: '#e53935' }]}
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

      {/* Fullscreen image viewer */}
      <ImageViewer uri={fullscreenImg} onClose={() => setFullscreenImg(null)} />

      {/* Media gallery */}
      <Modal visible={showGallery} animationType="slide" onRequestClose={() => setShowGallery(false)}>
        <View style={gal.root}>
          <LinearGradient
            colors={[BRAND, '#10545B', ACCENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[gal.header, { paddingTop: top + 12 }]}
          >
            <View>
              <Text style={gal.kicker}>CHAT GALLERY</Text>
              <Text style={gal.title}>Shared Media</Text>
              <Text style={gal.sub}>{sharedMedia.length} image{sharedMedia.length === 1 ? '' : 's'} shared with {otherName}</Text>
            </View>
            <TouchableOpacity style={gal.closeBtn} onPress={() => setShowGallery(false)} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
              <Ionicons name="close" size={21} color={WHITE} />
            </TouchableOpacity>
          </LinearGradient>
          <FlatList
            data={sharedMedia}
            numColumns={3}
            keyExtractor={(m, i) => `${m.id}-${i}`}
            renderItem={({ item: m, index }) => {
              return (
                <TouchableOpacity
                  style={gal.tile}
                  onPress={() => { setShowGallery(false); setFullscreenImg(m.uri); }}
                  activeOpacity={0.86}
                >
                  <Image source={{ uri: m.uri }} style={gal.thumb} resizeMode="cover" />
                  {index < 3 && (
                    <LinearGradient colors={['transparent', '#00000066']} style={gal.tileScrim}>
                      <Text style={gal.tileTxt}>Recent</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={sharedMedia.length ? gal.grid : { flex: 1 }}
            ListEmptyComponent={
              <View style={gal.empty}>
                <View style={gal.emptyIcon}>
                  <Ionicons name="images-outline" size={40} color={ACCENT} />
                </View>
                <Text style={gal.emptyTitle}>No shared images yet</Text>
                <Text style={gal.emptyTxt}>Images you send or receive in this chat will appear here.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 14, gap: 4,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    elevation: 8,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20, shadowRadius: 18,
    overflow: 'hidden',
  },
  headerGlowOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: WHITE + '12',
    top: -72,
    right: -48,
  },
  headerGlowTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: ACCENT + '28',
    bottom: -46,
    left: -34,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHITE + '1F',
    borderWidth: 1,
    borderColor: WHITE + '22',
  },
  headerInfo:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 5 },
  headerAvWrap: { position: 'relative' },
  headerAv:    { width: 42, height: 42, borderRadius: 16, borderWidth: 2, borderColor: WHITE + '45' },
  headerPresence: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    right: -1,
    bottom: 1,
    backgroundColor: '#94A3B8',
    borderWidth: 2,
    borderColor: BRAND,
  },
  headerPresenceOn: { backgroundColor: '#22C55E' },
  headerName:  { fontSize: 16, fontWeight: '900', color: WHITE, letterSpacing: -0.2 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE + '55' },
  statusDotOn: { backgroundColor: '#22C55E' },
  headerSub:   { fontSize: 11.5, color: WHITE + 'B8', fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  skeletonWrap: { flex: 1, padding: 20, gap: 16 },
  listContent:  { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 12 },

  // Day separator
  daySep:  { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 8, gap: 10 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BRAND + '22' },
  dayTxt:  { fontSize: 11, fontWeight: '900', color: BRAND, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: WHITE, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.2 },

  // Bubble rows
  bubbleRow:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 2 },
  bubbleRowMe:      { justifyContent: 'flex-end' },
  bubbleRowThem:    { justifyContent: 'flex-start' },
  bubbleRowFirst:   { marginTop: 10 },
  bubbleRowGrouped: { marginTop: 2 },

  avSlot:       { width: 34, alignItems: 'center', justifyContent: 'flex-end', marginRight: 4 },
  avSlotMe:     { width: 34, alignItems: 'center', justifyContent: 'flex-end', marginLeft: 4 },
  bubbleAv:     { width: 30, height: 30, borderRadius: 12 },
  avPlaceholder:{ width: 30, height: 30 },

  bubbleContent:    { maxWidth: '76%' },
  bubble:           { borderRadius: 21, paddingHorizontal: 13, paddingVertical: 9, overflow: 'hidden' },
  bubbleMe:         { backgroundColor: BRAND, borderBottomRightRadius: 6 },
  bubbleThem:       { backgroundColor: WHITE, borderBottomLeftRadius: 6, shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: BRAND + '0D' },
  bubbleMeGrouped:  { borderTopRightRadius: 8 },
  bubbleThemGrouped:{ borderTopLeftRadius: 8 },

  bubbleTxt:    { fontSize: 15.2, lineHeight: 22 },
  bubbleTxtMe:  { color: WHITE },
  bubbleTxtThem:{ color: DARK },
  reelLinkCard: {
    minWidth: 214,
    maxWidth: 248,
    marginTop: 2,
    borderRadius: 17,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reelLinkCardMe: {
    backgroundColor: WHITE + '17',
    borderWidth: 1,
    borderColor: WHITE + '1F',
  },
  reelLinkCardThem: {
    backgroundColor: BRAND + '08',
    borderWidth: 1,
    borderColor: BRAND + '18',
  },
  reelLinkIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelLinkTitle: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  reelLinkTitleMe: {
    color: WHITE,
  },
  reelLinkTitleThem: {
    color: BRAND,
  },
  reelLinkSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  reelLinkSubMe: {
    color: WHITE + 'B8',
  },
  reelLinkSubThem: {
    color: MUTED,
  },

  metaRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 4 },
  metaTime: { fontSize: 10.5, color: MUTED, fontWeight: '700' },

  // Reply inside bubble
  replyBox:     { flexDirection: 'row', borderRadius: 10, marginBottom: 4, padding: 6, gap: 6, overflow: 'hidden' },
  replyBoxMe:   { backgroundColor: WHITE + '18' },
  replyBoxThem: { backgroundColor: BRAND + '12' },
  replyBar:     { width: 3, borderRadius: 2 },
  replyBoxTxt:  { fontSize: 12, flex: 1 },

  // Translate inside bubble
  xlBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  xlBtnTxt:     { fontSize: 11, fontWeight: '600' },
  xlBtnTxtMe:   { color: WHITE + 'BB' },
  xlBtnTxtThem: { color: ACCENT },
  xlBox:        { marginTop: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  xlBoxMe:      { backgroundColor: WHITE + '18' },
  xlBoxThem:    { backgroundColor: BRAND + '10' },
  xlText:       { fontSize: 13.5, lineHeight: 19 },
  xlTextMe:     { color: WHITE + 'DD' },
  xlTextThem:   { color: DARK },

  bubbleImg:     { width: 218, height: 172, borderRadius: 16, marginBottom: 2 },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 12 },
  mediaPill:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  mediaLbl:      { fontSize: 13 },
  voicePill:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, minWidth: 160 },
  voiceTrack:    { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  voiceFill:     { height: '100%', borderRadius: 2 },

  // Scroll to bottom
  scrollBtn: {
    position: 'absolute', right: 16, bottom: 14,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },

  // Reply banner (above input)
  replyBanner:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BRAND + '12', paddingHorizontal: 14, paddingVertical: 10 },
  replyBannerBar: { width: 3, minHeight: 32, borderRadius: 2, backgroundColor: ACCENT },
  replyBannerName:{ fontSize: 12, fontWeight: '700', color: ACCENT },
  replyBannerMsg: { fontSize: 12, color: MUTED, marginTop: 1 },

  // Input
  inputArea: {
    backgroundColor: WHITE,
    borderTopWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 10,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 10,
  },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputIconBtn: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 1, backgroundColor: ACCENT + '12' },
  input: {
    flex: 1, backgroundColor: '#EEF7F7', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15, color: DARK, maxHeight: 112,
    borderWidth: 1,
    borderColor: BRAND + '0D',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 16, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 1,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
});

/* ─── Image viewer styles ────────────────────────────────────────────────── */
const iv = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000D', justifyContent: 'center', alignItems: 'center' },
  img:      { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 54, right: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
});

/* ─── Recording styles ───────────────────────────────────────────────────── */
const rec = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#e53935', paddingHorizontal: 16, paddingVertical: 10 },
  ring: { position: 'absolute', left: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: WHITE + '22' },
  dur:  { color: WHITE, fontSize: 14, fontWeight: '700', minWidth: 40 },
  hint: { color: WHITE + 'BB', fontSize: 12 },
});

/* ─── Gallery styles ─────────────────────────────────────────────────────── */
const gal = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#EEF7F7' },
  header:   {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  kicker:   { fontSize: 9, fontWeight: '900', color: WHITE + 'B8', letterSpacing: 2.2, marginBottom: 4 },
  title:    { fontSize: 25, fontWeight: '900', color: WHITE, letterSpacing: -0.5 },
  sub:      { fontSize: 12.5, color: WHITE + 'B8', fontWeight: '700', marginTop: 4, maxWidth: 260 },
  closeBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: WHITE + '24' },
  grid:     { padding: 10, paddingBottom: 34 },
  tile:     { width: '33.333%', aspectRatio: 1, padding: 3 },
  thumb:    { width: '100%', height: '100%', borderRadius: 16, backgroundColor: BRAND + '18' },
  tileScrim:{ position: 'absolute', left: 3, right: 3, bottom: 3, height: 42, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, justifyContent: 'flex-end', padding: 7 },
  tileTxt:  { fontSize: 10, fontWeight: '900', color: WHITE },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 12 },
  emptyIcon:{ width: 96, height: 96, borderRadius: 32, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ACCENT + '18' },
  emptyTitle:{ fontSize: 18, fontWeight: '900', color: BRAND },
  emptyTxt: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

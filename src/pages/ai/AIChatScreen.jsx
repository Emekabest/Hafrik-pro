/**
 * Hafrik AI
 * ----------
 * Mobile ChatGPT-style assistant. The app calls Hafrik's backend proxy endpoint
 * instead of calling OpenAI directly, so API keys stay off the device.
 */
import React, {
  memo, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import apiClient from '../../api/apiClient';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';
import PostFeedController from '../../controllers/postfeedcontroller';
import useStore from '../../repository/store';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const TEAL = Colors.tealAccent ?? '#20B9B4';
const BG = '#F3F8F8';
const WHITE = Colors.white;
const TEXT = Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = Colors.borderCool ?? '#DCEAEA';

const CHATGPT_API = '/ai/chat.php';
const SEARCH_API = '/search/index.php';
const STORAGE_PREFIX = 'hafrik_ai_conversations_v1';
const POST_INSIGHT_PROMPT = 'Explain this post in very short plain words. Use maximum 3 bullets. Then add "Reply ideas:" with 4 different short replies the user can choose from. Each reply must be under 18 words. Keep everything compact.';
const PRODUCT_INSIGHT_PROMPT = 'Explain this Hafrik Shop product properly for a buyer. Include what the product is, useful features from the description, available options or variations, stock/price notes, what to check before buying, and a practical recommendation. Use clear sections and helpful detail, but stay easy to read.';

const getVoiceModule = () => {
  if (!NativeModules?.Voice) return null;
  try {
    // Lazy-load so older dev builds without the native module do not crash at startup.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const voicePackage = require('@react-native-voice/voice');
    return voicePackage?.default ?? voicePackage;
  } catch {
    return null;
  }
};

const MODES = [
  { key: 'hafrik', icon: 'sparkles-outline', label: 'Hafrik', hint: 'Platform help', color: BRAND },
  { key: 'china', icon: 'earth-outline', label: 'China', hint: 'Travel & life', color: '#0EA5A3' },
  { key: 'business', icon: 'storefront-outline', label: 'Business', hint: 'Trade ideas', color: '#D97706' },
  { key: 'study', icon: 'school-outline', label: 'Study', hint: 'Admissions', color: '#6366F1' },
];

const SUGGESTIONS = [
  { icon: 'compass-outline', label: 'Explore Hafrik', text: 'What can I do with Hafrik?' },
  { icon: 'people-outline', label: 'Find people', text: 'Help me find useful communities' },
  { icon: 'storefront-outline', label: 'China shop', text: 'How can I buy and ship goods from China?' },
  { icon: 'school-outline', label: 'Study route', text: 'Explain scholarship and self-sponsored study routes' },
  { icon: 'airplane-outline', label: 'Travel plan', text: 'Plan my first trip to Guangzhou' },
  { icon: 'language-outline', label: 'Translate', text: 'Translate this into simple Chinese: I want to buy this item' },
];

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi, I am Hafrik AI. Ask me about Hafrik, China life, business, study, shipping, or anything you are trying to figure out.',
  meta: 'Powered by Hafrik AI',
};

const normalizeSearchItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.data?.results)) return raw.data.results;
  return [];
};

const buildContext = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '';

  return items.slice(0, 8).map((item) => {
    const type = item?.type ?? item?.result_type ?? 'item';
    const title = item?.title ?? item?.name ?? item?.full_name ?? item?.username ?? 'Untitled';
    const body = item?.description ?? item?.bio ?? item?.text ?? item?.content ?? '';
    return `${type}: ${title}${body ? ` - ${String(body).replace(/\s+/g, ' ').slice(0, 160)}` : ''}`;
  }).join('\n');
};

const buildAttachedContextText = (ctx) => {
  if (!ctx?.type || !ctx?.data) return '';
  if (ctx.type === 'post') {
    const d = ctx.data;
    return [
      'Attached Hafrik post:',
      `Post ID: ${ctx.id ?? d.post_id ?? ''}`,
      `Type: ${d.type ?? 'post'}`,
      `Author: ${d.author ?? d.username ?? 'Unknown'}`,
      d.context?.title ? `Posted in: ${d.context.title}` : '',
      d.text ? `Text: ${String(d.text).slice(0, 2500)}` : '',
      d.payload?.title ? `Payload title: ${d.payload.title}` : '',
      `Stats: ${Number(d.likes_count ?? 0)} likes, ${Number(d.comments_count ?? 0)} comments, ${Number(d.views ?? 0)} views`,
    ].filter(Boolean).join('\n');
  }
  if (ctx.type === 'product') {
    const d = ctx.data;
    return [
      'Attached Hafrik marketplace product:',
      `Product ID: ${ctx.id ?? d.product_id ?? ''}`,
      `Title: ${d.title ?? ''}`,
      d.description ? `Description: ${String(d.description).slice(0, 2500)}` : '',
      `Price: ${d.price ?? ''} ${d.currency ?? ''}`,
      `Stock: ${d.in_stock ? 'In stock' : 'Out of stock'}`,
      `Rating: ${d.rating ?? 0} from ${d.review_count ?? 0} reviews`,
      Array.isArray(d.variations) && d.variations.length
        ? `Variations: ${d.variations.map(v => `${v.name}: ${(v.options ?? []).join(', ')}`).join(' | ')}`
        : '',
    ].filter(Boolean).join('\n');
  }
  return `Attached Hafrik context (${ctx.type}):\n${JSON.stringify(ctx.data).slice(0, 3000)}`;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeWelcomeMessage = () => ({
  ...WELCOME_MESSAGE,
  id: `welcome-${makeId()}`,
});

const makeConversation = () => ({
  id: makeId(),
  title: 'New chat',
  mode: 'hafrik',
  updatedAt: Date.now(),
  messages: [makeWelcomeMessage()],
});

const conversationTitle = (messages = []) => {
  const firstUser = messages.find((item) => item.role === 'user' && String(item.content ?? '').trim());
  if (!firstUser) return 'New chat';
  const text = String(firstUser.content).replace(/\s+/g, ' ').trim();
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
};

const cleanMarkdown = (text = '') =>
  String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .trim();

const cleanAiError = (message = '') => {
  const text = String(message || '').trim();
  if (!text) return 'I could not connect right now. Please try again.';
  if (/kimi|moonshot|provider|empty response|empty\s+respon/i.test(text)) {
    return 'AI could not respond clearly. Please try again.';
  }
  return text;
};

const shuffleList = (items = []) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const extractReplyIdeas = (content = '') => {
  const text = cleanMarkdown(content);
  const afterHeading = text.split(/reply ideas?:/i)[1] ?? '';
  if (!afterHeading) return [];
  const source = afterHeading || text;
  const ideas = source
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length >= 4 && line.length <= 160)
    .filter((line) => !/^(quick take|summary|reply ideas?)[:：]?$/i.test(line));

  return Array.from(new Set(ideas)).slice(0, 4);
};

const fallbackReplyIdeas = (postText = '') => {
  const lower = String(postText).toLowerCase();
  if (/business|market|shop|product|shipping|china|factory/.test(lower)) {
    return shuffleList([
      'This is useful, please share more details.',
      'I would like to know more about this.',
      'This can help many traders here.',
      'Interesting, how can someone get started?',
    ]);
  }
  if (/study|school|admission|scholarship|student/.test(lower)) {
    return shuffleList([
      'This is helpful, thanks for sharing.',
      'Please share more about the process.',
      'This is good information for students.',
      'I would like to learn more about this.',
    ]);
  }
  return shuffleList([
    'This is interesting, thanks for sharing.',
    'I like this perspective.',
    'Please share more about this.',
    'This makes sense.',
  ]);
};

const buildAiActions = (content = '') => {
  const text = String(content).toLowerCase();
  const actions = [{ key: 'draft', label: 'Draft post', icon: 'create-outline' }];

  if (/translat|mandarin|chinese|phrase|language/.test(text)) {
    actions.push({ key: 'translator', label: 'Translator', icon: 'language-outline' });
  }
  if (/marketplace|shop|product|buy|supplier|category|caption|price|goods/.test(text)) {
    actions.push({ key: 'marketplace', label: 'Marketplace', icon: 'storefront-outline' });
  }
  if (/wallet|fund|balance|money|payment|naira|rmb|cny|send/.test(text)) {
    actions.push({ key: 'wallet', label: 'Wallet', icon: 'wallet-outline' });
  }
  if (/communit|group|people|join/.test(text)) {
    actions.push({ key: 'communities', label: 'Communities', icon: 'people-outline' });
  }
  if (/city|travel|guangzhou|hotel|restaurant|food|market|directions|nightlife/.test(text)) {
    actions.push({ key: 'explore', label: 'Explore City', icon: 'compass-outline' });
  }
  if (/airport|pickup|arrival|hotel reservation|factory visit|inspection/.test(text)) {
    actions.push({ key: 'arrival', label: 'Arrival', icon: 'airplane-outline' });
  }
  if (/study|admission|scholarship|self-sponsored|student|university|visa/.test(text)) {
    actions.push({ key: 'study', label: 'Services', icon: 'school-outline' });
  }
  if (/shipping|sourcing|factory|business|agent|warehouse/.test(text)) {
    actions.push({ key: 'hafrikx', label: 'HafrikX', icon: 'briefcase-outline' });
  }

  return actions.slice(0, 4);
};

const TypingDots = memo(() => {
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const create = (value, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.25, duration: 280, useNativeDriver: true }),
      ]),
    );
    const animations = [create(dot1, 0), create(dot2, 120), create(dot3, 240)];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dot1, dot2, dot3]);

  return (
    <View style={typing.wrap}>
      {[dot1, dot2, dot3].map((dot, index) => (
        <Animated.View key={index} style={[typing.dot, { opacity: dot }]} />
      ))}
    </View>
  );
});

const RichMessageText = memo(({ content, isUser, id }) => {
  const lines = String(content ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

  return (
    <View style={bubble.richWrap}>
      {lines.map((line, index) => {
        const heading = line.match(/^#{1,4}\s+(.+)$/);
        const bullet = line.match(/^[-*•]\s+(.+)$/);
        const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
        const isSoftHeading = !bullet && !numbered && line.length <= 58 && /[:：]$/.test(line);

        if (heading || isSoftHeading) {
          return (
            <Text key={`${id}-h-${index}`} style={[bubble.heading, isUser && bubble.userText]}>
              {cleanMarkdown(heading?.[1] ?? line.replace(/[:：]$/, ''))}
            </Text>
          );
        }

        if (bullet) {
          return (
            <View key={`${id}-b-${index}`} style={bubble.listRow}>
              <Text style={[bubble.bulletDot, isUser && bubble.userText]}>•</Text>
              <Text style={[bubble.text, bubble.listText, isUser ? bubble.userText : bubble.aiText]}>
                {cleanMarkdown(bullet[1])}
              </Text>
            </View>
          );
        }

        if (numbered) {
          return (
            <View key={`${id}-n-${index}`} style={bubble.listRow}>
              <Text style={[bubble.numberDot, isUser && bubble.userText]}>{numbered[1]}.</Text>
              <Text style={[bubble.text, bubble.listText, isUser ? bubble.userText : bubble.aiText]}>
                {cleanMarkdown(numbered[2])}
              </Text>
            </View>
          );
        }

        return (
          <Text key={`${id}-p-${index}`} style={[bubble.text, isUser ? bubble.userText : bubble.aiText]}>
            {cleanMarkdown(line)}
          </Text>
        );
      })}
    </View>
  );
});

const MessageBubble = memo(({ item, onCopy, onShare, onAction, onSpeak, speakingId, sharingId }) => {
  const isUser = item.role === 'user';
  const isTyping = item.isTyping;
  const canAct = !isTyping && !!String(item.content ?? '').trim();
  const canShare = canAct && !isUser;
  const aiActions = canShare ? buildAiActions(item.content) : [];

  return (
    <View style={[bubble.row, isUser ? bubble.rowUser : bubble.rowAi]}>
      {!isUser && (
        <LinearGradient colors={[BRAND, ACCENT]} style={bubble.avatar}>
          <Ionicons name="sparkles" size={14} color={WHITE} />
        </LinearGradient>
      )}

      <View style={[bubble.stack, isUser && bubble.stackUser]}>
        <Pressable
          onLongPress={() => canAct && onCopy(item.content)}
          style={[bubble.card, isUser ? bubble.userCard : bubble.aiCard]}
        >
          {isTyping ? (
            <TypingDots />
          ) : (
            <>
              <RichMessageText content={item.content} isUser={isUser} id={item.id} />
              {!!item.meta && (
                <View style={bubble.metaRow}>
                  <Ionicons name="information-circle-outline" size={11} color={isUser ? 'rgba(255,255,255,0.8)' : ACCENT} />
                  <Text style={[bubble.metaText, isUser && bubble.userMetaText]}>{item.meta}</Text>
                </View>
              )}
            </>
          )}
        </Pressable>

        {canAct && (
          <View style={[bubble.actionRail, isUser && bubble.actionRailUser]}>
            <TouchableOpacity style={bubble.actionBtn} activeOpacity={0.82} onPress={() => onCopy(item.content)}>
              <Ionicons name="copy-outline" size={13} color={BRAND} />
              <Text style={bubble.actionText}>Copy</Text>
            </TouchableOpacity>

            {canShare && (
              <TouchableOpacity
                style={[bubble.actionBtn, speakingId === item.id && bubble.actionBtnActive]}
                activeOpacity={0.82}
                onPress={() => onSpeak(item)}
              >
                <Ionicons
                  name={speakingId === item.id ? 'stop-circle-outline' : 'volume-high-outline'}
                  size={13}
                  color={speakingId === item.id ? WHITE : BRAND}
                />
                <Text style={[bubble.actionText, speakingId === item.id && bubble.actionTextActive]}>
                  {speakingId === item.id ? 'Stop' : 'Read'}
                </Text>
              </TouchableOpacity>
            )}

            {canShare && (
              <TouchableOpacity
                style={bubble.actionBtn}
                activeOpacity={0.82}
                onPress={() => onShare(item)}
                disabled={sharingId === item.id}
              >
                {sharingId === item.id ? (
                  <ActivityIndicator size="small" color={BRAND} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={13} color={BRAND} />
                )}
                <Text style={bubble.actionText}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {aiActions.length > 0 && (
          <View style={bubble.aiActionGrid}>
            {aiActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={bubble.aiActionChip}
                activeOpacity={0.84}
                onPress={() => onAction(action.key, item)}
              >
                <Ionicons name={action.icon} size={13} color={ACCENT} />
                <Text style={bubble.aiActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

const ModePill = memo(({ mode, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.84}
    onPress={() => onPress(mode.key)}
    style={[styles.modePill, active && [styles.modePillActive, { backgroundColor: mode.color, borderColor: mode.color }]]}
  >
    <Ionicons name={mode.icon} size={15} color={active ? WHITE : BRAND} />
    <View>
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{mode.label}</Text>
      <Text style={[styles.modeHint, active && styles.modeHintActive]}>{mode.hint}</Text>
    </View>
  </TouchableOpacity>
));

export default function AIChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { top, bottom } = useSafeAreaInsets();
  const { user } = useAuth();
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const openComposer = useStore((state) => state.openComposer);
  const openCommentModal = useStore((state) => state.openCommentModal);

  const storageKey = useMemo(() => {
    const userId = user?.id ?? user?.user_id ?? user?.username ?? 'guest';
    return `${STORAGE_PREFIX}_${userId}`;
  }, [user]);

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([makeWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState('hafrik');
  const [usePlatformSearch, setUsePlatformSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');
  const [attachedContext, setAttachedContext] = useState(null);
  const [pendingAutoPrompt, setPendingAutoPrompt] = useState('');
  const [postInsightRequest, setPostInsightRequest] = useState(null);
  const [productInsightRequest, setProductInsightRequest] = useState(null);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const loadedRef = useRef(false);
  const attachedContextRef = useRef(null);
  const voiceStartedRef = useRef(false);
  const voiceModuleRef = useRef(null);

  const activeMode = useMemo(
    () => MODES.find((item) => item.key === mode) ?? MODES[0],
    [mode],
  );

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 80);
  }, [messages.length]);

  useEffect(() => {
    attachedContextRef.current = attachedContext;
  }, [attachedContext]);

  const configureVoiceEvents = useCallback((voice) => {
    if (!voice) return;
    voice.onSpeechStart = () => {
      voiceStartedRef.current = true;
      setIsListening(true);
      setVoiceHint('Listening...');
    };
    voice.onSpeechPartialResults = (event) => {
      const partial = event?.value?.[0];
      if (partial) {
        setInputText(partial);
        setVoiceHint('Keep speaking...');
      }
    };
    voice.onSpeechResults = (event) => {
      const transcript = event?.value?.[0];
      if (transcript) {
        setInputText(transcript);
        setVoiceHint('Voice converted to text. Edit or send.');
        setTimeout(() => inputRef.current?.focus?.(), 120);
      }
      setIsListening(false);
      voiceStartedRef.current = false;
    };
    voice.onSpeechEnd = () => {
      setIsListening(false);
      voiceStartedRef.current = false;
      setVoiceHint((current) => current || 'Voice converted to text. Edit or send.');
    };
    voice.onSpeechError = (event) => {
      const message = event?.error?.message || 'Could not hear clearly. Try again.';
      setIsListening(false);
      voiceStartedRef.current = false;
      setVoiceHint('');
      Alert.alert('Voice input', message);
    };
  }, []);

  useEffect(() => {
    return () => {
      const voice = voiceModuleRef.current;
      if (voice) {
        voice.destroy().then(() => voice.removeAllListeners()).catch(() => {});
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => () => {
      if (['post', 'product'].includes(attachedContextRef.current?.type)) {
        setAttachedContext(null);
        setPostInsightRequest(null);
        setProductInsightRequest(null);
        setPendingAutoPrompt('');
        setInputText('');
        setVoiceHint('');
        setIsListening(false);
        voiceModuleRef.current?.cancel?.().catch(() => {});
        setMode('hafrik');
        setMessages([makeWelcomeMessage()]);
      }
    }, []),
  );

  useEffect(() => {
    const params = route?.params ?? {};
    if (params?.fresh) {
      const fresh = makeConversation();
      setActiveConversationId(fresh.id);
      setMessages(fresh.messages);
      setMode('hafrik');
      setInputText('');
      setVoiceHint('');
      setIsListening(false);
      voiceModuleRef.current?.cancel?.().catch(() => {});
      setAttachedContext(null);
      setPostInsightRequest(null);
      setProductInsightRequest(null);
      setPendingAutoPrompt('');
      navigation.setParams?.({ fresh: undefined });
      return;
    }
    if (!params?.contextType) return;
    const nextContext = {
      type: params.contextType,
      id: params.contextId ?? params.postId ?? null,
      data: params.contextData ?? null,
    };
    const isPostContext = params.contextType === 'post';
    const isProductContext = params.contextType === 'product';
    const prompt = isPostContext
      ? `${POST_INSIGHT_PROMPT}\nVariation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 7)}. Do not reuse common generic replies.`
      : isProductContext
        ? `${PRODUCT_INSIGHT_PROMPT}\nVariation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 7)}.`
      : String(params.initialPrompt || 'Explain this Hafrik item and suggest what I can do next.');
    const fresh = {
      ...makeConversation(),
      title: `${isPostContext ? 'Post insight' : params.contextType === 'product' ? 'Product' : 'Hafrik'} Assistant`,
      mode: params.mode || (params.contextType === 'post' ? 'Post Assistant' : params.contextType === 'product' ? 'Product Assistant' : 'Hafrik'),
    };

    setConversations((prev) => [fresh, ...prev].slice(0, 20));
    setActiveConversationId(fresh.id);
    setMessages(isPostContext || isProductContext ? [] : fresh.messages);
    setAttachedContext(nextContext);
    if (params.mode) setMode(String(params.mode));
    else if (params.contextType === 'post') setMode('Post Assistant');
    else if (params.contextType === 'product') setMode('Product Assistant');
    setInputText('');
    if (isPostContext) {
      setPostInsightRequest({ id: makeId(), prompt, context: nextContext });
      setProductInsightRequest(null);
      setPendingAutoPrompt('');
    } else if (isProductContext) {
      setProductInsightRequest({ id: makeId(), prompt, context: nextContext });
      setPostInsightRequest(null);
      setPendingAutoPrompt('');
    } else {
      setPendingAutoPrompt(prompt);
    }
    navigation.setParams?.({
      contextType: undefined,
      contextId: undefined,
      postId: undefined,
      contextData: undefined,
      initialPrompt: undefined,
      mode: undefined,
    });
  }, [navigation, route?.params]);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    if (route?.params?.contextType) {
      loadedRef.current = true;
      return () => { cancelled = true; };
    }

    const loadConversations = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        const parsed = stored ? JSON.parse(stored) : [];
        const list = Array.isArray(parsed) && parsed.length ? parsed : [makeConversation()];
        const normalized = list
          .filter((item) => item && item.id)
          .map((item) => ({
            ...item,
            messages: Array.isArray(item.messages) && item.messages.length ? item.messages : [makeWelcomeMessage()],
            updatedAt: item.updatedAt ?? Date.now(),
          }))
          .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
        const active = normalized[0] ?? makeConversation();

        if (cancelled) return;
        setConversations(normalized.length ? normalized : [active]);
        setActiveConversationId(active.id);
        setMessages(active.messages);
        setMode(active.mode ?? 'hafrik');
      } catch {
        const fresh = makeConversation();
        if (cancelled) return;
        setConversations([fresh]);
        setActiveConversationId(fresh.id);
        setMessages(fresh.messages);
        setMode(fresh.mode);
      } finally {
        if (!cancelled) loadedRef.current = true;
      }
    };

    loadConversations();
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (!loadedRef.current || !activeConversationId) return;
    const saveableMessages = messages.filter((item) => !item.isTyping);
    const updatedAt = Date.now();

    setConversations((prev) => {
      const hasActive = prev.some((item) => item.id === activeConversationId);
      const base = hasActive ? prev : [{ ...makeConversation(), id: activeConversationId }];
      const next = base
        .map((item) => (
          item.id === activeConversationId
            ? {
                ...item,
                mode,
                messages: saveableMessages,
                title: conversationTitle(saveableMessages),
                updatedAt,
              }
            : item
        ))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, 20);

      AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [activeConversationId, messages, mode, storageKey]);

  const startNewConversation = useCallback(() => {
    const fresh = makeConversation();
    setConversations((prev) => [fresh, ...prev].slice(0, 20));
    setActiveConversationId(fresh.id);
    setMessages(fresh.messages);
    setMode(fresh.mode);
    setInputText('');
    setVoiceHint('');
    setIsListening(false);
    voiceModuleRef.current?.cancel?.().catch(() => {});
    setAttachedContext(null);
    setPostInsightRequest(null);
    setProductInsightRequest(null);
    setPendingAutoPrompt('');
  }, []);

  const openConversation = useCallback((conversation) => {
    if (!conversation || conversation.id === activeConversationId || isLoading) return;
    setActiveConversationId(conversation.id);
    setMessages(Array.isArray(conversation.messages) && conversation.messages.length ? conversation.messages : [makeWelcomeMessage()]);
    setMode(conversation.mode ?? 'hafrik');
    setInputText('');
    setVoiceHint('');
    setIsListening(false);
    voiceModuleRef.current?.cancel?.().catch(() => {});
    setAttachedContext(null);
    setPostInsightRequest(null);
    setProductInsightRequest(null);
    setPendingAutoPrompt('');
  }, [activeConversationId, isLoading]);

  const deleteActiveConversation = useCallback(() => {
    setConversations((prev) => {
      const remaining = prev.filter((item) => item.id !== activeConversationId);
      const nextActive = remaining[0] ?? makeConversation();
      const nextList = remaining.length ? remaining : [nextActive];
      setActiveConversationId(nextActive.id);
      setMessages(nextActive.messages);
      setMode(nextActive.mode ?? 'hafrik');
      AsyncStorage.setItem(storageKey, JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });
  }, [activeConversationId, storageKey]);

  const copyText = useCallback(async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    Alert.alert('Copied', 'Message copied to clipboard.');
  }, []);

  const ensureVoicePermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone access',
        message: 'Hafrik needs microphone access to turn your voice into text for AI chat.',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const startVoiceInput = useCallback(async () => {
    if (isLoading) return;
    try {
      const granted = await ensureVoicePermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice input.');
        return;
      }
      await Speech.stop();
      setSpeakingId(null);
      const voice = getVoiceModule();
      if (!voice) {
        Alert.alert('Voice input needs rebuild', 'Please rebuild the dev app so the native speech recognition module is included.');
        return;
      }
      voiceModuleRef.current = voice;
      configureVoiceEvents(voice);
      setVoiceHint('Listening...');
      setIsListening(true);
      voiceStartedRef.current = true;
      await voice.start('en-US');
    } catch (error) {
      setIsListening(false);
      voiceStartedRef.current = false;
      setVoiceHint('');
      Alert.alert('Voice input', error?.message || 'Could not start voice input. Please try again.');
    }
  }, [configureVoiceEvents, ensureVoicePermission, isLoading]);

  const stopVoiceInput = useCallback(async () => {
    try {
      setVoiceHint('Converting voice...');
      await voiceModuleRef.current?.stop?.();
    } catch {
      setIsListening(false);
      voiceStartedRef.current = false;
    }
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (isListening || voiceStartedRef.current) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  const speakResponse = useCallback(async (item) => {
    const text = String(item?.content ?? '').trim();
    if (!text) return;

    if (speakingId === item.id) {
      await Speech.stop();
      setSpeakingId(null);
      return;
    }

    await Speech.stop();
    setSpeakingId(item.id);
    Speech.speak(cleanMarkdown(text), {
      rate: 0.92,
      pitch: 1,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  }, [speakingId]);

  const shareResponseToHafrik = useCallback(async (item) => {
    const content = String(item?.content ?? '').trim();
    if (!content || sharingId) return;

    Alert.alert(
      'Share to Hafrik?',
      'This will publish the AI response as a text post on your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            setSharingId(item.id);
            try {
              const body = {
                type: 'post',
                target_type: 'profile',
                privacy: 'public',
                text: `Shared from Hafrik AI\n\n${content}`,
              };
              const response = await PostFeedController(body);

              if (response.status === 'success' || response.httpStatus === 200) {
                triggerRefresh?.();
                Alert.alert('Shared', 'The AI response has been posted to your Hafrik profile.');
              } else {
                Alert.alert('Could not share', response.message || 'Please try again.');
              }
            } catch (error) {
              Alert.alert('Could not share', error?.message || 'Please try again.');
            } finally {
              setSharingId(null);
            }
          },
        },
      ],
    );
  }, [sharingId, triggerRefresh]);

  const clearChat = useCallback(() => {
    if (messages.length <= 1) return;
    Alert.alert('Delete chat?', 'This will remove this saved conversation from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteActiveConversation },
    ]);
  }, [deleteActiveConversation, messages.length]);

  const fetchPlatformContext = useCallback(async (query) => {
    if (!usePlatformSearch) return { context: '', found: false };

    try {
      const response = await apiClient.get(SEARCH_API, { params: { q: query }, timeout: 10000 });
      const items = normalizeSearchItems(response?.data);
      return {
        context: buildContext(items),
        found: items.length > 0,
      };
    } catch {
      return { context: '', found: false };
    }
  }, [usePlatformSearch]);

  const send = useCallback(async (rawText, contextOverride = null, options = {}) => {
    const query = String(rawText ?? inputText).trim();
    if (!query || isLoading) return;

    Keyboard.dismiss();
    setInputText('');

    const userMessage = { id: makeId(), role: 'user', content: query };
    const typingMessage = { id: 'typing', role: 'assistant', isTyping: true };
    const visibleMessages = messages.filter((item) => !item.isTyping);
    const nextMessages = options.silentUser ? visibleMessages : [...visibleMessages, userMessage];

    setMessages([...nextMessages, typingMessage]);
    setIsLoading(true);

    try {
      const { context, found } = await fetchPlatformContext(query);
      const activeAttachedContext = contextOverride ?? attachedContext;
      const attachedContextText = buildAttachedContextText(activeAttachedContext);
      const mergedContext = [attachedContextText, context].filter(Boolean).join('\n\n');
      const requestMessages = options.silentUser ? [...nextMessages, userMessage] : nextMessages;
      const history = requestMessages
        .filter((item) => item.id !== 'welcome')
        .slice(-12)
        .map((item) => ({
          role: item.role === 'user' ? 'user' : 'assistant',
          content: item.content,
        }));

      const response = await apiClient.post(CHATGPT_API, {
        provider: 'kimi',
        mode,
        mode_label: activeMode.label,
        messages: history,
        context: mergedContext,
        context_type: activeAttachedContext?.type ?? null,
        context_id: activeAttachedContext?.id ?? null,
        context_data: activeAttachedContext?.data ?? null,
        has_platform_results: found,
        response_style: activeAttachedContext?.type === 'post' ? 'short_post_explain' : 'concise',
      }, { timeout: 60000 });

      const reply = response?.data?.reply
        ?? response?.data?.data?.reply
        ?? response?.data?.message
        ?? response?.data?.content
        ?? response?.data?.text
        ?? 'I could not get a clear response. Please try again.';

      setMessages([
        ...nextMessages,
        {
          id: makeId(),
          role: 'assistant',
          content: String(reply),
          meta: found ? 'Used Hafrik search context' : 'AI response',
        },
      ]);
    } catch (error) {
      const message = cleanAiError(error?.response?.data?.message
        ?? error?.message
        ?? 'I could not connect right now. Please try again.');
      setMessages([
        ...nextMessages,
        {
          id: makeId(),
          role: 'assistant',
          content: message,
          meta: 'Connection issue',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeMode.label, attachedContext, fetchPlatformContext, inputText, isLoading, messages, mode]);

  useEffect(() => {
    if (!pendingAutoPrompt || !attachedContext || isLoading) return;
    if (['post', 'product'].includes(attachedContext?.type)) return;
    const prompt = pendingAutoPrompt;
    const contextForPrompt = attachedContext;
    setPendingAutoPrompt('');
    const timer = setTimeout(() => {
      send(prompt, contextForPrompt, { silentUser: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [attachedContext, isLoading, pendingAutoPrompt, send]);

  useEffect(() => {
    if (!postInsightRequest?.context) return;

    let cancelled = false;
    const runPostInsight = async () => {
      const contextForPrompt = postInsightRequest.context;
      const prompt = postInsightRequest.prompt;
      const typingMessage = { id: 'typing', role: 'assistant', isTyping: true };

      setIsLoading(true);
      setMessages([typingMessage]);

      try {
        const attachedContextText = buildAttachedContextText(contextForPrompt);
        const postText = contextForPrompt?.data?.text || contextForPrompt?.data?.payload?.title || '';
        const response = await apiClient.post(CHATGPT_API, {
          provider: 'kimi',
          mode: 'Post Assistant',
          mode_label: 'Post Assistant',
          messages: [{
            role: 'user',
            content: `${prompt}\n\nOnly use the attached Hafrik post below. Your reply ideas must directly respond to this post:\n${String(postText).slice(0, 1800)}`,
          }],
          context: attachedContextText,
          context_type: 'post',
          context_id: contextForPrompt?.id ?? contextForPrompt?.data?.post_id ?? null,
          context_data: contextForPrompt?.data ?? null,
          has_platform_results: true,
          response_style: 'short_post_explain',
        }, { timeout: 60000 });

        if (cancelled) return;

        const reply = response?.data?.reply
          ?? response?.data?.data?.reply
          ?? response?.data?.message
          ?? response?.data?.content
          ?? response?.data?.text
          ?? 'I could not explain this post right now.';

        setMessages([{
          id: makeId(),
          role: 'assistant',
          content: String(reply),
          meta: 'Based on this post',
        }]);
      } catch (error) {
        if (cancelled) return;
        setMessages([{
          id: makeId(),
          role: 'assistant',
          content: cleanAiError(error?.response?.data?.message ?? error?.message ?? 'I could not read this post right now. Please try again.'),
          meta: 'Connection issue',
        }]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    runPostInsight();
    return () => { cancelled = true; };
  }, [postInsightRequest]);

  useEffect(() => {
    if (!productInsightRequest?.context) return;

    let cancelled = false;
    const runProductInsight = async () => {
      const contextForPrompt = productInsightRequest.context;
      const prompt = productInsightRequest.prompt;
      const data = contextForPrompt?.data ?? {};
      const typingMessage = { id: 'typing', role: 'assistant', isTyping: true };

      setIsLoading(true);
      setMessages([typingMessage]);

      try {
        const attachedContextText = buildAttachedContextText(contextForPrompt);
        const compactProduct = [
          data.title ? `Product: ${data.title}` : '',
          data.price ? `Price: ${data.price} ${data.currency ?? ''}` : '',
          typeof data.in_stock === 'boolean' ? `Stock: ${data.in_stock ? 'In stock' : 'Out of stock'}` : '',
          data.description ? `Description: ${String(data.description).slice(0, 1500)}` : '',
          Array.isArray(data.variations) && data.variations.length
            ? `Options: ${data.variations.map((v) => `${v.name}: ${(v.options ?? []).join(', ')}`).join(' | ')}`
            : '',
        ].filter(Boolean).join('\n');

        const response = await apiClient.post(CHATGPT_API, {
          provider: 'kimi',
          mode: 'Product Assistant',
          mode_label: 'Product Assistant',
          messages: [{
            role: 'user',
            content: `${prompt}\n\nOnly use the attached Hafrik Shop product below. Be practical and concise for a buyer:\n${compactProduct}`,
          }],
          context: attachedContextText,
          context_type: 'product',
          context_id: contextForPrompt?.id ?? data.product_id ?? null,
          context_data: data,
          has_platform_results: true,
          response_style: 'product_full_explain',
        }, { timeout: 60000 });

        if (cancelled) return;

        const reply = response?.data?.reply
          ?? response?.data?.data?.reply
          ?? response?.data?.message
          ?? response?.data?.content
          ?? response?.data?.text
          ?? 'I could not check this product right now.';

        setMessages([{
          id: makeId(),
          role: 'assistant',
          content: String(reply),
          meta: 'Based on this product',
        }]);
      } catch (error) {
        if (cancelled) return;
        setMessages([{
          id: makeId(),
          role: 'assistant',
          content: cleanAiError(error?.response?.data?.message ?? error?.message ?? 'I could not check this product right now. Please try again.'),
          meta: 'Connection issue',
        }]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    runProductInsight();
    return () => { cancelled = true; };
  }, [productInsightRequest]);

  const handleAiAction = useCallback((actionKey, item) => {
    const content = String(item?.content ?? '').trim();
    const draftText = content ? `Shared from Hafrik AI\n\n${content}` : '';

    switch (actionKey) {
      case 'draft':
        openComposer({ initialTab: 'text', initialText: draftText });
        break;
      case 'translator':
        navigation.navigate('TranslatorScreen');
        break;
      case 'marketplace':
        navigation.navigate('MarketplaceScreen');
        break;
      case 'wallet':
        navigation.navigate('WalletScreen');
        break;
      case 'communities':
        navigation.navigate('GroupScreen');
        break;
      case 'explore':
        navigation.navigate('ExploreHome');
        break;
      case 'arrival':
        navigation.navigate('ArrivalConcierge');
        break;
      case 'study':
        navigation.navigate('HafrikXVisa');
        break;
      case 'hafrikx':
        navigation.navigate('HafrikXHome');
        break;
      default:
        break;
    }
  }, [navigation, openComposer]);

  const renderMessage = useCallback(
    ({ item }) => (
      <MessageBubble
        item={item}
        onCopy={copyText}
        onShare={shareResponseToHafrik}
        onAction={handleAiAction}
        onSpeak={speakResponse}
        speakingId={speakingId}
        sharingId={sharingId}
      />
    ),
    [copyText, handleAiAction, shareResponseToHafrik, sharingId, speakResponse, speakingId],
  );

  const isPostInsight = attachedContext?.type === 'post';
  const isProductInsight = attachedContext?.type === 'product';
  const isInsightMode = isPostInsight || isProductInsight;
  const productData = isProductInsight ? (attachedContext?.data ?? {}) : null;
  const productTitle = cleanMarkdown(productData?.title || 'Hafrik Shop product');
  const productPrice = [productData?.price, productData?.currency].filter(Boolean).join(' ');
  const productOptions = Array.isArray(productData?.variations) ? productData.variations : [];
  const latestAiMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'assistant' && !item.isTyping && String(item.content ?? '').trim()),
    [messages],
  );
  const replyIdeas = useMemo(() => {
    if (!isPostInsight) return [];
    const extracted = extractReplyIdeas(latestAiMessage?.content);
    return extracted.length
      ? shuffleList(extracted)
      : fallbackReplyIdeas(attachedContext?.data?.text ?? '');
  }, [attachedContext?.data?.text, isPostInsight, latestAiMessage?.content]);

  const openReplyInCommentModal = useCallback((replyText) => {
    const text = String(replyText ?? '').trim();
    const postId = attachedContext?.id ?? attachedContext?.data?.post_id;
    if (!text || !postId) return;
    openCommentModal(postId, null, text);
    navigation.goBack();
  }, [attachedContext, navigation, openCommentModal]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {isInsightMode ? (
        <View style={[styles.insightHeader, { paddingTop: top + 10 }]}>
          <TouchableOpacity style={styles.insightBackBtn} activeOpacity={0.82} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={23} color={BRAND} />
          </TouchableOpacity>
          <View style={styles.insightTitleWrap}>
            <Text style={styles.insightTitle}>{isProductInsight ? 'Product insight' : 'Post insight'}</Text>
            <Text style={styles.insightSub}>{isProductInsight ? 'AI buying check' : 'Short explanation by Hafrik AI'}</Text>
          </View>
          <TouchableOpacity
            style={styles.insightIconBtn}
            activeOpacity={0.82}
            onPress={() => {
              setMessages([]);
              if (isProductInsight) {
                setProductInsightRequest({
                  id: makeId(),
                  prompt: `${PRODUCT_INSIGHT_PROMPT}\nVariation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 7)}. Give a different useful buying angle with full product details.`,
                  context: attachedContext,
                });
              } else {
                setPostInsightRequest({
                  id: makeId(),
                  prompt: `${POST_INSIGHT_PROMPT}\nVariation seed: ${Date.now()}-${Math.random().toString(36).slice(2, 7)}. Use a different angle this time.`,
                  context: attachedContext,
                });
              }
            }}
          >
            <Ionicons name="refresh-outline" size={19} color={BRAND} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.aiHeader, { paddingTop: top + 10 }]}>
          <LinearGradient
            colors={[BRAND, '#0E4D52']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandHeaderInner}
          >
            <TouchableOpacity style={styles.aiHeaderBtn} activeOpacity={0.82} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={23} color={WHITE} />
            </TouchableOpacity>

            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>Hafrik AI</Text>
              <Text style={styles.heroSubDark}>Ask. Learn. Create.</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.aiHeaderBtn} activeOpacity={0.82} onPress={startNewConversation}>
                <Ionicons name="add" size={21} color={WHITE} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiHeaderBtn} activeOpacity={0.82} onPress={clearChat}>
                <Ionicons name="trash-outline" size={18} color={WHITE} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isInsightMode ? (
          <ScrollView
            style={styles.insightBody}
            contentContainerStyle={styles.insightContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isProductInsight ? (
              <LinearGradient
                colors={['#073D43', '#0E4D52', '#1f8e93']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.productInsightCard}
              >
                <View style={styles.productInsightTop}>
                  <View style={styles.productInsightIcon}>
                    <Ionicons name="bag-check-outline" size={20} color={BRAND} />
                  </View>
                  <View style={styles.productInsightBadge}>
                    <Ionicons name="sparkles" size={12} color={WHITE} />
                    <Text style={styles.productInsightBadgeText}>AI Check</Text>
                  </View>
                </View>
                <Text style={styles.productInsightTitle} numberOfLines={3}>{productTitle}</Text>
                <View style={styles.productMetaWrap}>
                  {!!productPrice && (
                    <View style={styles.productMetaPill}>
                      <Ionicons name="pricetag-outline" size={12} color={WHITE} />
                      <Text style={styles.productMetaText}>{productPrice}</Text>
                    </View>
                  )}
                  {typeof productData?.in_stock === 'boolean' && (
                    <View style={styles.productMetaPill}>
                      <Ionicons name={productData.in_stock ? 'checkmark-circle-outline' : 'close-circle-outline'} size={12} color={WHITE} />
                      <Text style={styles.productMetaText}>{productData.in_stock ? 'In stock' : 'Out of stock'}</Text>
                    </View>
                  )}
                  {productOptions.length > 0 && (
                    <View style={styles.productMetaPill}>
                      <Ionicons name="options-outline" size={12} color={WHITE} />
                      <Text style={styles.productMetaText}>{productOptions.length} option groups</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['#EFFFFB', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.insightPostCard}
              >
                <View style={styles.insightPostBadge}>
                  <Ionicons name="document-text-outline" size={13} color={BRAND} />
                  <Text style={styles.insightPostBadgeText}>Post attached</Text>
                </View>
                <Text style={styles.insightPostText} numberOfLines={5}>
                  {cleanMarkdown(attachedContext?.data?.text || attachedContext?.data?.payload?.title || 'Hafrik post')}
                </Text>
                {!!attachedContext?.data?.author && (
                  <Text style={styles.insightPostAuthor}>By {attachedContext.data.author}</Text>
                )}
              </LinearGradient>
            )}

            {isLoading && !latestAiMessage ? (
              <View style={styles.insightLoadingCard}>
                <LinearGradient colors={[BRAND, ACCENT]} style={styles.insightLoadingIcon}>
                  <Ionicons name="sparkles" size={20} color={WHITE} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightLoadingTitle}>{isProductInsight ? 'Checking the product...' : 'Reading the post...'}</Text>
                  <Text style={styles.insightLoadingText}>{isProductInsight ? 'Hafrik AI is preparing a quick buying check.' : 'Hafrik AI is preparing a short answer.'}</Text>
                </View>
                <TypingDots />
              </View>
            ) : null}

            {!!latestAiMessage && (
              <View style={styles.insightResultCard}>
                <View style={styles.insightSectionHead}>
                  <View style={styles.insightSectionIcon}>
                    <Ionicons name="sparkles" size={15} color={WHITE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightSectionTitle}>{isProductInsight ? 'Buying check' : 'Quick insight'}</Text>
                    <Text style={styles.insightSectionSub}>{isProductInsight ? 'Short, practical, and product-focused' : 'Short, simple, and ready to use'}</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.82} onPress={() => copyText(latestAiMessage.content)} style={styles.insightMiniBtn}>
                    <Ionicons name="copy-outline" size={14} color={BRAND} />
                  </TouchableOpacity>
                </View>
                <RichMessageText content={latestAiMessage.content} isUser={false} id={latestAiMessage.id} />
              </View>
            )}

            {isPostInsight && !!latestAiMessage && (
            <View style={styles.replyIdeaCard}>
              <View style={styles.insightSectionHead}>
                <View style={[styles.insightSectionIcon, { backgroundColor: ACCENT }]}>
                  <Ionicons name="chatbubble-ellipses" size={15} color={WHITE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightSectionTitle}>Reply ideas</Text>
                  <Text style={styles.insightSectionSub}>Tap one, edit it, then send</Text>
                </View>
              </View>
              <View style={styles.replyIdeaGrid}>
                {replyIdeas.map((idea) => (
                  <TouchableOpacity
                    key={idea}
                    activeOpacity={0.86}
                    style={styles.replyIdeaBtn}
                    onPress={() => openReplyInCommentModal(idea)}
                    disabled={isLoading}
                  >
                    <Text style={styles.replyIdeaText}>{idea}</Text>
                    <Ionicons name="create-outline" size={15} color={ACCENT} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            )}
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            ListHeaderComponent={(
              <View style={styles.suggestionBox}>
                <LinearGradient
                  colors={['#073D43', BRAND, ACCENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.aiHeroCard}
                >
                  <View style={styles.aiHeroIcon}>
                    <Ionicons name={activeMode.icon} size={21} color={BRAND} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiHeroTitle}>How can I help today?</Text>
                    <Text style={styles.aiHeroText}>Ask, draft, translate, plan, compare, or understand anything on Hafrik.</Text>
                  </View>
                </LinearGradient>

                <View style={styles.modeGrid}>
                  {MODES.map((item) => (
                    <ModePill key={item.key} mode={item} active={item.key === mode} onPress={setMode} />
                  ))}
                </View>

                {conversations.length > 1 && (
                  <View style={styles.historyRail}>
                    <Text style={styles.historyTitle}>Recent</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
                      {conversations.slice(0, 8).map((conversation) => {
                        const active = conversation.id === activeConversationId;
                        return (
                          <TouchableOpacity
                            key={conversation.id}
                            activeOpacity={0.84}
                            onPress={() => openConversation(conversation)}
                            style={[styles.historyChip, active && styles.historyChipActive]}
                          >
                            <Ionicons name={active ? 'chatbubble-ellipses' : 'chatbubble-outline'} size={13} color={active ? WHITE : BRAND} />
                            <Text style={[styles.historyText, active && styles.historyTextActive]} numberOfLines={1}>
                              {conversation.title ?? 'New chat'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {!!attachedContext && (
                  <View style={styles.attachedCard}>
                    <View style={styles.attachedIcon}>
                      <Ionicons name="document-text-outline" size={16} color={BRAND} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attachedTitle}>Hafrik {attachedContext.type} attached</Text>
                      <Text style={styles.attachedText} numberOfLines={2}>
                        {attachedContext?.data?.text
                          ? cleanMarkdown(String(attachedContext.data.text)).slice(0, 140)
                          : attachedContext?.data?.title
                            ? cleanMarkdown(String(attachedContext.data.title)).slice(0, 140)
                            : 'Ask AI to explain, summarize, translate, or help you reply.'}
                      </Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setAttachedContext(null)} style={styles.attachedClose}>
                      <Ionicons name="close" size={15} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.suggestionHead}>
                  <View>
                    <Text style={styles.suggestionTitle}>Start with one tap</Text>
                    <Text style={styles.suggestionSub}>Pick a common task or type below.</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setUsePlatformSearch((value) => !value)}
                    style={[styles.searchToggle, usePlatformSearch && styles.searchToggleOn]}
                  >
                    <Ionicons name="search-outline" size={13} color={usePlatformSearch ? WHITE : BRAND} />
                    <Text style={[styles.searchToggleText, usePlatformSearch && styles.searchToggleTextOn]}>
                      Deep search
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.suggestionGrid}>
                  {SUGGESTIONS.map((item) => (
                    <TouchableOpacity
                      key={item.text}
                      style={styles.suggestionChip}
                      activeOpacity={0.84}
                      onPress={() => send(item.text)}
                      disabled={isLoading}
                    >
                      <View style={styles.suggestionIconWrap}>
                        <Ionicons name={item.icon} size={17} color={ACCENT} />
                      </View>
                      <Text style={styles.suggestionLabel}>{item.label}</Text>
                      <Text style={styles.suggestionText}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
        )}

        <View style={[styles.inputDock, { paddingBottom: bottom + 8 }]}>
          <View style={styles.inputCard}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={isInsightMode ? 'Ask a follow-up...' : `Ask in ${activeMode.label} mode...`}
              placeholderTextColor={Colors.neutral430}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (!isListening) setVoiceHint('');
              }}
              editable={!isLoading}
              multiline
              maxLength={1200}
            />

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={toggleVoiceInput}
              disabled={isLoading}
              style={[styles.voiceBtn, isListening && styles.voiceBtnActive, isLoading && styles.sendBtnDisabled]}
            >
              <Ionicons name={isListening ? 'stop' : 'mic-outline'} size={18} color={isListening ? WHITE : BRAND} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => send()}
              disabled={!inputText.trim() || isLoading}
              style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <Ionicons name="arrow-up" size={19} color={WHITE} />
              )}
            </TouchableOpacity>
          </View>

          {!!voiceHint && (
            <View style={styles.voiceHintRow}>
              <View style={[styles.voicePulse, isListening && styles.voicePulseActive]} />
              <Text style={styles.voiceHintText}>{voiceHint}</Text>
            </View>
          )}

          <Text style={styles.disclaimer}>AI can make mistakes. Verify important travel, money, school, and visa information.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  aiHeader: {
    backgroundColor: BRAND,
  },
  brandHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  insightBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitleWrap: {
    flex: 1,
  },
  insightTitle: {
    color: BRAND,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  insightSub: {
    color: MUTED,
    fontSize: 12,
    marginTop: 1,
    fontFamily: AppDetails.fontFamily?.body,
  },
  insightIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroTitleWrap: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  heroSubDark: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '700',
    fontFamily: AppDetails.fontFamily?.body,
  },
  aiHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 15,
    borderRadius: 28,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  aiHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  aiHeroText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    fontWeight: '700',
    fontFamily: AppDetails.fontFamily?.body,
  },
  aiStatusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.primary + '12',
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  aiStatusText: {
    color: BRAND,
    fontSize: 10,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 1,
    fontFamily: AppDetails.fontFamily?.body,
  },
  statusCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  statusText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    marginTop: 2,
    fontFamily: AppDetails.fontFamily?.body,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modePillActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  modeLabel: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  modeLabelActive: {
    color: WHITE,
  },
  modeHint: {
    color: MUTED,
    fontSize: 10,
    marginTop: 1,
  },
  modeHintActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  historyRail: {
    marginTop: 12,
  },
  historyTitle: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  historyScroll: {
    gap: 8,
    paddingRight: 8,
  },
  historyChip: {
    maxWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  historyChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  historyText: {
    maxWidth: 132,
    color: BRAND,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: AppDetails.fontFamily?.body,
  },
  historyTextActive: {
    color: WHITE,
  },
  chatArea: {
    flex: 1,
  },
  insightBody: {
    flex: 1,
  },
  insightContent: {
    padding: 14,
    paddingBottom: 22,
  },
  insightPostCard: {
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  insightPostBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  insightPostBadgeText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  insightPostText: {
    color: TEXT,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.3,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  insightPostAuthor: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    fontFamily: AppDetails.fontFamily?.body,
  },
  productInsightCard: {
    padding: 18,
    borderRadius: 30,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  productInsightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  productInsightIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInsightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  productInsightBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  productInsightTitle: {
    color: WHITE,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  productMetaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  productMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  productMetaText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  insightLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 24,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  insightLoadingIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightLoadingTitle: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  insightLoadingText: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
    fontFamily: AppDetails.fontFamily?.body,
  },
  insightResultCard: {
    padding: 16,
    borderRadius: 28,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  insightSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  insightSectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightSectionTitle: {
    color: BRAND,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  insightSectionSub: {
    color: MUTED,
    fontSize: 11,
    marginTop: 1,
    fontFamily: AppDetails.fontFamily?.body,
  },
  insightMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  replyIdeaCard: {
    padding: 16,
    borderRadius: 28,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  replyIdeaGrid: {
    gap: 10,
  },
  replyIdeaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: Colors.primary + '0D',
    borderWidth: 1,
    borderColor: Colors.primary + '22',
  },
  replyIdeaText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    fontFamily: AppDetails.fontFamily?.body,
  },
  messageList: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
  },
  suggestionBox: {
    marginBottom: 12,
    paddingVertical: 2,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  attachedIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: BRAND + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedTitle: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  attachedText: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
    fontFamily: AppDetails.fontFamily?.body,
  },
  attachedClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  suggestionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  suggestionTitle: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  suggestionSub: {
    color: MUTED,
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '700',
    fontFamily: AppDetails.fontFamily?.body,
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchToggleOn: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  searchToggleText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '800',
  },
  searchToggleTextOn: {
    color: WHITE,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    width: '48.3%',
    minHeight: 126,
    padding: 13,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'flex-start',
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  suggestionLabel: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
    fontFamily: AppDetails.fontFamily?.heading,
  },
  suggestionText: {
    color: MUTED,
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
    fontFamily: AppDetails.fontFamily?.body,
  },
  inputDock: {
    paddingHorizontal: 12,
    paddingTop: 9,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 26,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    paddingTop: 9,
    paddingBottom: 8,
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppDetails.fontFamily?.body,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.42,
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  voiceBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  voiceHintRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.primary + '0F',
  },
  voicePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
    opacity: 0.5,
  },
  voicePulseActive: {
    backgroundColor: '#EF4444',
    opacity: 1,
  },
  voiceHintText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  disclaimer: {
    marginTop: 6,
    color: Colors.neutral430,
    fontSize: 10,
    textAlign: 'center',
    fontFamily: AppDetails.fontFamily?.body,
  },
});

const bubble = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAi: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  stack: {
    maxWidth: '86%',
    alignItems: 'flex-start',
  },
  stackUser: {
    alignItems: 'flex-end',
  },
  card: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userCard: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  aiCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    marginLeft: 4,
  },
  actionRailUser: {
    marginLeft: 0,
    marginRight: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  actionText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  actionTextActive: {
    color: WHITE,
  },
  aiActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
    marginLeft: 4,
    maxWidth: '100%',
  },
  aiActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '1F',
  },
  aiActionText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.body,
  },
  richWrap: {
    gap: 7,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: AppDetails.fontFamily?.body,
  },
  heading: {
    color: BRAND,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    fontFamily: AppDetails.fontFamily?.heading,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  bulletDot: {
    color: ACCENT,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  numberDot: {
    minWidth: 20,
    color: ACCENT,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '900',
  },
  listText: {
    flex: 1,
  },
  userText: {
    color: WHITE,
  },
  aiText: {
    color: TEXT,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  metaText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '800',
  },
  userMetaText: {
    color: 'rgba(255,255,255,0.8)',
  },
});

const typing = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
});

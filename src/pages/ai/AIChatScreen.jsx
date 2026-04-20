/**
 * AIChatScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Hafrik AI — conversational assistant that searches the Hafrik platform
 * before answering, so it knows what's on the app and can surface relevant
 * people, posts, pages, groups, and articles to the user.
 *
 * Flow:
 *  1. User sends a message
 *  2. App hits /search/index.php?q=<message> to find relevant content
 *  3. Search results are formatted as context and sent to the AI endpoint
 *  4. AI responds, referencing platform content where relevant
 *
 * Backend endpoint needed:
 *  POST https://hafrik.com/api/v1/ai/chat.php
 *  Body: { messages: [{role, content}], context: string }
 *  Response: { reply: string }
 */
import React, {
  useState, useRef, useCallback, useEffect, memo,
} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, StatusBar, Pressable, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import apiClient from '../../api/apiClient';
import { Colors } from '../../theme/colors';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG        = '#071e21';
const BG_CARD   = '#0d2d32';
const BG_INPUT  = '#0f3539';
const ACCENT    = '#1f8e93';
const ACCENT2   = '#27adb5';
const LIME      = '#a8e063';
const WHITE     = Colors.white;
const MUTED     = 'rgba(255,255,255,0.45)';
const AI_BUBBLE = '#0f3539';
const ME_BUBBLE = ACCENT;

const SEARCH_API = 'https://hafrik.com/api/v1/search/index.php';
const AI_API     = 'https://hafrik.com/api/v1/ai/chat.php';

// ── Suggested prompts shown on empty state ─────────────────────────────────────
const SUGGESTIONS = [
  { icon: 'people-outline',        text: 'Find people from Nigeria' },
  { icon: 'newspaper-outline',     text: 'Latest articles on the platform' },
  { icon: 'airplane-outline',      text: 'How does Arrival Concierge work?' },
  { icon: 'swap-horizontal-outline', text: 'What currencies can I exchange?' },
  { icon: 'document-text-outline', text: 'Help me with a visa application' },
  { icon: 'tv-outline',            text: 'What\'s on HafrikTV today?' },
];

// ── Helper: format search results into a context string ───────────────────────
const buildContext = (results) => {
  if (!results || !Array.isArray(results) || results.length === 0) return '';

  const lines = ['Here is what I found on the Hafrik platform relevant to the question:\n'];

  results.forEach((item) => {
    const type = item.type ?? item.result_type ?? 'item';
    switch (type) {
      case 'user':
      case 'person':
        lines.push(`• Person: ${item.name ?? item.full_name ?? item.username} (${item.username ?? ''})${item.bio ? ' — ' + item.bio : ''}`);
        break;
      case 'post':
        lines.push(`• Post by ${item.user?.name ?? 'user'}: "${String(item.text ?? item.content ?? '').slice(0, 120)}"`);
        break;
      case 'page':
      case 'business':
        lines.push(`• Business Page: ${item.name ?? item.title} — ${item.description ? String(item.description).slice(0, 100) : ''}`);
        break;
      case 'group':
      case 'community':
        lines.push(`• Community: ${item.name ?? item.title} (${item.total_members ?? 0} members)`);
        break;
      case 'article':
        lines.push(`• Article: "${item.title}" by ${item.author?.name ?? 'Hafrik'}`);
        break;
      default:
        lines.push(`• ${item.title ?? item.name ?? item.text ?? JSON.stringify(item).slice(0, 80)}`);
    }
  });

  return lines.join('\n');
};

// ── Typing indicator ───────────────────────────────────────────────────────────
const TypingDots = memo(() => {
  const dots = [useRef(new Animated.Value(0)).current,
                useRef(new Animated.Value(0)).current,
                useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={td.wrap}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[td.dot, { opacity: d }]} />
      ))}
    </View>
  );
});

// ── Message bubble ─────────────────────────────────────────────────────────────
const Bubble = memo(({ msg }) => {
  const isMe = msg.role === 'user';

  if (msg.isTyping) {
    return (
      <View style={[b.row, b.rowAI]}>
        <View style={b.aiAvatar}>
          <Ionicons name="sparkles" size={14} color={ACCENT2} />
        </View>
        <View style={[b.bubble, b.aiBubble]}>
          <TypingDots />
        </View>
      </View>
    );
  }

  // Split text into paragraphs for nicer rendering
  const parts = (msg.content ?? '').split('\n').filter(l => l.trim().length > 0);

  return (
    <View style={[b.row, isMe ? b.rowMe : b.rowAI]}>
      {!isMe && (
        <View style={b.aiAvatar}>
          <Ionicons name="sparkles" size={14} color={ACCENT2} />
        </View>
      )}
      <View style={[b.bubble, isMe ? b.meBubble : b.aiBubble, isMe && b.meShadow]}>
        {parts.map((line, i) => (
          <Text key={i} style={[b.text, isMe ? b.meText : b.aiText]}>
            {line}
          </Text>
        ))}
        {msg.searchContext && !isMe && (
          <View style={b.contextPill}>
            <Ionicons name="search-outline" size={10} color={ACCENT2} />
            <Text style={b.contextTxt}>Searched Hafrik platform</Text>
          </View>
        )}
      </View>
    </View>
  );
});

// ── Suggestion chip ────────────────────────────────────────────────────────────
const SuggestionChip = memo(({ item, onPress }) => (
  <TouchableOpacity style={sc.chip} onPress={() => onPress(item.text)} activeOpacity={0.8}>
    <Ionicons name={item.icon} size={15} color={ACCENT2} />
    <Text style={sc.txt}>{item.text}</Text>
  </TouchableOpacity>
));

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AIChatScreen() {
  const navigation    = useNavigation();
  const { token }     = useAuth();
  const { top, bottom } = useSafeAreaInsets();

  const [messages,    setMessages]    = useState([]);
  const [inputText,   setInputText]   = useState('');
  const [isLoading,   setIsLoading]   = useState(false);

  const flatListRef = useRef(null);
  const inputRef    = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const query = (text ?? inputText).trim();
    if (!query || isLoading) return;

    setInputText('');
    Keyboard.dismiss();

    const userMsg = { id: Date.now(), role: 'user', content: query };
    const typingMsg = { id: 'typing', role: 'ai', isTyping: true };

    setMessages(prev => [...prev, userMsg, typingMsg]);
    setIsLoading(true);

    try {
      // ── 1. Search the Hafrik platform ──────────────────────────────────────
      let searchContext = '';
      let hasResults    = false;
      try {
        const searchRes = await apiClient.get(SEARCH_API, { params: { q: query } });
        const raw = searchRes?.data;
        // The search API returns an array or { data: [...] }
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data) ? raw.data
          : Array.isArray(raw?.results) ? raw.results
          : [];

        if (items.length > 0) {
          hasResults    = true;
          searchContext = buildContext(items.slice(0, 8));
        }
      } catch {
        // Search failure is non-fatal — AI will answer from its own knowledge
      }

      // ── 2. Build conversation history for the API ──────────────────────────
      const history = messages
        .filter(m => !m.isTyping && m.role !== undefined)
        .slice(-10) // keep last 10 for context window
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      // ── 3. Call AI endpoint ────────────────────────────────────────────────
      const payload = {
        messages: [...history, { role: 'user', content: query }],
        context:  searchContext,
        has_platform_results: hasResults,
      };

      const aiRes  = await apiClient.post(AI_API, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });

      const reply = aiRes?.data?.reply
        ?? aiRes?.data?.message
        ?? aiRes?.data?.content
        ?? aiRes?.data?.text
        ?? "I'm sorry, I couldn't get a response. Please try again.";

      setMessages(prev => [
        ...prev.filter(m => !m.isTyping),
        {
          id:            Date.now() + 1,
          role:          'ai',
          content:       reply,
          searchContext: hasResults,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => !m.isTyping),
        {
          id:      Date.now() + 1,
          role:    'ai',
          content: "I'm having trouble connecting right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, token]);

  const isEmpty = messages.length === 0;

  return (
    <View style={[s.root, { paddingTop: top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BG, BG_CARD]}
        style={s.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={WHITE} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <LinearGradient colors={[ACCENT, ACCENT2]} style={s.aiIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="sparkles" size={18} color={BG} />
          </LinearGradient>
          <View>
            <Text style={s.headerTitle}>Hafrik AI</Text>
            <Text style={s.headerSub}>Connected to Hafrik platform</Text>
          </View>
        </View>

        <View style={s.headerRight}>
          <View style={s.onlineDot} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Empty state / suggestions ── */}
        {isEmpty ? (
          <View style={s.emptyWrap}>
            <LinearGradient colors={[ACCENT, ACCENT2]} style={s.emptyIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="sparkles" size={32} color={BG} />
            </LinearGradient>
            <Text style={s.emptyTitle}>How can I help you?</Text>
            <Text style={s.emptySub}>
              I can search the Hafrik platform and answer questions about people, posts, communities, and services.
            </Text>
            <View style={s.suggestions}>
              {SUGGESTIONS.map((item, i) => (
                <SuggestionChip key={i} item={item} onPress={send} />
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => <Bubble msg={item} />}
            contentContainerStyle={s.messageList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          />
        )}

        {/* ── Input bar ── */}
        <View style={[s.inputBar, { paddingBottom: bottom + 8 }]}>
          <View style={s.inputWrap}>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Ask anything about Hafrik…"
              placeholderTextColor={MUTED}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => send()}
              blurOnSubmit={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!inputText.trim() || isLoading) && s.sendBtnDisabled]}
              onPress={() => send()}
              activeOpacity={0.8}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={BG} />
              ) : (
                <Ionicons name="arrow-up" size={18} color={BG} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={s.disclaimer}>
            Hafrik AI may make mistakes. Verify important information.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight:  { width: 24, alignItems: 'center' },
  aiIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: WHITE, letterSpacing: 0.1 },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 1 },
  onlineDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: LIME },

  // empty state
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingBottom: 40,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: WHITE, marginBottom: 10, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  suggestions: { width: '100%', gap: 8 },

  // messages
  messageList: { padding: 16, gap: 12, paddingBottom: 8 },

  // input bar
  inputBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: BG_CARD,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BG_INPUT,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(31,142,147,0.25)',
    gap: 8,
    marginBottom: 6,
  },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ACCENT2,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  disclaimer: {
    fontSize: 10, color: MUTED, textAlign: 'center', marginBottom: 2,
  },
});

// ── Bubble styles ──────────────────────────────────────────────────────────────
const b = StyleSheet.create({
  row:      { flexDirection: 'row', marginBottom: 4, gap: 8 },
  rowMe:    { justifyContent: 'flex-end' },
  rowAI:    { justifyContent: 'flex-start', alignItems: 'flex-end' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: BG_INPUT,
    borderWidth: 1, borderColor: `${ACCENT2}40`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  meBubble: {
    backgroundColor: ME_BUBBLE,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: AI_BUBBLE,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  meShadow: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  text:   { fontSize: 14, lineHeight: 21 },
  meText: { color: WHITE },
  aiText: { color: 'rgba(255,255,255,0.88)' },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  contextTxt: { fontSize: 10, color: ACCENT2 },
});

// ── Suggestion chip styles ─────────────────────────────────────────────────────
const sc = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: `${ACCENT}30`,
  },
  txt: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', flex: 1 },
});

// ── Typing dots styles ─────────────────────────────────────────────────────────
const td = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 2 },
  dot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT2 },
});

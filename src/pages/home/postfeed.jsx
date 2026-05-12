import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../../repository/store';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CARD   = Colors.white;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;

const hex2 = (hex, op) => {
  const h = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

// ─── Prompts pool ─────────────────────────────────────────────────────────────
const PROMPTS = [
  // Community & Connection
  { emoji: '🌍', text: 'What brought you to China? Share your story with the Hafrik community.' },
  { emoji: '🤝', text: 'Tag someone in the community who helped you when you first arrived.' },
  { emoji: '💬', text: 'What\'s one thing you\'d tell every African in China right now?' },
  { emoji: '🧭', text: 'New to China? Ask anything — the Hafrik community has your back.' },
  { emoji: '🫂', text: 'Who in this community deserves a shout out today? Drop their name.' },

  // Business & Trade
  { emoji: '📦', text: 'Sourcing from China? Share a tip that saved you time or money.' },
  { emoji: '💼', text: 'What business opportunity in China do you think more Africans should know about?' },
  { emoji: '🏭', text: 'Found a great supplier or market? Help the community by sharing it here.' },
  { emoji: '📊', text: 'What\'s your biggest challenge doing business between Africa and China?' },
  { emoji: '🚢', text: 'Shipping tips, freight agents, customs advice — share what\'s working for you.' },
  { emoji: '🛒', text: 'Canton Fair, Yiwu, 1688 — what\'s your go-to sourcing method right now?' },

  // Wins & Growth
  { emoji: '🏆', text: 'Share a win this week — big or small. Hafrik celebrates with you.' },
  { emoji: '🚀', text: 'What goal are you working toward this month? Put it out there.' },
  { emoji: '🌟', text: 'What\'s something you\'ve achieved in China that you\'re proud of?' },
  { emoji: '📈', text: 'How has being connected on Hafrik helped your business or career?' },

  // Knowledge & Tips
  { emoji: '💡', text: 'What do you wish someone had told you before moving to China?' },
  { emoji: '🏦', text: 'Banking, WeChat Pay, Alipay — what works best for foreigners right now?' },
  { emoji: '💰', text: 'Best way you\'ve found to send money back to Africa from China?' },
  { emoji: '📱', text: 'What app can you not live without while living in China?' },
  { emoji: '🌐', text: 'VPN, connectivity, staying online — what\'s your setup in China?' },
  { emoji: '📚', text: 'Learning Mandarin? Share your progress or a useful phrase.' },
  { emoji: '🏠', text: 'Apartment hunting in China — tips for getting a good deal without stress.' },
  { emoji: '✈️', text: 'Best flight routes or deals between China and Africa right now?' },

  // Culture & Lifestyle
  { emoji: '🍽️', text: 'Best African food spot you\'ve discovered in China — where is it?' },
  { emoji: '🎉', text: 'How are you keeping African culture alive while living in China?' },
  { emoji: '🧘', text: 'Living abroad can be tough. How do you take care of your mental health here?' },
  { emoji: '🕌', text: 'Finding halal food, African churches, or community events near you?' },
  { emoji: '🤲', text: 'Hafrik is built for us, by us. What feature would you love to see next?' },

  // Hafrik mission-specific
  { emoji: '🌱', text: 'Hafrik connects Africans in China. Who should join the platform that you haven\'t told yet?' },
  { emoji: '🔗', text: 'Have you used Hafrik to find a business contact or opportunity? Share your experience.' },
  { emoji: '📣', text: 'What conversation does the African community in China need to be having right now?' },
  { emoji: '💎', text: 'What makes the African community in China unique? Let\'s hear your perspective.' },
];

// Picks a new prompt every hour so it feels fresh across app opens
const getPrompt = () => {
  const hourSlot = Math.floor(Date.now() / (1000 * 60 * 60));
  return PROMPTS[hourSlot % PROMPTS.length];
};

// ─── Quick action chips ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: 'image-outline',     label: 'Photo',   color: '#3b82f6' },
  { icon: 'videocam-outline',  label: 'Video',   color: '#ef4444' },
  { icon: 'happy-outline',     label: 'Feeling', color: '#f59e0b' },
  { icon: 'stats-chart',       label: 'Poll',    color: '#8b5cf6' },
];

// ─── PostFeed (Daily Prompt Card) ─────────────────────────────────────────────
const PostFeed = () => {
  const openComposer = useStore(s => s.openComposer);
  const userAvatar   = useStore(s => s.userAvatar);
  const { user }     = useAuth();
  const userName     = user?.full_name ?? user?.username ?? '';

  const prompt = getPrompt();

  // Pulse animation on the emoji
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900,  useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleOpen = useCallback(() => openComposer(), [openComposer]);

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.93}
      onPress={handleOpen}
    >
      {/* ── Top accent bar ── */}
      <LinearGradient
        colors={[ACCENT, BRAND]}
        style={s.accentBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
      />

      {/* ── Header row: Daily prompt label + day ── */}
      <View style={s.headerRow}>
        <View style={s.promptBadge}>
          <View style={s.promptDot} />
          <Text style={s.promptBadgeTxt}>COMMUNITY PROMPT</Text>
        </View>
        <Text style={s.dateLabel}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* ── Prompt text ── */}
      <View style={s.promptRow}>
        <Animated.Text style={[s.promptEmoji, { transform: [{ scale: pulseAnim }] }]}>
          {prompt.emoji}
        </Animated.Text>
        <Text style={s.promptText}>{prompt.text}</Text>
      </View>

      {/* ── Input row: avatar + placeholder ── */}
      <View style={s.inputRow}>
        <View style={s.avatarWrap}>
          <Image
            source={{ uri: userAvatar }}
            style={s.avatar}
            resizeMode="cover"
          />
          <View style={s.avatarOnline} />
        </View>

        <View style={s.inputBox}>
          <Text style={s.inputPlaceholder}>
            {firstName ? `Hey ${firstName}, what's on your mind?` : "What's on your mind?"}
          </Text>
          <View style={s.inputArrow}>
            <Ionicons name="arrow-forward" size={14} color={WHITE} />
          </View>
        </View>
      </View>

      {/* ── Quick action chips ── */}
      <View style={s.actionsRow}>
        {QUICK_ACTIONS.map(({ icon, label, color }) => (
          <TouchableOpacity
            key={label}
            style={s.actionChip}
            onPress={handleOpen}
            activeOpacity={0.75}
          >
            <View style={[s.actionIconBox, { backgroundColor: hex2(color, 0.12) }]}>
              <Ionicons name={icon} size={14} color={color} />
            </View>
            <Text style={[s.actionLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: hex2(BRAND, 0.08),
  },

  accentBar: { height: 3, width: '100%' },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  promptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: hex2(ACCENT, 0.08),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  promptDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  promptBadgeTxt:{ fontSize: 10, fontWeight: '800', color: ACCENT, letterSpacing: 1 },
  dateLabel:     { fontSize: 11, color: MUTED, fontWeight: '600' },

  // Prompt
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  promptEmoji: { fontSize: 26, lineHeight: 32 },
  promptText:  {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    lineHeight: 22,
    fontFamily: AppDetails.fontFamily?.heading ?? 'System',
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: hex2(ACCENT, 0.25),
  },
  avatarOnline: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 1.5, borderColor: CARD,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hex2(BRAND, 0.04),
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: hex2(BRAND, 0.08),
    paddingLeft: 16,
    paddingRight: 6,
    height: 42,
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: 13.5,
    color: MUTED,
    fontFamily: AppDetails.fontFamily?.body ?? 'System',
  },
  inputArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },

  // Quick actions
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: hex2(BRAND, 0.07),
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: hex2(BRAND, 0.03),
  },
  actionIconBox: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: AppDetails.fontFamily?.body ?? 'System',
  },
});

export default memo(PostFeed);

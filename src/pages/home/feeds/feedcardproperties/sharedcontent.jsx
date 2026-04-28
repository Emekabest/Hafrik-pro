import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, TouchableOpacity, View,
  TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import AppDetails from '../../../../helpers/appdetails.js';
import CleanText from '../../../../helpers/cleantext.js';
import UserDetails from './userdetails.jsx';
import Videocontent from './videocontent.jsx';
import ProductContent from './productcontent.jsx';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT     = Colors.primary;
const BRAND      = Colors.primaryDark;
const WHITE      = Colors.white;
const TEXT_BODY  = Colors.textBodyIndigo;
const TEXT_MUTED = Colors.mutedBlueGrayAlt;
const BORDER     = Colors.borderLightAlt;

const FONT_H = AppDetails?.fontFamily?.heading ?? AppDetails?.fontFamily?.body ?? 'System';
const FONT_B = AppDetails?.fontFamily?.body    ?? 'System';

const hex2 = (hex, op) => {
  const h = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

// ─── SharedContent ─────────────────────────────────────────────────────────────
const SharedContent = ({ post = {}, parentFeedId, containerWidth, isVisible = false }) => {
  const navigation     = useNavigation();
  const tabletMode     = useStore(s => s.tabletMode);
  const storeFeedWidth = useStore(s => s.feedWidth);

  const effectiveWidth = containerWidth > 0
    ? containerWidth
    : (tabletMode && storeFeedWidth > 0 ? storeFeedWidth : 0);

  // For media/product sizing — full card width minus card padding
  const innerWidth = effectiveWidth > 0 ? effectiveWidth - 2 : undefined; // -2 for border

  const safePost   = post || {};
  const mediaArray = Array.isArray(safePost.media) ? safePost.media : [];
  const mediaItem  = mediaArray.length > 0 ? mediaArray[0] : null;
  const isVideo    = safePost.type === 'video' || safePost.type === 'reel';

  const [hasError,    setHasError]    = useState(false);
  const [isExpanded,  setIsExpanded]  = useState(false);

  const cleanedText    = useMemo(() => (post.text ? CleanText(post.text) : null), [post.text]);
  const isLongPostText = useMemo(() => cleanedText && cleanedText.length > 120, [cleanedText]);
  const displayText    = useMemo(() => {
    if (!cleanedText) return null;
    if (isLongPostText && !isExpanded) return `${cleanedText.substring(0, 120)}...`;
    return cleanedText;
  }, [cleanedText, isLongPostText, isExpanded]);

  const handlePress      = useCallback(() => {
    if (post?.id) navigation.navigate('PostDetail', { postId: post.id });
  }, [navigation, post?.id]);
  const toggleExpanded   = useCallback(() => setIsExpanded(p => !p), []);
  const handleRetry      = useCallback(() => setHasError(false), []);

  // Media dimensions — full bleed (no horizontal padding on media)
  const mediaW = innerWidth || 300;
  const mediaH = Math.min(Math.round(mediaW * 0.72), 340);

  const hasMedia   = !!mediaItem && !isVideo;
  const hasVideo   = !!mediaItem && isVideo;
  const hasArticle = post.type === 'article' && !!post.payload;
  const hasPoll    = post.type === 'poll';
  const hasProduct = post.type === 'product';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={s.card}
      onPress={handlePress}
      activeOpacity={0.92}
    >
      {/* ── Top accent gradient bar ── */}
      <LinearGradient
        colors={[ACCENT, BRAND]}
        style={s.accentBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
      />

      {/* ── Repost header ── */}
      <View style={s.repostHeader}>
        <View style={s.repostLabelRow}>
          <Ionicons name="arrow-redo" size={12} color={ACCENT} />
          <Text style={s.repostLabelTxt}>Shared Post</Text>
        </View>
      </View>

      {/* ── Original author ── */}
      <View style={s.authorRow}>
        <View style={s.avatarWrap}>
          {/* Gradient ring */}
          <LinearGradient
            colors={[ACCENT, BRAND]}
            style={s.avatarRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <ExpoImage
            source={{ uri: post.user?.avatar }}
            style={s.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </View>
        <View style={s.authorMeta}>
          <UserDetails feed={post} fullNameFontSize={13.5} />
        </View>
        <View style={s.viewChip}>
          <Text style={s.viewChipTxt}>View</Text>
          <Ionicons name="arrow-forward" size={10} color={ACCENT} />
        </View>
      </View>

      {/* ── Caption ── */}
      {!!displayText && (
        <View style={s.captionWrap}>
          <Text style={s.captionTxt}>
            {displayText}
            {isLongPostText && (
              <Text
                onPress={e => { e.stopPropagation?.(); toggleExpanded(); }}
                style={s.seeMoreTxt}
              >
                {isExpanded ? '  See less' : '  See more'}
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━ CONTENT VARIANTS ━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ── Poll ── */}
      {hasPoll && (
        <View style={s.contentPad}>
          <View style={s.pollCard}>
            <View style={s.pollIconBox}>
              <Ionicons name="stats-chart" size={18} color={WHITE} />
            </View>
            <View>
              <Text style={s.pollTitle}>Poll</Text>
              <Text style={s.pollSub}>Tap to see & vote</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={TEXT_MUTED} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      )}

      {/* ── Product ── */}
      {hasProduct && (
        <View style={s.contentPad}>
          <ProductContent
            feed={post}
            leftOffset={0}
            rightOffset={0}
            imageWidth={innerWidth}
            containerWidth={effectiveWidth}
          />
        </View>
      )}

      {/* ── Article ── */}
      {hasArticle && (
        <View style={s.contentPad}>
          <View style={s.articleCard}>
            {post.payload.cover ? (
              <ExpoImage
                source={{ uri: post.payload.cover }}
                style={s.articleCover}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <LinearGradient
                colors={[hex2(BRAND, 0.12), hex2(ACCENT, 0.08)]}
                style={[s.articleCover, s.articleCoverFallback]}
              >
                <Ionicons name="newspaper-outline" size={32} color={hex2(BRAND, 0.35)} />
              </LinearGradient>
            )}
            <View style={s.articleBody}>
              <Text style={s.articleTitle} numberOfLines={2}>
                {post.payload.title}
              </Text>
              <View style={s.articleReadRow}>
                <Ionicons name="book-outline" size={12} color={ACCENT} />
                <Text style={s.articleReadTxt}>Read article</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Photo media ── */}
      {hasMedia && (
        hasError ? (
          <View style={[s.mediaBox, { height: mediaH }]}>
            <Ionicons name="image-outline" size={32} color={hex2(WHITE, 0.5)} />
            <Text style={s.mediaErrTxt}>Could not load image</Text>
            <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
              <Text style={s.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.mediaBox, { height: mediaH }]}>
            {mediaItem.url ? (
              <ExpoImage
                source={{ uri: mediaItem.url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                onError={() => setHasError(true)}
              />
            ) : null}
            {/* Subtle bottom overlay so card edge looks clean */}
            <LinearGradient
              colors={['transparent', hex2('#000', 0.12)]}
              style={[StyleSheet.absoluteFill, { top: '60%' }]}
              pointerEvents="none"
            />
          </View>
        )
      )}

      {/* ── Video ── */}
      {hasVideo && (
        <View style={[s.mediaBox, { height: mediaH }]}>
          <Videocontent feedId={parentFeedId} media={post.media} isVisible={isVisible} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: hex2(BRAND, 0.09),
    // Shadow
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  // ── Accent bar ───────────────────────────────────────────────────────────────
  accentBar: {
    height: 3,
    width: '100%',
  },

  // ── Repost label ─────────────────────────────────────────────────────────────
  repostHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  repostLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: hex2(ACCENT, 0.08),
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  repostLabelTxt: {
    fontSize: 10.5,
    fontWeight: '700',
    color: ACCENT,
    fontFamily: FONT_B,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Author row ────────────────────────────────────────────────────────────────
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatar: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    borderWidth: 2,
    borderColor: WHITE,
  },
  authorMeta: { flex: 1 },
  viewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: hex2(ACCENT, 0.07),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  viewChipTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ACCENT,
    fontFamily: FONT_B,
  },

  // ── Caption ───────────────────────────────────────────────────────────────────
  captionWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  captionTxt: {
    fontSize: 13.5,
    color: TEXT_BODY,
    lineHeight: 20,
    fontFamily: FONT_B,
    letterSpacing: 0.1,
  },
  seeMoreTxt: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Padded content wrapper ────────────────────────────────────────────────────
  contentPad: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  // ── Poll card ─────────────────────────────────────────────────────────────────
  pollCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: hex2(ACCENT, 0.06),
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: hex2(ACCENT, 0.12),
  },
  pollIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_BODY,
    fontFamily: FONT_H,
  },
  pollSub: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    fontFamily: FONT_B,
    marginTop: 1,
  },

  // ── Article card ──────────────────────────────────────────────────────────────
  articleCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: hex2(BRAND, 0.08),
    backgroundColor: WHITE,
  },
  articleCover: {
    width: '100%',
    height: 160,
    backgroundColor: hex2(BRAND, 0.06),
  },
  articleCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleBody: {
    padding: 12,
    gap: 6,
  },
  articleTitle: {
    fontWeight: '700',
    fontSize: 14.5,
    color: TEXT_BODY,
    lineHeight: 21,
    fontFamily: FONT_H,
  },
  articleReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  articleReadTxt: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
    fontFamily: FONT_B,
  },

  // ── Media box (photo + video) ─────────────────────────────────────────────────
  mediaBox: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaErrTxt: {
    color: hex2(WHITE, 0.6),
    fontSize: 13,
    marginTop: 8,
    fontFamily: FONT_B,
  },
  retryBtn: {
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 20,
    backgroundColor: hex2(WHITE, 0.15),
    borderRadius: 20,
  },
  retryTxt: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_B,
  },
});

export default memo(SharedContent, (prev, next) =>
  prev.post.id             === next.post.id             &&
  prev.parentFeedId        === next.parentFeedId        &&
  prev.post.likes_count    === next.post.likes_count    &&
  prev.post.comments_count === next.post.comments_count &&
  prev.isVisible           === next.isVisible,
);

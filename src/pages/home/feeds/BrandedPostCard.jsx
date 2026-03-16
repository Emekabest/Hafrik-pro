/**
 * BrandedPostCard
 * ───────────────
 * Premium shareable card captured via ViewShot.
 * Design: gradient header · user info · content · stats · branded footer
 */
import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const BRAND    = '#0C3F44';
const JAVA     = '#1F8E93';
const HONEYDEW = '#F0FAF9';
const WHITE    = '#FFFFFF';
const DARK     = '#0A1F21';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../../assl.js/Layer 3.png');

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};


const BrandedPostCard = memo(({ feed, width = 340 }) => {
  const user     = feed?.user ?? {};
  const name     = user.full_name || user.username || 'Hafrik User';
  const handle   = user.username ? `@${user.username}` : '';
  const avatar   = user.avatar?.length > 8 ? user.avatar : null;
  const bodyText = (feed?.text ?? '').replace(/#\w+/g, '').trim();
  const hashtags = (feed?.text ?? '').match(/#\w+/g) ?? [];
  const date     = fmtDate(feed?.created_at ?? feed?.time);
  // First usable image from media
  const firstImg = (() => {
    const m = feed?.media;
    if (Array.isArray(m) && m.length > 0) {
      const url = m[0]?.url || m[0]?.thumb || m[0]?.src || null;
      return typeof url === 'string' && url.length > 8 ? url : null;
    }
    return null;
  })();

  const imageW = width;
  const imageH = Math.round(imageW * 0.65);

  return (
    <View style={[s.card, { width }]}>

      {/* ══ HEADER GRADIENT BAR ══════════════════════════════════════════ */}
      <View style={s.header}>
        {/* Decorative circles */}
        <View style={[s.deco, s.decoTL]} />
        <View style={[s.deco, s.decoBR]} />

        {/* Logo */}
        <View style={s.headerInner}>
         
          <Image source={LOGO} style={s.headerLogo} resizeMode="contain" />
        </View>
      </View>

      {/* ══ USER ROW ════════════════════════════════════════════════════ */}
      <View style={s.userRow}>
        {/* Avatar */}
        {avatar ? (
          <Image source={{ uri: avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}

        {/* Name / handle */}
        <View style={s.userMeta}>
          <Text style={s.userName} numberOfLines={1}>{name}</Text>
          {!!handle && <Text style={s.userHandle}>{handle}</Text>}
        </View>

        {/* Date badge */}
        {!!date && (
          <View style={s.dateBadge}>
            <Text style={s.dateText}>{date}</Text>
          </View>
        )}
      </View>

      {/* ══ DIVIDER ════════════════════════════════════════════════════ */}
      <View style={s.rule} />

      {/* ══ FULL-WIDTH IMAGE ════════════════════════════════════════════ */}
      {firstImg && (
        <Image
          source={{ uri: firstImg }}
          style={{ width: imageW, height: imageH }}
          resizeMode="cover"
        />
      )}

      {/* ══ BODY CONTENT ════════════════════════════════════════════════ */}
      {!!bodyText && (
        <View style={[s.bodyWrap, firstImg && s.bodyWrapAfterImage]}>
          {/* Quote accent */}
          <View style={s.quoteBar} />
          <Text style={[s.bodyText, !firstImg && s.bodyTextLarge]}>
            {bodyText}
          </Text>
        </View>
      )}

      {/* ══ HASHTAGS ════════════════════════════════════════════════════ */}
      {hashtags.length > 0 && (
        <View style={s.hashRow}>
          {hashtags.slice(0, 5).map((tag, i) => (
            <View key={i} style={s.hashPill}>
              <Text style={s.hashText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ══ FOOTER WATERMARK ═════════════════════════════════════════════ */}
      <View style={s.footer}>
       <View style={s.footerDivider} />
        <View>
          <Text style={s.footerLine1}>Shared from Hafrik</Text>
          <Text style={s.footerLine2}>hafrik.com</Text>
        </View>
        <View style={s.footerSpacer} />
       
      </View>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    // no borderRadius — let ViewShot capture square edges cleanly;
    // the preview in the modal will apply borderRadius visually
    overflow: 'hidden',
  },

  // Header
  header: {
    backgroundColor: BRAND,
    paddingVertical: 18,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  deco: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: JAVA + '30',
  },
  decoTL: { width: 120, height: 120, top: -40, left: -30 },
  decoBR: { width: 80,  height: 80,  bottom: -30, right: 10 },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WHITE + '25',
  },
  logoImg: { width: 28, height: 28 },
  headerLogo: { width: 100, height: 36 },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: HONEYDEW,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: JAVA,
  },
  avatarFallback: {
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
    color: WHITE,
  },
  userMeta: { flex: 1 },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.2,
  },
  userHandle: {
    fontSize: 12,
    color: JAVA,
    fontWeight: '600',
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: BRAND + '12',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND + '20',
  },
  dateText: {
    fontSize: 10,
    color: BRAND,
    fontWeight: '700',
  },

  // Rule
  rule: {
    height: 2,
    backgroundColor: JAVA,
    opacity: 0.15,
  },

  // Body
  bodyWrap: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: WHITE,
    gap: 12,
  },
  bodyWrapAfterImage: {
    paddingTop: 14,
  },
  quoteBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: JAVA,
    alignSelf: 'stretch',
  },
  bodyText: {
    flex: 1,
    fontSize: 14,
    color: DARK,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bodyTextLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },

  // Hashtags
  hashRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: WHITE,
  },
  hashPill: {
    backgroundColor: JAVA + '14',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: JAVA + '30',
  },
  hashText: {
    fontSize: 11,
    color: JAVA,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 10,
  },
  footerLogo: { width: 26, height: 26 },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: WHITE + '25',
  },
  footerLine1: {
    fontSize: 11,
    color: WHITE,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerLine2: {
    fontSize: 10,
    color: JAVA,
    fontWeight: '600',
    marginTop: 1,
  },
  footerSpacer: { flex: 1 },
  footerBadge: {
    backgroundColor: WHITE + '14',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: WHITE + '20',
  },
  footerBadgeTxt: {
    fontSize: 9,
    color: WHITE,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
});

export default BrandedPostCard;

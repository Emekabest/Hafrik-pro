/**
 * LinkPreview — Universal link embed component
 *
 * • YouTube    → inline player via react-native-youtube-iframe
 * • Spotify    → WebView embed player
 * • Vimeo      → WebView embed player
 * • SoundCloud → WebView embed player
 * • Apple Music→ WebView embed player
 * • Twitter/X  → OG metadata card (Twitter blocks iframe embeds)
 * • Generic    → OG-style card (image + title + description + domain)
 *
 * When a link is embedded, the URL is NOT shown in the post text
 * (the text is already stripped by parseLinkFromText in feedcard.jsx).
 *
 * Usage:
 *   <LinkPreview url="https://youtube.com/watch?v=abc123" />
 */
import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import { Colors } from '../theme/colors';
import AppDetails from '../helpers/appdetails';
import { getYoutubeVideoId, getYoutubeThumbnail } from '../helpers/youtubeIframe';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT     = Colors.primary;
const TEXT_BODY  = Colors.textBodyIndigo;
const TEXT_MUTED = Colors.mutedBlueGrayAlt;
const BORDER     = Colors.borderLight;
const BG_CARD    = Colors.surfaceCool;

// ─── URL type detectors ───────────────────────────────────────────────────────

const isYouTubeUrl = (url) =>
  !!url && /(?:youtube\.com|youtu\.be)/i.test(url);

const isSpotifyUrl = (url) =>
  !!url && /open\.spotify\.com/i.test(url);

const isVimeoUrl = (url) =>
  !!url && /(?:vimeo\.com)/i.test(url);

const isSoundCloudUrl = (url) =>
  !!url && /soundcloud\.com/i.test(url);

const isAppleMusicUrl = (url) =>
  !!url && /music\.apple\.com/i.test(url);

const isTwitterUrl = (url) =>
  !!url && /(?:twitter\.com|x\.com)/i.test(url);

// ─── Embed URL builders ───────────────────────────────────────────────────────

const getSpotifyEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/embed/')) return url;
    return `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`;
  } catch { return null; }
};

const getVimeoEmbedUrl = (url) => {
  if (!url) return null;
  // Match vimeo.com/12345678 or vimeo.com/channels/xyz/12345678 etc.
  const match = url.match(/vimeo\.com(?:\/channels\/[^/]+)?(?:\/videos?)?\/(\d+)/i);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}?autoplay=0&byline=0&portrait=0`;
};

const getSoundCloudEmbedUrl = (url) => {
  if (!url) return null;
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
};

const getAppleMusicEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Convert music.apple.com/... → embed.music.apple.com/...
    return `https://embed.music.apple.com${u.pathname}${u.search}`;
  } catch { return null; }
};

/** Extract domain from URL for display */
const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch { return ''; }
};

// ─── OG metadata cache (in-memory) ───────────────────────────────────────────
const ogCache = new Map();

/** Decode common HTML entities */
const decodeHTMLEntities = (str) => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

/**
 * Fetch OG metadata.
 * In React Native there is no CORS restriction, so we fetch the raw HTML
 * and extract <meta property="og:..." /> tags.
 * Falls back to a minimal card showing just the domain if the fetch fails.
 */
const fetchOGData = async (url) => {
  if (ogCache.has(url)) return ogCache.get(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; HafrikBot/1.0; +https://hafrik.com)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    const head = text.substring(0, 60000); // first 60KB is enough for <head>

    const get = (property) => {
      const re = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*?)["']`,
        'i'
      );
      const m = head.match(re);
      if (m) return decodeHTMLEntities(m[1]);
      // reversed attribute order
      const re2 = new RegExp(
        `<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${property}["']`,
        'i'
      );
      const m2 = head.match(re2);
      return m2 ? decodeHTMLEntities(m2[1]) : null;
    };

    const titleTagMatch = head.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleTag = titleTagMatch ? decodeHTMLEntities(titleTagMatch[1]) : null;

    // Resolve relative image URL
    let image = get('og:image') || get('twitter:image') || '';
    if (image && image.startsWith('/')) {
      try {
        const base = new URL(url);
        image = `${base.protocol}//${base.host}${image}`;
      } catch {}
    }

    const data = {
      title:       get('og:title')       || get('twitter:title')       || titleTag || '',
      description: get('og:description') || get('twitter:description') || get('description') || '',
      image,
      siteName:    get('og:site_name') || getDomain(url),
      url,
    };

    ogCache.set(url, data);
    return data;
  } catch {
    const fallback = { title: '', description: '', image: '', siteName: getDomain(url), url };
    ogCache.set(url, fallback);
    return fallback;
  }
};

// ─── YouTube Embed ────────────────────────────────────────────────────────────
const YouTubeEmbed = memo(({ url }) => {
  const videoId = getYoutubeVideoId(url);
  const [playing, setPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const thumb = getYoutubeThumbnail(videoId);

  const onStateChange = useCallback((state) => {
    if (state === 'ended') setPlaying(false);
  }, []);

  if (!videoId) return null;

  if (!showPlayer) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => { setShowPlayer(true); setPlaying(true); }}
        style={styles.ytContainer}
      >
        <ExpoImage
          source={{ uri: thumb.high }}
          style={styles.ytThumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={32} color={Colors.white} />
          </View>
        </View>
        <View style={styles.ytBadge}>
          <Ionicons name="logo-youtube" size={16} color="#FF0000" />
          <Text style={styles.ytBadgeText}>YouTube</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.ytContainer}>
      <YoutubePlayer
        height={210}
        videoId={videoId}
        play={playing}
        onChangeState={onStateChange}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  );
});

// Mobile Safari UA — Spotify's embed player requires a recognised browser UA
// otherwise it redirects to the "open in app" landing page.
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ─── Spotify Embed ────────────────────────────────────────────────────────────
const SpotifyEmbed = memo(({ url }) => {
  const embedUrl = getSpotifyEmbedUrl(url);
  const [failed,  setFailed]  = useState(false);
  const embedUrlRef = useRef(embedUrl);

  if (!embedUrl) return null;

  const isCompact = /\/(track|episode)\//.test(url);
  const height = isCompact ? 152 : 352;

  // Fallback card shown when the embed redirects to a landing / error page
  if (failed) {
    return (
      <TouchableOpacity
        style={styles.spotifyFallback}
        onPress={() => Linking.openURL(url).catch(() => {})}
        activeOpacity={0.85}
      >
        <View style={styles.spotifyFallbackLeft}>
          <Ionicons name="musical-notes" size={28} color="#1DB954" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.spotifyFallbackTitle}>Listen on Spotify</Text>
          <Text style={styles.spotifyFallbackSub} numberOfLines={1}>{url}</Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#1DB954" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.webEmbedContainer, { height }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={{ height, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        userAgent={MOBILE_UA}
        renderLoading={() => <EmbedLoader color="#1DB954" bg="#191414" />}
        onError={() => setFailed(true)}
        onHttpError={(e) => { if (e.nativeEvent.statusCode >= 400) setFailed(true); }}
        onNavigationStateChange={(state) => {
          // Spotify may redirect to an "open in app" landing page.
          // Detect that by checking if the URL drifted away from the embed path.
          if (
            state.url &&
            !state.url.startsWith('about:') &&
            !state.url.includes('spotify.com/embed') &&
            !state.url.includes('spotify.com/intl') // allow locale redirects within embed
          ) {
            setFailed(true);
          }
        }}
      />
      <PlatformBadge icon="musical-notes" label="Spotify" color="#1DB954" bg="rgba(0,0,0,0.6)" />
    </View>
  );
});

// ─── Vimeo Embed ──────────────────────────────────────────────────────────────
const VimeoEmbed = memo(({ url }) => {
  const embedUrl = getVimeoEmbedUrl(url);
  const [showPlayer, setShowPlayer] = useState(false);

  if (!embedUrl) return null;

  if (!showPlayer) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setShowPlayer(true)}
        style={[styles.ytContainer, { backgroundColor: '#1ab7ea' }]}
      >
        <View style={styles.embedPlaceholder}>
          <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.8)" />
          <Text style={styles.embedPlaceholderText}>Tap to play Vimeo video</Text>
        </View>
        <View style={styles.playOverlay}>
          <View style={[styles.playButton, { backgroundColor: 'rgba(26,183,234,0.85)' }]}>
            <Ionicons name="play" size={32} color={Colors.white} />
          </View>
        </View>
        <PlatformBadge icon="videocam" label="Vimeo" color="#1ab7ea" bg="rgba(0,0,0,0.55)" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.webEmbedContainer, { height: 210 }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={{ height: 210, backgroundColor: '#000' }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        renderLoading={() => <EmbedLoader color="#1ab7ea" bg="#000" />}
      />
    </View>
  );
});

// ─── SoundCloud Embed ─────────────────────────────────────────────────────────
const SoundCloudEmbed = memo(({ url }) => {
  const embedUrl = getSoundCloudEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <View style={[styles.webEmbedContainer, { height: 300 }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={{ height: 300, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        renderLoading={() => <EmbedLoader color="#ff5500" bg="#f2f2f2" />}
      />
      <PlatformBadge icon="musical-note" label="SoundCloud" color="#ff5500" bg="rgba(0,0,0,0.5)" />
    </View>
  );
});

// ─── Apple Music Embed ────────────────────────────────────────────────────────
const AppleMusicEmbed = memo(({ url }) => {
  const embedUrl = getAppleMusicEmbedUrl(url);
  if (!embedUrl) return null;

  const isAlbumOrPlaylist = /\/(album|playlist)\//.test(url);
  const height = isAlbumOrPlaylist ? 450 : 175;

  return (
    <View style={[styles.webEmbedContainer, { height }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={{ height, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        renderLoading={() => <EmbedLoader color="#fa2d55" bg="#000" />}
      />
      <PlatformBadge icon="musical-notes" label="Apple Music" color="#fa2d55" bg="rgba(0,0,0,0.6)" />
    </View>
  );
});

// ─── Generic Link Card ────────────────────────────────────────────────────────
const GenericLinkCard = memo(({ url }) => {
  const [ogData, setOgData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOGData(url).then((data) => {
      if (mounted) { setOgData(data); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [url]);

  const handlePress = useCallback(() => {
    Linking.openURL(url).catch(() => {});
  }, [url]);

  if (loading) {
    return (
      <View style={styles.genericCardLoading}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  const hasImage = ogData?.image?.length > 0;
  const hasTitle = ogData?.title?.length > 0;
  const hasDesc  = ogData?.description?.length > 0;

  if (!hasTitle && !hasDesc && !hasImage) {
    return (
      <TouchableOpacity style={styles.minimalLink} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="link-outline" size={16} color={ACCENT} />
        <Text style={styles.minimalLinkText} numberOfLines={1}>{getDomain(url)}</Text>
        <Ionicons name="open-outline" size={14} color={TEXT_MUTED} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.genericCard} onPress={handlePress} activeOpacity={0.85}>
      {hasImage && (
        <ExpoImage
          source={{ uri: ogData.image }}
          style={styles.genericCardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
      <View style={styles.genericCardBody}>
        {hasTitle && (
          <Text style={styles.genericCardTitle} numberOfLines={2}>{ogData.title}</Text>
        )}
        {hasDesc && (
          <Text style={styles.genericCardDesc} numberOfLines={2}>{ogData.description}</Text>
        )}
        <View style={styles.genericCardDomain}>
          <Ionicons name="globe-outline" size={12} color={TEXT_MUTED} />
          <Text style={styles.genericCardDomainText} numberOfLines={1}>
            {ogData.siteName || getDomain(url)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Small spinner shown while a WebView embed loads */
const EmbedLoader = ({ color, bg }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
    <ActivityIndicator size="small" color={color} />
  </View>
);

/** Platform badge shown over embeds */
const PlatformBadge = ({ icon, label, color, bg }) => (
  <View style={[styles.platformBadge, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[styles.platformBadgeText, { color }]}>{label}</Text>
  </View>
);

// ─── Main LinkPreview Component ───────────────────────────────────────────────
const LinkPreview = ({ url }) => {
  if (!url) return null;
  const cleanUrl = url.trim();

  if (isYouTubeUrl(cleanUrl))    return <YouTubeEmbed     url={cleanUrl} />;
  if (isSpotifyUrl(cleanUrl))    return <SpotifyEmbed     url={cleanUrl} />;
  if (isVimeoUrl(cleanUrl))      return <VimeoEmbed       url={cleanUrl} />;
  if (isSoundCloudUrl(cleanUrl)) return <SoundCloudEmbed  url={cleanUrl} />;
  if (isAppleMusicUrl(cleanUrl)) return <AppleMusicEmbed  url={cleanUrl} />;

  // Twitter/X and all other links → OG metadata card
  return <GenericLinkCard url={cleanUrl} />;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── YouTube ──────────────────────────────────────────────────────────────
  ytContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: Colors.black,
  },
  ytThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  ytBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ytBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: AppDetails.fontFamily?.body,
  },

  // ── Shared play overlay ───────────────────────────────────────────────────
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },

  // ── Spotify fallback (when embed redirects to landing page) ─────────────
  spotifyFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#191414',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  spotifyFallbackLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(29,185,84,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyFallbackTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: AppDetails.fontFamily?.body,
  },
  spotifyFallbackSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: AppDetails.fontFamily?.body,
  },

  // ── Vimeo placeholder (before tap) ───────────────────────────────────────
  embedPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1ab7ea22',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  embedPlaceholderText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: AppDetails.fontFamily?.body,
  },

  // ── Generic WebView embed wrapper ─────────────────────────────────────────
  webEmbedContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: Colors.black,
  },

  // ── Platform badge (overlay on embeds) ───────────────────────────────────
  platformBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  platformBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: AppDetails.fontFamily?.body,
  },

  // ── Generic OG card ───────────────────────────────────────────────────────
  genericCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  genericCardImage: {
    width: '100%',
    height: 180,
  },
  genericCardBody: {
    padding: 12,
  },
  genericCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: TEXT_BODY,
    lineHeight: 20,
    fontFamily: AppDetails.fontFamily?.body,
  },
  genericCardDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 18,
    fontFamily: AppDetails.fontFamily?.body,
  },
  genericCardDomain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  genericCardDomainText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontFamily: AppDetails.fontFamily?.body,
  },

  // ── Loading / minimal states ───────────────────────────────────────────────
  genericCardLoading: {
    height: 80,
    borderRadius: 14,
    marginTop: 10,
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: BG_CARD,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  minimalLinkText: {
    flex: 1,
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
    fontFamily: AppDetails.fontFamily?.body,
  },
});

export default memo(LinkPreview);

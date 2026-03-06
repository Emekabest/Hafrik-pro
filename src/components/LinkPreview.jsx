/**
 * LinkPreview — Universal link embed component
 *
 * • YouTube links → inline player via react-native-youtube-iframe
 * • Spotify links → WebView embed player
 * • Generic URLs  → OG-style card (image + title + description + domain)
 *
 * Usage:
 *   <LinkPreview url="https://youtube.com/watch?v=abc123" />
 */
import React, { useEffect, useState, memo, useCallback } from 'react';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check if a URL is a YouTube link */
const isYouTubeUrl = (url) => {
  if (!url) return false;
  return /(?:youtube\.com|youtu\.be)/i.test(url);
};

/** Check if a URL is a Spotify link */
const isSpotifyUrl = (url) => {
  if (!url) return false;
  return /open\.spotify\.com/i.test(url);
};

/**
 * Convert a Spotify URL to an embed URL.
 * e.g. https://open.spotify.com/track/xxx → https://open.spotify.com/embed/track/xxx
 */
const getSpotifyEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Already an embed URL
    if (u.pathname.startsWith('/embed/')) return url;
    // Convert /track/xxx or /album/xxx etc.
    return `https://open.spotify.com/embed${u.pathname}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
};

/** Extract domain from URL for display */
const getDomain = (url) => {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// ─── OG metadata cache (in-memory) ───────────────────────────────────────────
const ogCache = new Map();

/**
 * Fetch OG metadata using a lightweight HTML fetch + regex parse.
 * We avoid open-graph-scraper in RN because it relies on Node APIs.
 * Instead we fetch the raw HTML and extract <meta property="og:..." /> tags.
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

    // Only read first 50KB to avoid reading huge pages
    const text = await res.text();
    const head = text.substring(0, 50000);

    const get = (property) => {
      // Match both <meta property="og:title" content="..." /> and <meta name="og:title" content="..." />
      const re = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*?)["']`,
        'i'
      );
      const match = head.match(re);
      if (match) return decodeHTMLEntities(match[1]);

      // Try reversed order: content first, then property
      const re2 = new RegExp(
        `<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${property}["']`,
        'i'
      );
      const match2 = head.match(re2);
      if (match2) return decodeHTMLEntities(match2[1]);

      return null;
    };

    // Also try to get <title> as fallback
    const titleTagMatch = head.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleTag = titleTagMatch ? decodeHTMLEntities(titleTagMatch[1]) : null;

    const data = {
      title: get('og:title') || get('twitter:title') || titleTag || '',
      description: get('og:description') || get('twitter:description') || get('description') || '',
      image: get('og:image') || get('twitter:image') || '',
      siteName: get('og:site_name') || getDomain(url),
      url,
    };

    ogCache.set(url, data);
    return data;
  } catch (err) {
    // Return minimal fallback
    const fallback = { title: '', description: '', image: '', siteName: getDomain(url), url };
    ogCache.set(url, fallback);
    return fallback;
  }
};

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

  // Show thumbnail with play button initially for performance
  if (!showPlayer) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setShowPlayer(true);
          setPlaying(true);
        }}
        style={styles.ytContainer}
      >
        <ExpoImage
          source={{ uri: thumb.high }}
          style={styles.ytThumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={styles.ytPlayOverlay}>
          <View style={styles.ytPlayButton}>
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
        height={200}
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

// ─── Spotify Embed ────────────────────────────────────────────────────────────
const SpotifyEmbed = memo(({ url }) => {
  const embedUrl = getSpotifyEmbedUrl(url);
  if (!embedUrl) return null;

  // Detect type for height: tracks are shorter, albums/playlists are taller
  const isCompact = /\/(track|episode)\//.test(url);
  const height = isCompact ? 152 : 352;

  return (
    <View style={[styles.spotifyContainer, { height }]}>
      <WebView
        source={{ uri: embedUrl }}
        style={[styles.spotifyWebView, { height }]}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.tealAccent} />
          </View>
        )}
      />
      <View style={styles.spotifyBadge}>
        <Ionicons name="musical-notes" size={14} color="#1DB954" />
        <Text style={styles.spotifyBadgeText}>Spotify</Text>
      </View>
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
      if (mounted) {
        setOgData(data);
        setLoading(false);
      }
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
  const hasDesc = ogData?.description?.length > 0;

  // If no metadata at all, show a minimal link pill
  if (!hasTitle && !hasDesc && !hasImage) {
    return (
      <TouchableOpacity
        style={styles.minimalLink}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons name="link-outline" size={16} color={ACCENT} />
        <Text style={styles.minimalLinkText} numberOfLines={1}>
          {getDomain(url)}
        </Text>
        <Ionicons name="open-outline" size={14} color={TEXT_MUTED} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.genericCard}
      onPress={handlePress}
      activeOpacity={0.85}
    >
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
          <Text style={styles.genericCardTitle} numberOfLines={2}>
            {ogData.title}
          </Text>
        )}
        {hasDesc && (
          <Text style={styles.genericCardDesc} numberOfLines={2}>
            {ogData.description}
          </Text>
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

// ─── Main LinkPreview Component ───────────────────────────────────────────────
const LinkPreview = ({ url }) => {
  if (!url) return null;

  // Clean up URL
  const cleanUrl = url.trim();

  if (isYouTubeUrl(cleanUrl)) {
    return <YouTubeEmbed url={cleanUrl} />;
  }

  if (isSpotifyUrl(cleanUrl)) {
    return <SpotifyEmbed url={cleanUrl} />;
  }

  return <GenericLinkCard url={cleanUrl} />;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // YouTube
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
  ytPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  ytPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
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

  // Spotify
  spotifyContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    backgroundColor: '#191414',
  },
  spotifyWebView: {
    backgroundColor: 'transparent',
  },
  spotifyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spotifyBadgeText: {
    color: '#1DB954',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: AppDetails.fontFamily?.body,
  },

  // Generic card
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
  },
  genericCardDomainText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginLeft: 4,
    fontFamily: AppDetails.fontFamily?.body,
  },

  // Loading state
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
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#191414',
  },

  // Minimal link pill
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

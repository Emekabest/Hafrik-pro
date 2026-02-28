/**
 * GroupMedia — media grid component for a community.
 * Used as the MEDIA tab body inside GroupDetails.
 *
 * Props
 * ─────
 * groupId              {string|number}  required
 * token                {string}         auth token
 * listHeaderComponent  {JSX.Element}    rendered above the grid (parallax header)
 * onScroll             {function}       Animated.event handler to drive parallax
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGroupMedia } from './services/groupApi';

const { width: W } = Dimensions.get('window');

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';
const BORDER = 'rgba(12,63,68,0.09)';

const LIMIT = 24;

const MEDIA_TYPES = [
  { key: 'all',    label: 'All'    },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'reels',  label: 'Reels'  },
];

// ── Column / cell size per type ───────────────────────────────────────────────
const colsFor  = (type) => (type === 'reels' ? 1 : type === 'videos' ? 2 : 3);
const cellSize = (type) => W / colsFor(type);

// ── Sub-type tab bar (All | Photos | Videos | Reels) ─────────────────────────
const MediaTypeBar = React.memo(({ active, onSelect }) => (
  <View style={mg.typeBar}>
    {MEDIA_TYPES.map(({ key, label }) => (
      <TouchableOpacity
        key={key}
        style={[mg.typeBtn, active === key && mg.typeBtnOn]}
        onPress={() => onSelect(key)}
        activeOpacity={0.8}
      >
        <Text style={[mg.typeTxt, active === key && mg.typeTxtOn]}>{label}</Text>
      </TouchableOpacity>
    ))}
  </View>
));

// ── Individual grid cell ──────────────────────────────────────────────────────
const MediaCell = React.memo(({ item, type }) => {
  const isReel  = item.type === 'reel';
  const isVideo = item.type === 'video' || isReel;

  if (isReel || type === 'reels') {
    return (
      <View style={mg.reelCard}>
        <Image source={{ uri: item.url }} style={mg.reelImg} resizeMode="cover" />
        <View style={mg.overlay}>
          <View style={mg.playCircle}>
            <Ionicons name="play" size={22} color="#fff" />
          </View>
          <View style={mg.reelBadge}>
            <Ionicons name="film-outline" size={11} color="#fff" />
            <Text style={mg.reelBadgeTxt}>REEL</Text>
          </View>
        </View>
      </View>
    );
  }

  const sz = cellSize(type);

  return (
    <View style={{ width: sz, height: sz, padding: 1 }}>
      <Image
        source={{ uri: item.url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      {isVideo && (
        <View style={mg.videoOverlay}>
          <View style={mg.playCircleSmall}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        </View>
      )}
    </View>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
export default function GroupMedia({
  groupId,
  token,
  listHeaderComponent,
  onScroll,
}) {
  const [mediaType,    setMediaType]    = useState('all');
  const [items,        setItems]        = useState([]);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [error,        setError]        = useState(null);

  // Per-type first-page cache for smooth tab switching
  const cache = useRef({});

  // Flatten posts → individual media items, preserving post context
  const flatItems = useMemo(
    () =>
      items.flatMap((post) =>
        (post.media ?? []).map((m) => ({
          ...m,
          _postId:   post.post_id,
          _text:     post.text,
          _created:  post.created,
        }))
      ),
    [items]
  );

  useEffect(() => {
    fetchMedia(mediaType, 1, true);
  }, [mediaType, groupId]);

  const fetchMedia = async (type, pageNum, reset = false) => {
    setError(null);

    if (reset) {
      // Serve from cache while re-validating in background
      if (cache.current[type]) {
        setItems(cache.current[type]);
        setPage(1);
        setHasMore(cache.current[type].length === LIMIT);
        setLoading(false);
        return;
      }
      setLoading(true);
      setItems([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await getGroupMedia(groupId, type, pageNum, LIMIT, token);

      if (res?.status === 'success') {
        // Backend wraps real array inside res.data.data
        const posts = Array.isArray(res.data?.data) ? res.data.data : [];

        if (reset || pageNum === 1) {
          setItems(posts);
          cache.current[type] = posts; // cache first page
          setPage(1);
        } else {
          setItems((prev) => [...prev, ...posts]);
          setPage(pageNum);
        }

        setHasMore(posts.length === LIMIT);
      } else {
        setError(res?.message ?? 'Could not load media.');
      }
    } catch {
      setError('Network error. Tap Retry to try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const retry = useCallback(() => {
    delete cache.current[mediaType];
    fetchMedia(mediaType, 1, true);
  }, [mediaType, groupId, token]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchMedia(mediaType, page + 1, false);
  }, [loadingMore, hasMore, page, mediaType, groupId, token]);

  const onTypeSelect = useCallback((type) => {
    if (type === mediaType) return;
    setMediaType(type);
  }, [mediaType]);

  const numCols = colsFor(mediaType);

  const renderItem = useCallback(
    ({ item }) => <MediaCell item={item} type={mediaType} />,
    [mediaType]
  );

  // The sub-type bar + body are composed as ListHeaderComponent so the
  // single outer Animated.FlatList drives the parallax scroll.
  const GridHeader = (
    <>
      {listHeaderComponent}
      <MediaTypeBar active={mediaType} onSelect={onTypeSelect} />
    </>
  );

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error && items.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        {GridHeader}
        <View style={mg.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={MUTED} />
          <Text style={mg.errorTxt}>{error}</Text>
          <TouchableOpacity style={mg.retryBtn} onPress={retry} activeOpacity={0.85}>
            <Text style={mg.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading initial page ────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        {GridHeader}
        <View style={mg.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </View>
    );
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  return (
    <Animated.FlatList
      // key forces remount when numColumns changes (required by React Native)
      key={`${mediaType}-${numCols}`}
      data={flatItems}
      keyExtractor={(item, i) => `${item._postId ?? i}-${i}`}
      numColumns={numCols}
      renderItem={renderItem}
      ListHeaderComponent={GridHeader}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={flatItems.length === 0 ? mg.emptyOuter : mg.listContent}
      ListFooterComponent={
        loadingMore
          ? <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 16 }} />
          : null
      }
      ListEmptyComponent={
        <View style={mg.emptyWrap}>
          <View style={mg.emptyCircle}>
            <Ionicons name="images-outline" size={40} color={MUTED} />
          </View>
          <Text style={mg.emptyTxt}>
            No {mediaType === 'all' ? 'media' : mediaType} yet
          </Text>
        </View>
      }
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const mg = StyleSheet.create({
  // sub-type bar
  typeBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  typeBtnOn: { borderBottomColor: ACCENT },
  typeTxt:   { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.6 },
  typeTxtOn: { color: BRAND },

  // grid content
  listContent: { paddingBottom: 100 },
  emptyOuter:  { flexGrow: 1 },

  // reel card (full-width vertical)
  reelCard: {
    width: W,
    height: W * 1.35,
    marginBottom: 3,
  },
  reelImg: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  playCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  reelBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  reelBadgeTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // video overlay (play icon on grid cell)
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  playCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // centre loader / error
  center: { alignItems: 'center', paddingTop: 64, gap: 14 },
  errorTxt: {
    fontSize: 13,
    color: DARK,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 100,
  },
  retryTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTxt: { fontSize: 15, fontWeight: '700', color: DARK },
});

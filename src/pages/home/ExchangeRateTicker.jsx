import React, { useEffect, useState, useRef, memo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const DARK   = Colors.black;
const WHITE  = Colors.white;

const hex2 = (hex, op) => {
  const h = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

// ─── Markup added on top of live rate (per pair) ──────────────────────────────
const MARKUP = 10;

// ─── Currency pairs ───────────────────────────────────────────────────────────
const PAIRS = [
  { code: 'NGN', flag: '🇳🇬', label: 'NGN' },
  { code: 'GHS', flag: '🇬🇭', label: 'GHS' },
  { code: 'KES', flag: '🇰🇪', label: 'KES' },
  { code: 'ZAR', flag: '🇿🇦', label: 'ZAR' },
  { code: 'ETB', flag: '🇪🇹', label: 'ETB' },
  { code: 'USD', flag: '🇺🇸', label: 'USD' },
];

// ─── Static community snippets ────────────────────────────────────────────────
const SNIPPETS = [
  '📦 Canton Fair 2025 — register early',
  '🌍 Hafrik connects Africans across China',
  '💡 Post your tips — help the community',
  '🚢 Shipping updates in the feed daily',
  '🤝 New businesses listed this week',
  '📣 Share your sourcing wins on Hafrik',
  '🏆 Top traders in Guangzhou, Yiwu & Shenzhen',
  '✈️ Cheap routes: GZH → LOS → ACC → NBI',
];

const SEP = '     ·     ';

// ─── News fetch (BBC Africa via rss2json) ─────────────────────────────────────
let _cachedNews = null;
let _newsCacheSlot = -1;

async function fetchNews() {
  const slot = Math.floor(Date.now() / (1000 * 60 * 30));
  if (_cachedNews && _newsCacheSlot === slot) return _cachedNews;
  try {
    const rss = 'https://feeds.bbci.co.uk/news/world/africa/rss.xml';
    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=6`
    );
    const json = await res.json();
    const titles = (json?.items ?? []).map(i => `📰 ${i.title}`).filter(Boolean);
    if (titles.length) { _cachedNews = titles; _newsCacheSlot = slot; }
    return titles;
  } catch {
    return [];
  }
}

// ─── Hafrik articles fetch ────────────────────────────────────────────────────
let _cachedArticles = null;
let _articlesCacheSlot = -1;

async function fetchHafrikArticles() {
  const slot = Math.floor(Date.now() / (1000 * 60 * 30));
  if (_cachedArticles && _articlesCacheSlot === slot) return _cachedArticles;
  try {
    const res  = await fetch('https://hafrik.com/api/v1/articles/list.php?page=1&limit=8');
    const json = await res.json();
    const items = json?.data?.articles ?? json?.data?.data ?? json?.data ?? [];
    const titles = (Array.isArray(items) ? items : [])
      .map(a => a?.title ? `✍️ ${a.title}` : null)
      .filter(Boolean);
    if (titles.length) { _cachedArticles = titles; _articlesCacheSlot = slot; }
    return titles;
  } catch {
    return [];
  }
}

// ─── Exchange rates fetch (1-hour cache) ─────────────────────────────────────
let _cachedRates = null;
let _cacheSlot   = -1;

async function fetchRates() {
  const slot = Math.floor(Date.now() / (1000 * 60 * 60));
  if (_cachedRates && _cacheSlot === slot) return _cachedRates;
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/CNY');
    const json = await res.json();
    if (json?.rates) { _cachedRates = json.rates; _cacheSlot = slot; }
    return json?.rates ?? null;
  } catch {
    return null;
  }
}

const fmt = (v) => {
  if (!v && v !== 0) return '—';
  const n = v + MARKUP;
  return n >= 100 ? n.toFixed(1) : n >= 10 ? n.toFixed(2) : n.toFixed(3);
};

// ─── Ticker ───────────────────────────────────────────────────────────────────
const ExchangeRateTicker = () => {
  const [rates,    setRates]    = useState(null);
  const [news,     setNews]     = useState([]);
  const [articles, setArticles] = useState([]);
  const [textW,    setTextW]    = useState(0);

  const translateX = useRef(new Animated.Value(0)).current;
  const animRef    = useRef(null);

  useEffect(() => {
    fetchRates().then(r          => { if (r)        setRates(r); });
    fetchNews().then(n           => { if (n?.length) setNews(n); });
    fetchHafrikArticles().then(a => { if (a?.length) setArticles(a); });
  }, []);

  // Build ticker string
  const tickerItems = [
    ...(rates
      ? PAIRS.map(p =>
          rates[p.code] != null
            ? `${p.flag} 1 CNY = ${fmt(rates[p.code])} ${p.label}`
            : null
        ).filter(Boolean)
      : []
    ),
    ...articles,
    ...news,
    ...SNIPPETS,
  ];
  const tickerText = (tickerItems.length ? tickerItems : SNIPPETS).join(SEP);

  // Start/restart animation whenever measured width changes
  useEffect(() => {
    if (textW <= 0) return;

    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    translateX.setValue(0);

    // 28ms per pixel → comfortable news-ticker crawl speed
    const duration = textW * 28;

    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue:         -textW,
        duration,
        easing:          Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();

    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [textW, tickerText]);

  // Reset measurement when content changes so the hidden ScrollView re-measures
  const prevText = useRef('');
  if (prevText.current !== tickerText) {
    prevText.current = tickerText;
    if (textW > 0) {
      // will be re-measured via onContentSizeChange
      setTextW(0);
    }
  }

  const onContentSizeChange = (w) => {
    if (w > 0 && w !== textW) {
      setTextW(w);
    }
  };

  return (
    <View style={s.wrap}>
      {/* Hidden horizontal ScrollView — only purpose is reliable text width measurement */}
      <ScrollView
        horizontal
        scrollEnabled={false}
        style={s.measureScroll}
        onContentSizeChange={onContentSizeChange}
      >
        <Text style={s.tickerTxt}>{tickerText}{SEP}</Text>
      </ScrollView>

      {/* Left "LIVE" label */}
      <View style={s.labelBox}>
        <View style={s.liveDot} />
        <Text style={s.labelTxt}>LIVE</Text>
      </View>

      {/* Scrolling strip */}
      <View style={s.ticker}>
        <Animated.View
          style={[s.row, { transform: [{ translateX }] }]}
        >
          {/* Two copies side-by-side for seamless loop */}
          <Text style={s.tickerTxt}>{tickerText}{SEP}</Text>
          <Text style={s.tickerTxt}>{tickerText}{SEP}</Text>
        </Animated.View>
      </View>

      {/* Right icon */}
      <View style={s.rightIcon}>
        <Ionicons name="swap-horizontal" size={13} color={ACCENT} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   hex2(BRAND, 0.04),
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       hex2(BRAND, 0.08),
    height:            32,
    overflow:          'hidden',
  },

  // Hidden measurement ScrollView — positioned off-screen
  measureScroll: {
    position: 'absolute',
    top:      -200,
    left:     0,
    opacity:  0,
  },

  // Left "LIVE" label
  labelBox: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 10,
    height:            '100%',
    backgroundColor:   BRAND,
    borderRightWidth:  1,
    borderRightColor:  hex2(BRAND, 0.2),
  },
  liveDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: '#22c55e',
  },
  labelTxt: {
    fontSize:      9,
    fontWeight:    '900',
    color:         WHITE,
    letterSpacing: 1.2,
    fontFamily:    AppDetails.fontFamily?.body ?? 'System',
  },

  // Scrolling area
  ticker: {
    flex:           1,
    overflow:       'hidden',
    height:         '100%',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  tickerTxt: {
    fontSize:   11.5,
    fontWeight: '600',
    color:      DARK,
    paddingLeft: 12,
    fontFamily: AppDetails.fontFamily?.body ?? 'System',
  },

  // Right icon
  rightIcon: {
    paddingHorizontal: 10,
    height:            '100%',
    alignItems:        'center',
    justifyContent:    'center',
    borderLeftWidth:   1,
    borderLeftColor:   hex2(BRAND, 0.08),
  },
});

export default memo(ExchangeRateTicker);

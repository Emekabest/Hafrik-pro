import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal, FlatList, StatusBar, ActivityIndicator,
  Keyboard, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';

const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

const BRAND    = '#0c3f44';
const TEAL     = '#1f8e93';
const TEAL_L   = '#e8f6f7';
const WHITE    = '#ffffff';
const MUTED    = '#6b7a7c';
const DARK     = '#0d1f22';
const BG       = '#f4f9fa';
const SUCCESS  = '#10b981';

const a = (hex, op) => {
  const n = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${n}${alpha}`;
};

// ─── Language list ─────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect',           flag: '🔍' },
  { code: 'en',   name: 'English',               flag: '🇬🇧' },
  { code: 'zh',   name: 'Chinese (Simplified)',  flag: '🇨🇳' },
  { code: 'zh-TW',name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ar',   name: 'Arabic',                flag: '🇸🇦' },
  { code: 'fr',   name: 'French',                flag: '🇫🇷' },
  { code: 'es',   name: 'Spanish',               flag: '🇪🇸' },
  { code: 'pt',   name: 'Portuguese',            flag: '🇧🇷' },
  { code: 'ru',   name: 'Russian',               flag: '🇷🇺' },
  { code: 'de',   name: 'German',                flag: '🇩🇪' },
  { code: 'ja',   name: 'Japanese',              flag: '🇯🇵' },
  { code: 'ko',   name: 'Korean',                flag: '🇰🇷' },
  { code: 'hi',   name: 'Hindi',                 flag: '🇮🇳' },
  { code: 'tr',   name: 'Turkish',               flag: '🇹🇷' },
  { code: 'it',   name: 'Italian',               flag: '🇮🇹' },
  { code: 'nl',   name: 'Dutch',                 flag: '🇳🇱' },
  { code: 'pl',   name: 'Polish',                flag: '🇵🇱' },
  { code: 'vi',   name: 'Vietnamese',            flag: '🇻🇳' },
  { code: 'th',   name: 'Thai',                  flag: '🇹🇭' },
  { code: 'id',   name: 'Indonesian',            flag: '🇮🇩' },
  { code: 'ms',   name: 'Malay',                 flag: '🇲🇾' },
  { code: 'sw',   name: 'Swahili',               flag: '🌍' },
  { code: 'ha',   name: 'Hausa',                 flag: '🌍' },
  { code: 'yo',   name: 'Yoruba',                flag: '🇳🇬' },
  { code: 'ig',   name: 'Igbo',                  flag: '🇳🇬' },
  { code: 'am',   name: 'Amharic',               flag: '🇪🇹' },
  { code: 'so',   name: 'Somali',                flag: '🇸🇴' },
  { code: 'af',   name: 'Afrikaans',             flag: '🇿🇦' },
  { code: 'uk',   name: 'Ukrainian',             flag: '🇺🇦' },
  { code: 'cs',   name: 'Czech',                 flag: '🇨🇿' },
  { code: 'ro',   name: 'Romanian',              flag: '🇷🇴' },
  { code: 'sv',   name: 'Swedish',               flag: '🇸🇪' },
  { code: 'no',   name: 'Norwegian',             flag: '🇳🇴' },
  { code: 'da',   name: 'Danish',                flag: '🇩🇰' },
  { code: 'fi',   name: 'Finnish',               flag: '🇫🇮' },
  { code: 'el',   name: 'Greek',                 flag: '🇬🇷' },
  { code: 'he',   name: 'Hebrew',                flag: '🇮🇱' },
  { code: 'fa',   name: 'Persian',               flag: '🇮🇷' },
  { code: 'ur',   name: 'Urdu',                  flag: '🇵🇰' },
  { code: 'bn',   name: 'Bengali',               flag: '🇧🇩' },
  { code: 'ta',   name: 'Tamil',                 flag: '🇱🇰' },
  { code: 'te',   name: 'Telugu',                flag: '🇮🇳' },
  { code: 'mr',   name: 'Marathi',               flag: '🇮🇳' },
  { code: 'pa',   name: 'Punjabi',               flag: '🇮🇳' },
  { code: 'tl',   name: 'Filipino',              flag: '🇵🇭' },
  { code: 'hu',   name: 'Hungarian',             flag: '🇭🇺' },
  { code: 'bg',   name: 'Bulgarian',             flag: '🇧🇬' },
  { code: 'hr',   name: 'Croatian',              flag: '🇭🇷' },
  { code: 'sk',   name: 'Slovak',                flag: '🇸🇰' },
  { code: 'lt',   name: 'Lithuanian',            flag: '🇱🇹' },
  { code: 'lv',   name: 'Latvian',               flag: '🇱🇻' },
  { code: 'et',   name: 'Estonian',              flag: '🇪🇪' },
  { code: 'sl',   name: 'Slovenian',             flag: '🇸🇮' },
  { code: 'ca',   name: 'Catalan',               flag: '🇪🇸' },
  { code: 'sr',   name: 'Serbian',               flag: '🇷🇸' },
  { code: 'mk',   name: 'Macedonian',            flag: '🇲🇰' },
  { code: 'az',   name: 'Azerbaijani',           flag: '🇦🇿' },
  { code: 'ka',   name: 'Georgian',              flag: '🇬🇪' },
  { code: 'hy',   name: 'Armenian',              flag: '🇦🇲' },
  { code: 'kk',   name: 'Kazakh',                flag: '🇰🇿' },
  { code: 'uz',   name: 'Uzbek',                 flag: '🇺🇿' },
  { code: 'mn',   name: 'Mongolian',             flag: '🇲🇳' },
  { code: 'my',   name: 'Burmese',               flag: '🇲🇲' },
  { code: 'km',   name: 'Khmer',                 flag: '🇰🇭' },
  { code: 'lo',   name: 'Lao',                   flag: '🇱🇦' },
  { code: 'si',   name: 'Sinhala',               flag: '🇱🇰' },
  { code: 'ne',   name: 'Nepali',                flag: '🇳🇵' },
  { code: 'zu',   name: 'Zulu',                  flag: '🇿🇦' },
  { code: 'xh',   name: 'Xhosa',                 flag: '🇿🇦' },
];

const TARGET_LANGUAGES = LANGUAGES.filter(l => l.code !== 'auto');
const getLang = (code) => LANGUAGES.find(l => l.code === code) ?? LANGUAGES[1];

const QUICK_PAIRS = [
  { src: 'en', tgt: 'zh',  srcFlag: '🇬🇧', tgtFlag: '🇨🇳', label: 'EN › ZH' },
  { src: 'zh', tgt: 'en',  srcFlag: '🇨🇳', tgtFlag: '🇬🇧', label: 'ZH › EN' },
  { src: 'en', tgt: 'ar',  srcFlag: '🇬🇧', tgtFlag: '🇸🇦', label: 'EN › AR' },
  { src: 'en', tgt: 'fr',  srcFlag: '🇬🇧', tgtFlag: '🇫🇷', label: 'EN › FR' },
  { src: 'en', tgt: 'es',  srcFlag: '🇬🇧', tgtFlag: '🇪🇸', label: 'EN › ES' },
  { src: 'en', tgt: 'pt',  srcFlag: '🇬🇧', tgtFlag: '🇧🇷', label: 'EN › PT' },
  { src: 'en', tgt: 'ha',  srcFlag: '🇬🇧', tgtFlag: '🌍',  label: 'EN › HA' },
  { src: 'en', tgt: 'yo',  srcFlag: '🇬🇧', tgtFlag: '🇳🇬', label: 'EN › YO' },
  { src: 'fr', tgt: 'zh',  srcFlag: '🇫🇷', tgtFlag: '🇨🇳', label: 'FR › ZH' },
  { src: 'ar', tgt: 'zh',  srcFlag: '🇸🇦', tgtFlag: '🇨🇳', label: 'AR › ZH' },
];

// ─── Language Picker Modal ────────────────────────────────────────────────────
const LangPickerModal = ({ visible, onClose, onSelect, excludeCode, title }) => {
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const list = useMemo(() => {
    const src = title === 'From' ? LANGUAGES : TARGET_LANGUAGES;
    const q   = search.toLowerCase();
    return q ? src.filter(l => l.name.toLowerCase().includes(q) || l.code.includes(q)) : src;
  }, [search, title]);

  const handleClose  = () => { setSearch(''); onClose(); };
  const handleSelect = (lang) => { setSearch(''); onSelect(lang); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[pk.root, { paddingBottom: insets.bottom }]}>
        <View style={pk.handle} />
        <View style={pk.header}>
          <View>
            <Text style={pk.headerSub}>{title === 'From' ? 'Translate from' : 'Translate to'}</Text>
            <Text style={pk.title}>Select Language</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={pk.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={18} color={DARK} />
          </TouchableOpacity>
        </View>

        <View style={pk.searchWrap}>
          <View style={pk.searchRow}>
            <Ionicons name="search-outline" size={16} color={MUTED} />
            <TextInput
              style={pk.searchInput}
              placeholder="Search language…"
              placeholderTextColor={a(MUTED, 0.6)}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={list}
          keyExtractor={item => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item.code === excludeCode;
            return (
              <TouchableOpacity
                style={[pk.langItem, isSelected && pk.langItemSelected]}
                activeOpacity={0.75}
                onPress={() => !isSelected && handleSelect(item)}
              >
                <View style={pk.flagCircle}>
                  <Text style={pk.langFlag}>{item.flag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[pk.langName, isSelected && { color: TEAL }]}>{item.name}</Text>
                  <Text style={pk.langCode}>{item.code.toUpperCase()}</Text>
                </View>
                {isSelected && (
                  <View style={pk.selectedBadge}>
                    <Ionicons name="checkmark" size={13} color={WHITE} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={pk.sep} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </Modal>
  );
};

// ─── Speak button ─────────────────────────────────────────────────────────────
const SpeakBtn = ({ active, onPress, size = 17 }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[s.iconAction, active && s.iconActionActive]}>
    <Ionicons
      name={active ? 'stop-circle' : 'volume-high-outline'}
      size={size}
      color={active ? WHITE : TEAL}
    />
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TranslatorScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [sourceLang,     setSourceLang]     = useState('auto');
  const [targetLang,     setTargetLang]     = useState('zh');
  const [inputText,      setInputText]      = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang,   setDetectedLang]   = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [pickerFor,      setPickerFor]      = useState(null);
  const [copied,         setCopied]         = useState(false);
  const [speaking,       setSpeaking]       = useState(null);
  const [enlarged,       setEnlarged]       = useState(false);
  const inputRef = useRef(null);

  const sourceLangObj = getLang(sourceLang);
  const targetLangObj = getLang(targetLang);

  const translate = useCallback(async (text = inputText) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setLoading(true);
    setTranslatedText('');
    setDetectedLang(null);
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLang === 'auto' ? 'auto' : sourceLang,
        tl: targetLang,
        dt: 't',
        q:  trimmed,
      });
      const res  = await fetch(`${TRANSLATE_URL}?${params.toString()}`);
      const json = await res.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const translated = json[0].map(chunk => (Array.isArray(chunk) ? chunk[0] : '')).join('');
        setTranslatedText(translated);
        if (sourceLang === 'auto' && typeof json[2] === 'string') {
          const detected = getLang(json[2]);
          setDetectedLang(detected?.name ?? json[2]);
        }
      } else {
        Alert.alert('Error', 'Unexpected response from translation service.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not reach translation service. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [inputText, sourceLang, targetLang]);

  const handleSwap = useCallback(() => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText(inputText);
    }
    setDetectedLang(null);
  }, [sourceLang, targetLang, inputText, translatedText]);

  const handleCopy = useCallback(async () => {
    if (!translatedText) return;
    await Clipboard.setStringAsync(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [translatedText]);

  const handleClear = useCallback(() => {
    setInputText('');
    setTranslatedText('');
    setDetectedLang(null);
    inputRef.current?.focus();
  }, []);

  const speakText = useCallback(async (text, lang, key) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    try {
      await Speech.stop();
      setSpeaking(key);
      Speech.speak(clean, {
        language: lang === 'auto' ? undefined : lang,
        rate: 0.92, pitch: 1,
        onDone:    () => setSpeaking(null),
        onStopped: () => setSpeaking(null),
        onError:   () => setSpeaking(null),
      });
    } catch {
      setSpeaking(null);
      Alert.alert('Speech unavailable', 'Could not read this text aloud on your device.');
    }
  }, []);

  const stopSpeech = useCallback(async () => {
    await Speech.stop();
    setSpeaking(null);
  }, []);

  const handleLangSelected = (lang) => {
    if (pickerFor === 'source') {
      setSourceLang(lang.code);
      if (lang.code === targetLang) setTargetLang(sourceLang === 'auto' ? 'en' : sourceLang);
    } else {
      setTargetLang(lang.code);
      if (lang.code === sourceLang) setSourceLang('auto');
    }
    setTranslatedText('');
    setDetectedLang(null);
    setPickerFor(null);
  };

  const setQuickPair = (pair) => {
    setSourceLang(pair.src);
    setTargetLang(pair.tgt);
    setTranslatedText('');
    setDetectedLang(null);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative circles */}
        <View style={s.deco1} /><View style={s.deco2} />

        <View style={s.headerTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Translate</Text>
            <Text style={s.headerSub}>Google Translate · 65+ languages</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Language selector inside header ── */}
        <View style={s.langBar}>
          <TouchableOpacity style={s.langPill} onPress={() => setPickerFor('source')} activeOpacity={0.85}>
            <Text style={s.langPillFlag}>{sourceLangObj.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.langPillName} numberOfLines={1}>
                {sourceLang === 'auto' ? 'Auto Detect' : sourceLangObj.name}
              </Text>
              <Text style={s.langPillCode}>
                {sourceLang === 'auto' ? 'Any' : sourceLang.toUpperCase()}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={a(WHITE, 0.7)} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.swapBtn, sourceLang === 'auto' && s.swapBtnOff]}
            onPress={handleSwap}
            disabled={sourceLang === 'auto'}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={18} color={sourceLang === 'auto' ? a(WHITE, 0.3) : WHITE} />
          </TouchableOpacity>

          <TouchableOpacity style={s.langPill} onPress={() => setPickerFor('target')} activeOpacity={0.85}>
            <Text style={s.langPillFlag}>{targetLangObj.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.langPillName} numberOfLines={1}>{targetLangObj.name}</Text>
              <Text style={s.langPillCode}>{targetLang.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={a(WHITE, 0.7)} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Source card ── */}
        <View style={s.sourceCard}>
          {/* Card header */}
          <View style={s.cardHeader}>
            <View style={s.cardLangTag}>
              <Text style={s.cardLangTagFlag}>{sourceLangObj.flag}</Text>
              <Text style={s.cardLangTagName}>
                {sourceLang === 'auto' ? 'Enter text' : sourceLangObj.name}
              </Text>
            </View>
            <View style={s.cardHeaderActions}>
              {!!inputText && (
                <SpeakBtn
                  active={speaking === 'source'}
                  onPress={() => speaking === 'source' ? stopSpeech() : speakText(inputText, sourceLang === 'auto' ? targetLang : sourceLang, 'source')}
                />
              )}
              {!!inputText && (
                <TouchableOpacity onPress={handleClear} style={s.iconAction} activeOpacity={0.75}>
                  <Ionicons name="close" size={15} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TextInput
            ref={inputRef}
            style={s.textInput}
            multiline
            placeholder="Type or paste text here…"
            placeholderTextColor={a(MUTED, 0.5)}
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
            maxLength={5000}
          />

          {/* Card footer */}
          <View style={s.cardFooter}>
            <Text style={s.charCount}>{inputText.length}<Text style={{ color: a(MUTED, 0.5) }}> / 5000</Text></Text>
            <TouchableOpacity
              style={[s.translateBtn, (!inputText.trim() || loading) && s.translateBtnOff]}
              onPress={() => translate()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <Ionicons name="language-outline" size={16} color={WHITE} />
                  <Text style={s.translateBtnTxt}>Translate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Output card ── */}
        {(loading || !!translatedText) && (
          <View style={s.outputCard}>
            {/* Left accent bar */}
            <View style={s.outputAccent} />

            <View style={{ flex: 1 }}>
              {/* Output header */}
              <View style={s.cardHeader}>
                <View style={s.cardLangTag}>
                  <Text style={s.cardLangTagFlag}>{targetLangObj.flag}</Text>
                  <Text style={[s.cardLangTagName, { color: TEAL }]}>{targetLangObj.name}</Text>
                </View>
                {!!translatedText && (
                  <View style={s.cardHeaderActions}>
                    <SpeakBtn
                      active={speaking === 'target'}
                      onPress={() => speaking === 'target' ? stopSpeech() : speakText(translatedText, targetLang, 'target')}
                    />
                    <TouchableOpacity
                      onPress={handleCopy}
                      style={[s.iconAction, copied && s.iconActionSuccess]}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={15}
                        color={copied ? WHITE : TEAL}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEnlarged(true)}
                      style={[s.iconAction, { backgroundColor: a(BRAND, 0.1) }]}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="expand-outline" size={15} color={BRAND} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {loading ? (
                <View style={s.loadingRow}>
                  <ActivityIndicator size="small" color={TEAL} />
                  <Text style={s.loadingTxt}>Translating…</Text>
                </View>
              ) : (
                <Text style={s.outputText} selectable>{translatedText}</Text>
              )}

              {!!detectedLang && !loading && (
                <View style={s.detectedRow}>
                  <Ionicons name="scan-outline" size={12} color={TEAL} />
                  <Text style={s.detectedTxt}>Detected: <Text style={{ fontWeight: '700', color: TEAL }}>{detectedLang}</Text></Text>
                </View>
              )}

              {!!copied && (
                <View style={s.copiedBanner}>
                  <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                  <Text style={s.copiedTxt}>Copied to clipboard</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Quick pairs ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionDot} />
            <Text style={s.sectionLabel}>Quick Pairs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickScroll}>
            {QUICK_PAIRS.map(pair => {
              const active = sourceLang === pair.src && targetLang === pair.tgt;
              return (
                <TouchableOpacity
                  key={pair.label}
                  style={[s.quickChip, active && s.quickChipActive]}
                  onPress={() => setQuickPair(pair)}
                  activeOpacity={0.8}
                >
                  <Text style={s.quickChipFlag}>{pair.srcFlag}</Text>
                  <Ionicons name="arrow-forward" size={10} color={active ? WHITE : a(MUTED, 0.6)} style={{ marginHorizontal: 2 }} />
                  <Text style={s.quickChipFlag}>{pair.tgtFlag}</Text>
                  <Text style={[s.quickChipTxt, active && s.quickChipTxtActive]}>{pair.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tips ── */}
        <View style={s.tipsCard}>
          <View style={s.tipRow}>
            <View style={[s.tipIcon, { backgroundColor: a(TEAL, 0.12) }]}>
              <Ionicons name="flash-outline" size={15} color={TEAL} />
            </View>
            <Text style={s.tipTxt}>Tap a quick pair above to instantly switch language direction</Text>
          </View>
          <View style={[s.tipSep]} />
          <View style={s.tipRow}>
            <View style={[s.tipIcon, { backgroundColor: a('#f59e0b', 0.12) }]}>
              <Ionicons name="volume-high-outline" size={15} color="#f59e0b" />
            </View>
            <Text style={s.tipTxt}>Tap the speaker icon to hear the translation read aloud</Text>
          </View>
          <View style={s.tipSep} />
          <View style={s.tipRow}>
            <View style={[s.tipIcon, { backgroundColor: a(SUCCESS, 0.12) }]}>
              <Ionicons name="swap-horizontal-outline" size={15} color={SUCCESS} />
            </View>
            <Text style={s.tipTxt}>Swap languages to reverse-translate instantly</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Enlarge / Show Driver modal ── */}
      <Modal
        visible={enlarged}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEnlarged(false)}
      >
        <View style={s.enlargeOverlay}>
          {/* Gradient background */}
          <LinearGradient
            colors={[BRAND, '#144f55', TEAL]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Decorative blobs */}
          <View style={s.enlargeDeco1} />
          <View style={s.enlargeDeco2} />

          {/* Header row */}
          <View style={[s.enlargeHeader, { paddingTop: insets.top + 12 }]}>
            <View style={s.enlargeLangBadge}>
              <Text style={s.enlargeLangFlag}>{targetLangObj.flag}</Text>
              <Text style={s.enlargeLangName}>{targetLangObj.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setEnlarged(false)} style={s.enlargeClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={WHITE} />
            </TouchableOpacity>
          </View>

          {/* The big translated text */}
          <ScrollView
            contentContainerStyle={s.enlargeTextWrap}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.enlargeText} selectable>{translatedText}</Text>
          </ScrollView>

          {/* Bottom bar */}
          <View style={[s.enlargeFooter, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.enlargeHint}>Show this to the other person</Text>
            <View style={s.enlargeFooterBtns}>
              <TouchableOpacity
                style={s.enlargeFooterBtn}
                activeOpacity={0.8}
                onPress={() => speaking === 'target' ? stopSpeech() : speakText(translatedText, targetLang, 'target')}
              >
                <Ionicons name={speaking === 'target' ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color={WHITE} />
                <Text style={s.enlargeFooterBtnTxt}>{speaking === 'target' ? 'Stop' : 'Read Aloud'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.enlargeFooterBtn, { backgroundColor: a(WHITE, 0.15) }]}
                activeOpacity={0.8}
                onPress={handleCopy}
              >
                <Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={18} color={copied ? SUCCESS : WHITE} />
                <Text style={[s.enlargeFooterBtnTxt, copied && { color: SUCCESS }]}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LangPickerModal
        visible={pickerFor !== null}
        title={pickerFor === 'source' ? 'From' : 'To'}
        onClose={() => setPickerFor(null)}
        onSelect={handleLangSelected}
        excludeCode={pickerFor === 'source' ? targetLang : sourceLang}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 22 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: a(WHITE, 0.04), top: -80, right: -60,
  },
  deco2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: a(WHITE, 0.06), bottom: -40, left: -30,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 22,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: a(WHITE, 0.15),
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: WHITE, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:    { color: a(WHITE, 0.6), fontSize: 11.5, marginTop: 2 },

  // ── Language bar (inside header) ─────────────────────────────────────────────
  langBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  langPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: a(WHITE, 0.13),
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: a(WHITE, 0.15),
  },
  langPillFlag: { fontSize: 20 },
  langPillName: { fontSize: 13, fontWeight: '700', color: WHITE },
  langPillCode: { fontSize: 10.5, color: a(WHITE, 0.55), marginTop: 1 },

  swapBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: a(WHITE, 0.2),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: a(WHITE, 0.2),
  },
  swapBtnOff: { backgroundColor: a(WHITE, 0.07), borderColor: a(WHITE, 0.1) },

  // ── Source card ──────────────────────────────────────────────────────────────
  sourceCard: {
    backgroundColor: WHITE, borderRadius: 20, marginBottom: 12,
    shadowColor: DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
    overflow: 'hidden',
  },

  // ── Output card ──────────────────────────────────────────────────────────────
  outputCard: {
    flexDirection: 'row',
    backgroundColor: WHITE, borderRadius: 20, marginBottom: 24,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
    overflow: 'hidden',
    borderWidth: 1, borderColor: a(TEAL, 0.15),
  },
  outputAccent: {
    width: 4, backgroundColor: TEAL, borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
  },

  // ── Shared card header / footer ───────────────────────────────────────────────
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: a(MUTED, 0.1),
  },
  cardLangTag: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardLangTagFlag: { fontSize: 17 },
  cardLangTagName: { fontSize: 13, fontWeight: '700', color: DARK },

  cardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  iconAction: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: TEAL_L,
    alignItems: 'center', justifyContent: 'center',
  },
  iconActionActive:  { backgroundColor: TEAL },
  iconActionSuccess: { backgroundColor: SUCCESS },

  textInput: {
    minHeight: 130, maxHeight: 240,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: DARK, lineHeight: 25,
  },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: a(MUTED, 0.1),
  },
  charCount: { fontSize: 12, fontWeight: '700', color: MUTED },

  translateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: BRAND, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 11,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  translateBtnOff: { backgroundColor: a(MUTED, 0.4), shadowOpacity: 0 },
  translateBtnTxt: { color: WHITE, fontSize: 14, fontWeight: '800' },

  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20,
  },
  loadingTxt: { color: MUTED, fontSize: 14 },

  outputText: {
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 17, color: DARK, lineHeight: 27,
  },

  detectedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  detectedTxt: { fontSize: 12, color: MUTED },

  copiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  copiedTxt: { fontSize: 12, color: SUCCESS, fontWeight: '700' },

  // ── Quick pairs ───────────────────────────────────────────────────────────────
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot: { width: 4, height: 16, borderRadius: 2, backgroundColor: TEAL },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: DARK, letterSpacing: 0.8 },

  quickScroll: { paddingRight: 6, gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, backgroundColor: WHITE,
    borderWidth: 1, borderColor: a(MUTED, 0.15),
    shadowColor: DARK, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickChipActive: {
    backgroundColor: BRAND, borderColor: BRAND,
    shadowColor: BRAND, shadowOpacity: 0.25,
  },
  quickChipFlag: { fontSize: 14 },
  quickChipTxt:  { fontSize: 12, fontWeight: '700', color: MUTED, marginLeft: 2 },
  quickChipTxtActive: { color: WHITE },

  // ── Enlarge modal ─────────────────────────────────────────────────────────────
  enlargeOverlay: {
    flex: 1,
  },
  enlargeDeco1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: a(WHITE, 0.05), top: -80, right: -80,
  },
  enlargeDeco2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: a(WHITE, 0.04), bottom: 60, left: -60,
  },
  enlargeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  enlargeLangBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: a(WHITE, 0.15), borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  enlargeLangFlag: { fontSize: 18 },
  enlargeLangName: { fontSize: 13, fontWeight: '700', color: WHITE },
  enlargeClose: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: a(WHITE, 0.15),
    alignItems: 'center', justifyContent: 'center',
  },
  enlargeTextWrap: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 28, paddingVertical: 24,
  },
  enlargeText: {
    fontSize: 42,
    fontWeight: '900',
    color: WHITE,
    lineHeight: 56,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  enlargeFooter: {
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: a(WHITE, 0.15),
  },
  enlargeHint: {
    fontSize: 12.5, color: a(WHITE, 0.55), marginBottom: 14, fontWeight: '600',
  },
  enlargeFooterBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  enlargeFooterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: a(WHITE, 0.22),
    borderWidth: 1, borderColor: a(WHITE, 0.2),
  },
  enlargeFooterBtnTxt: { fontSize: 14, fontWeight: '800', color: WHITE },

  // ── Tips card ─────────────────────────────────────────────────────────────────
  tipsCard: {
    backgroundColor: WHITE, borderRadius: 18,
    paddingVertical: 4, paddingHorizontal: 14,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  tipIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tipTxt:  { flex: 1, fontSize: 12.5, color: MUTED, lineHeight: 18 },
  tipSep:  { height: StyleSheet.hairlineWidth, backgroundColor: a(MUTED, 0.1) },
});

// ─── Picker styles ────────────────────────────────────────────────────────────
const pk = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: a(MUTED, 0.2),
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: a(MUTED, 0.12),
  },
  headerSub: { fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '900', color: DARK },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: a(MUTED, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: a(MUTED, 0.07), borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: DARK,
  },
  langItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  langItemSelected: { backgroundColor: TEAL_L },
  flagCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
  langFlag: { fontSize: 22 },
  langName: { fontSize: 15, fontWeight: '600', color: DARK },
  langCode: { fontSize: 11, color: MUTED, marginTop: 1, fontWeight: '600' },
  selectedBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: a(MUTED, 0.1), marginLeft: 76 },
});

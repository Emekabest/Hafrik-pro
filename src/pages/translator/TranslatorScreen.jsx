import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal, FlatList, StatusBar, ActivityIndicator,
  Keyboard, Platform, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

// ─── Free Google Translate endpoint — no API key required ─────────────────────
const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
// ──────────────────────────────────────────────────────────────────────────────

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';
const INPUT_BG = '#f0f8f8';

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
  { code: 'kk',   name: 'Kazakh',               flag: '🇰🇿' },
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

// Picker excludes auto-detect for target
const TARGET_LANGUAGES = LANGUAGES.filter(l => l.code !== 'auto');

const getLang = (code) => LANGUAGES.find(l => l.code === code) ?? LANGUAGES[1];

// ─── Language Picker Modal ────────────────────────────────────────────────────
const LangPickerModal = ({ visible, onClose, onSelect, excludeCode, title }) => {
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const list = useMemo(() => {
    const src = title === 'From' ? LANGUAGES : TARGET_LANGUAGES;
    const q   = search.toLowerCase();
    return q ? src.filter(l => l.name.toLowerCase().includes(q) || l.code.includes(q)) : src;
  }, [search, title]);

  const handleClose = () => { setSearch(''); onClose(); };
  const handleSelect = (lang) => { setSearch(''); onSelect(lang); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[picker.root, { paddingBottom: insets.bottom }]}>
        {/* Handle bar */}
        <View style={picker.handle} />

        <View style={picker.header}>
          <Text style={picker.title}>{title} Language</Text>
          <TouchableOpacity onPress={handleClose} style={picker.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={BRAND} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={picker.searchRow}>
          <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginLeft: 12 }} />
          <TextInput
            style={picker.searchInput}
            placeholder="Search language…"
            placeholderTextColor={MUTED + '99'}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={list}
          keyExtractor={item => item.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[picker.langItem, item.code === excludeCode && picker.langItemDisabled]}
              activeOpacity={0.75}
              onPress={() => item.code !== excludeCode && handleSelect(item)}
            >
              <Text style={picker.langFlag}>{item.flag}</Text>
              <Text style={[picker.langName, item.code === excludeCode && { color: MUTED + '66' }]}>
                {item.name}
              </Text>
              {item.code === excludeCode && (
                <Text style={picker.currentTag}>current</Text>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={picker.sep} />}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TranslatorScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [sourceLang, setSourceLang]       = useState('auto');
  const [targetLang, setTargetLang]       = useState('zh');
  const [inputText, setInputText]         = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang]   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [pickerFor, setPickerFor]         = useState(null); // 'source' | 'target'
  const [copied, setCopied]               = useState(false);
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
      const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
      const params = new URLSearchParams({
        client: 'gtx',
        sl,
        tl:     targetLang,
        dt:     't',
        q:      trimmed,
      });

      const res  = await fetch(`${TRANSLATE_URL}?${params.toString()}`);
      const json = await res.json();

      // Response shape: [ [ ["translated","original",...], ... ], null, "detected_lang" ]
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const translated = json[0]
          .map(chunk => (Array.isArray(chunk) ? chunk[0] : ''))
          .join('');
        setTranslatedText(translated);

        if (sourceLang === 'auto' && typeof json[2] === 'string') {
          const detected = getLang(json[2]);
          setDetectedLang(detected?.name ?? json[2]);
        }
      } else {
        Alert.alert('Error', 'Unexpected response from translation service.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not reach translation service. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [inputText, sourceLang, targetLang]);

  const handleSwap = useCallback(() => {
    if (sourceLang === 'auto') return;
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);
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

  const handleLangSelected = (lang) => {
    if (pickerFor === 'source') {
      setSourceLang(lang.code);
      // If source becomes same as target, flip target
      if (lang.code === targetLang) setTargetLang(sourceLang === 'auto' ? 'en' : sourceLang);
    } else {
      setTargetLang(lang.code);
      if (lang.code === sourceLang) setSourceLang('auto');
    }
    setTranslatedText('');
    setDetectedLang(null);
    setPickerFor(null);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, TEAL]}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Translator</Text>
          <Text style={styles.headerSub}>Powered by Google Translate</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language selector row */}
        <View style={styles.langRow}>
          {/* Source language */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setPickerFor('source')}
            activeOpacity={0.8}
          >
            <Text style={styles.langFlag}>{sourceLangObj.flag}</Text>
            <Text style={styles.langBtnTxt} numberOfLines={1}>
              {sourceLang === 'auto' ? 'Detect' : sourceLangObj.name.split(' ')[0]}
            </Text>
            <Ionicons name="chevron-down" size={13} color={TEAL} />
          </TouchableOpacity>

          {/* Swap button */}
          <TouchableOpacity
            style={[styles.swapBtn, sourceLang === 'auto' && styles.swapBtnDisabled]}
            onPress={handleSwap}
            activeOpacity={0.8}
            disabled={sourceLang === 'auto'}
          >
            <Ionicons name="swap-horizontal" size={20} color={sourceLang === 'auto' ? MUTED + '55' : WHITE} />
          </TouchableOpacity>

          {/* Target language */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setPickerFor('target')}
            activeOpacity={0.8}
          >
            <Text style={styles.langFlag}>{targetLangObj.flag}</Text>
            <Text style={styles.langBtnTxt} numberOfLines={1}>
              {targetLangObj.name.split(' ')[0]}
            </Text>
            <Ionicons name="chevron-down" size={13} color={TEAL} />
          </TouchableOpacity>
        </View>

        {/* Input card */}
        <View style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <Text style={styles.inputCardLabel}>
              {sourceLang === 'auto' ? 'Enter text' : sourceLangObj.name}
            </Text>
            {inputText.length > 0 && (
              <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            multiline
            placeholder="Type or paste text to translate…"
            placeholderTextColor={MUTED + '77'}
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
            maxLength={5000}
          />

          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{inputText.length} / 5000</Text>
            <TouchableOpacity
              style={[styles.translateBtn, !inputText.trim() && styles.translateBtnDisabled]}
              onPress={() => translate()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={WHITE} />
              ) : (
                <>
                  <Ionicons name="language-outline" size={16} color={WHITE} />
                  <Text style={styles.translateBtnTxt}>Translate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Output card */}
        {(loading || translatedText) ? (
          <View style={styles.outputCard}>
            <View style={styles.outputCardHeader}>
              <Text style={styles.outputCardLabel}>
                {targetLangObj.name}
              </Text>
              {translatedText ? (
                <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.7}>
                  <Ionicons
                    name={copied ? 'checkmark-done' : 'copy-outline'}
                    size={17}
                    color={copied ? '#10b981' : TEAL}
                  />
                  <Text style={[styles.copyBtnTxt, copied && { color: '#10b981' }]}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={TEAL} />
                <Text style={styles.loadingTxt}>Translating…</Text>
              </View>
            ) : (
              <Text style={styles.outputText} selectable>{translatedText}</Text>
            )}

            {!!detectedLang && !loading && (
              <View style={styles.detectedRow}>
                <Ionicons name="information-circle-outline" size={13} color={MUTED} />
                <Text style={styles.detectedTxt}>Detected: {detectedLang}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Quick language pairs */}
        <Text style={styles.sectionLabel}>QUICK LANGUAGE PAIRS</Text>
        <View style={styles.quickGrid}>
          {[
            { src: 'en', tgt: 'zh',   label: 'EN → ZH' },
            { src: 'zh', tgt: 'en',   label: 'ZH → EN' },
            { src: 'en', tgt: 'ar',   label: 'EN → AR' },
            { src: 'en', tgt: 'fr',   label: 'EN → FR' },
            { src: 'en', tgt: 'es',   label: 'EN → ES' },
            { src: 'en', tgt: 'pt',   label: 'EN → PT' },
            { src: 'en', tgt: 'ha',   label: 'EN → HA' },
            { src: 'en', tgt: 'yo',   label: 'EN → YO' },
            { src: 'fr', tgt: 'zh',   label: 'FR → ZH' },
            { src: 'ar', tgt: 'zh',   label: 'AR → ZH' },
          ].map(pair => {
            const active = sourceLang === pair.src && targetLang === pair.tgt;
            return (
              <TouchableOpacity
                key={pair.label}
                style={[styles.quickChip, active && styles.quickChipActive]}
                activeOpacity={0.75}
                onPress={() => {
                  setSourceLang(pair.src);
                  setTargetLang(pair.tgt);
                  setTranslatedText('');
                  setDetectedLang(null);
                }}
              >
                <Text style={[styles.quickChipTxt, active && styles.quickChipTxtActive]}>
                  {pair.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Language picker modal */}
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
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  // ── Language row ──
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: TEAL + '28',
  },
  langFlag:    { fontSize: 18 },
  langBtnTxt:  { flex: 1, color: BRAND, fontSize: 13, fontFamily: 'WorkSans_600SemiBold', textAlign: 'center' },

  swapBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  swapBtnDisabled: { backgroundColor: MUTED + '33', shadowOpacity: 0 },

  // ── Input card ──
  inputCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    overflow: 'hidden',
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  inputCardLabel: { color: TEAL, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.8 },
  clearBtn:       { padding: 4 },

  textInput: {
    minHeight: 130,
    maxHeight: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: BRAND,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 24,
  },

  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  charCount: { color: MUTED + 'aa', fontSize: 11.5, fontFamily: 'WorkSans_400Regular' },

  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  translateBtnDisabled: { backgroundColor: MUTED + '55' },
  translateBtnTxt: { color: WHITE, fontSize: 13.5, fontFamily: 'WorkSans_700Bold' },

  // ── Output card ──
  outputCard: {
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: TEAL + '44',
    marginBottom: 24,
    overflow: 'hidden',
  },
  outputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TEAL + '22',
  },
  outputCardLabel: { color: TEAL, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.8 },

  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: TEAL + '14',
  },
  copyBtnTxt: { color: TEAL, fontSize: 12, fontFamily: 'WorkSans_600SemiBold' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
  },
  loadingTxt: { color: MUTED, fontSize: 13.5, fontFamily: 'WorkSans_400Regular' },

  outputText: {
    padding: 14,
    fontSize: 16,
    color: BRAND,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 25,
  },

  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  detectedTxt: { color: MUTED, fontSize: 11.5, fontFamily: 'WorkSans_400Regular' },

  // ── Quick chips ──
  sectionLabel: {
    color: MUTED, fontSize: 10,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.5, marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  quickChipActive: {
    backgroundColor: TEAL + '14',
    borderColor: TEAL + '55',
  },
  quickChipTxt: {
    color: MUTED,
    fontSize: 12.5,
    fontFamily: 'WorkSans_600SemiBold',
  },
  quickChipTxtActive: { color: TEAL },
});

// ─── Picker styles ────────────────────────────────────────────────────────────
const picker = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  title:    { flex: 1, color: BRAND, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 14,
    color: BRAND,
    fontFamily: 'WorkSans_400Regular',
  },

  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
  },
  langItemDisabled: { opacity: 0.4 },
  langFlag:    { fontSize: 22, width: 30, textAlign: 'center' },
  langName:    { flex: 1, color: BRAND, fontSize: 14, fontFamily: 'WorkSans_500Medium' },
  currentTag:  { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular', fontStyle: 'italic' },
  sep:         { height: 1, backgroundColor: BORDER + '66', marginLeft: 64 },
});

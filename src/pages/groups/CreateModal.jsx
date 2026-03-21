/**
 * Shared bottom-sheet modal for creating a Community or Business Page.
 * Requires the user to be verified; otherwise shows the verification gate.
 *
 * Props:
 *   visible   {boolean}
 *   type      {'community' | 'business'}
 *   navigation  {NavigationProp}
 *   token     {string}
 *   user      {object}
 *   onClose   {() => void}
 *   onCreated {(data) => void}
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme';

const BASE_URL = 'https://hafrik.com/api/v1';

const LANGUAGES = [
  'English','French','Arabic','Portuguese','Swahili','Hausa','Yoruba','Igbo',
  'Amharic','Zulu','Xhosa','Somali','Afrikaans','Tigrinya','Mandarin','Spanish',
  'German','Italian','Hindi','Other',
];

const BRAND        = Colors.primaryDark;
const ACCENT       = Colors.primary;
const FEATURE_GOLD = Colors.gradientOrange?.[0] ?? '#f59e0b';
const MUTED        = Colors.secondaryText;
const DARK         = Colors.black;
const WHITE        = Colors.white;

const CreateModal = ({ visible, type, navigation, token, user, onClose, onCreated }) => {
  const isCommunity = type === 'community';
  const { bottom }  = useSafeAreaInsets();

  // Always fetch fresh verification status — login API may not include verified.
  const [verifyLoading, setVerifyLoading] = useState(true);
  const [isVerified,    setIsVerified]    = useState(false);

  useEffect(() => {
    if (!visible || !token) return;
    setVerifyLoading(true);
    fetch('https://hafrik.com/api/v1/users/profile.php', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const u = data?.data?.user ?? {};
        setIsVerified(
          u.verified === true || u.verified === 1 || u.verified === '1' ||
          u.is_verified === true || u.is_verified === 1 || u.is_verified === '1' ||
          u.verified_value === 1,
        );
      })
      .catch(() => {
        setIsVerified(
          user?.verified === true || user?.verified === 1 ||
          user?.is_verified === true || user?.is_verified === 1 ||
          user?.verified_value === 1,
        );
      })
      .finally(() => setVerifyLoading(false));
  }, [visible, token]);

  const [name,      setName]      = useState('');
  const [username,  setUsername]  = useState('');
  const [about,     setAbout]     = useState('');
  const [privacy,   setPrivacy]   = useState('public');
  // category / country / language stored as { id, name } or string
  const [category,  setCategory]  = useState(null);
  const [country,   setCountry]   = useState(null);
  const [language,  setLanguage]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // Fetched data
  const [categoriesList,  setCategoriesList]  = useState([]);
  const [countriesList,   setCountriesList]   = useState([]);
  const [fetchingMeta,    setFetchingMeta]    = useState(false);

  // Picker modals
  const [showCatPicker,  setShowCatPicker]  = useState(false);
  const [showCntPicker,  setShowCntPicker]  = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Fetch categories + countries when modal opens for business
  useEffect(() => {
    if (!visible || isCommunity) return;
    setFetchingMeta(true);
    Promise.all([
      fetch(`${BASE_URL}/business/categories.php`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).catch(() => ({})),
      fetch(`${BASE_URL}/location/countries.php`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).catch(() => ({})),
    ]).then(([catRes, cntRes]) => {
      const cats = Array.isArray(catRes?.data) ? catRes.data : [];
      const cnts = Array.isArray(cntRes?.data) ? cntRes.data : [];
      setCategoriesList(cats);
      setCountriesList(cnts);
    }).finally(() => setFetchingMeta(false));
  }, [visible, isCommunity, token]);

  const reset = () => {
    setName(''); setUsername(''); setAbout(''); setPrivacy('public');
    setCategory(null); setCountry(null); setLanguage(''); setFormError('');
  };
  const handleClose = () => { reset(); onClose(); };

  const handleApplyNow = () => {
    onClose();
    setTimeout(() => {
      navigation.navigate('WebView', {
        url: 'https://hafrik.com/settings/verification',
        title: 'Get Verified',
      });
    }, 350);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError(`Please enter a ${isCommunity ? 'community' : 'business'} name.`);
      return;
    }
    if (!username.trim()) {
      setFormError('Please choose a unique username (no spaces).');
      return;
    }
    if (!isCommunity && !category) {
      setFormError('Please select a category for your business page.');
      return;
    }
    setSaving(true);
    try {
      const endpoint = isCommunity
        ? 'https://hafrik.com/api/v1/communities/create_community.php'
        : 'https://hafrik.com/api/v1/business/create_business.php';
      const body = new FormData();
      body.append('name',        name.trim());
      body.append('username',    username.trim());
      body.append('description', about.trim());
      if (isCommunity) {
        body.append('privacy', privacy);
      } else {
        body.append('category', String(category?.id ?? category));
        if (country)         body.append('country',  String(country?.id ?? country));
        if (language.trim()) body.append('language', language.trim());
      }
      const res  = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const json = await res.json().catch(() => ({}));
      const createdId = json?.data?.id ?? json?.id ?? null;
      if (json?.status === 'success' || createdId) {
        reset();
        onCreated?.(json.data ?? json);
        onClose();
        if (createdId) {
          setTimeout(() => {
            if (isCommunity) {
              navigation.navigate('GroupDetails', { groupId: createdId });
            } else {
              navigation.navigate('BusinessDetails', { pageId: createdId });
            }
          }, 350);
        }
      } else {
        setFormError(json?.message ?? 'Could not create. Please try again.');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Reusable picker modal ─────────────────────────────────────────────────────
  const PickerModal = useCallback(({ pickerVisible, title, items, onSelect, onClose: closePicker, selected, labelKey = 'name' }) => (
    <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={closePicker}>
      <TouchableOpacity style={cr.overlay} activeOpacity={1} onPress={closePicker} />
      <View style={cr.pickerSheet}>
        <View style={cr.pickerHeader}>
          <Text style={cr.pickerTitle}>{title}</Text>
          <TouchableOpacity onPress={closePicker} style={cr.pickerClose}>
            <Ionicons name="close" size={18} color={DARK} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item?.id ?? item?.category_id ?? item ?? i)}
          style={{ maxHeight: 340 }}
          renderItem={({ item }) => {
            const label = typeof item === 'string' ? item : (item[labelKey] ?? item.title ?? item.category_name ?? String(item));
            const isSelected = typeof item === 'string' ? item === selected : (item.id ?? item.category_id) === (selected?.id ?? selected?.category_id);
            return (
              <TouchableOpacity
                style={[cr.pickerItem, isSelected && cr.pickerItemOn]}
                onPress={() => { onSelect(item); closePicker(); }}
                activeOpacity={0.75}
              >
                <Text style={[cr.pickerItemTxt, isSelected && cr.pickerItemTxtOn]}>{label}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  ), []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity style={cr.overlay} activeOpacity={1} onPress={handleClose} />

      <PickerModal
        pickerVisible={showCatPicker}
        title="Select Category"
        items={categoriesList}
        selected={category}
        labelKey="name"
        onSelect={setCategory}
        onClose={() => setShowCatPicker(false)}
      />
      <PickerModal
        pickerVisible={showCntPicker}
        title="Select Country"
        items={countriesList}
        selected={country}
        labelKey="name"
        onSelect={setCountry}
        onClose={() => setShowCntPicker(false)}
      />
      <PickerModal
        pickerVisible={showLangPicker}
        title="Select Language"
        items={LANGUAGES}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setShowLangPicker(false)}
      />
      <KeyboardAvoidingView
        style={cr.kavWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={[cr.sheet, { paddingBottom: bottom + 8 }]}>
          <View style={cr.handle} />
          <TouchableOpacity style={cr.closeBtn} onPress={handleClose} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color={DARK} />
          </TouchableOpacity>

          {verifyLoading ? (
            <View style={cr.loadingWrap}>
              <ActivityIndicator color={BRAND} size="large" />
              <Text style={cr.loadingTxt}>Checking account status…</Text>
            </View>

          ) : isVerified ? (
            <>
              <Text style={cr.sheetTitle}>
                {isCommunity ? 'Create Community' : 'Create Business Page'}
              </Text>
              <ScrollView style={cr.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={cr.form}>
                  <Text style={cr.label}>{isCommunity ? 'Community Name' : 'Business Name'} *</Text>
                  <TextInput
                    style={cr.input} value={name} onChangeText={setName}
                    placeholder={isCommunity ? 'Give your community a name' : 'Your business or page name'}
                    placeholderTextColor={MUTED} maxLength={80}
                  />
                  <Text style={cr.label}>Username *</Text>
                  <TextInput
                    style={cr.input} value={username} onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
                    placeholder={isCommunity ? 'community_username' : 'business_handle'}
                    placeholderTextColor={MUTED} maxLength={40} autoCapitalize="none"
                  />
                  <Text style={cr.label}>{isCommunity ? 'Description' : 'About'}</Text>
                  <TextInput
                    style={[cr.input, cr.textarea]} value={about} onChangeText={setAbout}
                    placeholder={isCommunity ? 'What is this community about?' : 'What does your business do?'}
                    placeholderTextColor={MUTED} multiline numberOfLines={3}
                    textAlignVertical="top" maxLength={500}
                  />
                  {isCommunity ? (
                    <>
                      <Text style={cr.label}>Privacy</Text>
                      <View style={cr.privacyRow}>
                        {['public', 'private'].map((p) => (
                          <TouchableOpacity
                            key={p} style={[cr.privacyOpt, privacy === p && cr.privacyOptOn]}
                            onPress={() => setPrivacy(p)} activeOpacity={0.8}
                          >
                            <Ionicons
                              name={p === 'public' ? 'earth-outline' : 'lock-closed-outline'}
                              size={15} color={privacy === p ? WHITE : MUTED}
                            />
                            <Text style={[cr.privacyTxt, privacy === p && cr.privacyTxtOn]}>
                              {p === 'public' ? 'Public' : 'Private'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={cr.label}>Category *</Text>
                      <TouchableOpacity
                        style={[cr.pickerBtn, category && cr.pickerBtnOn]}
                        onPress={() => setShowCatPicker(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={[cr.pickerTxt, !category && cr.pickerPlaceholder]}>
                          {category
                            ? (category.name ?? category.title ?? String(category))
                            : (fetchingMeta ? 'Loading categories…' : 'Select a category')}
                        </Text>
                        <Ionicons name="chevron-down" size={15} color={category ? BRAND : MUTED} />
                      </TouchableOpacity>

                      <Text style={cr.label}>Country</Text>
                      <TouchableOpacity
                        style={[cr.pickerBtn, country && cr.pickerBtnOn]}
                        onPress={() => setShowCntPicker(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={[cr.pickerTxt, !country && cr.pickerPlaceholder]}>
                          {country
                            ? (country.name ?? String(country))
                            : (fetchingMeta ? 'Loading countries…' : 'Select a country')}
                        </Text>
                        <Ionicons name="chevron-down" size={15} color={country ? BRAND : MUTED} />
                      </TouchableOpacity>

                      <Text style={cr.label}>Language</Text>
                      <TouchableOpacity
                        style={[cr.pickerBtn, language && cr.pickerBtnOn]}
                        onPress={() => setShowLangPicker(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={[cr.pickerTxt, !language && cr.pickerPlaceholder]}>
                          {language || 'Select a language'}
                        </Text>
                        <Ionicons name="chevron-down" size={15} color={language ? BRAND : MUTED} />
                      </TouchableOpacity>
                    </>
                  )}
                  {!!formError && (
                    <Text style={cr.errorTxt}>{formError}</Text>
                  )}
                </View>
              </ScrollView>
              <View style={cr.formFooter}>
                <TouchableOpacity
                  style={[cr.submitBtn, (!name.trim() || !username.trim() || saving) && cr.submitBtnOff]}
                  onPress={handleSubmit} disabled={!name.trim() || !username.trim() || saving} activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <Text style={cr.submitTxt}>Create</Text>}
                </TouchableOpacity>
              </View>
            </>

          ) : (
            <>
              <View style={cr.verifyWrap}>
                <LinearGradient colors={[BRAND + '18', ACCENT + '0C']} style={cr.verifyIcon}>
                  <Ionicons name="shield-checkmark" size={34} color={BRAND} />
                </LinearGradient>
                <Text style={cr.verifyTitle}>Verification Required</Text>
                <Text style={cr.verifySub}>
                  Only verified accounts can create {isCommunity ? 'communities' : 'business pages'} on Hafrik.
                </Text>
                <View style={cr.benefitsCard}>
                  {[
                    { icon: 'checkmark-circle', color: ACCENT,       text: 'Verified badge on your profile' },
                    { icon: 'trending-up',       color: BRAND,        text: 'Higher visibility in feeds & search' },
                    { icon: 'star',              color: FEATURE_GOLD, text: 'Access to creator & business tools' },
                  ].map(({ icon, color, text }) => (
                    <View key={text} style={cr.benefitRow}>
                      <View style={[cr.benefitDot, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon} size={14} color={color} />
                      </View>
                      <Text style={cr.benefitTxt}>{text}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={cr.verifyFooter}>
                <TouchableOpacity style={cr.applyBtn} onPress={handleApplyNow} activeOpacity={0.88}>
                  <Ionicons name="open-outline" size={15} color={WHITE} />
                  <Text style={cr.applyTxt}>Apply for Verification</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                  <Text style={cr.maybeTxt}>Maybe later</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateModal;

const cr = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000060' },
  kavWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: MUTED + '55',
    alignSelf: 'center', marginBottom: 6,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 16,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingTxt:  { fontSize: 13, color: MUTED, fontWeight: '500' },

  sheetTitle: { fontSize: 18, fontWeight: '800', color: DARK, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  formScroll: { maxHeight: 380 },
  form:       { paddingHorizontal: 20, paddingBottom: 10 },
  label:      { fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: DARK,
    backgroundColor: Colors.background,
  },
  textarea:   { height: 90, textAlignVertical: 'top' },
  privacyRow: { flexDirection: 'row', gap: 10 },
  privacyOpt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  privacyOptOn: { backgroundColor: BRAND, borderColor: BRAND },
  privacyTxt:   { fontSize: 13, fontWeight: '600', color: MUTED },
  privacyTxtOn: { color: WHITE },

  formFooter: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  submitBtn: {
    backgroundColor: BRAND, borderRadius: 30, paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnOff: { opacity: 0.45 },
  submitTxt:    { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.2 },

  // Verify gate
  verifyWrap:   { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 6 },
  verifyIcon:   { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  verifyTitle:  { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 6, textAlign: 'center' },
  verifySub:    { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  benefitsCard: { width: '100%', backgroundColor: Colors.background, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
  benefitRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitDot:   { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  benefitTxt:   { fontSize: 13, color: DARK, fontWeight: '500', flex: 1 },
  verifyFooter: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, gap: 12 },
  applyBtn: {
    backgroundColor: BRAND, borderRadius: 30, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  applyTxt:  { fontSize: 14, fontWeight: '800', color: WHITE },
  maybeTxt:  { fontSize: 13, color: MUTED, textAlign: 'center', fontWeight: '500' },
  errorTxt:  { fontSize: 13, color: '#E53935', marginTop: 10, fontWeight: '500' },

  // ── Picker button (replaces TextInput for category/country/language) ──
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  pickerBtnOn:      { borderColor: BRAND },
  pickerTxt:        { fontSize: 14, color: DARK, flex: 1 },
  pickerPlaceholder:{ color: MUTED },

  // ── Picker modal sheet ──
  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: DARK },
  pickerClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  pickerItemOn:    { backgroundColor: ACCENT + '0D' },
  pickerItemTxt:   { fontSize: 14, color: DARK, fontWeight: '500', flex: 1 },
  pickerItemTxtOn: { color: BRAND, fontWeight: '700' },
});

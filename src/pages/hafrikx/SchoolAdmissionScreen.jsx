import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, StatusBar,
  LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../AuthContext';
import { GetEditableProfileController } from '../../controllers/profilecontroller';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const PURPLE = '#8b5cf6';
const GREEN  = '#10b981';
const WHITE  = '#ffffff';
const MUTED  = '#6b7a7c';
const DARK   = '#0d1f22';
const BG     = '#f4f9fa';
const BORDER = '#ddeaec';
const CARD   = '#ffffff';

const a = (hex, op) => {
  const n = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${n}${alpha}`;
};

// ─── Static data ─────────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  { icon: 'send-outline',                  text: 'You submit your basic details.' },
  { icon: 'people-outline',                text: 'Hafrik and GoBeyond Admissions review your request.' },
  { icon: 'chatbubbles-outline',           text: 'We contact you through your preferred method.' },
  { icon: 'clipboard-outline',             text: 'We confirm your level, budget, documents, course, and intake.' },
  { icon: 'bulb-outline',                  text: 'We recommend the best admission route for you.' },
  { icon: 'checkmark-done-circle-outline', text: 'We guide you through the full admission process.' },
];

const DOCUMENTS = [
  'International passport',
  'Academic certificate',
  'Transcript or result',
  'Passport photograph',
  'English proficiency letter or IELTS / TOEFL (if required)',
  'HSK certificate for Chinese-taught programs (if required)',
  'Study plan or personal statement',
  'Recommendation letters for Master\'s or PhD',
  'Medical examination form (when required)',
];

const CONTACT_OPTIONS = ['WhatsApp', 'Phone', 'Email', 'In-app'];
const firstValue = (...vals) =>
  vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <View style={s.field}>
      <View style={s.fieldRow}>
        <Text style={s.fieldLabel}>{label}</Text>
        {required
          ? <View style={s.reqBadge}><Text style={s.reqTxt}>Required</Text></View>
          : <Text style={s.optTxt}>optional</Text>}
      </View>
      {children}
      {!!error && (
        <View style={s.errRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text style={s.errTxt}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Success ──────────────────────────────────────────────────────────────────
function SuccessView({ onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.successGrad, { paddingTop: insets.top + 40 }]}
      >
        <View style={s.successCircle}>
          <Ionicons name="checkmark-circle" size={56} color={WHITE} />
        </View>
        <Text style={s.successTitle}>Admission Request Submitted</Text>
        <Text style={s.successMsg}>
          Your request has been received. Hafrik and GoBeyond Admissions will review your details and contact you through your preferred contact method.
        </Text>
        <View style={s.successBadge}>
          <Ionicons name="people-circle-outline" size={14} color={a(WHITE, 0.75)} style={{ marginRight: 6 }} />
          <Text style={s.successBadgeTxt}>Powered by GoBeyond Admissions</Text>
        </View>
      </LinearGradient>
      <View style={s.successSteps}>
        {[
          { color: TEAL,   text: 'Your details are being reviewed by our admissions team.' },
          { color: GOLD,   text: 'We will contact you within 24–48 hours through your chosen method.' },
          { color: PURPLE, text: 'Prepare your documents — we will guide you on what is needed.' },
        ].map((step, i) => (
          <View key={i} style={s.successStep}>
            <View style={[s.successDot, { backgroundColor: step.color }]} />
            <Text style={s.successStepTxt}>{step.text}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={onBack} activeOpacity={0.87} style={{ marginHorizontal: 20 }}>
        <LinearGradient
          colors={[BRAND, TEAL]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.successBtn}
        >
          <Ionicons name="arrow-back" size={17} color={WHITE} />
          <Text style={s.successBtnTxt}>Back to Services</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SchoolAdmissionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, token } = useAuth();
  const { service_id, service_name } = route.params ?? {};

  const [selectedPath, setSelectedPath] = useState(null); // null | 'Scholarship' | 'Self-Sponsored'

  const [profileLoading, setProfileLoading] = useState(false);
  const [fullName,  setFullName]  = useState(() => firstValue(user?.full_name, user?.name, [user?.first_name, user?.last_name].filter(Boolean).join(' '), user?.username));
  const [phone,     setPhone]     = useState(() => firstValue(user?.phone, user?.user_phone, user?.mobile));
  const [email,     setEmail]     = useState(() => firstValue(user?.email, user?.user_email));
  const [country,   setCountry]   = useState(() => firstValue(user?.country_name, user?.country, user?.user_country));
  const [city,      setCity]      = useState(() => firstValue(user?.current_city, user?.city, user?.user_current_city));
  const [preferredContact, setPreferredContact] = useState('WhatsApp');
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [errors,    setErrors]    = useState({});
  const [focused,   setFocused]   = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return;
      setProfileLoading(true);
      try {
        const res = await GetEditableProfileController(token);
        const p   = res?.data;
        if (!mounted || !p) return;
        setFullName(prev => prev || firstValue(p.full_name, p.name, [p.first_name, p.last_name].filter(Boolean).join(' '), p.username));
        setPhone(prev    => prev || firstValue(p.phone, p.user_phone, p.mobile));
        setEmail(prev    => prev || firstValue(p.email, p.user_email));
        setCountry(prev  => prev || firstValue(p.country_name, p.country, p.user_country));
        setCity(prev     => prev || firstValue(p.current_city, p.city, p.user_current_city));
      } finally { if (mounted) setProfileLoading(false); }
    })();
    return () => { mounted = false; };
  }, [token]);

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!phone.trim())    e.phone    = 'Phone number is required';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await apiClient.post('/services/apply.php', {
        service_id,
        service_title:     service_name ?? 'School Admission',
        full_name:         fullName.trim(),
        phone:             phone.trim(),
        email:             email.trim(),
        country:           country.trim(),
        city:              city.trim(),
        preferred_contact: preferredContact,
        admission_path:    selectedPath ?? 'Not selected',
        more_information:  notes.trim(),
        profile_prefilled: true,
      });
      setSubmitted(true);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message ?? 'Failed to submit. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const selectPath = (path) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPath(prev => prev === path ? null : path);
  };

  const iStyle = (f) => [s.input, focused === f && s.inputFocus, !!errors[f] && s.inputErr];

  if (submitted) return <SuccessView onBack={() => navigation.goBack()} />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header (scrolls with content) ── */}
        <LinearGradient
          colors={[BRAND, '#144f55', TEAL]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={s.blob1} />
          <View style={s.blob2} />
          <View style={s.navRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color={WHITE} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={s.hBadge}>
              <Ionicons name="school-outline" size={11} color={WHITE} style={{ marginRight: 4 }} />
              <Text style={s.hBadgeTxt}>Study in China</Text>
            </View>
          </View>
          <View style={s.headerBody}>
            <View style={s.headerIconBox}>
              <Ionicons name="school" size={32} color={WHITE} />
            </View>
            <Text style={s.headerTitle}>School Admission</Text>
            <Text style={s.headerSub}>Study in China with Ease</Text>
          </View>
          <View style={s.partnerPill}>
            <View style={s.partnerDot}>
              <Ionicons name="people" size={12} color={GOLD} />
            </View>
            <Text style={s.partnerPillTxt}>Powered by GoBeyond Admissions</Text>
          </View>
        </LinearGradient>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* ── Path selector ── */}
          <Text style={s.sectionLbl}>SELECT YOUR ADMISSION PATH</Text>
          <Text style={s.sectionHint}>Tap a path to explore everything you need to know.</Text>

          <View style={s.pathSelectorRow}>
            {/* Scholarship */}
            <TouchableOpacity
              style={[
                s.pathTab,
                selectedPath === 'Scholarship'
                  ? { backgroundColor: PURPLE, borderColor: PURPLE }
                  : { backgroundColor: a(PURPLE, 0.06), borderColor: a(PURPLE, 0.25) },
              ]}
              onPress={() => { selectPath('Scholarship'); navigation.navigate('AdmissionInfoScreen', { type: 'Scholarship' }); }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="trophy"
                size={20}
                color={selectedPath === 'Scholarship' ? WHITE : PURPLE}
                style={{ marginBottom: 6 }}
              />
              <Text style={[s.pathTabTitle, selectedPath === 'Scholarship' && { color: WHITE }]}>Scholarship</Text>
              <Text style={[s.pathTabSub, selectedPath === 'Scholarship' && { color: a(WHITE, 0.8) }]}>Funded by gov. or university</Text>
              <View style={s.pathTabArrow}>
                <Ionicons name="chevron-forward" size={12} color={selectedPath === 'Scholarship' ? WHITE : PURPLE} />
              </View>
            </TouchableOpacity>

            {/* Self-Sponsored */}
            <TouchableOpacity
              style={[
                s.pathTab,
                selectedPath === 'Self-Sponsored'
                  ? { backgroundColor: GREEN, borderColor: GREEN }
                  : { backgroundColor: a(GREEN, 0.06), borderColor: a(GREEN, 0.25) },
              ]}
              onPress={() => { selectPath('Self-Sponsored'); navigation.navigate('AdmissionInfoScreen', { type: 'Self-Sponsored' }); }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="flash"
                size={20}
                color={selectedPath === 'Self-Sponsored' ? WHITE : GREEN}
                style={{ marginBottom: 6 }}
              />
              <Text style={[s.pathTabTitle, selectedPath === 'Self-Sponsored' && { color: WHITE }]}>Self-Sponsored</Text>
              <Text style={[s.pathTabSub, selectedPath === 'Self-Sponsored' && { color: a(WHITE, 0.8) }]}>Faster, pay your tuition</Text>
              <View style={[s.pathTabArrow, { borderColor: a(GREEN, 0.2) }]}>
                <Ionicons name="chevron-forward" size={12} color={selectedPath === 'Self-Sponsored' ? WHITE : GREEN} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Not sure hint ── */}
          {!selectedPath && (
            <View style={s.notSureStrip}>
              <Ionicons name="help-circle-outline" size={18} color={TEAL} style={{ marginRight: 8 }} />
              <Text style={s.notSureTxt}>
                Not sure which path? Fill in the form below and we'll guide you to the right one.
              </Text>
            </View>
          )}

          {/* ── Contact form ── */}
          <View style={s.formCard}>
            <View style={s.formCardHead}>
              <View style={s.formCardIconBox}>
                <Ionicons name="person-circle-outline" size={20} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.formCardTitle}>Your Contact Details</Text>
                <Text style={s.formCardSub}>
                  {profileLoading ? 'Loading your profile…' : 'Pre-filled from your profile. Edit before submitting.'}
                </Text>
              </View>
              {profileLoading && <ActivityIndicator size="small" color={TEAL} />}
            </View>

            <Field label="Full Name" required error={errors.fullName}>
              <TextInput style={iStyle('fullName')} placeholder="Your full name" placeholderTextColor={a(MUTED, 0.55)}
                value={fullName} onChangeText={v => { setFullName(v); if (errors.fullName) setErrors(p => ({ ...p, fullName: null })); }}
                onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)} />
            </Field>

            <Field label="Phone" required error={errors.phone}>
              <TextInput style={iStyle('phone')} placeholder="Your phone number" placeholderTextColor={a(MUTED, 0.55)}
                value={phone} onChangeText={v => { setPhone(v); if (errors.phone) setErrors(p => ({ ...p, phone: null })); }}
                keyboardType="phone-pad" onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} />
            </Field>

            <Field label="Email">
              <TextInput style={iStyle('email')} placeholder="Your email address" placeholderTextColor={a(MUTED, 0.55)}
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
            </Field>

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Field label="Country">
                  <TextInput style={iStyle('country')} placeholder="e.g. Nigeria" placeholderTextColor={a(MUTED, 0.55)}
                    value={country} onChangeText={setCountry} onFocus={() => setFocused('country')} onBlur={() => setFocused(null)} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="City">
                  <TextInput style={iStyle('city')} placeholder="e.g. Lagos" placeholderTextColor={a(MUTED, 0.55)}
                    value={city} onChangeText={setCity} onFocus={() => setFocused('city')} onBlur={() => setFocused(null)} />
                </Field>
              </View>
            </View>

            <View style={s.field}>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Preferred Contact</Text>
                <Text style={s.optTxt}>how we reach you</Text>
              </View>
              <View style={s.chipRow}>
                {CONTACT_OPTIONS.map(opt => {
                  const active = preferredContact === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setPreferredContact(opt)}
                      activeOpacity={0.82}
                    >
                      {active && <Ionicons name="checkmark-circle" size={13} color={WHITE} style={{ marginRight: 4 }} />}
                      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field label="More Information">
              <TextInput
                style={[iStyle('notes'), s.textarea]}
                placeholder="Your study goals, level, preferred course, budget range, or any questions."
                placeholderTextColor={a(MUTED, 0.55)}
                value={notes} onChangeText={setNotes}
                multiline textAlignVertical="top"
                onFocus={() => setFocused('notes')} onBlur={() => setFocused(null)}
              />
            </Field>

            {!!errors.submit && (
              <View style={s.submitErrCard}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={s.submitErrTxt}>{errors.submit}</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.87}>
              <LinearGradient
                colors={loading ? [MUTED, MUTED] : [BRAND, TEAL]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.submitBtn}
              >
                {loading
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <>
                      <Ionicons name="send" size={17} color={WHITE} />
                      <Text style={s.submitTxt}>Submit Admission Request</Text>
                    </>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <View style={s.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={MUTED} style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={s.disclaimerTxt}>
              Submitting this form does not guarantee admission or scholarship approval. Final admission decisions are made by the university or scholarship body.
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  blob1:  { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  blob2:  { position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.05)' },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  hBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hBadgeTxt: { color: WHITE, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  headerBody: { alignItems: 'center', marginBottom: 18 },
  headerIconBox: { width: 68, height: 68, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: WHITE, letterSpacing: -0.5, textAlign: 'center' },
  headerSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  partnerPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  partnerDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: a(GOLD, 0.3), alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  partnerPillTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  // Body
  body: { paddingHorizontal: 18, paddingTop: 24 },

  // Section label
  sectionLbl: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 1.2, marginBottom: 4 },
  sectionHint: { fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 17 },

  // Path selector
  pathSelectorRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  pathTab: {
    flex: 1, borderRadius: 18, borderWidth: 2,
    padding: 16, alignItems: 'center', position: 'relative',
  },
  pathTabTitle: { fontSize: 14, fontWeight: '800', color: DARK, textAlign: 'center', marginBottom: 4 },
  pathTabSub: { fontSize: 11, color: MUTED, textAlign: 'center', lineHeight: 15 },
  pathTabCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  pathTabArrow: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1, borderColor: a(PURPLE, 0.2),
    alignItems: 'center', justifyContent: 'center',
  },

  // Not sure strip
  notSureStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: a(TEAL, 0.07), borderRadius: 14, borderWidth: 1, borderColor: a(TEAL, 0.18), padding: 13, marginBottom: 20 },
  notSureTxt: { flex: 1, fontSize: 12.5, color: TEAL, lineHeight: 18, fontWeight: '500' },

  // Info section
  infoSection: { marginBottom: 6 },
  infoSectionHead: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  infoSectionHeadTxt: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },

  // Collapsible
  collapse: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 12, overflow: 'hidden' },
  collapseHead: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  collapseIconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  collapseTitleTxt: { flex: 1, fontSize: 13.5, fontWeight: '700', color: DARK },
  collapseBody: { paddingHorizontal: 14, paddingBottom: 14 },

  // Scholar cards
  scholarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.6) },
  scholarIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  scholarName: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  scholarDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Sub section label
  subSectionLbl: { fontSize: 10.5, fontWeight: '700', color: MUTED, letterSpacing: 0.8, marginBottom: 10 },

  // Stipend rows
  stipendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  stipendIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stipendLevel: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK },
  stipendAmount: { fontSize: 13, fontWeight: '800', color: GOLD },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  infoRowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  infoRowLabel: { fontSize: 12, color: MUTED, marginBottom: 2 },
  infoRowValue: { fontSize: 13, fontWeight: '700', color: DARK },

  // Requirements
  reqCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: a(BORDER, 0.6) },
  reqLevelBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  reqLevelTxt: { fontSize: 11, fontWeight: '800' },
  reqDetails: { gap: 4 },
  reqDetailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  reqDetailTxt: { flex: 1, fontSize: 12.5, color: MUTED, lineHeight: 17 },

  // Timeline
  timelineWrap: { marginBottom: 14 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', marginRight: 12, width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, backgroundColor: BORDER, minHeight: 16, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: 14 },
  timelinePeriod: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginBottom: 2 },
  timelineEvent: { fontSize: 12.5, color: DARK },

  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  durationLevel: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK },
  durationBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  durationVal: { fontSize: 12, fontWeight: '700' },

  // Checklist
  checklistRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  checklistNum: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checklistNumTxt: { fontSize: 11, fontWeight: '800' },
  checklistPoint: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  checklistDetail: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Self advantages
  advRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  advIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  advLabel: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 2 },
  advDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Self costs note
  selfCostNote: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, padding: 10, marginTop: 10 },
  selfCostNoteTxt: { flex: 1, fontSize: 11.5, lineHeight: 17 },

  // Self requirements
  selfReqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  selfReqIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  selfReqTxt: { flex: 1, fontSize: 13, color: DARK, lineHeight: 18 },

  // Process
  processRow: { flexDirection: 'row', alignItems: 'flex-start' },
  processLeft: { alignItems: 'center', marginRight: 12, width: 28 },
  processNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  processNumTxt: { color: WHITE, fontSize: 11, fontWeight: '800' },
  processLine: { width: 2, flex: 1, backgroundColor: BORDER, minHeight: 14, marginTop: 3 },
  processContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 14 },
  processTxt: { flex: 1, fontSize: 12.5, color: MUTED, lineHeight: 18 },

  // Documents
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: a(BORDER, 0.7) },
  docIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: a(GOLD, 0.1), alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  docTxt: { flex: 1, fontSize: 12.5, color: DARK, lineHeight: 18 },

  // Form card
  formCard: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16, marginTop: 4, marginBottom: 14 },
  formCardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  formCardIconBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: a(TEAL, 0.1), alignItems: 'center', justifyContent: 'center' },
  formCardTitle: { fontSize: 15, fontWeight: '800', color: DARK },
  formCardSub: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 16 },

  // Fields
  field: { marginBottom: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fieldLabel: { fontSize: 13.5, fontWeight: '700', color: DARK },
  reqBadge: { backgroundColor: a('#ef4444', 0.1), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reqTxt: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  optTxt: { fontSize: 11, color: MUTED },
  input: { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: DARK },
  inputFocus: { borderColor: TEAL, backgroundColor: CARD, shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 2 },
  inputErr: { borderColor: '#ef4444' },
  textarea: { minHeight: 100, lineHeight: 20 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errTxt: { fontSize: 11.5, color: '#ef4444' },
  twoCol: { flexDirection: 'row', gap: 10 },

  // Contact chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, paddingHorizontal: 13, paddingVertical: 9 },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipTxt: { fontSize: 12.5, fontWeight: '600', color: MUTED },
  chipTxtActive: { color: WHITE },

  // Submit
  submitErrCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: a('#ef4444', 0.06), borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: a('#ef4444', 0.15) },
  submitErrTxt: { flex: 1, fontSize: 13, color: '#ef4444' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 17 },
  submitTxt: { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.2 },

  // Disclaimer
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: a(GOLD, 0.06), borderRadius: 12, padding: 12, marginBottom: 10 },
  disclaimerTxt: { flex: 1, fontSize: 11.5, color: MUTED, lineHeight: 17 },

  // Success
  successGrad: { padding: 36, alignItems: 'center' },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)' },
  successTitle: { fontSize: 22, fontWeight: '800', color: WHITE, textAlign: 'center', marginBottom: 14, letterSpacing: -0.3 },
  successMsg: { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 21 },
  successBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  successBadgeTxt: { fontSize: 11.5, color: 'rgba(255,255,255,0.82)', fontWeight: '600' },
  successSteps: { padding: 22 },
  successStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  successDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 14 },
  successStepTxt: { flex: 1, fontSize: 13.5, color: DARK, lineHeight: 20 },
  successBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 17 },
  successBtnTxt: { fontSize: 15, fontWeight: '800', color: WHITE },
});

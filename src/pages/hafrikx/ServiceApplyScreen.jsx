import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, StatusBar, Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../AuthContext';
import { GetEditableProfileController } from '../../controllers/profilecontroller';

const { width: W } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const firstValue = (...values) =>
  values.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

const getServiceMeta = (name = '') => {
  const n = String(name).toLowerCase();
  if (n.includes('visa')) return {
    icon: 'document-text-outline',
    color: '#6366f1',
    title: 'What happens after you apply',
    body: 'Our visa support team will review your travel purpose, timeline and documents, then contact you with the exact requirements and next steps.',
  };
  if (n.includes('admission') || n.includes('school') || n.includes('student')) return {
    icon: 'school-outline',
    color: TEAL,
    title: 'Study in China support',
    body: 'After you apply, we will contact you to confirm your preferred program, budget, academic background, target intake and arrival plan.',
    items: [
      'Confirm your admission notice details: major, study length, language, registration time, location and required materials.',
      'Contact the school early about accommodation so you are not affected by limited rooms.',
      'Prepare key documents: passport, visa, admission notice, JW201/JW202, photos, physical exam record, tuition proof and academic documents.',
      'Bring essentials for arrival: some RMB cash, personal medicine, suitable clothes, toiletries, bedding if needed, and electronics with China 220V adapters.',
      'Plan money and insurance: exchange currency through banks, confirm card withdrawal limits, and arrange medical/personal accident insurance.',
      'Do not bring prohibited items such as narcotics, weapons, controlled knives, ammunition or explosives into China.',
    ],
  };
  if (n.includes('tour') || n.includes('guide')) return {
    icon: 'map-outline',
    color: '#10b981',
    title: 'Guide planning',
    body: 'A Hafrik team member will reach out to understand your city, schedule, language needs and the type of places you want to visit.',
  };
  if (n.includes('business')) return {
    icon: 'briefcase-outline',
    color: '#f59e0b',
    title: 'Business service follow-up',
    body: 'We will contact you to understand your business goal, documents and deadline, then advise the best route before starting the request.',
  };
  if (n.includes('document')) return {
    icon: 'folder-open-outline',
    color: GOLD,
    title: 'Document review',
    body: 'Our team will check the document type, urgency and required format, then contact you if anything else is needed.',
  };
  return {
    icon: 'chatbubbles-outline',
    color: TEAL,
    title: 'We will contact you',
    body: 'After you submit, the Hafrik services team will review your request and contact you using your preferred contact method.',
  };
};

const CONTACT_OPTIONS = ['WhatsApp', 'Phone', 'Email', 'In-app'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <View style={s.field}>
      <View style={s.fieldLabelRow}>
        <Text style={s.fieldLabel}>{label}</Text>
        {required
          ? <View style={s.reqBadge}><Text style={s.reqTxt}>Required</Text></View>
          : <Text style={s.optTxt}>optional</Text>
        }
      </View>
      {children}
      {!!error && (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ServiceApplyScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const { user, token } = useAuth();

  const { service_id, service_name, description, price, processing_time } = route.params ?? {};

  const [profileLoading, setProfileLoading] = useState(false);
  const [fullName, setFullName] = useState(() => firstValue(
    user?.full_name, user?.name,
    [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    user?.username,
  ));
  const [phone,   setPhone]   = useState(() => firstValue(user?.phone, user?.user_phone, user?.mobile));
  const [email,   setEmail]   = useState(() => firstValue(user?.email, user?.user_email));
  const [country, setCountry] = useState(() => firstValue(user?.country_name, user?.country, user?.user_country));
  const [city,    setCity]    = useState(() => firstValue(user?.current_city, user?.city, user?.user_current_city));
  const [preferredContact, setPreferredContact] = useState('WhatsApp');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const serviceMeta    = useMemo(() => getServiceMeta(service_name), [service_name]);
  const serviceSummary = useMemo(() => [
    price           ? { icon: 'pricetag-outline',       label: price }            : null,
    processing_time ? { icon: 'time-outline',           label: processing_time }  : null,
    { icon: 'shield-checkmark-outline', label: 'Hafrik verified' },
  ].filter(Boolean), [price, processing_time]);

  // prefill from profile
  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      if (!token) return;
      setProfileLoading(true);
      try {
        const res     = await GetEditableProfileController(token);
        const profile = res?.data;
        if (!mounted || !profile) return;
        setFullName(prev => prev || firstValue(profile.full_name, profile.name, [profile.first_name, profile.last_name].filter(Boolean).join(' '), profile.username));
        setPhone(prev   => prev || firstValue(profile.phone, profile.user_phone, profile.mobile));
        setEmail(prev   => prev || firstValue(profile.email, profile.user_email));
        setCountry(prev => prev || firstValue(profile.country_name, profile.country, profile.user_country));
        setCity(prev    => prev || firstValue(profile.current_city, profile.city, profile.user_current_city));
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };
    loadProfile();
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
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      await apiClient.post('/services/apply.php', {
        service_id,
        full_name: fullName.trim(),
        phone:     phone.trim(),
        email:     email.trim(),
        payload: {
          country:           country.trim(),
          city:              city.trim(),
          preferred_contact: preferredContact,
          notes:             notes.trim(),
          profile_prefilled: true,
        },
      });
      Alert.alert('Application Sent!', 'We\'ll be in touch shortly.', [
        { text: 'View My Applications', onPress: () => navigation.navigate('MyApplications') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => [
    s.input,
    focusedField === field && s.inputFocused,
    !!errors[field] && s.inputError,
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#144f55', TEAL]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.blobTR} />
        <View style={s.blobBL} />

        {/* nav */}
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeTxt}>Service Application</Text>
          </View>
        </View>

        {/* icon + title */}
        <View style={s.headerBody}>
          <View style={[s.headerIconBox, { backgroundColor: a(serviceMeta.color, 0.22) }]}>
            <Ionicons name={serviceMeta.icon} size={28} color={WHITE} />
          </View>
          <Text style={s.headerTitle} numberOfLines={2}>{service_name ?? 'Apply for Service'}</Text>
          {!!description && (
            <Text style={s.headerSub} numberOfLines={2}>{description}</Text>
          )}
        </View>

        {/* meta pills */}
        {serviceSummary.length > 0 && (
          <View style={s.metaRow}>
            {serviceSummary.map(m => (
              <View key={m.label} style={s.metaPill}>
                <Ionicons name={m.icon} size={11} color={a(WHITE, 0.85)} style={{ marginRight: 4 }} />
                <Text style={s.metaPillTxt}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* ── Body ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* prefill notice */}
        <View style={s.prefillCard}>
          <Ionicons
            name={profileLoading ? 'sync-outline' : 'person-circle-outline'}
            size={18}
            color={TEAL}
          />
          <Text style={s.prefillTxt}>
            {profileLoading
              ? 'Loading your profile details…'
              : 'We pre-filled what we could from your profile. Edit freely before submitting.'}
          </Text>
        </View>

        {/* service brief */}
        <View style={[s.briefCard, { borderLeftColor: serviceMeta.color }]}>
          <View style={[s.briefIconBox, { backgroundColor: a(serviceMeta.color, 0.1) }]}>
            <Ionicons name={serviceMeta.icon} size={20} color={serviceMeta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.briefTitle}>{serviceMeta.title}</Text>
            <Text style={s.briefBody}>{serviceMeta.body}</Text>
          </View>
        </View>

        {/* checklist teaser */}
        {Array.isArray(serviceMeta.items) && serviceMeta.items.length > 0 && (
          <TouchableOpacity style={s.checklistTeaser} activeOpacity={0.86} onPress={() => setShowChecklist(true)}>
            <View style={s.checklistIcon}>
              <Ionicons name="checkmark-done-circle" size={20} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.checklistTitle}>Study preparation checklist</Text>
              <Text style={s.checklistSub}>Documents, accommodation, money, insurance & packing essentials.</Text>
            </View>
            <View style={s.checklistArrow}>
              <Ionicons name="chevron-forward" size={15} color={TEAL} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Section: Contact ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionLbl}>CONTACT DETAILS</Text>
        </View>

        <Field label="Full Name" required error={errors.fullName}>
          <TextInput
            style={inputStyle('fullName')}
            placeholder="Your full name"
            placeholderTextColor={a(MUTED, 0.6)}
            value={fullName}
            onChangeText={v => { setFullName(v); if (errors.fullName) setErrors(p => ({ ...p, fullName: null })); }}
            onFocus={() => setFocusedField('fullName')}
            onBlur={() => setFocusedField(null)}
          />
        </Field>

        <Field label="Phone" required error={errors.phone}>
          <TextInput
            style={inputStyle('phone')}
            placeholder="Your phone number"
            placeholderTextColor={a(MUTED, 0.6)}
            value={phone}
            onChangeText={v => { setPhone(v); if (errors.phone) setErrors(p => ({ ...p, phone: null })); }}
            keyboardType="phone-pad"
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
          />
        </Field>

        <Field label="Email">
          <TextInput
            style={inputStyle('email')}
            placeholder="Your email address"
            placeholderTextColor={a(MUTED, 0.6)}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </Field>

        {/* ── Section: Context ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionLbl}>TRIP / SERVICE CONTEXT</Text>
        </View>

        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="Country">
              <TextInput
                style={inputStyle('country')}
                placeholder="e.g. Nigeria"
                placeholderTextColor={a(MUTED, 0.6)}
                value={country}
                onChangeText={setCountry}
                onFocus={() => setFocusedField('country')}
                onBlur={() => setFocusedField(null)}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="City">
              <TextInput
                style={inputStyle('city')}
                placeholder="e.g. Guangzhou"
                placeholderTextColor={a(MUTED, 0.6)}
                value={city}
                onChangeText={setCity}
                onFocus={() => setFocusedField('city')}
                onBlur={() => setFocusedField(null)}
              />
            </Field>
          </View>
        </View>

        {/* Preferred contact */}
        <View style={s.field}>
          <View style={s.fieldLabelRow}>
            <Text style={s.fieldLabel}>Preferred Contact</Text>
            <Text style={s.optTxt}>how we reach you</Text>
          </View>
          <View style={s.contactRow}>
            {CONTACT_OPTIONS.map(opt => {
              const active = preferredContact === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.contactChip, active && s.contactChipActive]}
                  activeOpacity={0.82}
                  onPress={() => setPreferredContact(opt)}
                >
                  {active && (
                    <Ionicons name="checkmark-circle" size={13} color={WHITE} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[s.contactChipTxt, active && s.contactChipTxtActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Field label="More Information">
          <TextInput
            style={[inputStyle('notes'), s.textarea]}
            placeholder="Tell us your deadline, documents you have, or any special request."
            placeholderTextColor={a(MUTED, 0.6)}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            onFocus={() => setFocusedField('notes')}
            onBlur={() => setFocusedField(null)}
          />
        </Field>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={s.submitWrap}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={loading ? [MUTED, MUTED] : [BRAND, TEAL]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.submitBtn}
          >
            {loading ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <Ionicons name="send" size={17} color={WHITE} />
                <Text style={s.submitTxt}>Submit Application</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Checklist Modal ── */}
      <Modal
        visible={showChecklist}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChecklist(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowChecklist(false)} />
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Study Checklist</Text>
                <Text style={s.modalSub}>Use this before travelling to China.</Text>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={() => setShowChecklist(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={BRAND} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {serviceMeta.items?.map((item, i) => (
                <View key={i} style={s.clItem}>
                  <LinearGradient colors={[BRAND, TEAL]} style={s.clNum}>
                    <Text style={s.clNumTxt}>{i + 1}</Text>
                  </LinearGradient>
                  <Text style={s.clTxt}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 20 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  blobTR: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobBL: {
    position: 'absolute', bottom: -20, left: -20,
    width: 85, height: 85, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerBadgeTxt: { color: WHITE, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  headerBody: { alignItems: 'center', paddingBottom: 4 },
  headerIconBox: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  headerTitle: {
    fontSize: 20, fontWeight: '800', color: WHITE,
    letterSpacing: -0.3, textAlign: 'center',
  },
  headerSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.72)',
    textAlign: 'center', marginTop: 5, lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginTop: 14,
  },
  metaPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  metaPillTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.88)' },

  // Prefill
  prefillCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: a(TEAL, 0.08),
    borderRadius: 14, borderWidth: 1, borderColor: a(TEAL, 0.2),
    padding: 13, marginBottom: 18,
  },
  prefillTxt: { flex: 1, fontSize: 12.5, color: MUTED, lineHeight: 18 },

  // Brief
  briefCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    borderLeftWidth: 3,
    padding: 14, marginBottom: 14,
  },
  briefIconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  briefTitle: { fontSize: 13.5, fontWeight: '700', color: DARK, marginBottom: 4 },
  briefBody: { fontSize: 12.5, color: MUTED, lineHeight: 18 },

  // Checklist teaser
  checklistTeaser: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 22,
  },
  checklistIcon: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: a(TEAL, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  checklistTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 2 },
  checklistSub: { fontSize: 11.5, color: MUTED },
  checklistArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: a(TEAL, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 16,
  },
  sectionDot: {
    width: 4, height: 16, borderRadius: 2,
    backgroundColor: TEAL,
  },
  sectionLbl: {
    fontSize: 11, fontWeight: '700',
    color: TEAL, letterSpacing: 1.2,
  },

  // Field
  field: { marginBottom: 16 },
  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 7,
  },
  fieldLabel: { fontSize: 13.5, fontWeight: '700', color: DARK },
  reqBadge: {
    backgroundColor: a('#ef4444', 0.1),
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  reqTxt: { fontSize: 10, fontWeight: '700', color: '#ef4444' },
  optTxt: { fontSize: 11, color: MUTED },

  // Inputs
  input: {
    backgroundColor: CARD,
    borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: DARK,
  },
  inputFocused: {
    borderColor: TEAL,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: { borderColor: '#ef4444' },
  textarea: { minHeight: 110, lineHeight: 20 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errorTxt: { fontSize: 11.5, color: '#ef4444' },

  twoCol: { flexDirection: 'row', gap: 10 },

  // Contact chips
  contactRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  contactChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD, paddingHorizontal: 14, paddingVertical: 9,
  },
  contactChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  contactChipTxt: { fontSize: 13, fontWeight: '600', color: MUTED },
  contactChipTxtActive: { color: WHITE },

  // Submit
  submitWrap: { marginTop: 8 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 17,
  },
  submitTxt: { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' },
  modalSheet: {
    maxHeight: '78%',
    backgroundColor: BG,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 10,
  },
  modalHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: BORDER, alignSelf: 'center', marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  modalSub: { fontSize: 12, color: MUTED, marginTop: 2 },
  modalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  clItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: a(BORDER, 0.6),
  },
  clNum: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  clNumTxt: { color: WHITE, fontSize: 11, fontWeight: '800' },
  clTxt: { flex: 1, fontSize: 12.5, color: MUTED, lineHeight: 18.5 },
});

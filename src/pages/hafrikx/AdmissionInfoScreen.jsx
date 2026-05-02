import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

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

// ─── Scholarship data ─────────────────────────────────────────────────────────
const SCHOLARSHIP_TYPES = [
  {
    name: 'CSC Type A — Bilateral Program',
    icon: 'business-outline',
    color: PURPLE,
    desc: 'Applied through your home country\'s Ministry of Education. They nominate you to the Chinese Embassy. Government-to-government route.',
  },
  {
    name: 'CSC Type B — University Program',
    icon: 'school-outline',
    color: '#6366f1',
    desc: 'Apply directly to your chosen Chinese university using their Agency Number on the CSC portal. The most common path for self-motivated students.',
  },
  {
    name: 'Jasmine Jiangsu Government Scholarship',
    icon: 'flower-outline',
    color: '#ec4899',
    desc: 'For Jiangsu province. Full (tuition + room + stipend) or Partial (one-time ~30,000 RMB grant for first year).',
  },
  {
    name: 'CIS — Chinese Language Teachers Scholarship',
    icon: 'language-outline',
    color: '#f59e0b',
    desc: 'For those wanting to teach Chinese. Covers tuition, accommodation & stipend. 4-week, one-semester, one-year, or full-degree options.',
  },
  {
    name: 'MOFCOM Scholarship',
    icon: 'briefcase-outline',
    color: GOLD,
    desc: 'For mid-career professionals or government officials from developing countries. Requires 3+ years work experience. Higher stipend than CSC.',
  },
  {
    name: 'Provincial & City Scholarships',
    icon: 'location-outline',
    color: GREEN,
    desc: 'Includes Shanghai Government Scholarship (SGS) and Beijing Government Scholarship. Typically cover tuition or partial living allowances.',
  },
];

const STIPENDS = [
  { level: 'Undergraduate', amount: '2,500 RMB / month', icon: 'school-outline' },
  { level: "Master's",      amount: '3,000 RMB / month', icon: 'library-outline' },
  { level: 'PhD',           amount: '3,500 RMB / month', icon: 'ribbon-outline'  },
];

const REQUIREMENTS = [
  { level: 'Undergraduate', degree: 'High school diploma (WAEC / NECO / GCE)', age: 'Under 25', gpa: '3.0/4.0 or 2:1 equivalent' },
  { level: "Master's",      degree: "Bachelor's degree",                        age: 'Under 35', gpa: '3.0/4.0 or 2:1 equivalent' },
  { level: 'PhD',           degree: "Master's degree",                          age: 'Under 40', gpa: '3.0/4.0 or 2:1 equivalent' },
  { level: 'MOFCOM',        degree: "Bachelor's degree + 3 yrs work experience",age: 'Under 45', gpa: 'Professional track'         },
];

const TIMELINE_ITEMS = [
  { period: 'Nov – Dec', event: 'Applications open'                      },
  { period: 'Mar – Apr', event: 'Deadline to submit'                     },
  { period: 'Jul – Aug', event: 'Admission notices sent out'             },
  { period: 'Sep',       event: 'Studies begin (September intake)'       },
];

const DURATION = [
  { level: "Bachelor's", duration: '4 – 5 years'                              },
  { level: "Master's",   duration: '2 – 3 years'                              },
  { level: 'PhD',        duration: '3 – 4 years'                              },
  { level: 'Foundation', duration: '+1 year added if your HSK level is low'   },
];

// ─── Self-Sponsored data ──────────────────────────────────────────────────────
const SELF_ADVANTAGES = [
  { icon: 'flash-outline',            label: 'Faster process',    desc: 'Admission in weeks, not months. No nomination queues or government timelines.'   },
  { icon: 'layers-outline',           label: 'More schools',      desc: 'Access to a wider range of universities and programs across China.'               },
  { icon: 'checkmark-circle-outline', label: 'Higher acceptance', desc: 'Less competition. GPA requirements are more flexible than scholarship programs.'  },
  { icon: 'calendar-outline',         label: 'Urgent intakes',    desc: 'Good if your deadline is close or you are targeting the March intake.'            },
];

const SELF_TUITION = [
  { label: 'Language Program (1 yr)',  value: '$2,000 – $4,000 / year',  icon: 'language-outline'  },
  { label: 'Undergraduate (4–5 yrs)', value: '$3,000 – $8,000 / year',  icon: 'school-outline'    },
  { label: "Master's (2–3 yrs)",      value: '$4,000 – $10,000 / year', icon: 'library-outline'   },
  { label: 'PhD (3–4 yrs)',           value: '$5,000 – $12,000 / year', icon: 'ribbon-outline'    },
];

const SELF_REQUIREMENTS = [
  { icon: 'document-text-outline', text: 'High school certificate or degree depending on your study level' },
  { icon: 'person-outline',        text: 'No age limit in most cases'                                      },
  { icon: 'checkmark-outline',     text: 'No government nomination needed'                                 },
  { icon: 'card-outline',          text: 'Proof of funds or payment ability may be required by the school' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Collapsible({ title, icon, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };
  return (
    <View style={s.collapse}>
      <TouchableOpacity style={s.collapseHead} onPress={toggle} activeOpacity={0.82}>
        <View style={[s.collapseIcon, { backgroundColor: a(color, 0.1) }]}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
        <Text style={s.collapseTitleTxt}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
      </TouchableOpacity>
      {open && <View style={s.collapseBody}>{children}</View>}
    </View>
  );
}

function InfoRow({ icon, label, value, color = TEAL }) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoRowIcon, { backgroundColor: a(color, 0.1) }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoRowLabel}>{label}</Text>
        <Text style={s.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Scholarship panels ───────────────────────────────────────────────────────
function ScholarshipContent() {
  return (
    <>
      <Collapsible title="Types of Scholarships" icon="trophy-outline" color={PURPLE} defaultOpen>
        {SCHOLARSHIP_TYPES.map((t, i) => (
          <View key={i} style={[s.scholarCard, { borderLeftColor: t.color }, i === SCHOLARSHIP_TYPES.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.scholarIcon, { backgroundColor: a(t.color, 0.1) }]}>
              <Ionicons name={t.icon} size={16} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.scholarName}>{t.name}</Text>
              <Text style={s.scholarDesc}>{t.desc}</Text>
            </View>
          </View>
        ))}
      </Collapsible>

      <Collapsible title="Monthly Stipend (Scholarship Covers This)" icon="wallet-outline" color={GOLD}>
        <View style={s.stipendNote}>
          <Ionicons name="information-circle-outline" size={14} color={TEAL} style={{ marginRight: 7, marginTop: 1 }} />
          <Text style={s.stipendNoteTxt}>
            A fully funded scholarship covers your tuition, dormitory accommodation, and pays you a monthly living allowance directly.
          </Text>
        </View>
        {STIPENDS.map((st, i) => (
          <View key={i} style={[s.stipendRow, i === STIPENDS.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.stipendIcon, { backgroundColor: a(GOLD, 0.1) }]}>
              <Ionicons name={st.icon} size={14} color={GOLD} />
            </View>
            <Text style={s.stipendLevel}>{st.level}</Text>
            <Text style={s.stipendAmount}>{st.amount}</Text>
          </View>
        ))}
      </Collapsible>

      <Collapsible title="Education Requirements & Age Limits" icon="person-outline" color={TEAL}>
        {REQUIREMENTS.map((r, i) => (
          <View key={i} style={[s.reqCard, i === 0 && { borderTopWidth: 0 }]}>
            <View style={[s.reqLevelBadge, { backgroundColor: a(TEAL, 0.1) }]}>
              <Text style={[s.reqLevelTxt, { color: TEAL }]}>{r.level}</Text>
            </View>
            <View style={s.reqDetails}>
              <View style={s.reqDetailRow}>
                <Ionicons name="school-outline" size={12} color={MUTED} style={{ marginRight: 5, marginTop: 1 }} />
                <Text style={s.reqDetailTxt}>{r.degree}</Text>
              </View>
              <View style={s.reqDetailRow}>
                <Ionicons name="calendar-outline" size={12} color={MUTED} style={{ marginRight: 5, marginTop: 1 }} />
                <Text style={s.reqDetailTxt}>Age limit: {r.age}</Text>
              </View>
              <View style={s.reqDetailRow}>
                <Ionicons name="bar-chart-outline" size={12} color={MUTED} style={{ marginRight: 5, marginTop: 1 }} />
                <Text style={s.reqDetailTxt}>Min. GPA: {r.gpa}</Text>
              </View>
            </View>
          </View>
        ))}
      </Collapsible>

      <Collapsible title="Application Timeline" icon="calendar-outline" color={GREEN}>
        <View style={s.timelineWrap}>
          {TIMELINE_ITEMS.map((t, i) => (
            <View key={i} style={s.timelineRow}>
              <View style={s.timelineLeft}>
                <View style={[s.timelineDot, { backgroundColor: GREEN }]} />
                {i < TIMELINE_ITEMS.length - 1 && <View style={s.timelineLine} />}
              </View>
              <View style={s.timelineContent}>
                <Text style={[s.timelinePeriod, { color: GREEN }]}>{t.period}</Text>
                <Text style={s.timelineEvent}>{t.event}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={s.subLabel}>How Long Will You Study?</Text>
        {DURATION.map((d, i) => (
          <View key={i} style={[s.durationRow, i === DURATION.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.durationLevel}>{d.level}</Text>
            <View style={[s.durationBadge, { backgroundColor: a(GREEN, 0.1) }]}>
              <Text style={[s.durationVal, { color: GREEN }]}>{d.duration}</Text>
            </View>
          </View>
        ))}
      </Collapsible>

    </>
  );
}

// ─── Self-Sponsored panels ────────────────────────────────────────────────────
function SelfSponsoredContent() {
  return (
    <>
      <Collapsible title="Why Choose Self-Sponsored?" icon="flash-outline" color={GREEN} defaultOpen>
        {SELF_ADVANTAGES.map((adv, i) => (
          <View key={i} style={[s.advRow, i === SELF_ADVANTAGES.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.advIcon, { backgroundColor: a(GREEN, 0.1) }]}>
              <Ionicons name={adv.icon} size={16} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.advLabel}>{adv.label}</Text>
              <Text style={s.advDesc}>{adv.desc}</Text>
            </View>
          </View>
        ))}
      </Collapsible>

      <Collapsible title="Typical Tuition Fees" icon="wallet-outline" color={GOLD}>
        <View style={s.stipendNote}>
          <Ionicons name="information-circle-outline" size={14} color={TEAL} style={{ marginRight: 7, marginTop: 1 }} />
          <Text style={s.stipendNoteTxt}>
            These are average figures. The actual tuition depends on the university, city, and program. Hafrik will help you find the best fit for your budget.
          </Text>
        </View>
        {SELF_TUITION.map((c, i) => (
          <View key={i} style={[s.infoRow, i === SELF_TUITION.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.infoRowIcon, { backgroundColor: a(GOLD, 0.1) }]}>
              <Ionicons name={c.icon} size={14} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoRowLabel}>{c.label}</Text>
              <Text style={s.infoRowValue}>{c.value}</Text>
            </View>
          </View>
        ))}
      </Collapsible>

      <Collapsible title="Entry Requirements" icon="person-outline" color={TEAL}>
        {SELF_REQUIREMENTS.map((r, i) => (
          <View key={i} style={[s.selfReqRow, i === SELF_REQUIREMENTS.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.selfReqIcon, { backgroundColor: a(TEAL, 0.1) }]}>
              <Ionicons name={r.icon} size={14} color={TEAL} />
            </View>
            <Text style={s.selfReqTxt}>{r.text}</Text>
          </View>
        ))}
      </Collapsible>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdmissionInfoScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const { type = 'Scholarship' } = route.params ?? {};

  const isScholarship = type === 'Scholarship';
  const accent        = isScholarship ? PURPLE : GREEN;
  const headerColors  = isScholarship
    ? [BRAND, '#3b1f8c', PURPLE]
    : [BRAND, '#0e5c3a', GREEN];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={headerColors}
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
              <Text style={s.hBadgeTxt}>Study in China</Text>
            </View>
          </View>

          <View style={s.headerBody}>
            <View style={[s.headerIconBox, { backgroundColor: a(WHITE, 0.15) }]}>
              <Ionicons name={isScholarship ? 'trophy' : 'flash'} size={32} color={WHITE} />
            </View>
            <Text style={s.headerTitle}>
              {isScholarship ? 'Scholarship Admission' : 'Self-Sponsored Admission'}
            </Text>
            <Text style={s.headerSub}>
              {isScholarship
                ? 'Fully or partially funded by the government or university.'
                : 'Faster process. You pay your tuition and choose your school freely.'}
            </Text>
          </View>

          <View style={s.partnerPill}>
            <View style={[s.partnerDot, { backgroundColor: a(GOLD, 0.3) }]}>
              <Ionicons name="people" size={12} color={GOLD} />
            </View>
            <Text style={s.partnerPillTxt}>Powered by GoBeyond Admissions</Text>
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={s.body}>

          {isScholarship ? <ScholarshipContent /> : <SelfSponsoredContent />}

          {/* ── CTA back to form ── */}
          <View style={s.ctaCard}>
            <Text style={s.ctaTitle}>Ready to apply?</Text>
            <Text style={s.ctaSub}>
              Go back and fill in your contact details. Our team will reach out and guide you through the next steps.
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.87}>
              <LinearGradient
                colors={[BRAND, TEAL]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaBtn}
              >
                <Ionicons name="arrow-back" size={17} color={WHITE} />
                <Text style={s.ctaBtnTxt}>Back to Application Form</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  blob1:  { position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)' },
  blob2:  { position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.05)' },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  hBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hBadgeTxt: { color: WHITE, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  headerBody: { alignItems: 'center', marginBottom: 18 },
  headerIconBox: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: WHITE, letterSpacing: -0.4, textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 7, lineHeight: 19, paddingHorizontal: 10 },
  partnerPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  partnerDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  partnerPillTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  body: { paddingHorizontal: 18, paddingTop: 22 },

  // Collapsible
  collapse: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 12, overflow: 'hidden' },
  collapseHead: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  collapseIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  collapseTitleTxt: { flex: 1, fontSize: 13.5, fontWeight: '700', color: DARK },
  collapseBody: { paddingHorizontal: 14, paddingBottom: 14 },

  // Scholar cards
  scholarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.6) },
  scholarIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  scholarName: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 4 },
  scholarDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Stipend
  stipendNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: a(TEAL, 0.06), borderRadius: 10, padding: 10, marginBottom: 12 },
  stipendNoteTxt: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },
  stipendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  stipendIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stipendLevel: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK },
  stipendAmount: { fontSize: 14, fontWeight: '800', color: GOLD },

  // Requirements
  subLabel: { fontSize: 10.5, fontWeight: '700', color: MUTED, letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  reqCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: a(BORDER, 0.6) },
  reqLevelBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  reqLevelTxt: { fontSize: 11, fontWeight: '800' },
  reqDetails: { gap: 5 },
  reqDetailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  reqDetailTxt: { flex: 1, fontSize: 12.5, color: MUTED, lineHeight: 17 },

  // Timeline
  timelineWrap: { marginBottom: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', marginRight: 12, width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, backgroundColor: BORDER, minHeight: 16, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: 14 },
  timelinePeriod: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginBottom: 2 },
  timelineEvent: { fontSize: 12.5, color: DARK },
  durationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  durationLevel: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK },
  durationBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  durationVal: { fontSize: 12, fontWeight: '700' },

  // Advantages
  advRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  advIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  advLabel: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 2 },
  advDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Info row
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  infoRowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  infoRowLabel: { fontSize: 12, color: MUTED, marginBottom: 2 },
  infoRowValue: { fontSize: 13, fontWeight: '700', color: DARK },

  // Self req
  selfReqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: a(BORDER, 0.5) },
  selfReqIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  selfReqTxt: { flex: 1, fontSize: 13, color: DARK, lineHeight: 18 },

  // CTA
  ctaCard: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 20, marginTop: 8 },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 7 },
  ctaSub: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 18 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16 },
  ctaBtnTxt: { fontSize: 15, fontWeight: '800', color: WHITE },
});

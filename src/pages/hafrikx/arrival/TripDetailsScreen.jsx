import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const GOLD   = '#d4a017';
const GREEN  = '#1a9e5c';
const BG     = '#f4f9fa';
const CARD   = '#ffffff';
const BORDER = '#ddeaec';
const DARK   = '#0d2b2e';
const MUTED  = '#5f7275';
const WHITE  = '#ffffff';
const ERR    = '#ef4444';

const a = (hex, alpha) => {
  const n = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const SERVICES = [
  { id: 'transfer',   icon: 'car-outline',      label: 'Airport Transfer',     required: true  },
  { id: 'hotel',      icon: 'bed-outline',       label: 'Hotel Booking',        required: false },
  { id: 'inspection', icon: 'search-outline',    label: 'Factory Inspection',   required: false },
];

const VEHICLES = [
  { id: 'standard', icon: 'car-outline',       label: '5-Seat Standard',      transfer: '$150', inspection: '$180' },
  { id: 'suv',      icon: 'car-sport-outline', label: '5-Seat SUV',           transfer: '$180', inspection: '$210' },
  { id: 'business', icon: 'bus-outline',        label: '7-Seat Business',      transfer: '$220', inspection: '$270' },
  { id: 'luxury',   icon: 'star-outline',       label: 'Luxury / Large',       transfer: '$300', inspection: '$380' },
];

const HOTELS = [
  { id: 'budget',   icon: 'bed-outline',      label: 'Budget Business',         price: 'From $30 / night',  color: TEAL   },
  { id: 'midrange', icon: 'business-outline', label: 'Mid-Range Boutique',      price: 'From $50 / night',  color: GOLD   },
  { id: 'luxury',   icon: 'diamond-outline',  label: '4–5 Star Hotel',          price: 'From $200 / night', color: '#9b59b6' },
];

const CITIES = [
  { label: 'Guangzhou', airports: ['Baiyun International (CAN)'] },
  { label: 'Yiwu',      airports: ['Yiwu Airport (YIW)', 'Hangzhou Xiaoshan (HGH)'] },
  { label: 'Shanghai',  airports: ['Pudong International (PVG)', 'Hongqiao (SHA)'] },
  { label: 'Beijing',   airports: ['Capital International (PEK)', 'Daxing International (PKX)'] },
  { label: 'Shenzhen',  airports: ['Bao\'an International (SZX)'] },
];

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PAXOPTS = ['1', '2', '3', '4', '5', '6+'];

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
function Sheet({ visible, title, options, selected, onSelect, onClose, labelKey }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sh.overlay} onPress={onClose}>
        <Pressable style={sh.panel}>
          <View style={sh.handle} />
          <Text style={sh.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt, i) => {
              const val = labelKey ? opt[labelKey] : opt;
              const isSelected = (labelKey ? opt[labelKey] : opt) === (labelKey && selected ? selected[labelKey] : selected);
              return (
                <TouchableOpacity
                  key={i}
                  style={[sh.option, isSelected && sh.optionActive]}
                  onPress={() => { onSelect(opt); onClose(); }}
                  activeOpacity={0.75}
                >
                  <Text style={[sh.optionTxt, isSelected && sh.optionTxtActive]}>{val}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={TEAL} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, icon, error, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldInner, error && { borderColor: ERR }]}>
        {icon && <Ionicons name={icon} size={17} color={error ? ERR : MUTED} style={{ marginRight: 10 }} />}
        {children}
      </View>
      {!!error && <Text style={s.fieldErr}>{error}</Text>}
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SecHead({ label }) {
  return (
    <View style={s.secHead}>
      <View style={s.secBar} />
      <Text style={s.secLabel}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TripDetailsScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  // Services
  const [selectedServices, setSelectedServices] = useState(['transfer']);
  // Vehicle
  const [vehicle, setVehicle] = useState(null);
  // Hotel
  const [hotelTier, setHotelTier] = useState(null);
  // Flight
  const [city,       setCity]       = useState(null);
  const [airport,    setAirport]    = useState('');
  const [flight,     setFlight]     = useState('');
  const [date,       setDate]       = useState('');
  const [hour,       setHour]       = useState('');
  const [minute,     setMinute]     = useState('');
  // Destination
  const [dropoff,    setDropoff]    = useState('');
  // Passengers + notes
  const [pax,        setPax]        = useState('1');
  const [notes,      setNotes]      = useState('');
  // Errors
  const [errors,     setErrors]     = useState({});
  // Sheet
  const [openSheet,  setOpenSheet]  = useState(null);

  const wantsHotel      = selectedServices.includes('hotel');
  const wantsInspection = selectedServices.includes('inspection');

  const toggleService = (id) => {
    if (id === 'transfer') return; // required
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCitySelect = (c) => {
    setCity(c);
    setAirport(c.airports[0]);
    setErrors(e => ({ ...e, city: null }));
  };

  const validate = () => {
    const e = {};
    if (!vehicle)  e.vehicle = 'Please choose a vehicle';
    if (!city)     e.city    = 'Please select a city';
    if (!flight)   e.flight  = 'Flight number required';
    if (!date)     e.date    = 'Arrival date required';
    if (!hour)     e.time    = 'Select arrival time';
    if (!dropoff)  e.dropoff = 'Drop-off address required';
    if (wantsHotel && !hotelTier) e.hotel = 'Please select a hotel tier';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    navigation.navigate('ArrivalReview', {
      services: selectedServices,
      vehicle:  VEHICLES.find(v => v.id === vehicle),
      hotel:    wantsHotel ? HOTELS.find(h => h.id === hotelTier) : null,
      trip: {
        city:       city.label,
        airport,
        flight,
        date,
        time:       `${hour}:${minute || '00'}`,
        dropoff,
        passengers: pax,
        notes,
        inspection: wantsInspection,
      },
    });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header (scrolls) ── */}
        <LinearGradient
          colors={[BRAND, '#144f55', TEAL]}
          style={[s.header, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={s.blob} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Trip Details</Text>
          <Text style={s.headerSub}>Tell us about your arrival</Text>
          <View style={s.stepPill}>
            <Text style={s.stepTxt}>Step 1 of 2</Text>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* ══ Services ══ */}
          <SecHead label="What do you need?" />
          <View style={s.servicesRow}>
            {SERVICES.map(svc => {
              const active = selectedServices.includes(svc.id);
              return (
                <TouchableOpacity
                  key={svc.id}
                  style={[s.svcChip, active && { backgroundColor: a(TEAL, 0.1), borderColor: TEAL }]}
                  onPress={() => toggleService(svc.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={svc.icon} size={16} color={active ? TEAL : MUTED} />
                  <Text style={[s.svcLabel, active && { color: TEAL }]}>{svc.label}</Text>
                  {svc.required && (
                    <View style={s.requiredDot} />
                  )}
                  {active && !svc.required && (
                    <Ionicons name="checkmark-circle" size={14} color={TEAL} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {wantsInspection && (
            <View style={s.inspectionNote}>
              <Ionicons name="location" size={14} color={GREEN} />
              <Text style={s.inspectionNoteTxt}>
                Factory inspection is available in <Text style={{ fontWeight: '800', color: GREEN }}>Guangzhou only</Text>.
              </Text>
            </View>
          )}

          {/* ══ Vehicle ══ */}
          <SecHead label="Choose Your Vehicle" />
          {errors.vehicle && <Text style={s.secErr}>{errors.vehicle}</Text>}
          {VEHICLES.map(v => {
            const active = vehicle === v.id;
            const price  = wantsInspection ? v.inspection : v.transfer;
            return (
              <TouchableOpacity
                key={v.id}
                style={[s.vehicleCard, active && { borderColor: TEAL, backgroundColor: a(TEAL, 0.05) }]}
                onPress={() => { setVehicle(v.id); setErrors(e => ({ ...e, vehicle: null })); }}
                activeOpacity={0.85}
              >
                <View style={[s.vehicleIconBox, { backgroundColor: active ? a(TEAL, 0.15) : a(MUTED, 0.08) }]}>
                  <Ionicons name={v.icon} size={20} color={active ? TEAL : MUTED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.vehicleName, active && { color: TEAL }]}>{v.label}</Text>
                  {wantsInspection && (
                    <Text style={s.vehicleSub}>Transfer + Inspection rate</Text>
                  )}
                </View>
                <View style={s.vehiclePriceWrap}>
                  <Text style={[s.vehiclePrice, active && { color: TEAL }]}>{price}</Text>
                  <Text style={s.vehiclePriceSub}>{wantsInspection ? 'per day' : 'round trip'}</Text>
                </View>
                {active && (
                  <View style={s.vehicleCheck}>
                    <Ionicons name="checkmark" size={12} color={WHITE} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* ══ Hotel Tier ══ */}
          {wantsHotel && (
            <>
              <SecHead label="Hotel Preference" />
              {errors.hotel && <Text style={s.secErr}>{errors.hotel}</Text>}
              {HOTELS.map(h => {
                const active = hotelTier === h.id;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[s.hotelCard, active && { borderColor: h.color, backgroundColor: a(h.color, 0.05) }]}
                    onPress={() => { setHotelTier(h.id); setErrors(e => ({ ...e, hotel: null })); }}
                    activeOpacity={0.85}
                  >
                    <View style={[s.hotelIconBox, { backgroundColor: a(h.color, 0.12) }]}>
                      <Ionicons name={h.icon} size={18} color={h.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.hotelName, active && { color: h.color }]}>{h.label}</Text>
                      <Text style={s.hotelPrice}>{h.price}</Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color={h.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ══ Flight Info ══ */}
          <SecHead label="Flight Information" />

          {/* City */}
          <Field label="Arrival City" icon="location-outline" error={errors.city}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpenSheet('city')} activeOpacity={0.8}>
              <Text style={[s.selectTxt, !city && { color: MUTED }]}>
                {city ? city.label : 'Select city'}
              </Text>
            </TouchableOpacity>
            <Ionicons name="chevron-down" size={16} color={MUTED} />
          </Field>

          {/* Airport */}
          {city && city.airports.length > 1 && (
            <Field label="Airport" icon="airplane-outline">
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpenSheet('airport')} activeOpacity={0.8}>
                <Text style={[s.selectTxt]}>{airport || 'Select airport'}</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-down" size={16} color={MUTED} />
            </Field>
          )}
          {city && city.airports.length === 1 && (
            <Field label="Airport" icon="airplane-outline">
              <Text style={s.selectTxt}>{airport}</Text>
            </Field>
          )}

          {/* Flight number */}
          <Field label="Flight Number" icon="document-text-outline" error={errors.flight}>
            <TextInput
              style={s.input}
              placeholder="e.g. EK384"
              placeholderTextColor={MUTED}
              value={flight}
              onChangeText={t => { setFlight(t.toUpperCase()); setErrors(e => ({ ...e, flight: null })); }}
              autoCapitalize="characters"
            />
          </Field>

          {/* Date */}
          <Field label="Arrival Date" icon="calendar-outline" error={errors.date}>
            <TextInput
              style={s.input}
              placeholder="DD / MM / YYYY"
              placeholderTextColor={MUTED}
              value={date}
              onChangeText={t => { setDate(t); setErrors(e => ({ ...e, date: null })); }}
              keyboardType="numeric"
            />
          </Field>

          {/* Time */}
          <Text style={s.fieldLabel}>Arrival Time</Text>
          <View style={s.timeRow}>
            <TouchableOpacity
              style={[s.timePicker, errors.time && { borderColor: ERR }]}
              onPress={() => setOpenSheet('hour')}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={16} color={MUTED} />
              <Text style={[s.selectTxt, !hour && { color: MUTED }]}>{hour || 'HH'}</Text>
              <Ionicons name="chevron-down" size={14} color={MUTED} />
            </TouchableOpacity>
            <Text style={s.timeSep}>:</Text>
            <TouchableOpacity
              style={[s.timePicker, errors.time && { borderColor: ERR }]}
              onPress={() => setOpenSheet('minute')}
              activeOpacity={0.8}
            >
              <Text style={[s.selectTxt, !minute && { color: MUTED }]}>{minute || 'MM'}</Text>
              <Ionicons name="chevron-down" size={14} color={MUTED} />
            </TouchableOpacity>
          </View>
          {!!errors.time && <Text style={s.fieldErr}>{errors.time}</Text>}

          {/* ══ Drop-off ══ */}
          <SecHead label="Destination" />
          <Field label="Drop-off / Hotel Address" icon="navigate-outline" error={errors.dropoff}>
            <TextInput
              style={s.input}
              placeholder="Hotel name or full address"
              placeholderTextColor={MUTED}
              value={dropoff}
              onChangeText={t => { setDropoff(t); setErrors(e => ({ ...e, dropoff: null })); }}
            />
          </Field>

          {/* ══ Passengers ══ */}
          <SecHead label="Passengers" />
          <View style={s.paxRow}>
            {PAXOPTS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.paxBtn, pax === p && { backgroundColor: a(TEAL, 0.1), borderColor: TEAL }]}
                onPress={() => setPax(p)}
                activeOpacity={0.8}
              >
                <Text style={[s.paxTxt, pax === p && { color: TEAL, fontWeight: '800' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ══ Notes ══ */}
          <SecHead label="Special Requests" />
          <View style={[s.fieldInner, { alignItems: 'flex-start', minHeight: 90 }]}>
            <TextInput
              style={[s.input, { textAlignVertical: 'top', paddingTop: 4 }]}
              placeholder="Wheelchair, infant seat, name board text..."
              placeholderTextColor={MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.88} style={{ flex: 1 }}>
          <LinearGradient
            colors={[BRAND, TEAL]}
            style={s.ctaBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={s.ctaTxt}>Review Booking</Text>
            <Ionicons name="arrow-forward" size={18} color={WHITE} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Sheets ── */}
      <Sheet
        visible={openSheet === 'city'}
        title="Select City"
        options={CITIES}
        selected={city}
        onSelect={handleCitySelect}
        onClose={() => setOpenSheet(null)}
        labelKey="label"
      />
      <Sheet
        visible={openSheet === 'airport'}
        title="Select Airport"
        options={city?.airports ?? []}
        selected={airport}
        onSelect={opt => { setAirport(opt); }}
        onClose={() => setOpenSheet(null)}
      />
      <Sheet
        visible={openSheet === 'hour'}
        title="Hour"
        options={HOURS}
        selected={hour}
        onSelect={h => { setHour(h); setErrors(e => ({ ...e, time: null })); }}
        onClose={() => setOpenSheet(null)}
      />
      <Sheet
        visible={openSheet === 'minute'}
        title="Minute"
        options={MINUTES}
        selected={minute}
        onSelect={setMinute}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sh = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  panel:         { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44, maxHeight: '65%' },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  title:         { color: DARK, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  option:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: BORDER },
  optionActive:  { backgroundColor: a(TEAL, 0.05) },
  optionTxt:     { color: MUTED, fontSize: 14, fontWeight: '500' },
  optionTxtActive: { color: TEAL, fontWeight: '700' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  blob:   { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', right: -50, top: -50 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerTitle: { color: WHITE, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 },
  stepPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  stepTxt:  { color: WHITE, fontSize: 11, fontWeight: '700' },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 20 },

  // Section head
  secHead:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12 },
  secBar:   { width: 4, height: 18, borderRadius: 2, backgroundColor: TEAL },
  secLabel: { fontSize: 14, fontWeight: '800', color: DARK },
  secErr:   { color: ERR, fontSize: 12, marginBottom: 8, marginTop: -6 },

  // Services
  servicesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  svcChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 13, paddingVertical: 9 },
  svcLabel: { fontSize: 13, fontWeight: '600', color: MUTED },
  requiredDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TEAL },

  // Inspection note
  inspectionNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: a(GREEN, 0.08), borderRadius: 12, borderWidth: 1, borderColor: a(GREEN, 0.2), paddingHorizontal: 13, paddingVertical: 9, marginBottom: 12 },
  inspectionNoteTxt: { flex: 1, fontSize: 12.5, color: '#145a38' },

  // Vehicle cards
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, padding: 14, marginBottom: 10 },
  vehicleIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 14, fontWeight: '700', color: DARK },
  vehicleSub:  { fontSize: 11, color: MUTED, marginTop: 2 },
  vehiclePriceWrap: { alignItems: 'flex-end' },
  vehiclePrice: { fontSize: 18, fontWeight: '800', color: DARK },
  vehiclePriceSub: { fontSize: 10, color: MUTED, marginTop: 1 },
  vehicleCheck: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  // Hotel cards
  hotelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER, padding: 14, marginBottom: 10 },
  hotelIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hotelName: { fontSize: 14, fontWeight: '700', color: DARK },
  hotelPrice: { fontSize: 12, color: MUTED, marginTop: 2 },

  // Field
  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  fieldInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, minHeight: 50 },
  fieldErr:   { color: ERR, fontSize: 11.5, marginTop: 4 },
  input:      { flex: 1, color: DARK, fontSize: 14, padding: 0 },
  selectTxt:  { flex: 1, color: DARK, fontSize: 14 },

  // Time
  timeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  timePicker: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, height: 50 },
  timeSep:    { color: MUTED, fontSize: 22, fontWeight: '300' },

  // Passengers
  paxRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  paxBtn: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER },
  paxTxt: { fontSize: 15, color: MUTED, fontWeight: '600' },

  // CTA
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 17 },
  ctaTxt: { color: WHITE, fontSize: 16, fontWeight: '800' },
});

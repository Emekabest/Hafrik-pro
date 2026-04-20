/**
 * Arrival Concierge — Screen 2: Trip Details
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, StatusBar, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const GOLD   = '#c9a84c';
const MUTED  = '#5f6b6d';
const WHITE   = '#ffffff';
const BRAND   = '#0c3f44';
const TEAL    = '#1f8e93';
const INPUT_BG = '#0c3f44';
const ERR    = '#ef4444';

const CITIES = [
  { label: 'Guangzhou', airports: ['Baiyun International (CAN)'] },
  { label: 'Yiwu',      airports: ['Yiwu Airport (YIW)', 'Hangzhou Xiaoshan (HGH)'] },
  { label: 'Shanghai',  airports: ['Pudong International (PVG)', 'Hongqiao (SHA)'] },
  { label: 'Beijing',   airports: ['Capital International (PEK)', 'Daxing International (PKX)'] },
  { label: 'Shenzhen',  airports: ['Bao\'an International (SZX)'] },
];

const PASSENGERS = ['1', '2', '3', '4', '5', '6+'];
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

// Simple select sheet
const SelectSheet = ({ visible, title, options, selected, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={sheet.overlay} onPress={onClose}>
      <Pressable style={sheet.panel}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i} style={sheet.option}
              onPress={() => { onSelect(opt); onClose(); }}
              activeOpacity={0.75}
            >
              <Text style={[sheet.optionTxt, opt === selected && { color: GOLD, fontFamily: 'WorkSans_700Bold' }]}>
                {typeof opt === 'object' ? opt.label : opt}
              </Text>
              {opt === selected && <Ionicons name="checkmark" size={18} color={GOLD} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>
);

const Field = ({ label, icon, children, error }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.fieldInner, error && { borderColor: ERR }]}>
      <Ionicons name={icon} size={17} color={error ? ERR : MUTED} style={{ marginRight: 10 }} />
      {children}
    </View>
    {!!error && <Text style={styles.fieldError}>{error}</Text>}
  </View>
);

export default function TripDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { experience } = route.params ?? {};

  const [city,        setCity]        = useState(null);
  const [airport,     setAirport]     = useState('');
  const [flight,      setFlight]      = useState('');
  const [date,        setDate]        = useState('');
  const [hour,        setHour]        = useState('');
  const [minute,      setMinute]      = useState('');
  const [dropoff,     setDropoff]     = useState('');
  const [passengers,  setPassengers]  = useState('1');
  const [notes,       setNotes]       = useState('');
  const [errors,      setErrors]      = useState({});

  const [sheet, setSheet] = useState(null); // which sheet is open

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleCitySelect = (c) => {
    setCity(c);
    setAirport(c.airports[0]);
  };

  const validate = () => {
    const e = {};
    if (!city)    e.city    = 'Please select a city';
    if (!flight)  e.flight  = 'Flight number required';
    if (!date)    e.date    = 'Arrival date required';
    if (!hour)    e.time    = 'Arrival time required';
    if (!dropoff) e.dropoff = 'Drop-off location required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReview = () => {
    if (!validate()) return;
    navigation.navigate('ArrivalReview', {
      experience,
      trip: {
        city: city.label,
        airport,
        flight,
        date,
        time: `${hour}:${minute || '00'}`,
        dropoff,
        passengers,
        notes,
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0c3f44" translucent={false} />

      {/* Header */}
      <LinearGradient colors={["#0c3f44", "#1a5a60"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <Text style={styles.headerSub}>{experience?.title ?? 'Arrival Concierge'}</Text>
        </View>
        <View style={[styles.stepBadge]}>
          <Text style={styles.stepTxt}>2 / 3</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Selected experience pill */}
          {experience && (
            <View style={styles.expPill}>
              <Ionicons name={experience.icon} size={14} color={GOLD} />
              <Text style={styles.expPillTxt}>{experience.title} · {experience.price}</Text>
            </View>
          )}

          {/* City */}
          <Field label="Arrival City" icon="location-outline" error={errors.city}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => setSheet('city')} activeOpacity={0.8}>
              <Text style={[styles.selectValue, !city && { color: MUTED }]}>
                {city ? city.label : 'Select city'}
              </Text>
            </TouchableOpacity>
            <Ionicons name="chevron-down" size={16} color={MUTED} />
          </Field>

          {/* Airport */}
          {city && city.airports.length > 1 ? (
            <Field label="Airport" icon="airplane-outline" error={errors.airport}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setSheet('airport')} activeOpacity={0.8}>
                <Text style={[styles.selectValue, !airport && { color: MUTED }]}>
                  {airport || 'Select airport'}
                </Text>
              </TouchableOpacity>
              <Ionicons name="chevron-down" size={16} color={MUTED} />
            </Field>
          ) : city ? (
            <Field label="Airport" icon="airplane-outline">
              <Text style={styles.selectValue}>{airport}</Text>
            </Field>
          ) : null}

          {/* Flight number */}
          <Field label="Flight Number" icon="document-text-outline" error={errors.flight}>
            <TextInput
              style={styles.input}
              placeholder="e.g. EK384"
              placeholderTextColor={MUTED}
              value={flight}
              onChangeText={t => { setFlight(t.toUpperCase()); setErrors(e => ({ ...e, flight: null })); }}
              autoCapitalize="characters"
            />
          </Field>

          {/* Arrival Date */}
          <Field label="Arrival Date" icon="calendar-outline" error={errors.date}>
            <TextInput
              style={styles.input}
              placeholder="DD / MM / YYYY"
              placeholderTextColor={MUTED}
              value={date}
              onChangeText={t => { setDate(t); setErrors(e => ({ ...e, date: null })); }}
              keyboardType="numeric"
            />
          </Field>

          {/* Arrival Time */}
          <Text style={styles.fieldLabel}>Arrival Time</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={[styles.timePicker, errors.time && { borderColor: ERR }]} onPress={() => setSheet('hour')} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={16} color={MUTED} />
              <Text style={[styles.selectValue, !hour && { color: MUTED }]}>{hour || 'HH'}</Text>
              <Ionicons name="chevron-down" size={14} color={MUTED} />
            </TouchableOpacity>
            <Text style={styles.timeSep}>:</Text>
            <TouchableOpacity style={[styles.timePicker, errors.time && { borderColor: ERR }]} onPress={() => setSheet('minute')} activeOpacity={0.8}>
              <Text style={[styles.selectValue, !minute && { color: MUTED }]}>{minute || 'MM'}</Text>
              <Ionicons name="chevron-down" size={14} color={MUTED} />
            </TouchableOpacity>
          </View>
          {!!errors.time && <Text style={styles.fieldError}>{errors.time}</Text>}

          {/* Drop-off */}
          <Field label="Drop-off Location" icon="navigate-outline" error={errors.dropoff}>
            <TextInput
              style={styles.input}
              placeholder="Hotel name or full address"
              placeholderTextColor={MUTED}
              value={dropoff}
              onChangeText={t => { setDropoff(t); setErrors(e => ({ ...e, dropoff: null })); }}
            />
          </Field>

          {/* Passengers */}
          <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Number of Passengers</Text>
          <View style={styles.passengerRow}>
            {PASSENGERS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.passengerBtn, passengers === p && styles.passengerBtnActive]}
                onPress={() => setPassengers(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.passengerTxt, passengers === p && styles.passengerTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Field label="Notes (Optional)" icon="chatbox-ellipses-outline">
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Special requests, wheelchair, infant seat..."
              placeholderTextColor={MUTED}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Field>

        </Animated.View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleReview} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <LinearGradient colors={[GOLD, '#a07830']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="clipboard-outline" size={20} color="#000" />
            <Text style={styles.ctaTxt}>Review Booking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* City sheet */}
      <SelectSheet
        visible={sheet === 'city'}
        title="Select City"
        options={CITIES}
        selected={city}
        onSelect={handleCitySelect}
        onClose={() => setSheet(null)}
      />

      {/* Airport sheet */}
      <SelectSheet
        visible={sheet === 'airport'}
        title="Select Airport"
        options={city?.airports ?? []}
        selected={airport}
        onSelect={setAirport}
        onClose={() => setSheet(null)}
      />

      {/* Hour sheet */}
      <SelectSheet
        visible={sheet === 'hour'}
        title="Hour"
        options={HOURS}
        selected={hour}
        onSelect={h => { setHour(h); setErrors(e => ({ ...e, time: null })); }}
        onClose={() => setSheet(null)}
      />

      {/* Minute sheet */}
      <SelectSheet
        visible={sheet === 'minute'}
        title="Minute"
        options={MINUTES}
        selected={minute}
        onSelect={setMinute}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '60%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e4eeef', alignSelf: 'center', marginBottom: 16 },
  title: { color: BRAND, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold', marginBottom: 14 },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e4eeef',
  },
  optionTxt: { color: '#b0bec5', fontSize: 14, fontFamily: 'WorkSans_400Regular' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  stepBadge: {
    backgroundColor: GOLD + '18', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: GOLD + '30',
  },
  stepTxt: { color: GOLD, fontSize: 11, fontFamily: 'WorkSans_700Bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  expPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: GOLD + '14', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: 'flex-start', marginBottom: 20,
    borderWidth: 1, borderColor: GOLD + '30',
  },
  expPillTxt: { color: GOLD, fontSize: 12, fontFamily: 'WorkSans_600SemiBold' },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  fieldInner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 52,
  },
  fieldError: { color: ERR, fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 4 },
  input: { flex: 1, color: BRAND, fontSize: 14, fontFamily: 'WorkSans_400Regular', padding: 0 },
  selectValue: { flex: 1, color: BRAND, fontSize: 14, fontFamily: 'WorkSans_400Regular' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  timePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: INPUT_BG, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 14, height: 52,
  },
  timeSep: { color: MUTED, fontSize: 20, fontFamily: 'ReadexPro_400Regular' },

  passengerRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  passengerBtn: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER,
  },
  passengerBtnActive: { backgroundColor: GOLD + '20', borderColor: GOLD },
  passengerTxt: { color: MUTED, fontSize: 14, fontFamily: 'WorkSans_600SemiBold' },
  passengerTxtActive: { color: GOLD },

  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER,
  },
  ctaBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, borderRadius: 16,
  },
  ctaTxt: { fontSize: 16, fontFamily: 'ReadexPro_600SemiBold', color: '#000' },
});

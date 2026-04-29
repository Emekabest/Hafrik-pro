import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';

export default function ServiceApplyScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();

  const {
    service_id,
    service_name,
    description,
    price,
    processing_time,
  } = route.params ?? {};

  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

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
        payload:   {},
      });
      Alert.alert('Success', 'Application submitted successfully', [
        { text: 'OK', onPress: () => navigation.navigate('MyApplications') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Apply for Service</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{service_name}</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Service summary card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="briefcase-outline" size={20} color={TEAL} />
            </View>
            <Text style={styles.infoTitle}>{service_name}</Text>
          </View>
          {!!description && (
            <Text style={styles.infoDesc}>{description}</Text>
          )}
          <View style={styles.infoMetaRow}>
            {!!price && (
              <View style={styles.infoMeta}>
                <Ionicons name="pricetag-outline" size={12} color={TEAL} />
                <Text style={styles.infoMetaTxt}>{price}</Text>
              </View>
            )}
            {!!processing_time && (
              <View style={styles.infoMeta}>
                <Ionicons name="time-outline" size={12} color={TEAL} />
                <Text style={styles.infoMetaTxt}>{processing_time}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Form section */}
        <Text style={styles.sectionLabel}>YOUR DETAILS</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Full Name <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, !!errors.fullName && styles.inputError]}
            placeholder="Enter your full name"
            placeholderTextColor={MUTED + '88'}
            value={fullName}
            onChangeText={v => {
              setFullName(v);
              if (errors.fullName) setErrors(p => ({ ...p, fullName: null }));
            }}
          />
          {!!errors.fullName && (
            <Text style={styles.errorTxt}>{errors.fullName}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Phone <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, !!errors.phone && styles.inputError]}
            placeholder="Enter your phone number"
            placeholderTextColor={MUTED + '88'}
            value={phone}
            onChangeText={v => {
              setPhone(v);
              if (errors.phone) setErrors(p => ({ ...p, phone: null }));
            }}
            keyboardType="phone-pad"
          />
          {!!errors.phone && (
            <Text style={styles.errorTxt}>{errors.phone}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Email <Text style={styles.opt}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            placeholderTextColor={MUTED + '88'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={WHITE} />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color={WHITE} />
              <Text style={styles.submitBtnTxt}>Submit Application</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },

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

  infoCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 24,
  },
  infoIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: TEAL + '14', borderWidth: 1, borderColor: TEAL + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  infoTitle:    { flex: 1, color: BRAND, fontSize: 15, fontFamily: 'ReadexPro_600SemiBold' },
  infoDesc:     { color: MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 19, marginBottom: 12 },
  infoMetaRow:  { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  infoMeta:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoMetaTxt:  { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_500Medium' },

  sectionLabel: {
    color: MUTED,
    fontSize: 10,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  field:      { marginBottom: 16 },
  fieldLabel: { color: BRAND, fontSize: 13, fontFamily: 'WorkSans_600SemiBold', marginBottom: 6 },
  req:        { color: '#ef4444' },
  opt:        { color: MUTED, fontFamily: 'WorkSans_400Regular', fontSize: 12 },

  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: BRAND,
    fontFamily: 'WorkSans_400Regular',
  },
  inputError: { borderColor: '#ef4444' },
  errorTxt:   { color: '#ef4444', fontSize: 11.5, fontFamily: 'WorkSans_500Medium', marginTop: 4 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnTxt: {
    color: WHITE,
    fontSize: 15,
    fontFamily: 'WorkSans_700Bold',
  },
});

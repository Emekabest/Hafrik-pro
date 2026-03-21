import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import AppDetails from '../helpers/appdetails';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const ERROR  = Colors.destructive;

const PasswordField = ({ label, value, onChange, placeholder, focused, onFocus, onBlur, hasError }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputFocused, hasError && styles.inputError]}>
        <Ionicons name="lock-closed-outline" size={17} color={focused ? ACCENT : MUTED} style={styles.inputIcon} />
        <TextInput
          style={styles.inputText}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <TouchableOpacity onPress={() => setShow(s => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ChangePasswordScreen({ navigation }) {
  const { top } = useSafeAreaInsets();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState('');
  const [errors,   setErrors]   = useState({});

  const nextRef    = useRef(null);
  const confirmRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!current.trim())    e.current = 'Current password is required';
    if (!next.trim())       e.next    = 'New password is required';
    else if (next.length < 6) e.next  = 'At least 6 characters';
    if (!confirm.trim())    e.confirm = 'Please confirm your password';
    else if (next !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || loading) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/change_password.php', {
        current_password: current,
        new_password:     next,
      });
      if (res.data?.status === 'success') {
        Alert.alert('Done', 'Your password has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Could not update password.');
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Network error. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.surfaceCool }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={[Colors.brandDeep, Colors.primaryDark, Colors.tealWave ?? Colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: top + 20 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark-outline" size={28} color={ACCENT} />
        </View>
        <Text style={styles.headerTitle}>Change Password</Text>
        <Text style={styles.headerSub}>Keep your account secure with a strong password</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <PasswordField
            label="Current Password"
            value={current}
            onChange={v => { setCurrent(v); setErrors(e => ({ ...e, current: '' })); }}
            placeholder="Enter current password"
            focused={focused === 'current'}
            onFocus={() => setFocused('current')}
            onBlur={() => setFocused('')}
            hasError={!!errors.current}
          />
          {!!errors.current && <Text style={styles.errText}>{errors.current}</Text>}

          <PasswordField
            label="New Password"
            value={next}
            onChange={v => { setNext(v); setErrors(e => ({ ...e, next: '' })); }}
            placeholder="At least 6 characters"
            focused={focused === 'next'}
            onFocus={() => setFocused('next')}
            onBlur={() => setFocused('')}
            hasError={!!errors.next}
          />
          {!!errors.next && <Text style={styles.errText}>{errors.next}</Text>}

          <PasswordField
            label="Confirm New Password"
            value={confirm}
            onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })); }}
            placeholder="Repeat new password"
            focused={focused === 'confirm'}
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused('')}
            hasError={!!errors.confirm}
          />
          {!!errors.confirm && <Text style={styles.errText}>{errors.confirm}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.brandDeep, Colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading
                ? <ActivityIndicator color={WHITE} size="small" />
                : <>
                    <Text style={styles.submitText}>Update Password</Text>
                    <Ionicons name="checkmark" size={18} color={WHITE} style={{ marginLeft: 8 }} />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot your current password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE + '1A', borderWidth: 1, borderColor: WHITE + '26',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: WHITE + '16', borderWidth: 1.5, borderColor: ACCENT + '50',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '900', color: WHITE,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerSub: {
    fontSize: 14, color: WHITE + 'A0', marginTop: 6, lineHeight: 20,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  body: {
    paddingHorizontal: 18, paddingTop: 24, paddingBottom: 60,
  },
  card: {
    backgroundColor: WHITE, borderRadius: 28, padding: 24,
    shadowColor: Colors.brandDeep, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 24, elevation: 6,
  },
  fieldWrap: { marginBottom: 6 },
  fieldLabel: {
    fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 7,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceCoolAlt ?? '#F5F5F8',
    borderRadius: 14, borderWidth: 1.5, borderColor: BRAND + '16',
    paddingHorizontal: 16, height: 52, marginBottom: 4,
  },
  inputFocused: {
    borderColor: ACCENT, backgroundColor: WHITE,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  inputError: { borderColor: ERROR, backgroundColor: ERROR + '08' },
  inputIcon:  { marginRight: 10 },
  inputText: {
    flex: 1, fontSize: 15, color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  errText: {
    fontSize: 12, color: ERROR, marginBottom: 12, marginTop: 2, paddingLeft: 4,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  submitBtn: {
    borderRadius: 28, overflow: 'hidden', marginTop: 12, marginBottom: 16,
    shadowColor: Colors.brandDeep, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  submitGradient: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  submitText: {
    fontSize: 17, fontWeight: '800', color: WHITE, letterSpacing: 0.3,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  forgotBtn: { alignItems: 'center', paddingVertical: 6 },
  forgotText: {
    fontSize: 13, color: ACCENT, fontWeight: '600',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
});

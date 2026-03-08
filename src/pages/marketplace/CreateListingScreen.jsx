import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;
const CREAM  = Colors.background;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Furniture', 'Services', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Used', 'For Parts'];

const API_BASE = 'https://hafrik.com';

export default function CreateListingScreen({ navigation }) {
  const { token } = useAuth();
  const { top } = useSafeAreaInsets();
  const { colors: tc } = useTheme();

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]           = useState('');
  const [location, setLocation]     = useState('');
  const [category, setCategory]     = useState('');
  const [condition, setCondition]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = title.trim() && price.trim() && category;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Missing Fields', 'Please fill in title, price, and category.');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('title', title.trim());
      body.append('description', description.trim());
      body.append('price', price.trim());
      body.append('location', location.trim());
      body.append('category', category);
      body.append('condition', condition);

      const res = await fetch(`${API_BASE}/api/v1/marketplace/create_listing.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const json = await res.json();

      if (json?.success || json?.status === 'success') {
        Alert.alert('Listed!', 'Your item has been posted to the marketplace.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', json?.message ?? 'Could not create listing. Try again.');
      }
    } catch (e) {
      console.log('CreateListing error', e);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: tc.background }]}>
      <StatusBar barStyle={tc.statusBar} backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient colors={[BRAND, Colors.tealHeader]} style={[styles.header, { paddingTop: top + 4 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Listing</Text>
          <Text style={styles.headerSub}>Fill in the details below</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Samsung Galaxy S23"
              placeholderTextColor={MUTED}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Price (¥) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2800"
              placeholderTextColor={MUTED}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Guangzhou, Xiaobei"
              placeholderTextColor={MUTED}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.pillGroup}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, category === c && styles.pillActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition */}
          <View style={styles.field}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.pillGroup}>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, condition === c && styles.pillActive]}
                  onPress={() => setCondition(c)}
                >
                  <Text style={[styles.pillText, condition === c && styles.pillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe your item — condition, features, reason for selling…"
              placeholderTextColor={MUTED}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={ACCENT} />
            <Text style={styles.infoText}>
              Listings are reviewed before going live. Photos can be added via the web portal.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !isValid && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <LinearGradient
                colors={[BRAND, Colors.tealHeader]}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                <Text style={styles.submitText}>Post Listing</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: withOpacity(Colors.white, 0.15),
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 11, color: withOpacity(Colors.white, 0.7), marginTop: 2 },

  body: { padding: 18 },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 8 },
  input: {
    backgroundColor: Colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: DARK,
  },
  textarea: { height: 110, paddingTop: 12 },
  charCount: { fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 4 },

  pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: Colors.white,
  },
  pillActive: { backgroundColor: BRAND, borderColor: BRAND },
  pillText: { fontSize: 12, fontWeight: '600', color: MUTED },
  pillTextActive: { color: Colors.white },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: `${ACCENT}12`, borderRadius: 14,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: `${ACCENT}25`,
  },
  infoText: { flex: 1, fontSize: 12.5, color: DARK, lineHeight: 18 },

  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, gap: 8,
  },
  submitText: { fontSize: 15, fontWeight: '800', color: Colors.white, letterSpacing: 0.3 },
});

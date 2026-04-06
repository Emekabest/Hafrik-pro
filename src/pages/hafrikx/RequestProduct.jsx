import React, { useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const BG      = '#070d1a';
const CARD    = '#0f1a2e';
const BORDER  = '#1e2d45';
const GOLD    = '#c9a84c';
const GOLD_LT = '#e8c87a';
const MUTED   = '#6b7f95';
const WHITE   = '#f5f6fa';
const ACCENT  = '#3b82f6';

const { width: W } = Dimensions.get('window');

const FieldLabel = memo(({ label, optional }) => (
  <View style={styles.fieldLabelRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {optional && <Text style={styles.fieldOptional}> (optional)</Text>}
  </View>
));

const StyledInput = memo(({ style, ...props }) => (
  <TextInput
    style={[styles.input, style]}
    placeholderTextColor={MUTED}
    {...props}
  />
));

const ToggleGroup = memo(({ value, onChange }) => (
  <View style={styles.toggleGroup}>
    {['Yes', 'No'].map(opt => (
      <TouchableOpacity
        key={opt}
        style={[styles.toggleBtn, value === opt && styles.toggleBtnActive]}
        onPress={() => onChange(opt)}
        activeOpacity={0.75}
      >
        <Text style={[styles.toggleBtnText, value === opt && styles.toggleBtnTextActive]}>
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

export default function RequestProduct() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [productName, setProductName]           = useState('');
  const [description, setDescription]           = useState('');
  const [quantity, setQuantity]                 = useState('');
  const [budget, setBudget]                     = useState('');
  const [destination, setDestination]           = useState('');
  const [needShipping, setNeedShipping]         = useState('Yes');
  const [needInspection, setNeedInspection]     = useState('No');
  const [deadline, setDeadline]                 = useState('');
  const [additionalNotes, setAdditionalNotes]   = useState('');
  const [imageAttached, setImageAttached]       = useState(false);

  const handleSubmit = useCallback(() => {
    if (!productName.trim()) {
      Alert.alert('Missing Info', 'Please enter the product name.');
      return;
    }
    Alert.alert(
      'Request Submitted!',
      'Our agents will contact you within 24 hours.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [productName, navigation]);

  const handleImagePick = useCallback(() => {
    setImageAttached(true);
    Alert.alert('Image Upload', 'Image picker will be connected to expo-image-picker.');
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request a Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Intro banner */}
        <LinearGradient colors={['#162240', '#0f1a2e']} style={styles.introBanner}>
          <Ionicons name="cube-outline" size={20} color={GOLD} />
          <Text style={styles.introBannerText}>
            Tell us what you need and our sourcing agents will find the best suppliers in China.
          </Text>
        </LinearGradient>

        {/* Product Name */}
        <FieldLabel label="Product Name" />
        <StyledInput
          value={productName}
          onChangeText={setProductName}
          placeholder="e.g. Wooden dining table"
          returnKeyType="next"
        />

        {/* Description */}
        <FieldLabel label="Description" />
        <StyledInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the product, material, size, colour, etc."
          multiline
          numberOfLines={4}
          style={styles.inputMultiline}
          textAlignVertical="top"
        />

        {/* Quantity */}
        <FieldLabel label="Quantity" />
        <StyledInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 100 pieces"
          keyboardType="numeric"
          returnKeyType="next"
        />

        {/* Budget */}
        <FieldLabel label="Budget" optional />
        <StyledInput
          value={budget}
          onChangeText={setBudget}
          placeholder="e.g. $500 USD"
          returnKeyType="next"
        />

        {/* Destination */}
        <FieldLabel label="Destination Country" />
        <StyledInput
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. Nigeria"
          returnKeyType="next"
        />

        {/* Need Shipping? */}
        <FieldLabel label="Need Shipping?" />
        <ToggleGroup value={needShipping} onChange={setNeedShipping} />

        {/* Need Inspection? */}
        <FieldLabel label="Need Inspection?" />
        <ToggleGroup value={needInspection} onChange={setNeedInspection} />

        {/* Deadline */}
        <FieldLabel label="Deadline" optional />
        <StyledInput
          value={deadline}
          onChangeText={setDeadline}
          placeholder="e.g. 30 April 2026"
          returnKeyType="next"
        />

        {/* Additional notes */}
        <FieldLabel label="Additional Notes" optional />
        <StyledInput
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
          placeholder="Any other details our agents should know…"
          multiline
          numberOfLines={3}
          style={[styles.inputMultiline, { height: 90 }]}
          textAlignVertical="top"
        />

        {/* Image upload */}
        <FieldLabel label="Attach Reference Image" optional />
        <TouchableOpacity
          style={styles.imageUploadBtn}
          onPress={handleImagePick}
          activeOpacity={0.8}
        >
          {imageAttached ? (
            <>
              <Ionicons name="checkmark-circle" size={22} color={GOLD} />
              <Text style={styles.imageUploadTextActive}>Image attached</Text>
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={22} color={MUTED} />
              <Text style={styles.imageUploadText}>Tap to upload an image</Text>
              <Text style={styles.imageUploadSub}>JPG, PNG up to 5MB</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          style={{ marginTop: 24, marginBottom: 50 }}
        >
          <LinearGradient colors={[GOLD, GOLD_LT, GOLD]} style={styles.submitBtn}>
            <Ionicons name="send" size={18} color={BG} />
            <Text style={styles.submitBtnText}>Submit Request</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'ReadexPro_600SemiBold',
    fontSize: 17,
    color: WHITE,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER,
  },
  introBannerText: {
    flex: 1,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
    color: WHITE,
    lineHeight: 19,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 14,
  },
  fieldLabel: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 13,
    color: WHITE,
  },
  fieldOptional: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    color: MUTED,
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    color: WHITE,
  },
  inputMultiline: {
    height: 110,
    paddingTop: 13,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: GOLD,
    backgroundColor: '#1e2a0e',
  },
  toggleBtnText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: MUTED,
  },
  toggleBtnTextActive: {
    color: GOLD_LT,
  },
  imageUploadBtn: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  imageUploadText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
    color: MUTED,
  },
  imageUploadTextActive: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 14,
    color: GOLD_LT,
  },
  imageUploadSub: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
    color: MUTED,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  submitBtnText: {
    fontFamily: 'WorkSans_700Bold',
    fontSize: 16,
    color: BG,
  },
});

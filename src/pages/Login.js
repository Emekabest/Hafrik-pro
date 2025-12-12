import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  FlatList
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../AuthContext';

const { width, height } = Dimensions.get('window');


// API base URL
const API_BASE_URL = 'https://hafrik.com/api/v1/auth';

// Country data with flags and dial codes
const countries = [
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'CI', name: 'Ivory Coast', dialCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
];

// Updated Onboarding Slides Data matching your screens
const onboardingScreens = [
  {
    id: 1,
    title: "Welcome to Hafrik",
    description: "Connect with fellow expatriates living in China and build your network.",
    image: require('../assl.js/iPhone 15 Pro Portrait Mockup.png'), // Use your actual image paths
  },
  {
    id: 2,
    title: "Join Us",
    description: "Join a groundbreaking platform tailored\nexclusively for expatriates like you.",
    image: require('../assl.js/iPhone 15 Pro Portrait Mockup (2).png'),
  },
  {
    id: 3,
    title: "Stay Connected",
    description: "Stay connected, stay informed, and make the most of every moment in China.",
    image: require('../assl.js/iPhone 15 Pro Portrait Mockup.png'),
  }
];

// Country Selector Modal Component (keep the same as before)
const CountrySelectorModal = ({ visible, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryDialCode}>{item.dialCode}</Text>
      </View>
      <Text style={styles.countryCode}>{item.code}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#2D3748" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#718096" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <FlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            style={styles.countriesList}
          />
        </View>
      </View>
    </Modal>
  );
};

// Updated OnboardingScreen component with text overlay
// Updated OnboardingScreen component with complete overlay
const OnboardingScreen = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slide);
  };

  const goToNextSlide = () => {
    const nextSlide = currentSlide + 1;
    if (nextSlide < onboardingScreens.length) {
      scrollViewRef.current.scrollTo({ x: nextSlide * width, animated: true });
      setCurrentSlide(nextSlide);
    } else {
      onComplete();
    }
  };

  const skipToAuth = () => {
    onComplete();
  };

  const renderItem = (item) => {
    return (
      <View style={styles.slide} key={item.id}>
        {/* Skip Button at Top Right */}
        {currentSlide < onboardingScreens.length - 1 && (
          <TouchableOpacity
            style={styles.skipButtonTop}
            onPress={skipToAuth}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={item.image}
            style={styles.onboardingImage}
            resizeMode="contain"
          />

          {/* Complete Overlay at Bottom of Image */}
          <View style={styles.fullOverlay}>
            {/* Text Content */}
            <View style={styles.textContent}>
              <Text style={styles.onboardingTitle}>{item.title}</Text>
              <Text style={styles.onboardingDescription}>{item.description}</Text>
            </View>

            {/* Progress Dots */}
            {currentSlide < onboardingScreens.length - 1 ? (
              <View style={styles.dotsContainer}>
                {onboardingScreens.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: currentSlide === index ? '#0C3F44' : '#E2E8F0',
                      }
                    ]}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptySpace} />
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={goToNextSlide}
            >
              <Text style={styles.onboardingButtonText}>
                {currentSlide === onboardingScreens.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.onboardingContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {onboardingScreens.map((item) => renderItem(item))}
      </ScrollView>
    </View>
  );
};
const AuthScreen = () => {
  const [authMode, setAuthMode] = useState('login');
  const navigation = useNavigation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phoneNumber: '',
    country: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState({});
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { token, user } = useAuth();

  const isSubmitting = useRef(false);

  const toggleAuthMode = () => {
    isSubmitting.current = false;
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setErrors({});
    setFormData({
      fullName: '',
      username: '',
      email: '',
      password: '',
      phoneNumber: '',
      country: null
    });
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleFocus = (name) => {
    setIsFocused(prev => ({ ...prev, [name]: true }));
  };

  const handleBlur = (name) => {
    setIsFocused(prev => ({ ...prev, [name]: false }));
  };

  const handleCountrySelect = (country) => {
    setFormData(prev => ({
      ...prev,
      country: country
    }));
  };

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');

    if (formData.country) {
      const dialCode = formData.country.dialCode.replace('+', '');
      if (cleaned.startsWith(dialCode)) {
        const numberWithoutDialCode = cleaned.slice(dialCode.length);
        return numberWithoutDialCode;
      }
    }

    return cleaned;
  };

  const getFullPhoneNumber = () => {
    if (!formData.country || !formData.phoneNumber) return '';
    return `${formData.country.dialCode}${formData.phoneNumber.replace(/\D/g, '')}`;
  };

  const validateForm = () => {
    const newErrors = {};

    if (authMode === 'register') {
      // Register validation
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }

      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      }

      if (!formData.country) {
        newErrors.country = 'Country is required';
      }

      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!validatePhoneNumber(formData.phoneNumber)) {
        newErrors.phoneNumber = 'Please enter a valid phone number';
      }

      if (!agreeToTerms) {
        newErrors.terms = 'You must agree to the terms of service';
      }
    } else {
      // Login validation
      if (!formData.username.trim() && !formData.email.trim()) {
        newErrors.username = 'Username or email is required';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[0-9]{7,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  // In your AuthScreen component, update the handleSubmit function
 const handleSubmit = async () => {
  if (isLoading || isSubmitting.current) {
    return;
  }

  if (!validateForm()) return;

  setIsLoading(true);
  isSubmitting.current = true;

  try {
    let response;
    let endpoint;
    let requestData;

    if (authMode === 'login') {
      endpoint = `${API_BASE_URL}/login.php`;
      const loginIdentifier = formData.username.trim() || formData.email.trim();
      requestData = {
        username: loginIdentifier,
        password: formData.password
      };
    } else {
      endpoint = `${API_BASE_URL}/register.php`;
      requestData = {
        full_name: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone_number: getFullPhoneNumber(),
        country: formData.country.code,
        country_name: formData.country.name
      };
    }

    console.log(`[HAFRIK Auth] Calling ${endpoint}...`);
    console.log(`[HAFRIK Auth] Request data:`, JSON.stringify(requestData, null, 2));

    response = await axios.post(
      endpoint,
      requestData,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('[HAFRIK Auth] Full API response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'success') {
      // FIX: Use 'token' instead of 'access_token' and handle user data properly
      const token = response.data.data?.token;
      let user = response.data.data?.user;

      console.log('[HAFRIK Auth] Extracted raw data:', {
        tokenExists: !!token,
        tokenLength: token?.length,
        userType: typeof user,
        isUserArray: Array.isArray(user),
        userData: user
      });

      // Handle user data if it's an array
      if (Array.isArray(user) && user.length > 0) {
        user = user[0]; // Take first element if it's an array
      }

      console.log('[HAFRIK Auth] Processed data:', {
        token: token ? `${token.substring(0, 20)}...` : 'No token',
        user: user ? `User ID: ${user.id}` : 'No user',
        userId: user?.id,
        username: user?.username
      });

      if (!token || !user) {
        console.error('[HAFRIK Auth] Missing data:', {
          token: token,
          user: user,
          fullResponse: response.data
        });
        throw new Error('Invalid API response: Missing token or user data');
      }

      console.log('[HAFRIK Auth] Authentication successful!', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      // Use the auth context to login
      await login(user, token);
      
      // Reset navigation to MainTabs
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });

    } else {
      console.log('[HAFRIK Auth] API returned unexpected response:', response.data);
      Alert.alert(
        'Authentication Failed',
        response.data.message || 'Please check your credentials and try again'
      );
    }
  } catch (error) {
    console.error('[HAFRIK Auth] Processing error:', error);
    console.error('[HAFRIK Auth] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      const serverError = error.response.data;
      if (serverError.message) {
        errorMessage = serverError.message;
      } else if (error.response.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (error.response.status === 400) {
        errorMessage = 'Invalid request data';
      } else if (error.response.status === 422) {
        errorMessage = 'Validation error. Please check your inputs.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please check your internet connection.';
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'Network unavailable. Please check your connection.';
    } else if (error.message.includes('Invalid API response')) {
      errorMessage = 'Server returned invalid response. Please try again.';
    }

    Alert.alert('Authentication Error', errorMessage);
  } finally {
    setIsLoading(false);
    setTimeout(() => {
      isSubmitting.current = false;
    }, 1000);
  }
};


 const storeToken = async (token) => {
  try {
    console.log('[HAFRIK Auth] Storing token:', `${token.substring(0, 20)}...`);
    await AsyncStorage.setItem('hafrik_token', token);
  } catch (error) {
    console.error('[HAFRIK Auth] Error storing token:', error);
  }
};

const storeUser = async (user) => {
  try {
    console.log('[HAFRIK Auth] Storing user data:', {
      id: user.id,
      username: user.username
    });
    await AsyncStorage.setItem('hafrik_user', JSON.stringify(user));
  } catch (error) {
    console.error('[HAFRIK Auth] Error storing user:', error);
  }
};



  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.authContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.authScrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Brand Header - At the very top */}
        <View style={styles.newHeader}>
          <Feather
            name={'eye'}
            size={28}
          />
          <Image
            source={require('../assl.js/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandSubtitle}>HAFRIK</Text>
        </View>

        {/* Referral Banner Section with Image - After the header */}
        <View style={styles.referralBanner}>
          <View style={styles.referralContent}>
            {/* Left side - Text content */}
            <View style={styles.referralTextContent}>
              <Text style={styles.referralSubtitle}>有福同享爱心double</Text>

              <View style={styles.referralDetails}>
                <Text style={styles.referralText}>每成功推荐一位贫困叔下单</Text>
                <Text style={styles.referralText}>您都将获得200或500元现金</Text>
                <Text style={styles.referralHighlight}>多荐多得，累计无上限</Text>
              </View>
            </View>

            {/* Right side - Image */}
            <View style={styles.referralImageContainer}>
              <Image
                source={require('../assl.js/young-smiling-woman-red-warm-sweater-listening-music-headphones 1.png')}
                style={styles.referralImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Main Auth Card */}
        <View style={styles.authCard}>
          {/* Title */}
          <Text style={styles.authTitle}>
            {authMode === 'login' ? 'Log in' : 'Sign up'}
          </Text>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Username/Email Input - Show for both login and register */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {authMode === 'login' ? 'Username or Email' : 'Username'}
              </Text>
              <View style={[
                styles.inputContainer,
                errors.username && styles.inputError,
                isFocused.username && styles.inputFocused
              ]}>
                <TextInput
                  style={styles.textInput}
                  placeholder={authMode === 'login' ? 'Enter username or email' : 'Enter username'}
                  placeholderTextColor="#A0AEC0"
                  value={authMode === 'login' ? (formData.username || formData.email) : formData.username}
                  onChangeText={(text) => {
                    if (authMode === 'login') {
                      // For login, allow both username or email
                      if (text.includes('@')) {
                        handleChange('email', text);
                        handleChange('username', '');
                      } else {
                        handleChange('username', text);
                        handleChange('email', '');
                      }
                    } else {
                      // For register, only username
                      handleChange('username', text);
                    }
                  }}
                  autoCapitalize="none"
                  onFocus={() => handleFocus('username')}
                  onBlur={() => handleBlur('username')}
                  returnKeyType="next"
                />
              </View>
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>

            {/* Email Input (only for register) */}
            {authMode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[
                  styles.inputContainer,
                  errors.email && styles.inputError,
                  isFocused.email && styles.inputFocused
                ]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your email"
                    placeholderTextColor="#A0AEC0"
                    value={formData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => handleFocus('email')}
                    onBlur={() => handleBlur('email')}
                    returnKeyType="next"
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
            )}

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[
                styles.inputContainer,
                errors.password && styles.inputError,
                isFocused.password && styles.inputFocused
              ]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#A0AEC0"
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                  secureTextEntry={!showPassword}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={errors.password ? '#FC8181' : '#A0AEC0'}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Additional fields for register */}
            {authMode === 'register' && (
              <>
                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full name</Text>
                  <View style={[
                    styles.inputContainer,
                    errors.fullName && styles.inputError,
                    isFocused.fullName && styles.inputFocused
                  ]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your full name"
                      placeholderTextColor="#A0AEC0"
                      value={formData.fullName}
                      onChangeText={(text) => handleChange('fullName', text)}
                      onFocus={() => handleFocus('fullName')}
                      onBlur={() => handleBlur('fullName')}
                      returnKeyType="next"
                    />
                  </View>
                  {errors.fullName && (
                    <Text style={styles.errorText}>{errors.fullName}</Text>
                  )}
                </View>

                {/* Country Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <TouchableOpacity
                    style={[
                      styles.countrySelector,
                      errors.country && styles.inputError,
                      isFocused.country && styles.inputFocused
                    ]}
                    onPress={() => setShowCountryModal(true)}
                    onFocus={() => handleFocus('country')}
                    onBlur={() => handleBlur('country')}
                  >
                    <View style={styles.countrySelectorContent}>
                      {formData.country ? (
                        <>
                          <Text style={styles.countryFlag}>{formData.country.flag}</Text>
                          <Text style={styles.countrySelectorText}>
                            {formData.country.name}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.countrySelectorPlaceholder}>
                          Select country
                        </Text>
                      )}
                      <Feather name="chevron-down" size={20} color="#A0AEC0" />
                    </View>
                  </TouchableOpacity>
                  {errors.country && (
                    <Text style={styles.errorText}>{errors.country}</Text>
                  )}
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <View style={[
                    styles.phoneInputContainer,
                    errors.phoneNumber && styles.inputError,
                    isFocused.phoneNumber && styles.inputFocused
                  ]}>
                    <View style={styles.countryCodeDisplay}>
                      <Text style={styles.countryCodeText}>
                        {formData.country ? formData.country.dialCode : '+234'}
                      </Text>
                    </View>
                    <Text style={styles.phoneSeparator}>|</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Mobile number"
                      placeholderTextColor="#A0AEC0"
                      value={formData.phoneNumber}
                      onChangeText={(text) => handleChange('phoneNumber', formatPhoneNumber(text))}
                      keyboardType="phone-pad"
                      onFocus={() => handleFocus('phoneNumber')}
                      onBlur={() => handleBlur('phoneNumber')}
                      returnKeyType="next"
                    />
                  </View>
                  {errors.phoneNumber && (
                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                  )}
                </View>

                {/* Terms Agreement */}
                <View style={styles.termsContainer}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setAgreeToTerms(!agreeToTerms)}
                  >
                    <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                      {agreeToTerms && <Feather name="check" size={14} color="#FFF" />}
                    </View>
                    <Text style={styles.termsText}>
                      By continuing, you agree to our terms of service
                    </Text>
                  </TouchableOpacity>
                  {errors.terms && (
                    <Text style={styles.errorText}>{errors.terms}</Text>
                  )}
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={[styles.submitButton, isLoading && styles.disabledButton]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {authMode === 'login' ? 'Sign in' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Switch Mode */}
            <View style={styles.switchModeContainer}>
              <Text style={styles.switchModeText}>
                {authMode === 'login'
                  ? "You don't have an account? "
                  : 'You already have an account? '}
              </Text>
              <TouchableOpacity onPress={toggleAuthMode}>
                <Text style={styles.switchModeLink}>
                  {authMode === 'login' ? 'Sign up' : 'Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>为什么选择我们</Text>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>X²</Text>
              </View>
              <Text style={styles.featureTitle}>双倍效率</Text>
              <Text style={styles.featureText}>
                双线显示屏设计，智能识别输入内容，自动优化排版布局，提升工作效率200%
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>Y+</Text>
              </View>
              <Text style={styles.featureTitle}>智能识别</Text>
              <Text style={styles.featureText}>
                高级AI算法自动检测X/Y坐标，一键确认精准定位，减少手动操作时间
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>⚡</Text>
              </View>
              <Text style={styles.featureTitle}>极速响应</Text>
              <Text style={styles.featureText}>
                毫秒级响应速度，实时处理复杂指令，确保工作流程顺畅无延迟
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>🛡️</Text>
              </View>
              <Text style={styles.featureTitle}>安全稳定</Text>
              <Text style={styles.featureText}>
                企业级数据加密保护，99.9%系统稳定性，保障您的数据安全无忧
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>🔧</Text>
              </View>
              <Text style={styles.featureTitle}>定制服务</Text>
              <Text style={styles.featureText}>
                根据个人需求定制专属功能，提供个性化解决方案和专业技术支持
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>📈</Text>
              </View>
              <Text style={styles.featureTitle}>持续更新</Text>
              <Text style={styles.featureText}>
                定期功能升级和优化，紧跟技术发展趋势，始终保持行业领先地位
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Country Selector Modal */}
      <CountrySelectorModal
        visible={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={handleCountrySelect}
      />
    </KeyboardAvoidingView>
  );
};

// Main Component
const HAFRIKOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return <AuthScreen />;
};

const styles = StyleSheet.create({
  // Onboarding Styles
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#FFF'
  },
  slide: {
    width: width,
    height: height,
    flex: 1,
    backgroundColor: '#FFF',
  },
  // Skip Button at Top Right
  skipButtonTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 24,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
  // Image Container
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    paddingTop: 90
  },
  onboardingImage: {
    width: '100%',
    height: '100%',
  },
  // Complete Overlay
  fullOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40
  },
  textContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptySpace: {
    height: 38,
  },
  onboardingButton: {
    backgroundColor: '#0C3F44',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  onboardingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },


  // New Auth Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  authScrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  // Referral Banner Styles
  newHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'left',
    marginBottom: 4,
  },
  productName: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'left',
  },

  // Referral Banner Styles with Image
  referralBanner: {
    backgroundColor: '#0C3F44',
    paddingHorizontal: 25,
    paddingVertical: 25,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralTextContent: {
    flex: 1,
    marginRight: 15,
  },
  referralTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  referralSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    marginBottom: 15,
  },
  referralDetails: {
    // This container holds the referral text lines
  },
  referralText: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  referralHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
  },
  referralImageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralImage: {
    width: '300%',
    height: '300%',
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'left',
    marginBottom: 4,
  },
  productName: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'left',
  },
  authCard: {
    paddingHorizontal: 25,
    paddingVertical: 30,
    backgroundColor: '#FFF',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'left',
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  inputFocused: {
    borderColor: '#0C3F44',
  },
  inputError: {
    borderColor: '#FC8181',
    backgroundColor: '#FED7D7',
  },
  textInput: {
    fontSize: 16,
    color: '#2D3748',
    paddingVertical: 0,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    padding: 8,
  },
  errorText: {
    color: '#FC8181',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },

  // Country Selector Styles
  countrySelector: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  countrySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countrySelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 10,
  },
  countrySelectorPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#A0AEC0',
    marginLeft: 10,
  },
  countryFlag: {
    fontSize: 20,
  },

  // Phone Input Styles
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countryCodeDisplay: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  phoneSeparator: {
    fontSize: 16,
    color: '#CBD5E0',
    marginHorizontal: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    paddingRight: 15,
  },

  // Terms Styles
  termsContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0C3F44',
    borderColor: '#0C3F44',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#0C3F44',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Switch Mode
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  switchModeText: {
    color: '#718096',
    fontSize: 14,
    textAlign: 'center',
  },
  switchModeLink: {
    color: '#0C3F44',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },

  // Features Section
  // Features Section Styles
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#F8FAFC',
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 25,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  featureCard: {
    width: (width - 55) / 2, // Calculate width for 2 columns with padding
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0C3F44',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  featureIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  featureText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Country Modal Styles (keep existing)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
  },
  countriesList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  countryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  countryName: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  countryDialCode: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  countryCode: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '500',
  },
});

export default HAFRIKOnboarding;



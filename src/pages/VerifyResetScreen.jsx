import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../theme/colors';

const API_BASE = 'https://hafrik.com/api/v1/auth';

const VerifyResetScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code) {
      Alert.alert('Error', 'Verification code is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/verify.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Code verified. You can now reset your password.');
        navigation.navigate('ResetPassword', { email, code });
      } else {
        Alert.alert('Error', data.message || 'Verification failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Reset Code</Text>
      <Text style={styles.subtitle}>Enter the code sent to your email.</Text>
      <TextInput
        style={styles.input}
        placeholder="Verification Code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textBodyIndigo,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: Colors.neutral100,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default VerifyResetScreen;

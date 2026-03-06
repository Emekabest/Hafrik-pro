import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { createCommunity } from '../../api/create';
import { Colors } from '../../theme/colors';

const ACCENT = Colors.primary;

export default function CreateCommunityScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();

  const [avatar,      setAvatar]      = useState<{ uri: string; fileName: string; type: string } | null>(null);
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setAvatar({ uri: a.uri, fileName: a.fileName || 'community.jpg', type: a.type || 'image' });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a community name.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description);
      if (avatar) {
        fd.append('avatar', {
          uri: avatar.uri,
          type: 'image/jpeg',
          name: avatar.fileName,
        } as any);
      }
      const res = await createCommunity(fd as any, token!);
      if (res?.status === 'success') {
        Alert.alert('Created!', 'Your community is ready.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res?.message || 'Something went wrong.');
      }
    } catch {
      Alert.alert('Error', 'Failed to create community.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Avatar Picker ── */}
        <TouchableOpacity style={styles.avatarPicker} activeOpacity={0.8} onPress={pickAvatar}>
          {avatar ? (
            <ExpoImage source={{ uri: avatar.uri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="people-outline" size={32} color={ACCENT} />
              <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={13} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* ── Section: Info ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="globe-outline" size={15} color={ACCENT} />
            <Text style={styles.sectionTitle}>Community Info</Text>
          </View>

          <Text style={styles.label}>Community Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Lagos Creatives" placeholderTextColor={Colors.mutedBlueGrayPlaceholder} />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this community about?"
            placeholderTextColor={Colors.mutedBlueGrayPlaceholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.btnTxt}>Create Community</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
    backgroundColor: Colors.surfaceBase,
  },

  // ── Avatar picker ───────────────────────
  avatarPicker: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 10,
    marginBottom: 18,
    overflow: 'visible',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceCool,
    borderWidth: 2,
    borderColor: Colors.borderSoft,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    marginTop: 4,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: ACCENT,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
  },

  // ── Sections ────────────────────────────
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textBodyIndigo,
    letterSpacing: -0.1,
  },

  // ── Fields ──────────────────────────────
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.mutedBlueGray,
    marginBottom: 4,
    marginTop: 10,
    letterSpacing: 0.15,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    backgroundColor: Colors.surfaceCool,
    color: Colors.textBodyIndigo,
  },
  multiline: {
    minHeight: 90,
    paddingTop: 10,
  },

  // ── Button ──────────────────────────────
  btn: {
    marginTop: 20,
    backgroundColor: ACCENT,
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnTxt: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

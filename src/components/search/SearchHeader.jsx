// SearchHeader — premium gradient header with animated search bar + filter tabs.
// TypingDots uses 3 separate useRef instances (not in a map) to fix the hooks-in-loop bug.
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme';

const PRIMARY = Colors.primaryDark;
const ACCENT  = Colors.primary;
const DARK    = Colors.black;
const WHITE   = Colors.white;

export const TABS = [
  { label: 'All',      icon: 'flash',         type: null      },
  { label: 'People',   icon: 'people',        type: 'user'    },
  { label: 'Posts',    icon: 'document-text', type: 'post'    },
  { label: 'Pages',    icon: 'business',      type: 'page'    },
  { label: 'Groups',   icon: 'albums',        type: 'group'   },
  { label: 'Articles', icon: 'newspaper',     type: 'article' },
];

// Fixed TypingDots — 3 separate refs, NOT called inside a map/loop
const TypingDots = () => {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (d, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(Math.max(0, 560 - delay)),
        ])
      );
    const a0 = make(d0, 0);
    const a1 = make(d1, 150);
    const a2 = make(d2, 300);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[d0, d1, d2].map((d, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, {
            opacity: d,
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }]}
        />
      ))}
    </View>
  );
};

const SearchHeader = ({
  searchQuery,
  onChangeText,
  onSubmit,
  onBack,
  onClear,
  isLoading,
  activeTab,
  onTabChange,
  inputRef,
}) => {
  const { top } = useSafeAreaInsets();
  const [inputFocused, setInputFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: inputFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [inputFocused]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [WHITE + '26', ACCENT],
  });

  return (
    <LinearGradient
      colors={[PRIMARY, ACCENT + 'CC']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: top + 10 }]}
    >
      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Search row */}
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>

        <Animated.View style={[styles.searchBar, { borderColor }]}>
          <Ionicons
            name="search"
            size={17}
            color={inputFocused ? ACCENT : WHITE + '80'}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search Hafrik…"
            placeholderTextColor={WHITE + '66'}
            value={searchQuery}
            onChangeText={onChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={onSubmit}
          />
          {isLoading ? (
            <TypingDots />
          ) : searchQuery?.length > 0 ? (
            <TouchableOpacity
              onPress={onClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={WHITE + '99'} />
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        keyboardShouldPersistTaps="handled"
      >
        {TABS.map((tab, index) => {
          const active = activeTab === index;
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tabChip, active && styles.tabChipActive]}
              activeOpacity={0.78}
              onPress={() => onTabChange(index)}
            >
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline`}
                size={13}
                color={active ? DARK : WHITE + 'A6'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Accent underline */}
      <View style={styles.borderBottom} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 6,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  blob1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: ACCENT + '1A', top: -70, right: -60,
  },
  blob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: WHITE + '0A', bottom: -40, left: -20,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE + '1F',
    borderWidth: 1, borderColor: WHITE + '29',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE + '1F',
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    gap: 8,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: WHITE,
    fontFamily: AppDetails.fontFamily.inter.regular,
    paddingVertical: 0,
  },
  tabsContent: { paddingBottom: 2, gap: 8 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: WHITE + '1F',
    borderWidth: 1, borderColor: WHITE + '1F',
  },
  tabChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: {
    fontSize: 13, color: WHITE + 'B3',
    fontFamily: AppDetails.fontFamily.redex.medium,
  },
  tabTextActive: {
    color: DARK,
    fontFamily: AppDetails.fontFamily.redex.bold,
  },
  borderBottom: {
    height: 1, backgroundColor: ACCENT + '33', marginTop: 4,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT },
});

export default SearchHeader;

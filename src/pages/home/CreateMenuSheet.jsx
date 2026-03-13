/**
 * CreateMenuSheet
 * ─────────────────
 * Global bottom-sheet creation menu shared across Home, Explore and Feed card.
 * State lives in Zustand (showCreateMenu / openCreateMenu / closeCreateMenu).
 * Opening a specific action calls openComposer() with the matching initialTab.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

const BRAND = Colors.primaryDark;
const WHITE = Colors.white;

const CREATE_ACTIONS = [
  { key: 'post',     label: 'Create Post',   icon: 'create-outline',      color: Colors.primaryDark,           initialTab: 'text'   },
  { key: 'reel',     label: 'Create Reel',   icon: 'flame-outline',        color: Colors.tealAccent ?? Colors.primary, initialTab: 'reel'   },
  { key: 'photos',   label: 'Add Photos',    icon: 'images-outline',       color: Colors.primary,               initialTab: 'photos' },
  { key: 'video',    label: 'Upload Video',  icon: 'videocam-outline',     color: Colors.brandLime ?? '#a8e063', initialTab: 'video'  },
  { key: 'question', label: 'Ask Question',  icon: 'help-circle-outline',  color: Colors.primary,               initialTab: 'text'   },
  { key: 'event',    label: 'Create Event',  icon: 'calendar-outline',     color: Colors.primaryDark,           initialTab: null, navigate: 'EventsScreen' },
];

const CreateMenuSheet = () => {
  const showCreateMenu  = useStore((s) => s.showCreateMenu);
  const closeCreateMenu = useStore((s) => s.closeCreateMenu);
  const openComposer    = useStore((s) => s.openComposer);
  const navigation      = useNavigation();

  const slideY = useRef(new Animated.Value(300)).current;
  const fadeOv = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showCreateMenu) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 160, friction: 18 }),
        Animated.timing(fadeOv,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeOv,  { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [showCreateMenu]);

  const handleAction = useCallback((action) => {
    closeCreateMenu();
    setTimeout(() => {
      if (action.navigate) {
        navigation.navigate(action.navigate);
      } else {
        openComposer({ initialTab: action.initialTab });
      }
    }, 240);
  }, [closeCreateMenu, openComposer, navigation]);

  if (!showCreateMenu) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeCreateMenu}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeOv }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeCreateMenu} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* Handle */}
        <View style={styles.handle} />
        <Text style={styles.title}>Create</Text>

        <View style={styles.grid}>
          {CREATE_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => handleAction(action)}
            >
              <View style={[styles.iconBubble, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.itemLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={closeCreateMenu} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black + '60',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: BRAND + '25',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  item: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: BRAND + '05',
    borderWidth: 1,
    borderColor: BRAND + '0E',
  },
  iconBubble: {
    width: 52, height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND,
    textAlign: 'center',
    lineHeight: 14,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND + '08',
    borderWidth: 1,
    borderColor: BRAND + '12',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND,
  },
});

export default CreateMenuSheet;

import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Pressable,
} from 'react-native';
import { Colors } from '../../../../theme/colors';

const REACTIONS = [
  { type: 'like',  emoji: '👍', label: 'Like' },
  { type: 'love',  emoji: '❤️', label: 'Love' },
  { type: 'haha',  emoji: '😂', label: 'Haha' },
  { type: 'yay',   emoji: '🎉', label: 'Yay' },
  { type: 'wow',   emoji: '😮', label: 'Wow' },
  { type: 'sad',   emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
];

export const REACTION_EMOJI_MAP = {
  like: '👍', love: '❤️', haha: '😂', yay: '🎉',
  wow: '😮', sad: '😢', angry: '😡',
};

/**
 * A floating reaction picker that appears on long-press of the like button.
 *
 * Props:
 *  - visible       : boolean
 *  - currentReaction: string | null — the user's current reaction type
 *  - onSelect      : (reactionType: string) => void
 *  - onClose       : () => void
 */
const ReactionPicker = ({ visible, currentReaction, onSelect, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      // Animate container in
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 6, tension: 120, useNativeDriver: true,
      }).start();
      // Stagger each emoji
      itemAnims.forEach((anim, i) => {
        anim.setValue(0);
        Animated.spring(anim, {
          toValue: 1, friction: 5, tension: 100, delay: i * 35, useNativeDriver: true,
        }).start();
      });
    } else {
      scaleAnim.setValue(0);
      itemAnims.forEach(a => a.setValue(0));
    }
  }, [visible]);

  const handleSelect = useCallback((type) => {
    onSelect(type);
  }, [onSelect]);

  if (!visible) return null;

  return (
    <>
      {/* Invisible backdrop to capture taps outside */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }], opacity: scaleAnim },
        ]}
      >
        {REACTIONS.map((r, i) => {
          const isActive = currentReaction === r.type;
          return (
            <Animated.View
              key={r.type}
              style={{
                transform: [
                  { scale: itemAnims[i] },
                  { translateY: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                ],
              }}
            >
              <TouchableOpacity
                style={[styles.emojiBtn, isActive && styles.emojiBtnActive]}
                onPress={() => handleSelect(r.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{r.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 42,
    left: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    // shadow
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 999,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnActive: {
    backgroundColor: Colors.primary + '18',
  },
  emoji: {
    fontSize: 24,
  },
});

export default memo(ReactionPicker);

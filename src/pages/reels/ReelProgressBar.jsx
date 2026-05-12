import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Colors } from '../../theme/colors';

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

export default function ReelProgressBar({ progress = 0, onSeek }) {
  const widthRef = useRef(1);
  const pct = Math.max(0, Math.min(1, Number(progress) || 0));
  const fillWidth = `${pct * 100}%`;

  const seekFromX = (x) => {
    const width = Math.max(1, widthRef.current);
    const ratio = Math.max(0, Math.min(1, x / width));
    onSeek?.(ratio);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => seekFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => seekFromX(event.nativeEvent.locationX),
  }), [onSeek]);

  return (
    <View style={styles.wrap}>
      <View
        style={styles.trackHit}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width || 1;
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: fillWidth }]} />
          <View style={[styles.thumb, { left: fillWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
  },
  trackHit: {
    height: 14,
    justifyContent: 'center',
  },
  track: {
    height: 2,
    width: '100%',
    backgroundColor: alpha(Colors.white, 0.2),
    borderRadius: 999,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 999,
  },
  thumb: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 8,
    marginLeft: -4,
    borderRadius: 4,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

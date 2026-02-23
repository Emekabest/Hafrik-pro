import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, Modal, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppDetails from '../helpers/appdetails';

const ProgressBarLoader = ({ visible = false }) => {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(visible);
  const running = useRef(false);

  // Get the status bar height
  const statusBarHeight = Platform.OS === 'android' 
    ? StatusBar.currentHeight || 0 
    : insets.top;

  useEffect(() => {
    if (visible) {
      setShow(true);
      running.current = true;
      progress.setValue(0);
      startLoop();
    } else {
      running.current = false;
      // finish the bar then hide
      Animated.timing(progress, {
        toValue: 100,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        progress.setValue(0);
        setShow(false);
      });
    }

    return () => {
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const startLoop = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 90,
      duration: 1500,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && running.current) {
        setTimeout(() => startLoop(), 150);
      }
    });
  };

  const width = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={show}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <View style={[styles.overlay, { marginTop: statusBarHeight }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width }]} />
        </View>
      </View>
    </Modal>
  );
};




const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: 4,
    backgroundColor: "#fff",
  },
});

export default ProgressBarLoader;

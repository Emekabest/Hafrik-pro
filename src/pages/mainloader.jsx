

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AppDetails from '../helpers/appdetails';
import { Colors } from '../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const MainLoader = ({ visible }) => {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                <ActivityIndicator size="small" color={Colors.white} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: withOpacity(Colors.black, 1),
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    container: {
        padding: 20,
        borderRadius: 10,
    },
});

export default MainLoader;
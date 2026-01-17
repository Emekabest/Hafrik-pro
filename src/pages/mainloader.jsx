

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AppDetails from '../helpers/appdetails';

const MainLoader = ({ visible }) => {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                <ActivityIndicator size="small" color="#fff" />
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
        backgroundColor: 'rgba(0, 0, 0, 1)',
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
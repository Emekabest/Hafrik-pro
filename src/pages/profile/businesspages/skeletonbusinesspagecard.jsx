import React from 'react';
import { View, StyleSheet } from 'react-native';

const SkeletonBusinessPageCard = () => {
    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <View style={styles.avatar} />
            </View>
            <View style={styles.right}>
                <View style={styles.lineShort} />
                <View style={styles.lineMedium} />
                <View style={styles.buttonPlaceholder} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        margin: 6,
        overflow: 'hidden'
    },
    left: {
        width: 80,
        height: 80,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        backgroundColor: '#e6e6e6'
    },
    right: {
        flex: 1,
        justifyContent: 'center'
    },
    lineShort: {
        width: '40%',
        height: 16,
        borderRadius: 8,
        backgroundColor: '#e6e6e6',
        marginBottom: 8
    },
    lineMedium: {
        width: '30%',
        height: 12,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
        marginBottom: 12
    },
    buttonPlaceholder: {
        width: 100,
        height: 32,
        borderRadius: 6,
        backgroundColor: '#e6e6e6'
    }
});

export default SkeletonBusinessPageCard;
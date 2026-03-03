import React from 'react';
import { View, StyleSheet, Dimensions } from "react-native";
import { Colors } from '../../../theme/colors';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = Math.round(width * 0.52);

const FeedSkelenton = () => {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.avatar} />

                <View style={styles.headerText}>
                    <View style={styles.lineShort} />
                    <View style={styles.lineTiny} />
                </View>
            </View>

            <View style={styles.coverPlaceholder} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 10,
        paddingTop: 10,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.neutral175,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.neutral170,
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    lineShort: {
        height: 14,
        width: '50%',
        borderRadius: 6,
        backgroundColor: Colors.neutral170,
        marginBottom: 8,
    },
    lineTiny: {
        height: 12,
        width: '30%',
        borderRadius: 6,
        backgroundColor: Colors.neutral150,
    },
    coverPlaceholder: {
        width: '60%',
        height: 50,
        backgroundColor: Colors.neutral160,
        borderTopLeftRadius:10,
        borderTopRightRadius:10,
        marginTop: 12,
        marginLeft: 56,
    },
});

export default FeedSkelenton;
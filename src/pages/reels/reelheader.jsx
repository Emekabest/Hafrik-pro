import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReelHeader = () => {
    const [selectedTab, setSelectedTab] = useState('foryou'); // Default selected tab


    return (
        <View style={styles.header}>
            <TouchableOpacity activeOpacity={1} style={styles.iconButton}>
                <Ionicons name="radio" size={15} color="white" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={1} onPress={() => setSelectedTab('following')} style={styles.tabButton}>
                <Text style={[styles.tabText, selectedTab === 'following' && styles.selectedTabText]}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={1} onPress={() => setSelectedTab('friends')} style={styles.tabButton}>
                <Text style={[styles.tabText, selectedTab === 'friends' && styles.selectedTabText]}>Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={1} onPress={() => setSelectedTab('foryou')} style={styles.tabButton}>
                <Text style={[styles.tabText, selectedTab === 'foryou' && styles.selectedTabText]}>For You</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={1} style={styles.iconButton}>
                <Ionicons name="search" size={18} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        height: 60,
    },
    iconButton: {
        padding: 5,
    },
    tabButton: {
        padding: 5,
    },
    tabText: {
        color: 'white',
        fontFamily: 'WorkSans_600SemiBold',
        fontSize: 13,
    },
    selectedTabText: {
        color: 'white',
        fontFamily: 'WorkSans_600SemiBold',
        textDecorationLine: 'underline',
    },
});

export default ReelHeader;
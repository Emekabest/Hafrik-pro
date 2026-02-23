import React, { memo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, ScrollView, StyleSheet } from 'react-native';
import AppDetails from '../../helpers/appdetails';


// Keep last horizontal scroll position across mounts
let _lastScrollX = 0;

// Profile Tabs Component - Sticky
const ProfileTabs = memo(({ tabs, activeTab, onTabChange }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        // restore previous scroll position on mount
        const id = setTimeout(() => {
            if (scrollRef.current && _lastScrollX) {
                scrollRef.current.scrollTo({ x: _lastScrollX, animated: false });
            }
        }, 0);
        return () => clearTimeout(id);
    }, []);

    return (
        <View style={styles.tabsWrapper}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
                onScroll={(e) => { _lastScrollX = e.nativeEvent.contentOffset.x; }}
                scrollEventThrottle={16}
            >
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.value}
                        style={[
                            styles.tabItem,
                            activeTab.value === tab.value && styles.activeTabItem
                        ]}
                        onPress={() => onTabChange(tab)}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab.value === tab.value && styles.activeTabText
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    tabsWrapper: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabsContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    tabItem: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: '#f8f8f8',
    },
    activeTabItem: {
        backgroundColor: AppDetails.primaryColor,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
});

export default ProfileTabs;
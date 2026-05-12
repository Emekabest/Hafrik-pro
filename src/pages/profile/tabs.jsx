import React, { memo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;

// Keep last horizontal scroll position across mounts
let _lastScrollX = 0;

// Profile Tabs Component - Sticky, modern pill style with icons
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
                {tabs.map((tab) => {
                    const isActive = activeTab.value === tab.value;
                    return (
                        <TouchableOpacity
                            key={tab.value}
                            style={[
                                styles.tabItem,
                                isActive && styles.activeTabItem
                            ]}
                            onPress={() => onTabChange(tab)}
                            activeOpacity={0.7}
                        >
                            {tab.icon && (
                                <Ionicons 
                                    name={isActive ? tab.icon.replace('-outline', '') || tab.icon : tab.icon} 
                                    size={15} 
                                    color={isActive ? Colors.white : Colors.mutedBlueGray} 
                                    style={styles.tabIcon}
                                />
                            )}
                            <Text style={[
                                styles.tabText,
                                isActive && styles.activeTabText
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    tabsWrapper: {
        backgroundColor: '#EEF7F7',
        borderBottomWidth: 0,
        paddingTop: 8,
    },
    tabsContainer: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 24,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#DCEBEB',
    },
    activeTabItem: {
        backgroundColor: BRAND,
        borderColor: BRAND,
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 5,
    },
    tabIcon: {
        marginRight: 5,
    },
    tabText: {
        fontSize: 13.5,
        color: Colors.mutedBlueGray,
        fontWeight: '600',
        fontFamily: AppDetails.fontFamily?.body,
        letterSpacing: 0.2,
    },
    activeTabText: {
        color: Colors.white,
        fontWeight: '700',
    },
});

export default ProfileTabs;

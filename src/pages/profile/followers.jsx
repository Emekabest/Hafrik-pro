import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native-gesture-handler';
import ProfileTabs from './tabs';
import { FollowersController } from '../../controllers/profilecontroller';
import { useAuth } from '../../AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
    const normalized = (hex || '').replace('#', '');
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
    return `#${normalized}${alpha}`;
};

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const DARK = Colors.deepSlate || '#1a2a3a';
const MUTED = Colors.secondaryText || Colors.neutral500;
const BASE_URL = 'https://hafrik.com';

const SUB_TABS = [
    { key: 'followers', label: 'Followers', icon: 'people-outline', path: 'profile_followers.php' },
    { key: 'following', label: 'Following', icon: 'person-add-outline', path: 'profile_following.php' },
];

const FollowerCard = React.memo(({ item, onFollow, onPress }) => {
    const avatarUri = item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name || item.name || 'U')}&background=1f8e93&color=fff&size=100`;
    const fullName = item.full_name || item.name || item.fullName || '';
    const username = item.username || (item.name ? item.name.toLowerCase().replace(/\s+/g, '') : '');
    const isFollowing = item._isFollowing;
    const isLoading = item._followLoading;

    return (
        <TouchableOpacity
            style={styles.followerCard}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <ExpoImage
                source={{ uri: avatarUri }}
                style={styles.followerAvatar}
                contentFit="cover"
                cachePolicy="memory-disk"
            />
            <View style={styles.followerInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.followerName} numberOfLines={1}>
                        {fullName}
                    </Text>
                    {!!item.verified && (
                        <Ionicons name="checkmark-circle" size={14} color={ACCENT} />
                    )}
                </View>
                <Text style={styles.followerUsername} numberOfLines={1}>
                    @{username}
                </Text>
            </View>
            <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={(e) => { e.stopPropagation?.(); onFollow(item); }}
                activeOpacity={0.7}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? ACCENT : Colors.white} />
                ) : (
                    <>
                        <Ionicons
                            name={isFollowing ? 'checkmark' : 'person-add-outline'}
                            size={14}
                            color={isFollowing ? ACCENT : Colors.white}
                        />
                        <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

const SkeletonCard = () => (
    <View style={styles.followerCard}>
        <View style={[styles.followerAvatar, styles.skeletonAvatar]} />
        <View style={styles.followerInfo}>
            <View style={[styles.skeletonLine, { width: '55%' }]} />
            <View style={[styles.skeletonLine, { width: '35%', marginTop: 8 }]} />
        </View>
        <View style={styles.skeletonButton} />
    </View>
);

const Followers = ({ header, tabs, activeTab, onTabChange, userId }) => {
    const { token, user: authUser } = useAuth();
    const navigation = useNavigation();

    const [subTab, setSubTab] = useState('followers');
    const [followers, setFollowers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => () => { mountedRef.current = false; }, []);

    const fetchFollowers = useCallback(async (path, pg = 1) => {
        if (pg === 1) setIsLoading(true);
        try {
            const response = await FollowersController(token, userId, path);
            if (!mountedRef.current) return;
            if (response.status === 200 && Array.isArray(response.data)) {
                const enriched = response.data.map(item => ({
                    ...item,
                    _isFollowing: !!(item.is_following ?? item.following ?? (item.follow_status === 1)),
                    _followLoading: false,
                }));
                setFollowers(prev => pg === 1 ? enriched : [...prev, ...enriched]);
                setHasMore(response.data.length >= 20);
            } else {
                if (pg === 1) setFollowers([]);
                setHasMore(false);
            }
        } catch (err) {
            console.warn('Failed to fetch followers', err);
            if (pg === 1) setFollowers([]);
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    }, [token, userId]);

    useEffect(() => {
        const tab = SUB_TABS.find(t => t.key === subTab);
        if (tab) {
            setPage(1);
            setHasMore(true);
            fetchFollowers(tab.path, 1);
        }
    }, [subTab, token, userId, fetchFollowers]);

    const handleFollow = useCallback(async (targetUser) => {
        const targetId = targetUser.id || targetUser.user_id;
        if (!targetId) return;

        setFollowers(prev => prev.map(item => {
            if ((item.id || item.user_id) === targetId) {
                return { ...item, _isFollowing: !item._isFollowing, _followLoading: true };
            }
            return item;
        }));

        const wasFollowing = targetUser._isFollowing;
        const action = wasFollowing ? 'unfollow' : 'follow';

        try {
            const res = await fetch(BASE_URL + '/api/v1/users/follow.php', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: Number(targetId), action }),
            });
            const json = await res.json();
            const ok = json?.status === 'success' || json?.status === 200 || json?.status === '200';
            if (!ok && mountedRef.current) {
                setFollowers(prev => prev.map(item => {
                    if ((item.id || item.user_id) === targetId) {
                        return { ...item, _isFollowing: wasFollowing, _followLoading: false };
                    }
                    return item;
                }));
            }
        } catch {
            if (mountedRef.current) {
                setFollowers(prev => prev.map(item => {
                    if ((item.id || item.user_id) === targetId) {
                        return { ...item, _isFollowing: wasFollowing, _followLoading: false };
                    }
                    return item;
                }));
            }
        } finally {
            if (mountedRef.current) {
                setFollowers(prev => prev.map(item => {
                    if ((item.id || item.user_id) === targetId) {
                        return { ...item, _followLoading: false };
                    }
                    return item;
                }));
            }
        }
    }, [token]);

    const handlePressUser = useCallback((item) => {
        const uid = item.id || item.user_id;
        if (uid && String(uid) !== String(authUser?.id)) {
            navigation.push('UserProfile', { userId: uid });
        }
    }, [navigation, authUser]);

    const renderItem = useCallback(({ item }) => (
        <FollowerCard
            item={item}
            onFollow={handleFollow}
            onPress={() => handlePressUser(item)}
        />
    ), [handleFollow, handlePressUser]);

    const keyExtractor = useCallback((item, i) => String(item?.id ?? item?.user_id ?? i), []);

    const ListHeaderContent = useCallback(() => (
        <View>
            {header}
            <ProfileTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

            {/* Sub-tabs: Followers / Following */}
            <View style={styles.subTabsContainer}>
                {SUB_TABS.map((tab) => {
                    const isActive = subTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.subTab, isActive && styles.subTabActive]}
                            onPress={() => setSubTab(tab.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={16}
                                color={isActive ? Colors.white : MUTED}
                            />
                            <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    ), [header, tabs, activeTab, onTabChange, subTab]);

    const ListEmptyContent = useCallback(() => {
        if (isLoading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons
                    name={subTab === 'followers' ? 'people-outline' : 'person-add-outline'}
                    size={44}
                    color={MUTED}
                />
                <Text style={styles.emptyTitle}>
                    {subTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {subTab === 'followers'
                        ? 'When people follow this account, they\'ll appear here.'
                        : 'Accounts being followed will show up here.'}
                </Text>
            </View>
        );
    }, [isLoading, subTab]);

    return (
        <FlatList
            data={isLoading ? [] : followers}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderContent}
            ListEmptyComponent={isLoading ? (
                <View>
                    {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </View>
            ) : <ListEmptyContent />}
            stickyHeaderIndices={[]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            onEndReached={() => {
                if (hasMore && !isLoading) {
                    const tab = SUB_TABS.find(t => t.key === subTab);
                    if (tab) {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        fetchFollowers(tab.path, nextPage);
                    }
                }
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
                !isLoading && followers.length > 0 && hasMore
                    ? <ActivityIndicator size="small" color={BRAND} style={{ padding: 16 }} />
                    : null
            }
        />
    );
};

const styles = StyleSheet.create({
    subTabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: withOpacity(Colors.primaryDark, 0.06),
    },
    subTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: withOpacity(Colors.primaryDark, 0.04),
        borderWidth: 1,
        borderColor: withOpacity(Colors.primaryDark, 0.08),
    },
    subTabActive: {
        backgroundColor: BRAND,
        borderColor: BRAND,
    },
    subTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: MUTED,
    },
    subTabTextActive: {
        color: Colors.white,
    },
    followerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: withOpacity(Colors.primaryDark, 0.05),
    },
    followerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.neutral180,
        marginRight: 12,
    },
    followerInfo: {
        flex: 1,
    },
    followerName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: DARK,
        flexShrink: 1,
    },
    followerUsername: {
        fontSize: 12.5,
        color: MUTED,
        marginTop: 2,
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: ACCENT,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 50,
        minWidth: 90,
        justifyContent: 'center',
    },
    followingButton: {
        backgroundColor: withOpacity(ACCENT, 0.1),
        borderWidth: 1,
        borderColor: withOpacity(ACCENT, 0.3),
    },
    followButtonText: {
        color: Colors.white,
        fontSize: 12.5,
        fontWeight: '700',
    },
    followingButtonText: {
        color: ACCENT,
    },
    skeletonAvatar: {
        backgroundColor: Colors.neutral160,
    },
    skeletonLine: {
        height: 11,
        backgroundColor: Colors.neutral160,
        borderRadius: 6,
    },
    skeletonButton: {
        width: 80,
        height: 32,
        borderRadius: 30,
        backgroundColor: Colors.neutral160,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 40,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: DARK,
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        color: MUTED,
        textAlign: 'center',
        lineHeight: 19,
    },
});

export default Followers;
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    TextInput,
    Image,
    Animated,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../../repository/store";
import AppDetails from "../../helpers/appdetails";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import { useAuth } from "../../AuthContext";
import { useNavigation, useRoute } from '@react-navigation/native';
import SearchPostCard from "./searchpostcard";

const PRIMARY = AppDetails.primaryColor; // #0C3F44
const ACCENT  = '#13C296';

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
    { label: "Top",    icon: "flash-outline",          type: null    },
    { label: "Posts",  icon: "document-text-outline",  type: "post"  },
    { label: "People", icon: "people-outline",         type: "user"  },
    { label: "Pages",  icon: "business-outline",       type: "page"  },
    { label: "Groups", icon: "albums-outline",         type: "group" },
    { label: "Events", icon: "calendar-outline",       type: "event" },
];


// ── Shimmer skeleton ───────────────────────────────────────────────────────────
const SkeletonCard = () => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

    return (
        <Animated.View style={[styles.skeletonCard, { opacity }]}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonBody}>
                <View style={[styles.skeletonLine, { width: '62%' }]} />
                <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
            </View>
        </Animated.View>
    );
};

const SkeletonList = () => (
    <View style={{ paddingTop: 4 }}>
        {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
    </View>
);


// ── Empty / idle state ─────────────────────────────────────────────────────────
const EmptyState = ({ query }) => (
    <View style={styles.emptyWrap}>
        <View style={styles.emptyIconBg}>
            <Ionicons name="search" size={38} color={PRIMARY} />
        </View>
        {query?.trim() ? (
            <>
                <Text style={styles.emptyTitle}>No results for "{query}"</Text>
                <Text style={styles.emptySub}>Try different keywords or check the spelling</Text>
            </>
        ) : (
            <>
                <Text style={styles.emptyTitle}>Discover Hafrik</Text>
                <Text style={styles.emptySub}>Search for people, pages, groups,{'\n'}events and posts</Text>
            </>
        )}
    </View>
);


// ── People card ────────────────────────────────────────────────────────────────
const PersonCard = React.memo(({ item, onPress }) => (
    <TouchableOpacity style={styles.personCard} activeOpacity={0.72} onPress={onPress}>
        <View style={styles.avatarWrap}>
            {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.personAvatar} />
            ) : (
                <View style={[styles.personAvatar, { backgroundColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person-outline" size={22} color={PRIMARY} />
                </View>
            )}
            <View style={styles.onlineDot} />
        </View>
        <View style={styles.personBody}>
            <View style={styles.personNameRow}>
                <Text style={styles.personName} numberOfLines={1}>{item.title}</Text>
                {item.verified ? (
                    <Ionicons name="checkmark-circle" size={14} color={ACCENT} style={styles.verifiedIcon} />
                ) : null}
            </View>
            {item.subtitle ? (
                <Text style={styles.personSub} numberOfLines={1}>{item.subtitle}</Text>
            ) : null}
        </View>
        <View style={styles.followPill}>
            <Ionicons name="person-add-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.followPillText}>Follow</Text>
        </View>
    </TouchableOpacity>
));


// ── Page card ──────────────────────────────────────────────────────────────────
const PageCard = React.memo(({ item, onPress }) => (
    <TouchableOpacity style={styles.entityCard} activeOpacity={0.72} onPress={onPress}>
        {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.entityAvatar} />
        ) : (
            <View style={[styles.entityAvatar, styles.entityAvatarFallback, { backgroundColor: '#E8F0F1' }]}>
                <Ionicons name="business" size={22} color={PRIMARY} />
            </View>
        )}
        <View style={styles.entityBody}>
            <Text style={styles.entityName} numberOfLines={1}>{item.title}</Text>
            <View style={styles.entityMeta}>
                <View style={[styles.typePill, { backgroundColor: '#E4F0F1' }]}>
                    <Text style={[styles.typePillText, { color: PRIMARY }]}>Page</Text>
                </View>
                {item.subtitle ? (
                    <Text style={styles.entitySub} numberOfLines={1}>{item.subtitle}</Text>
                ) : null}
            </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
));


// ── Group card ─────────────────────────────────────────────────────────────────
const GroupCard = React.memo(({ item, onPress }) => (
    <TouchableOpacity style={styles.entityCard} activeOpacity={0.72} onPress={onPress}>
        {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.entityAvatar} />
        ) : (
            <View style={[styles.entityAvatar, styles.entityAvatarFallback, { backgroundColor: '#E8F4EE' }]}>
                <Ionicons name="people" size={22} color="#0b8557" />
            </View>
        )}
        <View style={styles.entityBody}>
            <Text style={styles.entityName} numberOfLines={1}>{item.title}</Text>
            <View style={styles.entityMeta}>
                <View style={[styles.typePill, { backgroundColor: '#E8F4EE' }]}>
                    <Text style={[styles.typePillText, { color: '#0b8557' }]}>Group</Text>
                </View>
                {item.subtitle ? (
                    <Text style={styles.entitySub} numberOfLines={1}>{item.subtitle}</Text>
                ) : null}
            </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
));


// ── Event card ─────────────────────────────────────────────────────────────────
const EventCard = React.memo(({ item, onPress }) => (
    <TouchableOpacity style={styles.eventCard} activeOpacity={0.72} onPress={onPress}>
        {item.thumbnail ? (
            <Image source={{ uri: item.thumbnail }} style={styles.eventThumb} />
        ) : (
            <View style={[styles.eventThumb, styles.entityAvatarFallback, { backgroundColor: '#FEF3EC' }]}>
                <Ionicons name="calendar" size={26} color="#E07B39" />
            </View>
        )}
        <View style={styles.eventBody}>
            <View style={[styles.typePill, { backgroundColor: '#FEF3EC', alignSelf: 'flex-start', marginBottom: 5 }]}>
                <Text style={[styles.typePillText, { color: '#E07B39' }]}>Event</Text>
            </View>
            <Text style={styles.eventName} numberOfLines={2}>{item.title}</Text>
            {item.subtitle ? (
                <View style={styles.eventMeta}>
                    <Ionicons name="location-outline" size={11} color="#999" />
                    <Text style={styles.eventSub} numberOfLines={1}>{item.subtitle}</Text>
                </View>
            ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#ccc" style={styles.eventChevron} />
    </TouchableOpacity>
));


// ── Results label ──────────────────────────────────────────────────────────────
const ResultsLabel = ({ count, query }) => (
    <Text style={styles.resultsLabel}>
        <Text style={styles.resultsCount}>{count}</Text>
        {' result'}{count !== 1 ? 's' : ''} for{' '}
        <Text style={styles.resultsQuery}>"{query}"</Text>
    </Text>
);


// ── Main screen ────────────────────────────────────────────────────────────────
const SearchScreen = () => {
    const setSearchResultsVisible = useStore((state) => state.setSearchResultsVisible);
    const setSearchVisible        = useStore((state) => state.setSearchVisible);
    const searchQuery             = useStore((state) => state.searchQuery);
    const setSearchQuery          = useStore((state) => state.setSearchQuery);

    const [activeTab,        setActiveTab]        = useState(0);
    const [activeSearchData, setActiveSearchData] = useState([]);
    const [isLoading,        setIsLoading]        = useState(false);

    const { token } = useAuth();
    const navigation = useNavigation();
    const route      = useRoute();
    const inputRef   = useRef(null);

    // Pre-fill query from navigation params (e.g. from Explore hot topics or hero search)
    useEffect(() => {
        const initialQuery = route.params?.initialQuery;
        if (initialQuery && initialQuery !== searchQuery) {
            setSearchQuery(String(initialQuery).trim());
        }
    }, [route.params?.initialQuery]);

    // ── Fetch ────────────────────────────────────────────────────────────────────
    const handleSearch = useCallback(async () => {
        if (!searchQuery?.trim()) { setActiveSearchData([]); return; }
        setIsLoading(true);
        try {
            const response = await SearchSuggestionController(searchQuery, token);
            const results  = response?.data?.results || [];
            const targetType = TABS[activeTab].type;
            setActiveSearchData(
                targetType === null
                    ? results
                    : results.filter(item => (item.type || '').toLowerCase() === targetType)
            );
        } catch {
            setActiveSearchData([]);
        }
        setIsLoading(false);
    }, [searchQuery, activeTab, token]);

    useEffect(() => { handleSearch(); }, [handleSearch]);

    // ── Navigation ───────────────────────────────────────────────────────────────
    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            setSearchVisible(true);
            setTimeout(() => setSearchResultsVisible(false), 100);
        }
    }, [navigation, setSearchVisible, setSearchResultsVisible]);

    const handleItemPress = useCallback((item) => {
        const type = (item.type || '').toLowerCase();
        if (type === 'user')  return navigation.navigate('Profile',        { userId: item.id });
        if (type === 'page')  return navigation.navigate('BusinessDetails', { pageId: item.id });
        if (type === 'group') return navigation.navigate('GroupDetails',    { groupId: item.id });
        if (type === 'event') return navigation.navigate('EventDetail',     { event: item });
        navigation.navigate('CommentScreen', { feedId: item.id });
    }, [navigation]);

    // ── Render item ──────────────────────────────────────────────────────────────
    const renderItem = useCallback(({ item }) => {
        const type    = (item.type || '').toLowerCase();
        const onPress = () => handleItemPress(item);
        if (type === 'user')  return <PersonCard item={item} onPress={onPress} />;
        if (type === 'page')  return <PageCard   item={item} onPress={onPress} />;
        if (type === 'group') return <GroupCard  item={item} onPress={onPress} />;
        if (type === 'event') return <EventCard  item={item} onPress={onPress} />;
        return <SearchPostCard item={item} onPress={onPress} />;
    }, [handleItemPress]);

    const keyExtractor = useCallback((item, idx) => `${item.id ?? idx}-${idx}`, []);

    const listHeader = (activeSearchData.length > 0 && searchQuery?.trim()) ? (
        <ResultsLabel count={activeSearchData.length} query={searchQuery} />
    ) : null;

    // ── UI ───────────────────────────────────────────────────────────────────────
    return (
        <View style={styles.screen}>

            {/* ── Header: back + search bar ─────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="arrow-back" size={20} color={PRIMARY} />
                </TouchableOpacity>

                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={17} color="#aaa" />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search Hafrik…"
                        placeholderTextColor="#bbb"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                    {isLoading ? (
                        <Animated.View style={styles.searchLoader}>
                            <Ionicons name="ellipsis-horizontal" size={16} color={PRIMARY} />
                        </Animated.View>
                    ) : null}
                </View>
            </View>

            {/* ── Filter tabs ───────────────────────────────────────────── */}
            <View style={styles.tabsBar}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {TABS.map((tab, index) => {
                        const active = activeTab === index;
                        return (
                            <TouchableOpacity
                                key={tab.label}
                                style={[styles.tabPill, active && styles.tabPillActive]}
                                activeOpacity={0.75}
                                onPress={() => setActiveTab(index)}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={13}
                                    color={active ? '#fff' : '#888'}
                                    style={styles.tabIcon}
                                />
                                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── Results ──────────────────────────────────────────────── */}
            <View style={styles.results}>
                {isLoading ? (
                    <SkeletonList />
                ) : (
                    <FlatList
                        data={activeSearchData}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        ListHeaderComponent={listHeader}
                        ListEmptyComponent={<EmptyState query={searchQuery} />}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        onEndReachedThreshold={0.5}
                        initialNumToRender={8}
                        maxToRenderPerBatch={8}
                        windowSize={7}
                        removeClippedSubviews
                    />
                )}
            </View>

        </View>
    );
};


// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    screen: { flex: 1, backgroundColor: '#F5F7F7' },

    // ─ Header ─
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: Platform.OS === 'android' ? 14 : 12,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e8e8e8',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F0F4F4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F4F4',
        borderRadius: 13,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#111',
        fontFamily: AppDetails.fontFamily.inter.regular,
        paddingVertical: 0,
    },
    searchLoader: {
        marginLeft: 6,
    },

    // ─ Tabs ─
    tabsBar: {
        backgroundColor: '#fff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e8e8e8',
    },
    tabsContent: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: 'center',
        gap: 8,
    },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F0F4F4',
    },
    tabPillActive: {
        backgroundColor: PRIMARY,
    },
    tabIcon: {
        marginRight: 5,
    },
    tabLabel: {
        fontSize: 13,
        color: '#777',
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
    tabLabelActive: {
        color: '#fff',
        fontFamily: AppDetails.fontFamily.redex.bold,
    },

    // ─ Results ─
    results: { flex: 1 },
    listContent: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 50,
    },
    resultsLabel: {
        fontSize: 13,
        color: '#999',
        fontFamily: AppDetails.fontFamily.inter.regular,
        marginBottom: 14,
    },
    resultsCount: {
        color: PRIMARY,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
    },
    resultsQuery: {
        color: '#444',
        fontFamily: AppDetails.fontFamily.inter.semiBold,
    },

    // ─ Person card ─
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
        elevation: 2,
    },
    avatarWrap: { position: 'relative' },
    personAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#e8e8e8',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: ACCENT,
        borderWidth: 2,
        borderColor: '#fff',
    },
    personBody: { flex: 1, marginLeft: 12, marginRight: 10 },
    personNameRow: { flexDirection: 'row', alignItems: 'center' },
    personName: {
        fontSize: 15,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
        color: '#111',
        flexShrink: 1,
    },
    verifiedIcon: { marginLeft: 4 },
    personSub: {
        fontSize: 13,
        color: '#999',
        fontFamily: AppDetails.fontFamily.inter.regular,
        marginTop: 2,
    },
    followPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PRIMARY,
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 20,
    },
    followPillText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
    },

    // ─ Entity card (Page / Group) ─
    entityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
        elevation: 2,
    },
    entityAvatar: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: '#e8e8e8',
    },
    entityAvatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    entityBody: { flex: 1, marginLeft: 12, marginRight: 8 },
    entityName: {
        fontSize: 15,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
        color: '#111',
        marginBottom: 4,
    },
    entityMeta: { flexDirection: 'row', alignItems: 'center' },
    entitySub: {
        fontSize: 12,
        color: '#aaa',
        fontFamily: AppDetails.fontFamily.inter.regular,
        flexShrink: 1,
        marginLeft: 6,
    },
    typePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typePillText: {
        fontSize: 11,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
    },

    // ─ Event card ─
    eventCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
        elevation: 2,
    },
    eventThumb: {
        width: 72,
        height: 72,
        borderRadius: 12,
        backgroundColor: '#e8e8e8',
    },
    eventBody: { flex: 1, marginLeft: 12, marginRight: 6 },
    eventName: {
        fontSize: 15,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
        color: '#111',
        lineHeight: 20,
    },
    eventMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    eventSub: {
        fontSize: 12,
        color: '#aaa',
        fontFamily: AppDetails.fontFamily.inter.regular,
        marginLeft: 3,
        flexShrink: 1,
    },
    eventChevron: { alignSelf: 'center' },

    // ─ Skeleton ─
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 14,
        marginBottom: 10,
    },
    skeletonAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#e4e4e4',
    },
    skeletonBody: { flex: 1, marginLeft: 12 },
    skeletonLine: {
        height: 13,
        borderRadius: 7,
        backgroundColor: '#e4e4e4',
    },

    // ─ Empty ─
    emptyWrap: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyIconBg: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#E4EFF0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 22,
    },
    emptyTitle: {
        fontSize: 19,
        fontFamily: AppDetails.fontFamily.inter.semiBold,
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySub: {
        fontSize: 14,
        color: '#aaa',
        fontFamily: AppDetails.fontFamily.inter.regular,
        textAlign: 'center',
        lineHeight: 21,
    },
});

export default React.memo(SearchScreen);

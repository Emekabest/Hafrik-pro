// SearchScreen — fully rebuilt:
//   • Articles tab + ArticleCard → opens ArticleDetails screen
//   • All tab: max 3 per section + "See all" button that switches to that tab
//   • Individual tabs: max 5 items + inline "Show more" expansion
//   • Search fires only on Enter / search icon press + AsyncStorage recent searches
//   • Optimistic follow / join toggles
//   • Reel detection → Reels2 with initialPostId
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../repository/store';
import { useAuth } from '../../AuthContext';
import SearchSuggestionController from '../../controllers/searchsuggestioncontroller';
import SearchHeader, { TABS } from '../../components/search/SearchHeader';
import {
  PersonCard, PostCard, PageCard, GroupCard, ArticleCard,
  SectionHeader, SkeletonCard, ResultsLabel, ShowMoreButton,
} from '../../components/search/SearchCards';
import SearchEmptyState from '../../components/search/SearchEmptyState';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

const RECENT_KEY = 'hafrik_recent_searches';
const MAX_RECENT = 8;
const ALL_SECTION_LIMIT = 3;
const TAB_ITEM_LIMIT    = 5;

const ACCENT  = Colors.primary;
const DARK    = Colors.black;
const WHITE   = Colors.white;
const MUTED   = Colors.secondaryText;

// tabIndex matches TABS array order: 0=All 1=People 2=Posts 3=Pages 4=Groups 5=Articles
const SECTION_ORDER = [
  { type: 'user',    label: 'People',   tabIndex: 1 },
  { type: 'post',    label: 'Posts',    tabIndex: 2 },
  { type: 'page',    label: 'Pages',    tabIndex: 3 },
  { type: 'group',   label: 'Groups',   tabIndex: 4 },
  { type: 'article', label: 'Articles', tabIndex: 5 },
];


// ─── SearchScreen ─────────────────────────────────────────────────────────────
const SearchScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuth();

  const setSearchResultsVisible = useStore(s => s.setSearchResultsVisible);
  const setSearchVisible        = useStore(s => s.setSearchVisible);
  const searchQuery             = useStore(s => s.searchQuery);
  const setSearchQuery          = useStore(s => s.setSearchQuery);

  const [activeTab,       setActiveTab]       = useState(0);
  const [results,         setResults]         = useState([]);
  const [isLoading,       setIsLoading]       = useState(false);
  const [recentSearches,  setRecentSearches]  = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [followedIds,     setFollowedIds]     = useState(new Set());
  const [joinedIds,       setJoinedIds]       = useState(new Set());
  const [showAllItems,    setShowAllItems]    = useState(false);

  const inputRef = useRef(null);

  // Reset "show all" when switching tabs
  useEffect(() => { setShowAllItems(false); }, [activeTab]);

  // ── Load recent searches ────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then(raw => {
      if (raw) {
        try { setRecentSearches(JSON.parse(raw)); } catch (_) {}
      }
    });
  }, []);

  // ── Suggested people (idle — no query) ────────────────────────────────────
  useEffect(() => {
    if (searchQuery?.trim()) return;
    apiClient.get('https://hafrik.com/api/v1/people/list.php?limit=5').then(res => {
      const people =
        res.data?.data    ||
        res.data?.people  ||
        res.data?.results ||
        [];
      setSuggestedPeople(people.slice(0, 5));
    }).catch(() => {});
  }, [token, searchQuery]);

  // ── Auto-focus + pre-fill from nav params ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const initial = route.params?.initialQuery;
    if (!initial) return;
    const q = String(initial).trim();
    setSearchQuery(q);
    runSearch(q);
  }, [route.params?.initialQuery]);

  // ── initialTab: allow callers to pre-select a tab ──────────────────────────
  useEffect(() => {
    const tab = route.params?.initialTab;
    if (tab == null) return;
    const tabMap = {
      all: 0, people: 1, posts: 2, hashtags: 2,
      pages: 3, groups: 4, articles: 5,
    };
    const idx = typeof tab === 'number' ? tab : tabMap[String(tab).toLowerCase()];
    if (idx !== undefined) setActiveTab(idx);
  }, [route.params?.initialTab]);

  // ── Explicit search — fires only on Enter / search icon ─────────────────────
  const runSearch = useCallback(async (q) => {
    const trimmed = q?.trim();
    if (!trimmed) { setResults([]); return; }
    setIsLoading(true);
    try {
      const res = await SearchSuggestionController(trimmed, token);
      setResults(res?.data?.results || []);
    } catch (_) {
      setResults([]);
    }
    setIsLoading(false);
  }, [token]);

  const handleSubmit = useCallback(() => {
    const q = searchQuery?.trim();
    if (!q) return;
    saveRecent(q);
    inputRef.current?.blur();
    runSearch(q);
  }, [searchQuery, saveRecent, runSearch]);

  // ── Recent search helpers ──────────────────────────────────────────────────
  const saveRecent = useCallback(async (q) => {
    if (!q?.trim()) return;
    const trimmed = q.trim();
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(x => x !== trimmed)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeRecent = useCallback((q) => {
    setRecentSearches(prev => {
      const next = prev.filter(x => x !== q);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAllRecent = useCallback(() => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_KEY);
  }, []);

  // ── Navigation / back ──────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else {
      setSearchVisible(true);
      setTimeout(() => setSearchResultsVisible(false), 100);
    }
  }, [navigation, setSearchVisible, setSearchResultsVisible]);

  // ── Item press ─────────────────────────────────────────────────────────────
  const handleItemPress = useCallback((item) => {
    saveRecent(searchQuery);
    inputRef.current?.blur();
    const type = (item.type || '').toLowerCase();
    if (type === 'user')    return navigation.navigate('UserProfile',    { userId: item.id });
    if (type === 'page')    return navigation.navigate('BusinessDetails', { pageId: item.id });
    if (type === 'group')   return navigation.navigate('GroupDetails',    { groupId: item.id });
    if (type === 'article') return navigation.navigate('ArticleDetails',  { postId: item.id, title: item.title, link: item.link });
    if (type === 'reel' || type === 'video') {
      return navigation.navigate('Reels2', {
        initialReels: [item],
        startIndex: 0,
        initialReelId: item.id,
      });
    }
    navigation.navigate('CommentScreen', { feedId: item.id });
  }, [navigation, saveRecent, searchQuery]);

  // ── Recent item tap ───────────────────────────────────────────────────────
  const handleRecentPress = useCallback((q) => {
    setSearchQuery(q);
    saveRecent(q);
    inputRef.current?.blur();
    runSearch(q);
  }, [setSearchQuery, saveRecent, runSearch]);

  // ── Follow toggle (optimistic) ─────────────────────────────────────────────
  const handleFollowToggle = useCallback(async (item) => {
    const id = item.id;
    setFollowedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await apiClient.post('https://hafrik.com/api/v1/users/follow.php', { user_id: id });
    } catch (_) {
      setFollowedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  }, [token]);

  // ── Join toggle (optimistic) ───────────────────────────────────────────────
  const handleJoinToggle = useCallback(async (item) => {
    const id = item.id;
    setJoinedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await apiClient.post('https://hafrik.com/api/v1/groups/join_toggle.php', { group_id: id });
    } catch (_) {
      setJoinedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  }, [token]);

  // ── Build flat FlatList data ────────────────────────────────────────────────
  const buildListData = useCallback(() => {
    if (isLoading) {
      return [0, 1, 2, 3, 4].map(i => ({ _key: `sk_${i}`, _type: 'skeleton' }));
    }

    const q = searchQuery?.trim();
    if (!q || results.length === 0) return [];

    const targetType = TABS[activeTab].type;

    // ── All tab: grouped sections, max 3 per section ───────────────────────
    if (targetType === null) {
      const data = [];
      let totalShown = 0;

      SECTION_ORDER.forEach(section => {
        const items = results.filter(
          item => (item.type || '').toLowerCase() === section.type
        );
        if (items.length === 0) return;

        totalShown += items.length;
        const displayed = items.slice(0, ALL_SECTION_LIMIT);
        const remaining = items.length - displayed.length;

        data.push({
          _key: `sec_${section.type}`,
          _type: 'section_header',
          title: section.label,
          count: items.length,
        });
        displayed.forEach(item =>
          data.push({ _key: `item_${item.id}_${section.type}`, _type: section.type, ...item })
        );
        if (remaining > 0) {
          data.push({
            _key: `more_${section.type}`,
            _type: 'show_more',
            tabIndex: section.tabIndex,
            label: section.label,
            count: items.length,
          });
        }
      });

      if (totalShown === 0) return [];

      data.unshift({
        _key: 'results_label',
        _type: 'results_label',
        count: results.length,
        query: q,
      });

      return data;
    }

    // ── Individual tab: flat list, max 5 (expandable) ─────────────────────
    const filtered = results.filter(
      item => (item.type || '').toLowerCase() === targetType
    );
    if (filtered.length === 0) return [];

    const displayed  = showAllItems ? filtered : filtered.slice(0, TAB_ITEM_LIMIT);
    const remaining  = filtered.length - displayed.length;
    const data       = [
      { _key: 'results_label', _type: 'results_label', count: filtered.length, query: q },
    ];
    displayed.forEach(item =>
      data.push({ _key: `item_${item.id}`, _type: targetType, ...item })
    );
    if (!showAllItems && remaining > 0) {
      data.push({
        _key: 'show_all',
        _type: 'show_all',
        label: TABS[activeTab].label,
        count: remaining,
      });
    }
    return data;
  }, [isLoading, searchQuery, results, activeTab, showAllItems]);

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    if (item._type === 'skeleton')       return <SkeletonCard />;
    if (item._type === 'section_header') return <SectionHeader title={item.title} count={item.count} />;
    if (item._type === 'results_label')  return <ResultsLabel count={item.count} query={item.query} />;
    if (item._type === 'show_more') {
      return (
        <ShowMoreButton
          label={item.label}
          count={item.count}
          onPress={() => setActiveTab(item.tabIndex)}
        />
      );
    }
    if (item._type === 'show_all') {
      return (
        <ShowMoreButton
          label={`${item.count} more ${item.label}`}
          count={0}
          onPress={() => setShowAllItems(true)}
        />
      );
    }

    const onPress = () => handleItemPress(item);

    if (item._type === 'user') return (
      <PersonCard
        item={item}
        onPress={onPress}
        isFollowed={followedIds.has(item.id)}
        onFollowToggle={handleFollowToggle}
      />
    );
    if (item._type === 'post')    return <PostCard    item={item} onPress={onPress} />;
    if (item._type === 'page')    return <PageCard    item={item} onPress={onPress} />;
    if (item._type === 'group')   return (
      <GroupCard
        item={item}
        onPress={onPress}
        isJoined={joinedIds.has(item.id)}
        onJoinToggle={handleJoinToggle}
      />
    );
    if (item._type === 'article') return <ArticleCard item={item} onPress={onPress} />;
    return null;
  }, [handleItemPress, followedIds, joinedIds, handleFollowToggle, handleJoinToggle]);

  const keyExtractor = useCallback((item) => item._key, []);

  const listData  = buildListData();
  const q         = searchQuery?.trim();
  const showEmpty = !isLoading && listData.length === 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <SearchHeader
        inputRef={inputRef}
        searchQuery={searchQuery}
        onChangeText={(text) => { setSearchQuery(text); setShowAllItems(false); setResults([]); }}
        onSubmit={handleSubmit}
        onBack={handleBack}
        onClear={() => { setSearchQuery(''); setResults([]); setShowAllItems(false); }}
        isLoading={isLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <FlashList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={120}
        ListEmptyComponent={
          showEmpty ? (
            <SearchEmptyState
              query={q}
              onTrendingPress={(label) => {
                setSearchQuery(label);
                saveRecent(label);
                inputRef.current?.blur();
                runSearch(label);
              }}
              recentSearches={recentSearches}
              onRecentPress={(label) => {
                setSearchQuery(label);
                saveRecent(label);
                inputRef.current?.blur();
                runSearch(label);
              }}
              onRemoveRecent={removeRecent}
              suggestedPeople={suggestedPeople}
              onPersonPress={(person) =>
                navigation.navigate('UserProfile', { userId: person.id ?? person.user_id })
              }
              followedIds={followedIds}
              onFollowToggle={handleFollowToggle}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfaceTint },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 60,
  },
});

export default React.memo(SearchScreen);

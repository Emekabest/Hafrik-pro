import { create } from 'zustand';


const BASE_URL = 'https://hafrik.com';

const apiBadge = async (path, token) => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    return await res.json();
  } catch { return null; }
};

const useStore = create((set, get) => ({
 
    isAppActive: true,
    setIsAppActive: (state)=> set({
        isAppActive: state
    }),

    isComposerOpen: false,
    composerConfig: null, // { _type, id, title, avatar, locked, initialTab }
    openComposer: (config = null) => set({ isComposerOpen: true, composerConfig: config }),
    closeComposer: () => set({ isComposerOpen: false, composerConfig: null }),

    // ── Creation menu (shared bottom sheet across Home, Explore, Feed card) ──
    showCreateMenu: false,
    openCreateMenu: () => set({ showCreateMenu: true }),
    closeCreateMenu: () => set({ showCreateMenu: false }),


    userAvatar: "",
    setUserAvatar: (state)=> set({
        userAvatar: state
    }),
    

    /** Search Section ............................................... */

    isSearchVisible: false,
    setSearchVisible: (visible) => set({ isSearchVisible: visible }),

    searchQuery: "",
    setSearchQuery: (query) => set({ searchQuery: query }),

    isSearchResultsVisible: false,
    setSearchResultsVisible: (visible) => set({ isSearchResultsVisible: visible }),



    refreshSignal: 0,
    triggerRefresh: () => set((state) => ({ refreshSignal: state.refreshSignal + 1 })),


    /** Background Upload Section ............................................... */
    // activeUpload shape: { id, phase, pct, done, total, label, error }  or null
    activeUpload: null,
    startUpload: (label = 'Uploading…') => set({
        activeUpload: { id: Date.now(), phase: 'uploading', pct: 0, done: 0, total: 1, label, error: null },
    }),
    updateUploadProgress: (patch) => set((state) => {
        if (!state.activeUpload) return {};
        return { activeUpload: { ...state.activeUpload, ...patch } };
    }),
    completeUpload: () => set((state) => {
        if (!state.activeUpload) return {};
        return { activeUpload: { ...state.activeUpload, phase: 'done', pct: 100, error: null } };
    }),
    failUpload: (error) => set((state) => {
        if (!state.activeUpload) return {};
        return { activeUpload: { ...state.activeUpload, phase: 'error', error } };
    }),
    clearUpload: () => set({ activeUpload: null }),


    /**Feeds Section............................................... */
    feeds:{
        feedsById: {},
        lists:{
            recentUpdateFeeds: [],
            trendingFeeds: [],
            whatsNearbyFeeds: [],
            profileTimelineFeeds: [],
            // ── Unified feed tabs ──────────────────────────────────────────
            forYouFeeds: [],
            discoverFeeds: [],
            popularFeeds: [],
            followingFeeds: [],
            reelsFeeds: [],
            watchFeeds: [],
        },
        // pagination metadata per list  { page, totalPages, newestId }
        meta: {},
    },
    setFeeds:(state)=> set({
        feeds: state
    }),

    
    // Helper setters (optional — make it easier to update slices)
    updateFeedById: (feedId, updatedFeed) => set((state) => ({
    feeds: {
        ...state.feeds,
        feedsById: {
             ...state.feeds.feedsById,
             [feedId]: updatedFeed
        }
    }
    })),

    removeFeedById: (feedId) => set((state) => {
        const feedsById = { ...state.feeds.feedsById };
        delete feedsById[feedId];
        // Also remove from every list that contains this id
        const lists = {};
        Object.entries(state.feeds.lists).forEach(([listName, ids]) => {
            lists[listName] = ids.filter(id => String(id) !== String(feedId));
        });
        return { feeds: { ...state.feeds, feedsById, lists } };
    }),


    addFeedsToList: (listName, feedsArray) => set((state) => {
        const feedsById = { ...state.feeds.feedsById };
        const existingList = state.feeds.lists[listName] || [];
        const idsToAdd = [];

        feedsArray.forEach(feed => {
            feedsById[feed.id] = feed;

            if (!existingList.includes(feed.id)) {
            idsToAdd.push(feed.id);
            }
        });

        return {
            feeds: {
            ...state.feeds,
            feedsById,
            lists: {
                ...state.feeds.lists,
                [listName]: [...existingList, ...idsToAdd]
            }
            }
        };
    }),


    // Prepends only genuinely new items (by id) — used for background focus refresh
    prependFeedsToList: (listName, feedsArray) => set((state) => {
        const feedsById = { ...state.feeds.feedsById };
        const existingList = state.feeds.lists[listName] || [];
        const existingIds = new Set(existingList.map(String));
        const newIds = [];

        feedsArray.forEach(feed => {
            feedsById[feed.id] = feed;
            if (!existingIds.has(String(feed.id))) {
                newIds.push(feed.id);
            }
        });

        if (newIds.length === 0) return {}; // nothing new

        return {
            feeds: {
                ...state.feeds,
                feedsById,
                lists: {
                    ...state.feeds.lists,
                    [listName]: [...newIds, ...existingList],
                },
            },
        };
    }),

    clearFeedsList: (listName) => set((state) => {
        const idsToRemove = state.feeds.lists[listName] || [];
        const feedsById = { ...state.feeds.feedsById };
        
        // Remove feeds that aren't used by other lists
        idsToRemove.forEach(id => {
            const usedElsewhere = Object.entries(state.feeds.lists).some(
            ([key, ids]) => key !== listName && ids.includes(id)
            );
            if (!usedElsewhere) {
            delete feedsById[id];
            }
        });

        return {
            feeds: {
            ...state.feeds,
            feedsById,
            lists: {
                ...state.feeds.lists,
                [listName]: []  // clear the list
            }
            }
        };
    }),

    // ── Pagination metadata per feed list ────────────────────────────────
    setFeedsMeta: (listName, meta) => set((state) => ({
        feeds: {
            ...state.feeds,
            meta: {
                ...state.feeds.meta,
                [listName]: { ...(state.feeds.meta[listName] || {}), ...meta },
            },
        },
    })),
/**...................................................................................
/**................................................................................... */



    isNextVideo: {shouldPlay: false, feedId: null},
    setIsNextVideo: (state)=> set({
        isNextVideo: state
    }),



    /** Controls muting of all videos in feeds ............................................... */
    isMuted: false,
    setIsMuted: (state)=> set({
        isMuted: state
    }),

    /** Reels Section ............................................... */
    reels:[],
    setReels:(state)=> set({
        reels: state
    }),


    currentReel:{shouldPlay: false, reelId: null}, //Keep monitoring incase of a future bug
    setCurrentReel:(state)=> set({
        currentReel: state
    }),

    isReelMediaFocused: false,
    setIsReelMediaFocused:(state)=> set({
        isReelMediaFocused: state
    }),

    isFeedsScreenFocused: false,
    setIsFeedsScreenFocused:(state)=> set({
        isFeedsScreenFocused: state
    }),

    /** Comment Modal Section ............................................... */
    commentModal: {
        isVisible: false,
        feedId: null,
        sharedVideo: null, // Optional video data for seamless transfer
    },
    openCommentModal: (feedId, sharedVideo = null) => set({
        commentModal: { isVisible: true, feedId, sharedVideo }
    }),
    closeCommentModal: () => set({
        commentModal: { isVisible: false, feedId: null, sharedVideo: null }
    }),



    /** Tablet Mode and Dimension */

    tabletMode: false,
    setTabletMode: (state)=> set({
        tabletMode: state
    }),

    tabletDimension: "M",
    setTabletDimension: (state)=> set({
        tabletDimension: state
    }),


    feedWidth: 0,
    setFeedWidth: (state)=> set({
        feedWidth: state
    }),


    /**Profile Section.................................... */
    profileTabMode:{},
    setProfileTabMode: (state)=> set({
        profileTabMode: state
    }),


    /** Notifications + Messages badges ...................... */
    notificationCount: 0,
    messageCount: 0,
    setNotificationCount: (n) => set({ notificationCount: Number(n) || 0 }),
    setMessageCount: (n) => set({ messageCount: Number(n) || 0 }),

    _badgeInterval: null,

    refreshBadges: async (token) => {
        if (!token) return;
        const [notifRes, inboxRes] = await Promise.all([
            apiBadge('/api/v1/notifications/count.php', token),
            apiBadge('/api/v1/messages/inbox.php?page=1&limit=50', token),
        ]);
        const notifCount = Number(notifRes?.data?.count ?? notifRes?.count ?? 0);
        const inboxItems = Array.isArray(inboxRes?.data) ? inboxRes.data : [];
        const msgCount   = inboxItems.filter((c) => !c.seen || c.seen === '0' || c.seen === 0).length;
        set({ notificationCount: notifCount, messageCount: msgCount });
    },

    startBadgePolling: (token) => {
        const { _badgeInterval, refreshBadges } = get();
        if (_badgeInterval) clearInterval(_badgeInterval);
        refreshBadges(token);
        const id = setInterval(() => refreshBadges(token), 20000);
        set({ _badgeInterval: id });
    },

    stopBadgePolling: () => {
        const { _badgeInterval } = get();
        if (_badgeInterval) clearInterval(_badgeInterval);
        set({ _badgeInterval: null });
    },

    // ── Country filter (reactive — drives apiUrl rebuild in UnifiedFeedScreen) ─
    selectedCountryId: null, // null | 'all' | number/string country_id
    setSelectedCountryId: (id) => set({ selectedCountryId: id }),

    // ── Toast ────────────────────────────────────────────────────────────────
    toast: null, // { message: string, emoji: string | null, id: number }
    showToast: (message, emoji = null, duration = 2600) => {
        const id = Date.now();
        set({ toast: { message, emoji, id } });
        setTimeout(() => {
            set((s) => (s.toast?.id === id ? { toast: null } : {}));
        }, duration);
    },
    hideToast: () => set({ toast: null }),

}));


export default useStore;
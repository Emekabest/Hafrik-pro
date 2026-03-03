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
    composerConfig: null, // { _type, id, title, avatar, locked }
    openComposer: (config = null) => set({ isComposerOpen: true, composerConfig: config }),
    closeComposer: () => set({ isComposerOpen: false, composerConfig: null }),


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



    /**Feeds Section............................................... */
    feeds:{
        feedsById: {},
        lists:{
            recentUpdateFeeds: [],
            trendingFeeds: [],
            whatsNearbyFeeds: [],
            profileTimelineFeeds: [],
        }
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


    addFeedsToList: (listName, feedsArray) => set((state) => {
        const feedsById = { ...state.feeds.feedsById };
        const idsToAdd = [];

        feedsArray.forEach(feed => {
            feedsById[feed.id] = feed;

            if (!state.feeds.lists[listName].includes(feed.id)) {
            idsToAdd.push(feed.id);
            }
        });

        return {
            feeds: {
            ...state.feeds,
            feedsById,
            lists: {
                ...state.feeds.lists,
                [listName]: [...state.feeds.lists[listName], ...idsToAdd]
            }
            }
        };
    }),


    // Prepends only genuinely new items (by id) — used for background focus refresh
    prependFeedsToList: (listName, feedsArray) => set((state) => {
        const feedsById = { ...state.feeds.feedsById };
        const existingIds = new Set(state.feeds.lists[listName].map(String));
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
                    [listName]: [...newIds, ...state.feeds.lists[listName]],
                },
            },
        };
    }),

    clearFeedsList: (listName) => set((state) => {
        const idsToRemove = state.feeds.lists[listName];
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
            apiBadge('/api/v1/notifications/unread_count.php', token),
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


}));


export default useStore;
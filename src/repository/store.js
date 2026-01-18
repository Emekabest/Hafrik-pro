import { create } from 'zustand';


const useStore = create((set) => ({
    likedPosts: {},
    likeCounts: {},

    // Sync data from API to Store
    syncFeedData: (feeds) => set((state) => {
        const newLiked = { ...state.likedPosts };
        const newCounts = { ...state.likeCounts };
        
        const feedArray = Array.isArray(feeds) ? feeds : [feeds];
        
        feedArray.forEach(feed => {
            newLiked[feed.id] = !!feed.liked;
            newCounts[feed.id] = parseInt(feed.likes_count) || 0;
        });

        return { likedPosts: newLiked, likeCounts: newCounts };
    }),

    // Toggle like locally
    toggleLike: (postId) => set((state) => {
        const isLiked = !!state.likedPosts[postId];
        const currentCount = state.likeCounts[postId] || 0;
        
        return {
            likedPosts: { ...state.likedPosts, [postId]: !isLiked },
            likeCounts: { ...state.likeCounts, [postId]: isLiked ? currentCount - 1 : currentCount + 1 }
        };
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
    recentUpdateFeeds: [],
    setRecentUpdateFeeds: (state)=> set({
        recentUpdateFeeds: state
    }),

    

    trendingFeeds: [],
    setTrendingFeeds: (state)=> set({
        trendingFeeds: state
    }),
    


    whatsNearbyFeeds: [],
    setWhatsNearbyFeeds: (state)=> set({
        whatsNearbyFeeds: state
    }),


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


    currentReel:{shouldPlay: false, reelId: null},
    setCurrentReel:(state)=> set({
        currentReel: state
    }),


}));


export default useStore;
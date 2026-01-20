import { create } from 'zustand';


const useStore = create((set) => ({
 
    isAppActive: true,
    setIsAppActive: (state)=> set({
        isAppActive: state
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

    isReelMediaFocused: false,
    setIsReelMediaFocused:(state)=> set({
        isReelMediaFocused: state
    }),


}));


export default useStore;
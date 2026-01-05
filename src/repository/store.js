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




    /**Feeds Section............................................... */

    trendingFeeds: [],
    setTrendingFeeds: (state)=> set({trendingFeeds: state}),







}));


export default useStore;
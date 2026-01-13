import React, { memo } from 'react';
import PhotoPostContent from './photocontent.jsx';
import VideoPostContent from './videocontent.jsx';
import SharedPostCard from './sharedcontent.jsx';
import ArticlePostContent from './articlecontent.jsx';
import PollPostContent from './pollcontent.jsx';
import ProductPostContent from './productcontent.jsx';

const PostContent = ({ feed, imageWidth, leftOffset, rightOffset, onImagePress, currentPlayingId, setCurrentPlayingId, isMuted, setIsMuted, isFocused }) => {


    const isVideo = feed.type === 'video' || feed.type === 'reel';

    if (feed.type === 'shared' && feed.shared_post) {
        return <SharedPostCard post={feed.shared_post} currentPlayingId={currentPlayingId} setCurrentPlayingId={setCurrentPlayingId} parentFeedId={feed.id} isMuted={isMuted} setIsMuted={setIsMuted} isFocused={isFocused} />;
    }

    if (feed.type === 'product') {
        return <ProductPostContent feed={feed} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} />;
    }

    if (feed.type === 'article') {
        return <ArticlePostContent feed={feed} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} onImagePress={onImagePress} />;
    }

    if (feed.type === 'poll') {
        return <PollPostContent feed={feed} />;
    }

    if (feed.type === 'group_picture'){
        // placeholder for group picture handling..........
    }

    if (feed.media && feed.media.length > 0) {
        if (isVideo) {
            return <VideoPostContent media={feed.media} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} currentPlayingId={currentPlayingId} setCurrentPlayingId={setCurrentPlayingId} parentFeedId={feed.id} isMuted={isMuted} setIsMuted={setIsMuted} isFocused={isFocused} />;
        }
        return <PhotoPostContent media={feed.media} imageWidth={imageWidth} leftOffset={leftOffset} rightOffset={rightOffset} onImagePress={onImagePress} />;
    }

    return null;
};




const handleMemomize = (prevProps, nextProps) => {
    const p = prevProps;
    const n = nextProps;

    // Different post id -> rerender
    if (p.feed.id !== n.feed.id) return false;

    // If counts changed (likes/comments) update
    if ((p.feed.likes_count || p.feed.likes) !== (n.feed.likes_count || n.feed.likes)) return false;
    if ((p.feed.comments_count || 0) !== (n.feed.comments_count || 0)) return false;

    // If type or text changed, update
    if (p.feed.type !== n.feed.type) return false;
    if ((p.feed.text || '') !== (n.feed.text || '')) return false;

    // If media length changed, update
    const pMediaLen = (p.feed.media && p.feed.media.length) || 0;
    const nMediaLen = (n.feed.media && n.feed.media.length) || 0;
    if (pMediaLen !== nMediaLen) return false;

    // Compute whether playback should be active for this feed (mirrors parent logic)...
    const prevShouldPlay = !!(p.currentPlayingId && String(p.currentPlayingId).startsWith(`${p.feed.id}_`) && p.isFocused);
    const nextShouldPlay = !!(n.currentPlayingId && String(n.currentPlayingId).startsWith(`${n.feed.id}_`) && n.isFocused);
    if (prevShouldPlay !== nextShouldPlay) return false;

    // mute/focus changes
    if (p.isMuted !== n.isMuted) return false;
    if (p.isFocused !== n.isFocused) return false;

    return true;
};
export default memo(PostContent, handleMemomize);

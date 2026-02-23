import React, { memo } from 'react';
import PhotoPostContent from './photocontent.jsx';
import VideoPostContent from './videocontent.jsx';
import SharedContent from './sharedcontent.jsx';
import ArticlePostContent from './articlecontent.jsx';
import PollPostContent from './pollcontent.jsx';
import ProductContent from './productcontent.jsx';
import EventPostContent from './eventpostcontent.jsx';
import JobPostContent from './jobpostcontent.jsx';
import LinkContent from './linkcontent.jsx';
import MediaLinkContent from './medialinkcontent.jsx';
import AppDetails from '../../../../helpers/appdetails.js';
import useStore from '../../../../repository/store.js';

const defaultSizes = AppDetails.feedSliderSizes;

// ─── PostContent ──────────────────────────────────────────────────────────────
const PostContent = ({ feed, onImagePress, isVisible }) => {  // ✅ accept isVisible
  const tabletMode = useStore(state => state.tabletMode);
  const feedWidth  = useStore(state => state.feedWidth);

  const { imageWidth, leftOffset, rightOffset } = (() => {
    if (tabletMode && feedWidth > 0) {
      const lo = 10 + ((feedWidth - 20) * 0.13) + 5;
      const ro = 15;
      const iw = feedWidth - lo - ro;
      return { leftOffset: lo, rightOffset: ro, imageWidth: iw };
    }
    return defaultSizes;
  })();

  const containerWidth = tabletMode && feedWidth > 0 ? feedWidth : 0;

  // ── Shared post ────────────────────────────────────────────────────────────
  if (feed.type === 'shared' && feed.shared_post) {
    return (
      <SharedContent
        post={feed.shared_post}
        parentFeedId={feed.id}
        containerWidth={containerWidth}
        isVisible={isVisible}  // ✅ shared posts may contain videos too
      />
    );
  }

  // ── Product ────────────────────────────────────────────────────────────────
  if (feed.type === 'product') {
    return (
      <ProductContent
        feed={feed}
        imageWidth={imageWidth}
        leftOffset={leftOffset}
        rightOffset={rightOffset}
        containerWidth={containerWidth}
      />
    );
  }

  // ── Article ────────────────────────────────────────────────────────────────
  if (feed.type === 'article') {
    return (
      <ArticlePostContent
        feed={feed}
        imageWidth={imageWidth}
        leftOffset={leftOffset}
        rightOffset={rightOffset}
        onImagePress={onImagePress}
      />
    );
  }

  // ── Poll ───────────────────────────────────────────────────────────────────
  if (feed.type === 'poll') {
    return <PollPostContent feed={feed} />;
  }

  // ── Event ──────────────────────────────────────────────────────────────────
  if (feed.type === 'event_cover') {
    return <EventPostContent context={feed.context} />;
  }

  // ── Job ────────────────────────────────────────────────────────────────────
  if (feed.type === 'job') {
    return <JobPostContent feed={feed} />;
  }

  // ── Link ───────────────────────────────────────────────────────────────────
  if (feed.type === 'link') {
    return <LinkContent feed={feed} />;
  }

  // ── Media link ─────────────────────────────────────────────────────────────
  if (feed.type === 'media') {
    return <MediaLinkContent text={feed.text} />;
  }

  // ── Video / Reel / Photo ───────────────────────────────────────────────────
  if (feed.media && feed.media.length > 0) {
    const isVideo = feed.type === 'video' || feed.type === 'reel';

    if (isVideo) {
      return (
        <VideoPostContent
          feedId={feed.id}
          media={feed.media}
          leftOffset={leftOffset}
          parentFeedId={feed.id}
          containerWidth={containerWidth}
          isVisible={isVisible}  // ✅ THIS is what makes auto-pause work
        />
      );
    }

    return (
      <PhotoPostContent
        media={feed.media}
        leftOffset={leftOffset}
        onImagePress={onImagePress}
        containerWidth={containerWidth}
      />
    );
  }

  return null;
};

// ✅ memo now includes isVisible so video re-renders when visibility changes
export default memo(PostContent, (prev, next) => {
  if (prev.feed.id        !== next.feed.id)        return false;
  if (prev.feed.type      !== next.feed.type)      return false;
  if (prev.isVisible      !== next.isVisible)      return false; // ✅ added
  if ((prev.feed.media?.length || 0) !== (next.feed.media?.length || 0)) return false;
  return true;
});

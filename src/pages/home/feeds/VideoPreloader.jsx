import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useVideoPlayer } from 'expo-video';
import { registerPlayer, getPlayer } from './videoRegistry';

const HiddenPlayer = ({ url, warmMs = 350 }) => {
  const player = useVideoPlayer(url || null, (p) => {
    try {
      p.play();
      setTimeout(() => { try { p.pause(); } catch (e) {} }, warmMs);
    } catch (e) {}
  });

  useEffect(() => {
    if (!url || !player) return;
    try { registerPlayer(url, player); } catch (e) {}
    return () => {
      // keep player in registry until explicitly removed
    };
  }, [url, player]);

  return <View style={{ width: 0, height: 0, opacity: 0 }} />;
};

const VideoPreloader = ({ urls = [], limit = 3 }) => {
  const list = useMemo(() => (Array.isArray(urls) ? urls.slice(0, limit) : []), [urls, limit]);

  return (
    <>
      {list.map((u) => (
        <HiddenPlayer key={u} url={u} />
      ))}
    </>
  );
};

export default VideoPreloader;

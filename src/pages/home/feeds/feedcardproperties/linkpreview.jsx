import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const LinkPreview = ({ url }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);

  

  useEffect(() => {
    fetchThumbnail(url);
  }, [url]);

  const fetchThumbnail = async (link) => {
    try {
      const response = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(link)}`
      );

      if (!response.ok) {
        // Server returned an error (e.g. 429 rate-limit, 500, etc.)
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Response is not JSON (likely HTML error page)
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Get image from Open Graph or screenshot
      const image = data?.data?.image?.url || data?.data?.logo?.url || null;
      setThumbnail(image);
    } catch (error) {
      // silently ignore – link preview is non-critical
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  
  return thumbnail ? (
    <ExpoImage
      source={{ uri: thumbnail }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  ) : null;
};


export default LinkPreview;
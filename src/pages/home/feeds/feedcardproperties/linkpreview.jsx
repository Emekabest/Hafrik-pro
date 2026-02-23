import { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';

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
      
      const data = await response.json();
      
      // Get image from Open Graph or screenshot
      const image = data.data.image?.url || data.data.logo?.url;
      setThumbnail(image);
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  
  return thumbnail ? (
    <Image 
      source={{ uri: thumbnail }} 
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
    />
  ) : null;
};


export default LinkPreview;
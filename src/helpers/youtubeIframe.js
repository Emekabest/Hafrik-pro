
const getYoutubeVideoId = (url) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

const getYoutubeThumbnail = (videoId) => ({
  low: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  max: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
});


export {getYoutubeVideoId, getYoutubeThumbnail}
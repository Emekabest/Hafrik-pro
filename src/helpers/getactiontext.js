
const getActionText = (post) => {
        if (post.type === 'product') {
            return " added product for sale";
        }
        if (post.type === 'article') {
            return " added a blog";
        }
        if (post.type === 'poll') {
            return " created a poll";
        }
        if (post.type === 'profile_picture' || post.type === 'group_picture' || post.type === 'page_picture') {
            return " updated the profile picture";
        }
        if (post.type === 'profile_cover' || post.type === 'group_cover' || post.type === 'page_cover') {
            return " updated the cover photo";
        }
        if (post.type === 'video'){
            return " added a video";
        }
        if (post.type === 'reel'){
            return " added a reel";
        }
        if (post.type === 'event_cover'){
            return " created an event";
        }
        if (post.type === 'job'){
            return " added a job";
        }
        if (post.type === 'shared') return " shared a post";
        
        if (post.media && post.media.length > 0) {
            const isVideo = post.type === 'video' || post.type === 'reel';
            if (!isVideo) {
                const count = post.media.length;
                return ` added ${count} photo${count > 1 ? 's' : ''}`;
            }
        }
        
        
        return "";
    };


export default getActionText;
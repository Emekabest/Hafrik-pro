import apiClient from '../api/apiClient';

const COMMENTS_URL = `https://hafrik.com/api/v1/feed/comments.php`;

/**
 * Add a comment to a post.
 * Body: { action: "comment", post_id, text }
 * Returns the new comment object.
 */
const AddCommentController = async(post_id, comment, token)=>{
    try {
        const response = await apiClient.post(COMMENTS_URL, {
            action: 'comment',
            post_id,
            text: comment,
        });
        return { status: response.status, data: response.data?.data ?? response.data };
    } catch(error) {
        return { status: error.response?.status ?? 500, data: error.response?.data ?? error };
    }
}

/**
 * Add a reply to a comment.
 * Body: { action: "reply", post_id, comment_id, text }
 */
const AddReplyController = async(post_id, comment_id, text, token)=>{
    try {
        const response = await apiClient.post(COMMENTS_URL, {
            action: 'reply',
            post_id,
            comment_id,
            text,
        });
        return { status: response.status, data: response.data?.data ?? response.data };
    } catch(error) {
        return { status: error.response?.status ?? 500, data: error.response?.data ?? error };
    }
}

/**
 * Like / unlike a comment (toggle).
 * Body: { action: "like", comment_id }
 * Returns: { comment_id, is_liked, likes }
 */
const LikeCommentController = async(comment_id, token)=>{
    try {
        const response = await apiClient.post(COMMENTS_URL, {
            action: 'like',
            comment_id,
        });
        return { status: response.status, data: response.data?.data ?? response.data };
    } catch(error) {
        return { status: error.response?.status ?? 500, data: error.response?.data ?? error };
    }
}

/**
 * Delete a comment (only if owned by current user).
 * DELETE with body: { comment_id }
 */
const DeleteCommentController = async(comment_id, token)=>{
    try {
        const response = await apiClient.delete(COMMENTS_URL, {
            data: { comment_id },
        });
        return { status: response.status, data: response.data?.data ?? response.data };
    } catch(error) {
        return { status: error.response?.status ?? 500, data: error.response?.data ?? error };
    }
}

/**
 * Get comments for a post.
 * GET comments.php?post_id=123&page=1&limit=10
 */
const GetCommentsController = async(post_id, token, page = 1, limit = 10)=>{
    try {
        const response = await apiClient.get(COMMENTS_URL, {
            params: { post_id, page, limit },
        });
        // Handle both { data: { data: [...] } } and { data: [...] } shapes
        const raw = response.data?.data;
        const comments = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        return { status: response.status, data: comments };
    } catch(error) {
        return { status: error.response?.status ?? 500, data: error.response?.data ?? error };
    }
}

/**
 * Get replies to a specific comment.
 * GET comments.php?comment_id=456
 */
const GetRepliesController = async(comment_id, token)=>{
    try {
        const response = await apiClient.get(COMMENTS_URL, {
            params: { comment_id },
        });
        const raw = response.data?.data;
        const replies = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        return { status: response.status, data: replies };
    } catch(error) {
        return { status: error.response?.status ?? 500, data: error.response?.data ?? error };
    }
}


export {
    AddCommentController,
    GetCommentsController,
    AddReplyController,
    LikeCommentController,
    DeleteCommentController,
    GetRepliesController,
};
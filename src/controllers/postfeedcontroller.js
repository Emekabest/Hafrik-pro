import apiClient from '../api/apiClient';

// ─── Single unified endpoint for all post types and targets ───────────────────
const API_URL = 'https://hafrik.com/api/v1/posts/create.php';

const PostFeedController = async (postData, token) => {

    // Normalize type: frontend uses 'text', backend expects 'post'
    const normalizedType = postData?.type === 'text' ? 'post' : postData?.type;

    // Build body — ensure page_id / group_id are present for backend compatibility
    const body = {
        ...postData,
        type: normalizedType,
    };

    // Backend expects page_id for page posts and group_id for group posts
    if (body.target_type === 'page' && body.target_id && !body.page_id) {
        body.page_id = body.target_id;
    }
    if (body.target_type === 'group' && body.target_id && !body.group_id) {
        body.group_id = body.target_id;
    }

    console.log('=== CREATE POST DEBUG ===');
    console.log('URL:', API_URL);
    console.log('BODY:', JSON.stringify(body));
    console.log('=========================');

    try {
        const response = await apiClient.post(API_URL, body);

        console.log('CREATE POST RESPONSE status:', response.status);
        console.log('CREATE POST RESPONSE data:', JSON.stringify(response.data));

        return {
            httpStatus: response.status,
            status:     response.data?.status,
            message:    response.data?.data?.message ?? response.data?.message ?? '',
            data:       response.data?.data ?? response.data,
        };

    } catch (error) {
        const httpStatus = error?.response?.status ?? 0;
        const serverData = error?.response?.data    ?? null;

        console.log('CREATE POST ERROR httpStatus:', httpStatus);
        console.log('CREATE POST ERROR data:', JSON.stringify(serverData));
        console.log('CREATE POST ERROR message:', error?.message);

        return {
            httpStatus,
            status:  serverData?.status  ?? 'error',
            message: serverData?.message ?? error?.message ?? 'Unknown error',
            data:    serverData,
        };
    }
};

export default PostFeedController;
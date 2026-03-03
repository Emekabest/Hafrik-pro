import axios from "axios";

const ENDPOINTS = {
    profile: 'https://hafrik.com/api/v1/posts/create_post.php',
    group:   'https://hafrik.com/api/v1/communities/create_group_post.php',
    page:    'https://hafrik.com/api/v1/business/create_page_post.php',
};

const PostFeedController = async (postData, token) => {
    const targetType = postData?.target_type || 'profile';
    const API_URL    = ENDPOINTS[targetType] || ENDPOINTS.profile;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const normalizedType = postData?.type === 'text' ? 'post' : postData?.type;

    // Strip generic routing fields and remap target_id to the endpoint-specific key
    const { target_type, target_id, ...rest } = postData || {};
    const body = {
        ...rest,
        ...(normalizedType ? { type: normalizedType } : {}),
        ...(targetType === 'group' && target_id ? { group_id: target_id } : {}),
        ...(targetType === 'page'  && target_id ? { page_id:  target_id } : {}),
    };

    console.log('=== CREATE POST DEBUG ===');
    console.log('URL:', API_URL);
    console.log('TARGET TYPE:', targetType);
    console.log('BODY:', JSON.stringify(body));
    console.log('=========================');

    try {
        const response = await axios.post(API_URL, body, { headers });

        console.log('CREATE POST RESPONSE status:', response.status);
        console.log('CREATE POST RESPONSE data:', JSON.stringify(response.data));

        return { httpStatus: response.status, status: response.data?.status, data: response.data };

    } catch (error) {
        const httpStatus = error?.response?.status ?? 0;
        const serverData = error?.response?.data ?? null;

        console.log('CREATE POST ERROR httpStatus:', httpStatus);
        console.log('CREATE POST ERROR data:', JSON.stringify(serverData));
        console.log('CREATE POST ERROR message:', error?.message);

        return {
            httpStatus,
            status:  serverData?.status  ?? 'error',
            data:    serverData,
            message: serverData?.message ?? error?.message ?? 'Unknown error',
        };
    }
};

export default PostFeedController;

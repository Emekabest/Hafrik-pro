import apiClient from '../api/apiClient';

const CREATE_URL = '/posts/create.php';

const PostFeedController = async (postData) => {

    // Normalize type: frontend uses 'text', backend expects 'post'
    const normalizedType = postData?.type === 'text' ? 'post' : postData?.type;

    const body = { ...postData, type: normalizedType };

    // Remove undefined/null keys
    Object.keys(body).forEach(k => (body[k] === undefined || body[k] === null) && delete body[k]);

    console.log('=== CREATE POST DEBUG ===');
    console.log('URL:', CREATE_URL);
    console.log('BODY:', JSON.stringify(body));
    console.log('=========================');

    try {
        const response = await apiClient.post(CREATE_URL, body);

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

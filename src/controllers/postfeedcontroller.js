import apiClient from '../api/apiClient';

const CREATE_URL = '/posts/create.php';

const PostFeedController = async (postData) => {

    // Normalize type: frontend uses 'text', backend expects 'post'
    const normalizedType = postData?.type === 'text' ? 'post' : postData?.type;

    const body = { ...postData, type: normalizedType };

    // Remove undefined/null keys
    Object.keys(body).forEach(k => (body[k] === undefined || body[k] === null) && delete body[k]);

    try {
        const response = await apiClient.post(CREATE_URL, body);

        return {
            httpStatus: response.status,
            status:     response.data?.status,
            message:    response.data?.data?.message ?? response.data?.message ?? '',
            data:       response.data?.data ?? response.data,
        };

    } catch (error) {
        const httpStatus = error?.response?.status ?? 0;
        const serverData = error?.response?.data    ?? null;

        return {
            httpStatus,
            status:  serverData?.status  ?? 'error',
            message: serverData?.message ?? error?.message ?? 'Unknown error',
            data:    serverData,
        };
    }
};

export default PostFeedController;

/**
 * PostDetailScreen
 * Accepts route.params.postId and delegates to CommentScreen logic.
 * Registered in App.js as the 'PostDetail' stack screen.
 */
import React from 'react';
import CommentScreen from './comments/commentscreen';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params ?? {};
  const initialPost = route?.params?.post ?? route?.params?.postData ?? route?.params?.data ?? null;
  // CommentScreen expects route.params.feedId
  return (
    <CommentScreen
      route={{ ...route, params: { ...(route.params ?? {}), feedId: postId, initialPost } }}
      navigation={navigation}
    />
  );
};

export default PostDetailScreen;

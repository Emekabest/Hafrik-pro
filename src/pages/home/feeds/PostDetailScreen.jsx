/**
 * PostDetailScreen
 * Accepts route.params.postId and delegates to CommentScreen logic.
 * Registered in App.js as the 'PostDetail' stack screen.
 */
import React from 'react';
import CommentScreen from './comments/commentscreen';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params ?? {};
  // CommentScreen expects route.params.feedId
  return (
    <CommentScreen
      route={{ ...route, params: { ...(route.params ?? {}), feedId: postId } }}
      navigation={navigation}
    />
  );
};

export default PostDetailScreen;

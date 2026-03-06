import React from 'react';
import ComingSoonScreen from './ComingSoonScreen';

export default function JobsScreen({ navigation, route }) {
  return (
    <ComingSoonScreen
      navigation={navigation}
      route={{ ...route, params: { ...(route?.params ?? {}), feature: 'Jobs' } }}
    />
  );
}

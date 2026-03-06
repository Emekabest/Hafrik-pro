import React from 'react';
import ComingSoonScreen from './ComingSoonScreen';

export default function EventsScreen({ navigation, route }) {
  return (
    <ComingSoonScreen
      navigation={navigation}
      route={{ ...route, params: { ...(route?.params ?? {}), feature: 'Events' } }}
    />
  );
}

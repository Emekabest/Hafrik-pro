import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WhatsNearbyScreen = () => {

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text>Whats Nearby - Coming Soon</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WhatsNearbyScreen;
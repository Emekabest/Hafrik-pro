import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppDetails from '../../service/appdetails';

const QuickActions = () => {
  const [activeQuickAction, setActiveQuickAction] = useState(2);

  return (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setActiveQuickAction(0)}
      >
        <View style={styles.quicActionsButtonTop}>
          <Text style={[styles.quickActionButtonText, activeQuickAction === 0 && styles.activeQuickActionButtonText]}>
            What's {"\n"} Nearby
          </Text>
        </View>
        {activeQuickAction === 0 && <View style={styles.quickActionsButtonBottom} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setActiveQuickAction(1)}
      >
        <View style={styles.quicActionsButtonTop}>
          <Text style={[styles.quickActionButtonText, activeQuickAction === 1 && styles.activeQuickActionButtonText]}>
            Trending on Hafrik
          </Text>
        </View>
        {activeQuickAction === 1 && <View style={styles.quickActionsButtonBottom} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setActiveQuickAction(2)}
      >
        <View style={styles.quicActionsButtonTop}>
          <Text style={[styles.quickActionButtonText, activeQuickAction === 2 && styles.activeQuickActionButtonText]}>
            Recent Updates
          </Text>
        </View>
        {activeQuickAction === 2 && <View style={styles.quickActionsButtonBottom} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsContainer: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  quickActionButton: {
    // paddingTop:9,
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: '100%',
  },
  quicActionsButtonTop: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsButtonBottom: {
    height: "4%",
    width: "100%",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: AppDetails.primaryColor,
  },
  quickActionButtonText: {
    color: '#333',
    textAlign: 'center',
  },
  activeQuickActionButtonText: {
    color: '#0C3F44',
    fontWeight: '600',
  },
});

export default QuickActions;
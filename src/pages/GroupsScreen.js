// screens/GroupsScreen.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GroupsScreen = ({ navigation }) => {
  const groups = [
    {
      id: '1',
      name: 'Photography Enthusiasts',
      members: 1250,
      image: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      description: 'Share and discuss photography techniques, tips, and showcase your work',
      isPublic: true
    },
    {
      id: '2',
      name: 'Startup Founders Network',
      members: 890,
      image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      description: 'Connect with fellow entrepreneurs and share startup experiences',
      isPublic: true
    },
    {
      id: '3',
      name: 'Fitness & Wellness Community',
      members: 2100,
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      description: 'Get fit together, share progress, and discuss health topics',
      isPublic: true
    },
  ];

  const renderGroup = ({ item }) => (
    <TouchableOpacity style={styles.groupCard}>
      <Image source={{ uri: item.image }} style={styles.groupImage} />
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{item.name}</Text>
          <View style={styles.publicBadge}>
            <Ionicons name={item.isPublic ? "earth" : "lock-closed"} size={12} color="#666" />
            <Text style={styles.publicText}>{item.isPublic ? "Public" : "Private"}</Text>
          </View>
        </View>
        <Text style={styles.groupDescription}>{item.description}</Text>
        <View style={styles.groupStats}>
          <View style={styles.groupStat}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.groupStatText}>{item.members.toLocaleString()} members</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#0C3F44" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    padding: 4,
  },
  listContent: {
    padding: 15,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  groupImage: {
    width: '100%',
    height: 120,
  },
  groupContent: {
    padding: 15,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  publicText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  groupStats: {
    marginBottom: 15,
  },
  groupStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  joinButton: {
    backgroundColor: '#0C3F44',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GroupsScreen;
// screens/CategoriesScreen.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CategoriesScreen = ({ navigation, route }) => {
  const categories = [
    { 
      id: '1', 
      name: 'Technology', 
      icon: 'laptop-outline', 
      count: 245,
      color: '#0C3F44',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '2', 
      name: 'Sports', 
      icon: 'football-outline', 
      count: 189,
      color: '#FF6B35',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '3', 
      name: 'Entertainment', 
      icon: 'film-outline', 
      count: 167,
      color: '#9C27B0',
      image: 'https://images.unsplash.com/photo-1489599809505-fb40ebc16d30?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '4', 
      name: 'Food & Drink', 
      icon: 'restaurant-outline', 
      count: 143,
      color: '#4CAF50',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '5', 
      name: 'Travel', 
      icon: 'airplane-outline', 
      count: 132,
      color: '#2196F3',
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '6', 
      name: 'Fashion', 
      icon: 'shirt-outline', 
      count: 118,
      color: '#E91E63',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '7', 
      name: 'Health & Fitness', 
      icon: 'fitness-outline', 
      count: 95,
      color: '#00BCD4',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '8', 
      name: 'Education', 
      icon: 'school-outline', 
      count: 87,
      color: '#FF9800',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '9', 
      name: 'Art & Design', 
      icon: 'brush-outline', 
      count: 76,
      color: '#795548',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
    { 
      id: '10', 
      name: 'Business', 
      icon: 'business-outline', 
      count: 154,
      color: '#607D8B',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
    },
  ];

  const renderCategory = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => {
        // Navigate to category details or feed filtered by category
        console.log('Category pressed:', item.name);
      }}
    >
      <View style={[styles.categoryIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>{item.count} posts</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Categories List */}
      <FlatList
        data={categories}
        renderItem={renderCategory}
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
  searchButton: {
    padding: 4,
  },
  listContent: {
    padding: 15,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
  },
});

export default CategoriesScreen;
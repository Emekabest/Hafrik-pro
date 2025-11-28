// Profile.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ImageBackground,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';

const { width } = Dimensions.get('window');

const Profile = () => {
  const { user, token, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullname: '',
    username: '',
    bio: '',
    website: '',
  });
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  // Fetch user profile data from API
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        Alert.alert('Error', 'Please login to view profile');
        return;
      }

      const response = await fetch('https://hafrik.com/api/v1/user/profile.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        const userProfile = data.data;
        setUserData(userProfile);
        
        // Update stats
        setStats({
          posts: userProfile.posts_count || 0,
          followers: userProfile.followers_count || 0,
          following: userProfile.following_count || 0,
        });

        // Set edit form data
        setEditForm({
          fullname: userProfile.fullname || userProfile.name || '',
          username: userProfile.username || '',
          bio: userProfile.bio || '',
          website: userProfile.website || '',
        });

        // Fetch user posts
        fetchUserPosts();
        
      } else {
        throw new Error(data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to context user data
      if (user) {
        setUserData({
          ...user,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          bio: user.bio || '',
          website: user.website || '',
          avatar: user.avatar || user.profile_picture,
          cover_photo: user.cover_photo,
          is_verified: user.is_verified || false,
        });
        
        setStats({
          posts: 0,
          followers: 0,
          following: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      if (!token) return;

      const response = await fetch('https://hafrik.com/api/v1/users/posts.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setPosts(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    }
  };

  // Fetch user reels
  const fetchUserReels = async () => {
    try {
      if (!token) return;

      const response = await fetch('https://hafrik.com/api/v1/user/reels.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setReels(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
      setReels([]);
    }
  };

  // Initialize with user data
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user, token]);

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    try {
      // Implement follow/unfollow API call
      setIsFollowing(!isFollowing);
      // You would typically call an API endpoint here
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  // Handle edit profile
  const handleEditProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://hafrik.com/api/v1/user/update-profile.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Update both local state and context
          const updatedUser = { ...user, ...editForm };
          setUserData(updatedUser);
          await updateUser(updatedUser);
          setEditProfileModalVisible(false);
          Alert.alert('Success', 'Profile updated successfully');
        } else {
          throw new Error(data.message || 'Failed to update profile');
        }
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  // Render post item
  const renderPostItem = ({ item, index }) => (
    <TouchableOpacity style={styles.postItem}>
      {item.media && item.media.length > 0 ? (
        <Image 
          source={{ uri: item.media[0].thumbnail || item.media[0].url }} 
          style={styles.postThumbnail} 
        />
      ) : (
        <View style={styles.textPost}>
          <Text style={styles.postText} numberOfLines={6}>
            {item.text || item.caption || ''}
          </Text>
        </View>
      )}
      {item.type === 'video' && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  // Render reel item
  const renderReelItem = ({ item, index }) => (
    <TouchableOpacity style={styles.reelItem}>
      <Image source={{ uri: item.thumbnail || item.media?.[0]?.thumbnail }} style={styles.reelThumbnail} />
      <View style={styles.reelOverlay}>
        <View style={styles.reelStats}>
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.reelViews}>{item.views_count || '0'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render follower item
  const renderFollowerItem = ({ item }) => (
    <View style={styles.followerItem}>
      <Image 
        source={{ uri: item.avatar || item.profile_picture }} 
        style={styles.followerAvatar} 
      />
      <View style={styles.followerInfo}>
        <Text style={styles.followerName}>{item.name || item.username}</Text>
        <Text style={styles.followerUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity 
        style={[
          styles.followButton,
          item.is_following && styles.followingButton
        ]}
        onPress={() => console.log('Follow action')}
      >
        <Text style={[
          styles.followButtonText,
          item.is_following && styles.followingButtonText
        ]}>
          {item.is_following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'posts' ? 'images-outline' : 'videocam-outline'} 
        size={64} 
        color="#ccc" 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'posts' ? 'No Posts Yet' : 'No Reels Yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'posts' 
          ? 'Share your first post with the world!' 
          : 'Create your first reel to get started'
        }
      </Text>
    </View>
  );

  if (loading && !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C3F44" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <Text style={styles.headerUsername}>{userData?.username || 'User'}</Text>
          <Text style={styles.headerPosts}>{stats.posts} posts</Text>
        </View>
        
        <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover Photo and Profile Info */}
        <View style={styles.profileHeader}>
          <ImageBackground 
            source={{ uri: userData?.cover_photo || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80' }} 
            style={styles.coverPhoto}
          >
            <View style={styles.coverOverlay} />
          </ImageBackground>

          <View style={styles.profileInfo}>
            <View style={styles.profileTop}>
              <Image 
                source={{ uri: userData?.avatar || userData?.profile_picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' }} 
                style={styles.profilePicture}
              />
              <View style={styles.statsContainer}>
                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => setFollowersModalVisible(true)}
                >
                  <Text style={styles.statNumber}>{stats.posts}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => setFollowersModalVisible(true)}
                >
                  <Text style={styles.statNumber}>{stats.followers}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statItem}
                  onPress={() => setFollowingModalVisible(true)}
                >
                  <Text style={styles.statNumber}>{stats.following}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{userData?.fullname || userData?.name || userData?.username}</Text>
                {userData?.is_verified && (
                  <Ionicons name="checkmark-circle" size={20} color="#4a80f0" />
                )}
              </View>
              <Text style={styles.userBio}>{userData?.bio || 'No bio yet'}</Text>
              {userData?.website && (
                <TouchableOpacity>
                  <Text style={styles.website}>{userData.website}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="person-add-outline" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons 
              name="grid" 
              size={24} 
              color={activeTab === 'posts' ? '#0C3F44' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'posts' && styles.activeTabText
            ]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reels' && styles.activeTab]}
            onPress={() => setActiveTab('reels')}
          >
            <Ionicons 
              name="play" 
              size={24} 
              color={activeTab === 'reels' ? '#0C3F44' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'reels' && styles.activeTabText
            ]}>Reels</Text>
          </TouchableOpacity>
        </View>

        {/* Content Grid */}
        {activeTab === 'posts' ? (
          posts.length > 0 ? (
            <FlatList
              data={posts}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.postsGrid}
            />
          ) : (
            renderEmptyState()
          )
        ) : (
          reels.length > 0 ? (
            <FlatList
              data={reels}
              renderItem={renderReelItem}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.reelsGrid}
            />
          ) : (
            renderEmptyState()
          )
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={editForm.fullname}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, fullname: text }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={editForm.username}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Bio"
                value={editForm.bio}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, bio: text }))}
                multiline
                numberOfLines={3}
              />
              <TextInput
                style={styles.input}
                placeholder="Website"
                value={editForm.website}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, website: text }))}
              />
              <TouchableOpacity 
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleEditProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    padding: 5,
  },
  headerUserInfo: {
    alignItems: 'center',
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerPosts: {
    color: '#666',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    marginBottom: 20,
  },
  coverPhoto: {
    height: 150,
    width: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  profileInfo: {
    paddingTop: 20,
    paddingHorizontal: 15,
    marginTop: -40,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  userInfo: {
    marginBottom: 15,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  userBio: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 5,
  },
  website: {
    fontSize: 14,
    color: '#0C3F44',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0C3F44',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#0C3F44',
    fontWeight: '600',
  },
  postsGrid: {
    padding: 1,
  },
  postItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 1,
    backgroundColor: '#f8f8f8',
    position: 'relative',
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
  },
  textPost: {
    width: '100%',
    height: '100%',
    padding: 8,
    backgroundColor: '#0C3F44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 16,
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  reelsGrid: {
    padding: 1,
  },
  reelItem: {
    flex: 1,
    aspectRatio: 0.8,
    margin: 1,
    backgroundColor: '#f8f8f8',
    position: 'relative',
  },
  reelThumbnail: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reelViews: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editForm: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0C3F44',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  followerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  followerUsername: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#0C3F44',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#333',
  },
});

export default Profile;
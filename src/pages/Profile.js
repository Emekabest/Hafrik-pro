// Profile.js - Simplified with direct API uploads
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const Profile = () => {
  const { user, token, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);

  // Initialize editForm with all fields from the API
  const [editForm, setEditForm] = useState({
    // Basic Info
    first_name: '',
    last_name: '',
    username: '',
    gender: '',
    about: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',

    // Location
    current_city: '',
    hometown: '',
    country: '',

    // Social Links
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
  });

  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  // Function to construct proper S3 URL from the stored path
  const constructImageUrl = (storedPath) => {
    if (!storedPath) return null;

    // Check if it's already a full URL
    if (storedPath.startsWith('https://') || storedPath.startsWith('http://')) {
      return storedPath;
    }

    // If it's a path from the API, construct the full S3 URL
    if (storedPath.includes('/')) {
      const bucketUrl = 'https://s3.ap-northeast-1.wasabisys.com/hafriksocial';
      const fullUrl = `${bucketUrl}/${storedPath}`;
      return fullUrl;
    }

    return null;
  };

  // Function to get avatar URL
  const getAvatarUrl = (userData) => {
    if (!userData) {
      const initial = userData?.username?.charAt(0) || 'U';
      return `https://via.placeholder.com/100/0C3F44/FFFFFF?text=${initial}`;
    }
    
    const avatarUrl = constructImageUrl(userData.avatar);
    
    if (avatarUrl) {
      return avatarUrl;
    }
    
    // Fallback to placeholder
    const initial = userData.username?.charAt(0) || 'U';
    return `https://via.placeholder.com/100/0C3F44/FFFFFF?text=${initial}`;
  };

  // Function to get cover URL
  const getCoverUrl = (userData) => {
    if (!userData) {
      return 'https://via.placeholder.com/400x150/0C3F44/FFFFFF?text=Cover+Photo';
    }
    
    const coverUrl = constructImageUrl(userData.cover);
    
    if (coverUrl) {
      return coverUrl;
    }
    
    // Fallback to placeholder
    return 'https://via.placeholder.com/400x150/0C3F44/FFFFFF?text=Cover+Photo';
  };

  // Handle image upload (avatar or cover)
  const handleImageUpload = async (imageType) => {
    try {
      // Request permission first
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need camera roll permissions to upload images.');
          return;
        }
      }

      // Pick image from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'avatar' ? [1, 1] : [3, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0].uri) {
        return;
      }

      setUploading(true);
      
      // Prepare form data
      const formData = new FormData();
      
      // Get file info
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Append the file
      formData.append('file', {
        uri,
        name: filename,
        type,
      });
      
      console.log(`Uploading ${imageType}...`);
      
      // Choose the correct API endpoint
      const endpoint = imageType === 'avatar' 
        ? 'https://hafrik.com/api/v1/users/update_avatar.php'
        : 'https://hafrik.com/api/v1/users/update_cover.php';
      
      // Upload to the specific endpoint
      const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);

      if (uploadData.status === 'success') {
        // Get the new image URL/path from response
        const imagePath = uploadData.data?.path || uploadData.data?.url || uploadData.data?.[imageType];
        
        if (imagePath) {
          // Update local state
          setProfileData(prev => ({
            ...prev,
            user: {
              ...prev.user,
              [imageType]: imagePath
            }
          }));

          // Update auth context
          const updatedUser = {
            ...user,
            [imageType]: imagePath,
          };
          await updateUser(updatedUser);

          Alert.alert('Success', `${imageType === 'avatar' ? 'Profile picture' : 'Cover photo'} updated successfully`);
        } else {
          throw new Error('No image path returned from server');
        }
      } else {
        throw new Error(uploadData.message || 'Upload failed');
      }

    } catch (error) {
      console.error(`Error uploading ${imageType}:`, error);
      Alert.alert('Error', `Failed to upload ${imageType === 'avatar' ? 'profile picture' : 'cover photo'}`);
    } finally {
      setUploading(false);
    }
  };

  // Fetch user profile data from API
  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      if (!token) {
        Alert.alert('Error', 'Please login to view profile');
        return;
      }

      const response = await fetch('https://hafrik.com/api/v1/users/profile.php', {
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
        const apiData = data.data;
        setProfileData(apiData);

        // Update stats based on API response
        const userData = apiData.user || {};
        const postsCount = apiData.posts?.length || 0;
        const followersCount = apiData.followers?.length || 0;
        const followingCount = apiData.followings?.length || 0;

        setStats({
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        });

        // Set edit form data from API
        setEditForm({
          // Basic Info
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          username: userData.username || '',
          gender: userData.gender?.toString() || '',
          about: userData.about || userData.bio || '',
          birth_day: userData.birth_day?.toString() || '',
          birth_month: userData.birth_month?.toString() || '',
          birth_year: userData.birth_year?.toString() || '',

          // Location
          current_city: userData.current_city || '',
          hometown: userData.hometown || '',
          country: userData.country?.toString() || userData.user_country?.toString() || '',

          // Social Links
          facebook: userData.facebook || '',
          twitter: userData.twitter || '',
          instagram: userData.instagram || '',
          linkedin: userData.linkedin || '',
          youtube: userData.youtube || '',
        });

      } else {
        throw new Error(data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // If API fails, use context user data
      if (user) {
        setProfileData({
          user: {
            ...user,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username || '',
            about: user.about || user.bio || '',
            gender: user.gender || '',
            verified: user.verified || false,
            avatar: user.avatar,
            cover: user.cover,
            joined: user.joined || new Date().toISOString(),
            last_seen: user.last_seen || new Date().toISOString(),
          },
          posts: [],
          followers: [],
          followings: [],
          pages_liked: [],
          pages_admin: [],
          groups: [],
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

  // Initialize with user data
  useEffect(() => {
    if (user && token) {
      fetchUserProfile();
    }
  }, [user, token]);

  // Function to update profile (text fields only)
  const handleUpdateProfile = async () => {
    try {
      setUploading(true);

      // Prepare payload - only text fields
      const payload = {};

      // Basic Info
      if (editForm.first_name !== (profileData?.user?.first_name || '')) {
        payload.first_name = editForm.first_name;
      }

      if (editForm.last_name !== (profileData?.user?.last_name || '')) {
        payload.last_name = editForm.last_name;
      }

      if (editForm.username !== (profileData?.user?.username || '')) {
        payload.username = editForm.username;
      }

      if (editForm.gender !== (profileData?.user?.gender?.toString() || '')) {
        payload.gender = editForm.gender ? parseInt(editForm.gender) : '';
      }

      if (editForm.about !== (profileData?.user?.about || profileData?.user?.bio || '')) {
        payload.about = editForm.about;
      }

      if (editForm.birth_day !== (profileData?.user?.birth_day?.toString() || '')) {
        payload.birth_day = editForm.birth_day ? parseInt(editForm.birth_day) : '';
      }

      if (editForm.birth_month !== (profileData?.user?.birth_month?.toString() || '')) {
        payload.birth_month = editForm.birth_month ? parseInt(editForm.birth_month) : '';
      }

      if (editForm.birth_year !== (profileData?.user?.birth_year?.toString() || '')) {
        payload.birth_year = editForm.birth_year ? parseInt(editForm.birth_year) : '';
      }

      // Location
      if (editForm.current_city !== (profileData?.user?.current_city || '')) {
        payload.current_city = editForm.current_city;
      }

      if (editForm.hometown !== (profileData?.user?.hometown || '')) {
        payload.hometown = editForm.hometown;
      }

      if (editForm.country !== (profileData?.user?.country?.toString() || profileData?.user?.user_country?.toString() || '')) {
        payload.country = editForm.country ? parseInt(editForm.country) : '';
      }

      // Social Links
      if (editForm.facebook !== (profileData?.user?.facebook || '')) {
        payload.facebook = editForm.facebook;
      }

      if (editForm.twitter !== (profileData?.user?.twitter || '')) {
        payload.twitter = editForm.twitter;
      }

      if (editForm.instagram !== (profileData?.user?.instagram || '')) {
        payload.instagram = editForm.instagram;
      }

      if (editForm.linkedin !== (profileData?.user?.linkedin || '')) {
        payload.linkedin = editForm.linkedin;
      }

      if (editForm.youtube !== (profileData?.user?.youtube || '')) {
        payload.youtube = editForm.youtube;
      }

      // If no changes, just return
      if (Object.keys(payload).length === 0) {
        setUploading(false);
        Alert.alert('Info', 'No changes to save');
        return;
      }

      console.log('Update profile payload:', payload);

      const response = await fetch('https://hafrik.com/api/v1/users/update_profile.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Update profile response:', data);

      if (data.status === 'success') {
        // Update local state
        setProfileData(prev => ({
          ...prev,
          user: {
            ...prev.user,
            ...payload
          }
        }));

        // Update auth context
        const updatedUser = {
          ...user,
          ...payload,
        };
        await updateUser(updatedUser);

        // Close modal
        setEditProfileModalVisible(false);

        Alert.alert('Success', 'Profile updated successfully');

        // Refresh profile data
        fetchUserProfile();

      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUploading(false);
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

  // Get post thumbnail source
  const getPostThumbnail = (post) => {
    // Check if post has media
    if (post.media && post.media.length > 0) {
      // Return the first media item
      const media = post.media[0];
      if (media.thumbnail) {
        return { uri: media.thumbnail };
      } else if (media.url) {
        return { uri: media.url };
      }
    }
    
    // If no media, use text thumbnail with caption
    return null;
  };

  // Render post item with thumbnail
  const renderPostItem = ({ item }) => {
    const thumbnailSource = getPostThumbnail(item);
    const hasMedia = item.media && item.media.length > 0;
    
    return (
      <TouchableOpacity style={styles.postItem}>
        {thumbnailSource ? (
          <Image
            source={thumbnailSource}
            style={styles.postThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.textThumbnail}>
            <Text style={styles.textThumbnailText} numberOfLines={6}>
              {item.text || item.caption || item.content || 'No caption'}
            </Text>
          </View>
        )}
        
        {/* Video indicator */}
        {item.type === 'video' && hasMedia && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        )}
        
        {/* Multiple media indicator */}
        {hasMedia && item.media.length > 1 && (
          <View style={styles.multipleMediaIndicator}>
            <Ionicons name="layers" size={16} color="#fff" />
            <Text style={styles.multipleMediaText}>{item.media.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === 'posts' ? 'images-outline' : type === 'followers' ? 'people-outline' : 'person-add-outline'}
        size={64}
        color="#ccc"
      />
      <Text style={styles.emptyStateTitle}>
        {type === 'posts' ? 'No Posts Yet' :
          type === 'followers' ? 'No Followers Yet' :
            'Not Following Anyone'}
      </Text>
      <Text style={styles.emptyStateText}>
        {type === 'posts'
          ? 'Share your first post with the world!'
          : type === 'followers'
            ? 'When you get followers, they\'ll appear here'
            : 'When you follow people, they\'ll appear here'
        }
      </Text>
    </View>
  );

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!profileData?.user) return 'User';

    const user = profileData.user;
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.last_name) {
      return user.last_name;
    }
    return user.username || 'User';
  };

  if (loading && !profileData) {
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

  const userData = profileData?.user || user || {};
  const posts = profileData?.posts || [];
  const followers = profileData?.followers || [];
  const followings = profileData?.followings || [];

  // Get safe image URLs
  const avatarUrl = getAvatarUrl(userData);
  const coverUrl = getCoverUrl(userData);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setEditProfileModalVisible(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerUserInfo}>
          <Text style={styles.headerUsername}>{userData.username || 'User'}</Text>
          <Text style={styles.headerPosts}>{stats.posts} posts</Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover Photo and Profile Info */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => handleImageUpload('cover')} disabled={uploading}>
            <ImageBackground
              source={{ uri: coverUrl }}
              style={styles.coverPhoto}
            >
              <View style={styles.coverOverlay}>
                <View style={styles.coverEditButton}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.coverEditText}>{uploading ? 'Uploading...' : 'Edit Cover'}</Text>
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.profileTop}>
              <TouchableOpacity onPress={() => handleImageUpload('avatar')} disabled={uploading}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.profilePicture}
                    onError={() => {
                      console.log('Error loading avatar, using placeholder');
                    }}
                  />
                  <View style={styles.avatarEditButton}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.statsContainer}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => setActiveTab('posts')}
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
                <Text style={styles.userName}>{getUserDisplayName()}</Text>
                {userData.verified && (
                  <Ionicons name="checkmark-circle" size={20} color="#4a80f0" style={styles.verifiedBadge} />
                )}
              </View>
              <Text style={styles.userUsername}>@{userData.username || 'username'}</Text>
              <Text style={styles.userBio}>{userData.about || userData.bio || 'No bio yet'}</Text>

              {/* Additional Info */}
              <View style={styles.additionalInfo}>
                {userData.gender !== undefined && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      {userData.gender === 1 ? 'Male' : userData.gender === 2 ? 'Female' : 'Other'}
                    </Text>
                  </View>
                )}
                {userData.current_city && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>{userData.current_city}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>Joined {formatDate(userData.joined)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setEditProfileModalVisible(true)}
              >
                <Text style={styles.actionButtonText}>Edit Profile</Text>
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
            style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
            onPress={() => setFollowersModalVisible(true)}
          >
            <Ionicons
              name="people"
              size={24}
              color={activeTab === 'followers' ? '#0C3F44' : '#666'}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'followers' && styles.activeTabText
            ]}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'following' && styles.activeTab]}
            onPress={() => setFollowingModalVisible(true)}
          >
            <Ionicons
              name="person-add"
              size={24}
              color={activeTab === 'following' ? '#0C3F44' : '#666'}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'following' && styles.activeTabText
            ]}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Content Grid */}
        {activeTab === 'posts' && (
          posts.length > 0 ? (
            <FlatList
              data={posts}
              renderItem={renderPostItem}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.postsGrid}
            />
          ) : (
            renderEmptyState('posts')
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

            <ScrollView style={styles.editForm}>
              {/* Basic Information Section */}
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={editForm.first_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, first_name: text }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={editForm.last_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, last_name: text }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Username"
                value={editForm.username}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, username: text }))}
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[styles.genderOption, editForm.gender === '1' && styles.genderOptionSelected]}
                  onPress={() => setEditForm(prev => ({ ...prev, gender: '1' }))}
                >
                  <Text style={[styles.genderOptionText, editForm.gender === '1' && styles.genderOptionTextSelected]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, editForm.gender === '2' && styles.genderOptionSelected]}
                  onPress={() => setEditForm(prev => ({ ...prev, gender: '2' }))}
                >
                  <Text style={[styles.genderOptionText, editForm.gender === '2' && styles.genderOptionTextSelected]}>
                    Female
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, editForm.gender === '0' && styles.genderOptionSelected]}
                  onPress={() => setEditForm(prev => ({ ...prev, gender: '0' }))}
                >
                  <Text style={[styles.genderOptionText, editForm.gender === '0' && styles.genderOptionTextSelected]}>
                    Other
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Bio/About"
                value={editForm.about}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, about: text }))}
                multiline
                numberOfLines={4}
              />

              {/* Birth Date Section */}
              <Text style={styles.sectionTitle}>Birth Date</Text>
              <View style={styles.birthDateContainer}>
                <TextInput
                  style={[styles.input, styles.birthDayInput]}
                  placeholder="Day"
                  value={editForm.birth_day}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, birth_day: text }))}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TextInput
                  style={[styles.input, styles.birthMonthInput]}
                  placeholder="Month"
                  value={editForm.birth_month}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, birth_month: text }))}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TextInput
                  style={[styles.input, styles.birthYearInput]}
                  placeholder="Year"
                  value={editForm.birth_year}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, birth_year: text }))}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>

              {/* Location Section */}
              <Text style={styles.sectionTitle}>Location</Text>

              <TextInput
                style={styles.input}
                placeholder="Current City"
                value={editForm.current_city}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, current_city: text }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Hometown"
                value={editForm.hometown}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, hometown: text }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Country Code"
                value={editForm.country}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, country: text }))}
                keyboardType="numeric"
              />

              {/* Social Links Section */}
              <Text style={styles.sectionTitle}>Social Links</Text>

              <View style={styles.socialInputContainer}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Facebook URL"
                  value={editForm.facebook}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, facebook: text }))}
                />
              </View>

              <View style={styles.socialInputContainer}>
                <Ionicons name="logo-twitter" size={20} color="#1DA1F2" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Twitter URL"
                  value={editForm.twitter}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, twitter: text }))}
                />
              </View>

              <View style={styles.socialInputContainer}>
                <Ionicons name="logo-instagram" size={20} color="#E4405F" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Instagram URL"
                  value={editForm.instagram}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, instagram: text }))}
                />
              </View>

              <View style={styles.socialInputContainer}>
                <Ionicons name="logo-linkedin" size={20} color="#0077B5" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="LinkedIn URL"
                  value={editForm.linkedin}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, linkedin: text }))}
                />
              </View>

              <View style={styles.socialInputContainer}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="YouTube URL"
                  value={editForm.youtube}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, youtube: text }))}
                />
              </View>

              {/* Upload Buttons */}
              <View style={styles.uploadButtons}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleImageUpload('avatar')}
                  disabled={uploading}
                >
                  <Ionicons name="person-circle-outline" size={20} color="#0C3F44" />
                  <Text style={styles.uploadButtonText}>
                    {uploading ? 'Uploading...' : 'Change Profile Picture'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => handleImageUpload('cover')}
                  disabled={uploading}
                >
                  <Ionicons name="image-outline" size={20} color="#0C3F44" />
                  <Text style={styles.uploadButtonText}>
                    {uploading ? 'Uploading...' : 'Change Cover Photo'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, (uploading || loading) && styles.disabledButton]}
                onPress={handleUpdateProfile}
                disabled={uploading || loading}
              >
                {uploading || loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save All Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
  },
  coverEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coverEditText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
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
  avatarContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0C3F44',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
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
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  additionalInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0C3F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    overflow: 'hidden',
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  textThumbnail: {
    width: '100%',
    height: '100%',
    padding: 8,
    backgroundColor: '#0C3F44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textThumbnailText: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  multipleMediaIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  multipleMediaText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 2,
    fontWeight: 'bold',
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
    maxHeight: '90%',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 15,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  genderOptionSelected: {
    backgroundColor: '#0C3F44',
    borderColor: '#0C3F44',
  },
  genderOptionText: {
    fontSize: 14,
    color: '#666',
  },
  genderOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadButtons: {
    marginVertical: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#0C3F44',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Profile;
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useNavigation } from "@react-navigation/native";

import FeedCard from "../home/feeds/feedcard";
import {
  getGroupDetails,
  getGroupFeed,
  getGroupMembers,
  joinGroup,
  leaveGroup
} from "./services/groupApi";

const { width } = Dimensions.get("window");

const PRIMARY = "#0C3F44";
const ACCENT = "#13C296";
const BG = "#F7F9FA";
const MUTED = "#6B7280";

const TABS = ["posts", "media", "members"];
const TAB_WIDTH = width / 3;

export default function GroupDetails({ route }) {
  const { groupId } = route.params;
  const navigation = useNavigation();

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [groupRes, feedRes, memberRes] = await Promise.all([
      getGroupDetails(groupId),
      getGroupFeed(groupId, 1, 20),
      getGroupMembers(groupId, 1, 50),
    ]);

    if (groupRes?.status === "success") {
      setGroup(groupRes.data);
      setIsMember(groupRes.data?.is_member === true);
    }

    if (feedRes?.status === "success") {
      const data = Array.isArray(feedRes.data?.data)
        ? feedRes.data.data
        : feedRes.data || [];
      setPosts(data);
    }

    if (memberRes?.status === "success") {
      const data = Array.isArray(memberRes.data?.data)
        ? memberRes.data.data
        : memberRes.data || [];
      setMembers(data);
    }

    setLoading(false);
  };

  const switchTab = (index) => {
    setActiveTab(index);
    Animated.spring(indicatorX, {
      toValue: index * TAB_WIDTH,
      useNativeDriver: true,
    }).start();
  };

  const mediaPosts = posts.filter(
    p =>
      p.type === "media" ||
      p.type === "video" ||
      p.type === "reel" ||
      (p.photos && p.photos.length > 0)
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <FlatList
        ListHeaderComponent={
          <>
            <ExpoImage
              source={{ uri: group?.cover }}
              style={styles.cover}
              contentFit="cover"
            />

            <View style={styles.infoSection}>
              <Text style={styles.title}>{group?.title}</Text>

              <Text style={styles.description}>
                {group?.about
                  ?.replace(/<\/?[^>]+(>|$)/g, "")
                  .replace(/&mdash;/g, "—")
                  .replace(/&rsquo;/g, "'")}
              </Text>

              <View style={styles.statsRow}>
                <Text style={styles.stat}>
                  {group?.members || 0} Members
                </Text>
                <Text style={styles.stat}>
                  {group?.posts_count || 0} Posts
                </Text>
              </View>

              {!isMember ? (
                <TouchableOpacity style={styles.joinBtn}>
                  <Text style={styles.joinText}>Join Community</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.joinedBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={{ color: "#fff", marginLeft: 4 }}>
                    Joined
                  </Text>
                </View>
              )}
            </View>

            {/* Animated Tabs */}
            <View style={styles.tabs}>
              {TABS.map((tab, index) => (
                <TouchableOpacity
                  key={tab}
                  style={styles.tab}
                  onPress={() => switchTab(index)}
                >
                  <Text
                    style={{
                      color:
                        activeTab === index ? PRIMARY : MUTED,
                      fontWeight:
                        activeTab === index ? "700" : "500"
                    }}
                  >
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}

              <Animated.View
                style={[
                  styles.indicator,
                  { transform: [{ translateX: indicatorX }] }
                ]}
              />
            </View>
          </>
        }
        data={
          activeTab === 0
            ? posts
            : activeTab === 1
            ? mediaPosts
            : members
        }
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          if (activeTab === 1) {
            return null;
          }

          if (activeTab === 2) {
            return (
              <View style={styles.memberRow}>
                <ExpoImage
                  source={{ uri: item.avatar }}
                  style={styles.memberAvatar}
                />
                <Text style={styles.memberName}>
                  {item.full_name || item.username}
                </Text>
              </View>
            );
          }

          return <FeedCard feed={item} />;
        }}
        ListFooterComponent={
          activeTab === 1 && (
            <View style={styles.mediaGrid}>
              {mediaPosts.map((item, index) => (
                <ExpoImage
                  key={index}
                  source={{ uri: item.photos?.[0] }}
                  style={styles.mediaItem}
                  contentFit="cover"
                />
              ))}
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />

      {isMember && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() =>
            navigation.navigate("CreatePost", { group_id: groupId })
          }
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  cover: { width, height: 160 },

  infoSection: {
    padding: 20,
    backgroundColor: "#fff"
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: PRIMARY
  },

  description: {
    marginTop: 10,
    fontSize: 14,
    color: MUTED,
    lineHeight: 22
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 20
  },

  stat: { fontSize: 13, color: MUTED },

  joinBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center"
  },

  joinText: { color: "#fff", fontWeight: "700" },

  joinedBadge: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },

  tabs: {
    flexDirection: "row",
    position: "relative",
    backgroundColor: "#fff"
  },

  tab: {
    width: TAB_WIDTH,
    alignItems: "center",
    paddingVertical: 14
  },

  indicator: {
    position: "absolute",
    bottom: 0,
    width: TAB_WIDTH,
    height: 3,
    backgroundColor: PRIMARY
  },

  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },

  mediaItem: {
    width: width / 3,
    height: width / 3
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee"
  },

  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },

  memberName: { fontWeight: "600" },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: PRIMARY,
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6
  }
});
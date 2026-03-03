import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Colors } from '../../../theme/colors';

export default function PostCard({ post }) {
  return (
    <View style={styles.card}>

      {/* USER */}
      <View style={styles.header}>
        <Image
          source={{ uri: post.user.avatar }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.name}>
            {post.user.full_name}
          </Text>
          <Text style={styles.date}>
            {post.created}
          </Text>
        </View>
      </View>

      {/* TEXT */}
      {post.text ? (
        <Text style={styles.text}>
          {post.text}
        </Text>
      ) : null}

      {/* MEDIA */}
      {post.media?.map((m, index) => {
        if (m.type === "photo") {
          return (
            <Image
              key={index}
              source={{ uri: m.url }}
              style={styles.image}
            />
          );
        }

        if (m.type === "video" || m.type === "reel") {
          return (
            <View key={index} style={styles.videoPlaceholder}>
              <Text>🎥 Video</Text>
            </View>
          );
        }

        return null;
      })}

      {/* STATS */}
      <View style={styles.stats}>
        <Text>👍 {post.likes_count}</Text>
        <Text>💬 {post.comments_count}</Text>
        <Text>👁 {post.views}</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 14,
    borderRadius: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  name: {
    fontWeight: "bold",
  },
  date: {
    fontSize: 12,
    color: Colors.neutral450,
  },
  text: {
    fontSize: 15,
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    marginTop: 8,
  },
  videoPlaceholder: {
    height: 200,
    borderRadius: 10,
    backgroundColor: Colors.neutral180,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});
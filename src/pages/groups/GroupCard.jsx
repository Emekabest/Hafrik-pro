import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";

export default function GroupCard({ group, onPress, onJoinToggle }) {
  const title =
    group.group_title ||
    group.title ||
    group.name;

  const members =
    group.group_members ||
    group.members_count ||
    group.members ||
    0;

  const joined = group.is_joined || false;

  const flag = group.group_country_flag || "";

  return (
    <TouchableOpacity
      style={styles.wrapper}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.card}>
        <Image
          source={{
            uri:
              group.avatar ||
              group.group_picture ||
              "https://hafrik.com/default-avatar.png",
          }}
          style={styles.avatar}
        />

        <View style={styles.info}>
          <Text style={styles.name}>
            {flag ? `${flag} ` : ""}
            {title}
          </Text>

          <Text style={styles.members}>
            {members.toLocaleString()} Members
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onJoinToggle(group.id, !joined)}
          style={[
            styles.joinBtn,
            joined && styles.joinedBtn,
          ]}
        >
          <Text
            style={[
              styles.joinText,
              joined && styles.joinedText,
            ]}
          >
            {joined ? "✓ Joined" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#0c3f44",
  },

  info: {
    flex: 1,
    marginLeft: 16,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  members: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  joinBtn: {
    backgroundColor: "#1f8b4c",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },

  joinedBtn: {
    backgroundColor: "#1f8b4c",
  },

  joinText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  joinedText: {
    color: "white",
  },
});
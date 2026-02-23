import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { joinGroup, leaveGroup } from "../services/groupApi";

export default function JoinButton({ group, onJoin }) {
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(group.join_status === "joined");

  const handlePress = async () => {
    if (loading) return;

    setLoading(true);

    try {
      if (joined) {
        await leaveGroup(group.id);
        setJoined(false);
      } else {
        await joinGroup(group.id);
        setJoined(true);
      }

      onJoin && onJoin(group.id);
    } catch (e) {
      console.log("JOIN ERROR:", e);
    }

    setLoading(false);
  };

  return (
    <TouchableOpacity
      style={[styles.button, joined && styles.joined]}
      onPress={handlePress}
    >
      <Text style={[styles.text, joined && styles.joinedText]}>
        {joined ? "✓ Joined" : "Join"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0c3f44",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joined: {
    backgroundColor: "#1f8f4e",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
  joinedText: {
    color: "#fff",
  },
});
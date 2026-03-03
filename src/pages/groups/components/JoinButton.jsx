import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { joinGroup, leaveGroup } from "../services/groupApi";
import Button from "../../../components/common/Button";
import { Colors, Radius, Spacing } from "../../../theme";

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
    <Button
      title={joined ? "✓ Joined" : "Join"}
      onPress={handlePress}
      loading={loading}
      style={[styles.button, joined && styles.joined]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  joined: {
    backgroundColor: Colors.primary,
  },
});
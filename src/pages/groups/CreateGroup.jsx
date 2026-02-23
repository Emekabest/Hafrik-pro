import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";

export default function CreateGroup() {
  const [name, setName] = useState("");

  const handleCreate = () => {
    fetch("https://hafrik.com/api/v1/groups/create.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_name: name })
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Group name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button title="Create Group" onPress={handleCreate} />
    </View>
  );
}
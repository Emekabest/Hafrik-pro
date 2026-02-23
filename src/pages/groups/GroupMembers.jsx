import React, { useEffect, useState } from "react";
import { View, FlatList, Text } from "react-native";

export default function GroupMembers({ route }) {
  const { groupId } = route.params;
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetch(`https://hafrik.com/api/v1/groups/members.php?group_id=${groupId}`)
      .then(res => res.json())
      .then(data => setMembers(data.data));
  }, []);

  return (
    <FlatList
      data={members}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 15 }}>
          <Text>{item.full_name}</Text>
        </View>
      )}
    />
  );
}
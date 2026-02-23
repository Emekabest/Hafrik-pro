import React, { useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import GroupCard from "./GroupCard";
import GroupFilters from "./GroupFilters";
import { getGroups } from "./services/groupApi";

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchGroups = async () => {
    if (loading) return;
    setLoading(true);

    const res = await getGroups(`page=${page}&limit=10`);
    if (res?.status === "success") {
      setGroups(prev => [...prev, ...res.data]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [page]);

  return (
    <View style={{ flex: 1 }}>
      <GroupFilters />

      <FlatList
        data={groups}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <GroupCard group={item} />}
        onEndReached={() => setPage(prev => prev + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" /> : null
        }
      />
    </View>
  );
}
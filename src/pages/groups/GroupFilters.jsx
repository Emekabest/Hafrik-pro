import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from '../../theme/colors';

const filters = ["all", "joined", "suggested", "trending"];

export default function GroupFilters({ active, setActive }) {
  return (
    <View style={styles.container}>
      {filters.map((item) => (
        <TouchableOpacity
          key={item}
          style={[
            styles.button,
            active === item && styles.activeButton,
          ]}
          onPress={() => setActive(item)}
        >
          <Text
            style={[
              styles.text,
              active === item && styles.activeText,
            ]}
          >
            {item.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  button: {
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.neutral180,
  },
  activeButton: {
    backgroundColor: Colors.greenDeep,
  },
  text: {
    fontSize: 12,
    color: Colors.neutral600,
  },
  activeText: {
    color: Colors.white,
  },
});
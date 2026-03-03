import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MarketplaceProduct } from '../pages/marketplace/MarketplaceScreen'; // Adjust path if needed
import { Colors } from '../theme/colors';

interface ProductCardProps {
  item: MarketplaceProduct; // Use the full type for consistency
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onPress }) => {
  const [imageUri, setImageUri] = useState(item.thumbnail);

  const handleImageError = () => {
    // Fallback to a placeholder image (replace with your own URL or local asset)
    setImageUri('https://via.placeholder.com/150?text=No+Image');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="cover"
        onError={handleImageError}
      />
      <View style={styles.details}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>{item.price} {item.currency}</Text>
        {/* Add more fields if needed, e.g., <Text>{item.location}</Text> */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 10,
    marginVertical: 5,
    shadowColor: Colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  details: {
    marginTop: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 14,
    color: Colors.neutral400,
  },
});
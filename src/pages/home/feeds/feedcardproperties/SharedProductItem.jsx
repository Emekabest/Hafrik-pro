import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../../helpers/appdetails';
import useStore from '../../../../repository/store';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width: defaultWidth } = Dimensions.get('window');
// Approximate width based on parent containers
const DEFAULT_SHARED_ITEM_WIDTH = defaultWidth * 0.85; 

const SharedProductItem = ({ post, parentFeedId }) => {
    const openCommentModal = useStore(state => state.openCommentModal);
    const tabletMode = useStore(state => state.tabletMode);
    const feedWidth = useStore(state => state.feedWidth);

    // In tablet mode, size based on feed container; otherwise use screen width
    const SHARED_ITEM_WIDTH = (tabletMode && feedWidth > 0) ? feedWidth * 0.85 : DEFAULT_SHARED_ITEM_WIDTH;
    const products = post.media || [];
    const product = products[0];

    if (!product) return null;

    const images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
    const inStock = (product.quantity && product.quantity > 0) || false;

    const handleContainerPress = useCallback(() => {
        // Open the parent feed's comment modal
        openCommentModal(parentFeedId);
    }, [openCommentModal, parentFeedId]);

    return (
        <View style={styles.container}>
            {images.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={SHARED_ITEM_WIDTH + 10}
                        decelerationRate="fast"
                        data={images}
                        keyExtractor={(item, index) => `${item}-${index}`}
                        renderItem={({ item: img, index }) => (
                            <TouchableOpacity onPress={handleContainerPress} activeOpacity={0.9}>
                                <View style={{ width: SHARED_ITEM_WIDTH, marginRight: 10 }}>
                                    <View style={styles.imageContainer}>
                                        <ExpoImage
                                            source={{ uri: img }}
                                            style={styles.image}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                        />
                                        {images.length > 1 && (
                                            <View style={styles.imageCounter}>
                                                <Text style={styles.imageCounterText}>{index + 1}/{images.length}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            <View style={styles.infoContainer}>
                <Text style={styles.name} numberOfLines={1}>{product.name || product.title || 'Product Name'}</Text>
                <Text style={styles.price}>
                    {post.currency || '$'}{product.price || '0.00'}
                </Text>
                <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons key={i} name="star" size={12} color={Colors.star} />
                    ))}
                    <Text style={styles.reviewText}>0.0 (0 Reviews)</Text>
                </View>
                
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={[styles.button, styles.buyButton, !inStock && styles.disabledButton]}
                        activeOpacity={1}
                        disabled={!inStock}
                    >
                        <Text style={styles.buttonText}>{inStock ? 'Buy' : 'Out of Stock'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.chatButton]}>
                        <Ionicons name="chatbubble-outline" size={20} color={Colors.neutral700} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1, // Square images
        borderRadius: 10,
        backgroundColor: Colors.neutral150,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageCounter: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: withOpacity(Colors.black, 0.6),
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageCounterText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    infoContainer: {
        paddingHorizontal: 2,
    },
    name: {
        fontWeight: 'bold',
        fontSize: 16,
        color: Colors.neutral700,
    },
    price: {
        fontWeight: 'bold',
        fontSize: 16,
        color: AppDetails.primaryColor,
        marginTop: 2,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    reviewText: {
        fontSize: 12,
        color: Colors.neutral430,
        marginLeft: 5,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    button: {
        paddingVertical: 10,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyButton: {
        flex: 1,
        backgroundColor: AppDetails.primaryColor,
        marginRight: 10,
    },
    disabledButton: {
        backgroundColor: Colors.neutral250,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 13,
        color: Colors.white,
    },
    chatButton: {
        width: 50,
        backgroundColor: Colors.neutral150,
    },
});

export default SharedProductItem;

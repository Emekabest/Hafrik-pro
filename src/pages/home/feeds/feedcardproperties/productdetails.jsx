import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../../helpers/appdetails';
import CleanText from '../../../../helpers/cleantext';

const ProductDetails = ({ feed }) => {

    const product = feed.media && feed.media.length > 0 ? feed.media[0] : {};
    const inStock = (product.quantity && product.quantity > 0) || false;

    const buyButtonStyle = [
        styles.button,
        styles.buyButton,
        { backgroundColor: inStock ? (AppDetails.primaryColor || '#000') : '#ccc' }
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.productName} numberOfLines={1}>{CleanText(product.name) || 'Product Name'}</Text>
            <Text style={styles.price}>
                {feed.currency || '$'}{product.price || '0.00'}
            </Text>
            <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons key={i} name="star" size={12} color="#FFD700" />
                ))}
                <Text style={styles.ratingText}>0.0 (0 Reviews)</Text>
            </View>
            
            <View style={styles.actionsContainer}>
                <TouchableOpacity 
                    style={buyButtonStyle}
                    activeOpacity={1}
                    disabled={!inStock}
                >
                    <Text style={styles.buyButtonText}>{inStock ? 'Buy' : 'Out of Stock'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.chatButton]}>
                    <Ionicons name="chatbubble-outline" size={20} color="#333" />
                </TouchableOpacity>
            </View>
            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <Ionicons name="cube-outline" size={16} style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        <Text style={{ color: inStock ? 'green' : 'red', fontWeight: '600' }}>{inStock ? 'In stock' : 'Out of stock'}</Text> • New
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} style={styles.infoIcon} />
                    <Text style={styles.infoText} numberOfLines={1}>{product.location || feed.location || "Location, City"}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="pricetag-outline" size={16} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{product.category_id ? `Category` : (feed.category || "Category")}</Text>
                </View>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 2,
    },
    productName: {
        fontFamily: AppDetails.fontFamily.heading,
        fontSize: 16,
        color: '#000',
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
    ratingText: {
        fontSize: 12,
        color: '#787878ff',
        marginLeft: 5,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 25,
    },
    button: {
        paddingVertical: 10,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyButton: {
        flex: 1,
        marginRight: 10,
    },
    buyButtonText: {
        fontWeight: '600',
        fontSize: 13,
        color: '#ffffffff',
    },
    chatButton: {
        width: 50,
        backgroundColor: '#f0f0f0',
    },
    infoSection: {
        marginTop: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    infoIcon: {
        color: '#666',
        marginRight: 6,
    },
    infoText: {
        fontSize: 13,
        color: '#555',
    },
});

export default ProductDetails;

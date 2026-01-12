import React, { memo } from 'react';
import { View, ScrollView, Image, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../../helpers/appdetails';
import { Image as RemoteImage } from 'expo-image';



const ProductPostContent = memo(({ feed, imageWidth, leftOffset, rightOffset }) => {

    // console.log("Product feed:", feed);

    const navigation = null; // navigation not required here; parent handles navigation in feedcard
    const products = feed.media || [];

    if (products.length === 0) return null;

    if (products.length === 1) {
        const product = products[0];
        const images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
        const inStock = (product.quantity && product.quantity > 0) || false;

        return (
            <View style={{ marginTop: 5 }}>
                <View style={{ 
                    width: Dimensions.get("window").width, 
                    marginLeft: -leftOffset, 
                    marginBottom: 10 
                }}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}
                        snapToInterval={imageWidth + 10}
                        decelerationRate="fast"
                    >
                        {images.length > 0 ? images.map((img, index) => (
                            <View key={index} style={{ width: imageWidth, marginRight: 10 }}>
                                <View style={{ width: '100%', height: imageWidth, borderRadius: 10, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                                    <RemoteImage 
                                        source={{ uri: img }} 
                                        style={{ width: '100%', height: '100%' }} 
                                        contentFit="cover" 
                                        cachePolicy="memory-disk"
                                    />
                                    {images.length > 1 && (
                                        <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{index + 1}/{images.length}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )) : (
                            <View style={{ width: imageWidth, marginRight: 10 }}>
                                <View style={{ width: '100%', height: imageWidth, borderRadius: 10, backgroundColor: '#f0f0f0', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="image-outline" size={40} color="#ccc" />
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>

                <View style={{ paddingHorizontal: 2 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }} numberOfLines={1}>{product.name || product.title || 'Product Name'}</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: AppDetails.primaryColor || '#000', marginTop: 2 }}>
                        {feed.currency || '$'}{product.price || '0.00'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons key={i} name="star" size={12} color="#FFD700" />
                        ))}
                        <Text style={{ fontSize: 12, color: '#787878ff', marginLeft: 5 }}>0.0 (0 Reviews)</Text>
                    </View>
                    {feed.text ? <Text style={{ color: '#787878ff', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{feed.text}</Text> : null}
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
                        <TouchableOpacity style={{ 
                            flex: 1,
                            backgroundColor: inStock ? (AppDetails.primaryColor || '#000') : '#ccc', 
                            paddingVertical: 10, 
                            borderRadius: 50, 
                            alignItems: 'center',
                            marginRight: 10
                        }}
                        activeOpacity={1}
                        disabled={!inStock}
                        >
                            <Text style={{ fontWeight: '600', fontSize: 13, color: '#ffffffff' }}>{inStock ? 'Buy' : 'Out of Stock'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={{ 
                                width: 50,
                                backgroundColor: '#f0f0f0', 
                                paddingVertical: 10, 
                                borderRadius: 50, 
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Ionicons name="chatbubble-outline" size={20} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="cube-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: '#555' }}>
                                <Text style={{ color: inStock ? 'green' : 'red', fontWeight: '600' }}>{inStock ? 'In stock' : 'Out of stock'}</Text> • New
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: '#555' }} numberOfLines={1}>{product.location || feed.location || "Location, City"}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="pricetag-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, color: '#555' }}>{product.category_id ? `Category` : (feed.category || "Category")}</Text>
                        </View>
                    </View>
                </View>

            </View>
        );
    }
    


    return (
        <View style={{ marginTop: 5 }}>
            <View style={{ 
                width: Dimensions.get("window").width, 
                marginLeft: -leftOffset, 
                marginBottom: 10 
            }}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}
                    snapToInterval={imageWidth + 10}
                    decelerationRate="fast"
                >
                    {products.map((product, index) => {
                        const productImage = (product.images && product.images.length > 0) ? product.images[0] : product.image;
                        const inStock = (product.quantity && product.quantity > 0) || false;

                        return (
                        <View key={index} style={{ width: imageWidth, marginRight: 10 }}>
                            <View style={{ width: '100%', height: imageWidth, borderRadius: 10, backgroundColor: '#f0f0f0', overflow: 'hidden', marginBottom: 10 }}>
                                {productImage ? (
                                <Image 
                                    source={{ uri: productImage }} 
                                    style={{ width: '100%', height: '100%' }} 
                                    resizeMode="cover" 
                                />
                                ) : (
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f8f8' }}>
                                        <Ionicons name="image-outline" size={40} color="#ccc" />
                                    </View>
                                )}
                                {products.length > 1 && (
                                    <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{index + 1}/{products.length}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ paddingHorizontal: 2 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }} numberOfLines={1}>{product.name || product.title || 'Product Name'}</Text>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: AppDetails.primaryColor || '#000', marginTop: 2 }}>
                                    {feed.currency || '$'}{product.price || '0.00'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Ionicons key={i} name="star" size={12} color="#FFD700" />
                                    ))}
                                    <Text style={{ fontSize: 12, color: '#787878ff', marginLeft: 5 }}>0.0 (0 Reviews)</Text>
                                </View>
                                {feed.text ? <Text style={{ color: '#787878ff', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{feed.text}</Text> : null}
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25 }}>
                                    <TouchableOpacity style={{ 
                                        flex: 1,
                                        backgroundColor: inStock ? (AppDetails.primaryColor || '#000') : '#ccc', 
                                        paddingVertical: 10, 
                                        borderRadius: 50, 
                                        alignItems: 'center',
                                        marginRight: 10
                                    }}
                                    activeOpacity={1}
                                    disabled={!inStock}
                                    >
                                        <Text style={{ fontWeight: '600', fontSize: 13, color: '#ffffffff' }}>{inStock ? 'Buy' : 'Out of Stock'}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={{ 
                                            width: 50,
                                            backgroundColor: '#f0f0f0', 
                                            paddingVertical: 10, 
                                            borderRadius: 50, 
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={20} color="#333" />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ marginTop: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Ionicons name="cube-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, color: '#555' }}>
                                            <Text style={{ color: inStock ? 'green' : 'red', fontWeight: '600' }}>{inStock ? 'In stock' : 'Out of stock'}</Text> • New
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, color: '#555' }} numberOfLines={1}>{product.location || feed.location || "Location, City"}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="pricetag-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, color: '#555' }}>{product.category_id ? `Category` : (feed.category || "Category")}</Text>
                                    </View>
                                </View>
                                
                            </View>
                        </View>
                    );
                    })}
                </ScrollView>
            </View>
        </View>
    );
});

export default ProductPostContent;

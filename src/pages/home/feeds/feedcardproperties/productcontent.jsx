import React, { memo } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import ProductDetails from "./productdetails";
import useStore from '../../../../repository/store';

const defaultScreenWidth = Dimensions.get("window").width;


const ProductContent = ({ feed, imageWidth, leftOffset, rightOffset, containerWidth }) => {


    

    const tabletMode = useStore(state => state.tabletMode);
    const tabletDimension = useStore(state => state.tabletDimension);

    // Use container width for tablet mode, screen width for mobile...
    const effectiveWidth = containerWidth > 0 ? containerWidth : defaultScreenWidth;

    // const effectiveImageWidth = tabletMode && tabletDimension === "XL" ? imageWidth * 0.6 : imageWidth;

    const effectiveImageWidth = imageWidth > 400 ? 400 : imageWidth; // Cap image width for better performance and layout on larger screens

    const products = feed.media || [];

    if (products.length === 0) return null;


    if (products.length === 1) {
        const product = products[0];
        let images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
        
        // Filter out empty URLs to prevent "source.uri should not be an empty string" warnings
        images = images.filter(img => img && img.length > 0);

        if (images.length === 0) return <ProductDetails feed={feed} />;



        return (
            <View>
                <View style={{
                    height: tabletMode ? 300 : null,    
                    width: effectiveWidth, 
                    marginLeft: -leftOffset, 
                    marginBottom: 10 
                }}>
                    {/* Use ScrollView instead of FlatList - avoids nested virtualization jitter */}
                    <ScrollView
                        horizontal
                        scrollEnabled={images.length > 1}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset,}}
                        removeClippedSubviews={true}
                        scrollEventThrottle={16}
                        
                    >
                        {images.map((img, index) => (
                            <View key={index} style={{  width: effectiveImageWidth, marginRight: 10, maxWidth: 400 }}>
                                <View style={[styles.productImageContainer, { aspectRatio: tabletMode ? undefined : 1 }]}>
                                    <ExpoImage
                                        source={{ uri: img }}
                                        style={styles.productImage}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        recyclingKey={`product-${feed.id}-${index}`}
                                    />
                                    {images.length > 1 && (
                                        <View style={styles.imageCounter}>
                                            <Text style={styles.imageCounterText}>{index + 1}/{images.length}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <ProductDetails feed={feed} />
            </View>
        );
    }
    
    
    return null;
};


const styles = StyleSheet.create({
    productImageContainer: {
        // height:"100%",
        width: '100%',
        borderRadius: 10,
        backgroundColor: '#dadadaff',
        overflow: 'hidden'
    },
    productImage: {
        width: '100%',
        height: '100%'
    },
    imageCounter: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    imageCounterText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    }
});


// Simple memo - check feed id and media
export default memo(ProductContent, (prev, next) => {
    if (prev.feed?.id !== next.feed?.id) return false;
    if (prev.containerWidth !== next.containerWidth) return false;
    
    const prevMediaLen = prev.feed?.media?.length ?? 0;
    const nextMediaLen = next.feed?.media?.length ?? 0;
    if (prevMediaLen !== nextMediaLen) return false;
    
    // Check first product's images
    const prevFirst = prev.feed?.media?.[0] ?? {};
    const nextFirst = next.feed?.media?.[0] ?? {};
    const prevImgCount = prevFirst.images?.length || (prevFirst.image ? 1 : 0);
    const nextImgCount = nextFirst.images?.length || (nextFirst.image ? 1 : 0);
    if (prevImgCount !== nextImgCount) return false;
    
    return true;
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';

const Banner = () => {
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [banners, setBanners] = useState([]);
    const [bannerLoading, setBannerLoading] = useState(true);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

    // Fetch banners from API
    const fetchBanners = async () => {
        try {
            setBannerLoading(true);
            const response = await fetch('https://hafrik.com/api/v1/home/banners.php');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            let bannersData = [];

            try {
                const data = JSON.parse(responseText);
                if (data.status === 'success') {
                    if (Array.isArray(data.data)) {
                        bannersData = data.data;
                    } else if (data.data && Array.isArray(data.data.data)) {
                        bannersData = data.data.data;
                    } else if (data.data && typeof data.data === 'object') {
                        bannersData = Object.values(data.data).filter(item => Array.isArray(item))[0] || [];
                    }
                }
            } catch (parseError) {
                console.error('Banners JSON Parse Error:', parseError);
            }

            setBanners(bannersData);

        } catch (error) {
            console.error('Error fetching banners:', error);
            setBanners([]);
        } finally {
            setBannerLoading(false);
        }
    };

    // Handle banner press
    const handleBannerPress = (banner) => {
        if (banner.button_link && banner.button_link !== '#') {
            navigation.navigate('WebView', {
                url: banner.button_link,
                title: banner.title || 'Banner',
                token: token, // Pass token
                user: user    // Pass user data
            });
        }
    };

    // Initial load
    useEffect(() => {
        fetchBanners();
    }, []);

    // Auto-rotate banners
    useEffect(() => {
        if (banners.length > 1) {
            const interval = setInterval(() => {
                setCurrentBannerIndex(prev =>
                    prev === banners.length - 1 ? 0 : prev + 1
                );
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [banners.length]);

    if (bannerLoading) {
        return (
            <View style={styles.bannerContainer}>
                <View style={styles.bannerLoading}>
                    <ActivityIndicator size="small" color="#0C3F44" />
                    <Text style={styles.bannerLoadingText}>Loading banner...</Text>
                </View>
            </View>
        );
    }

    if (banners.length === 0) {
        return null;
    }

    const currentBanner = banners[currentBannerIndex] || banners[0];
    const imageUrl = currentBanner.image || currentBanner.banner_image || currentBanner.image_url;

    return (
        <View style={styles.bannerContainer}>
            <TouchableOpacity
                style={styles.bannerContent}
                onPress={() => handleBannerPress(currentBanner)}
                activeOpacity={0.9}
            >
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.bannerBackgroundImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.bannerPlaceholderBackground}>
                        <Ionicons name="image-outline" size={40} color="#fff" />
                        <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                )}

                <View style={styles.bannerOverlay} />

                <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>{currentBanner.title || 'No Title'}</Text>
                    <Text style={styles.bannerDescription}>
                        {currentBanner.subtitle || currentBanner.description || 'No description'}
                    </Text>
                    {currentBanner.button_text && (
                        <TouchableOpacity style={styles.bannerButton}>
                            <Text style={styles.bannerButtonText}>{currentBanner.button_text}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {banners.length > 1 && (
                    <View style={styles.bannerIndicators}>
                        {banners.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.bannerIndicator,
                                    index === currentBannerIndex && styles.bannerIndicatorActive
                                ]}
                            />
                        ))}
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    bannerContainer: { margin: 2, borderRadius: 1, overflow: 'hidden', backgroundColor: '#0C3F44', height: 200 },
    bannerContent: { flex: 1, position: 'relative' },
    bannerBackgroundImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    bannerPlaceholderBackground: { width: '100%', height: '100%', backgroundColor: 'rgba(12, 63, 68, 0.8)', justifyContent: 'center', alignItems: 'center', position: 'absolute' },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
    bannerTextContainer: { flex: 1, justifyContent: 'center', padding: 20, zIndex: 1 },
    bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    bannerDescription: { fontSize: 14, color: 'rgba(255, 255, 255, 0.95)', marginBottom: 16, lineHeight: 20, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    bannerButton: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    bannerButtonText: { color: '#0C3F44', fontWeight: '600', fontSize: 14 },
    bannerIndicators: { position: 'absolute', bottom: 15, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    bannerIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.5)', marginHorizontal: 4 },
    bannerIndicatorActive: { backgroundColor: '#fff', width: 24 },
    placeholderText: { color: '#fff', fontSize: 12, marginTop: 8 },
    bannerLoading: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 16 },
    bannerLoadingText: { marginTop: 8, color: '#666', fontSize: 12 },
});

export default Banner;
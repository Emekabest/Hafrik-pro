import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../../../helpers/appdetails';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = Math.round(width * 0.55);

const CommentJobPostContent = ({post}) => {

    const coverPhoto = post.media && post.media[0] && post.media[0].url ? post.media[0].url : 'https://wallpapers.com/images/high/most-beautiful-spring-6ert6ugb103ltfwk.webp';
    const title = post.payload?.title || "Job Title";
    const currency = "$";
    const salaryMinimum = post.payload?.salary_minimum  ? parseFloat(post.payload?.salary_minimum).toFixed(2) : "0.00";
    const salaryMaximum = post.payload?.salary_maximum  ? parseFloat(post.payload?.salary_maximum).toFixed(2) : "0.00";
    const salaryPeriod = post.payload?.pay_salary_per === "per_month" ? " / Month" : post.payload?.pay_salary_per === "per_year" ? " / Year" : " / Hour";
    const location = post.payload?.location || "Location not specified";
    const type = post.payload?.type === "full_time" ? "Full Time" : post.payload?.type === "part_time" ? "Part Time" : "Other";
    const status = post.payload?.available ? "Open" : "Close";
    



    return (
        <View style={styles.container}>
            <View style={styles.imageWrapper}>
                {coverPhoto ? (
                    <ExpoImage
                        source={{ uri: coverPhoto }}
                        style={styles.coverImage}
                        contentFit="cover"
                        transition={200}
                    />
                ) : null}
                <View style={styles.overlayType}>
                    <Text style={styles.overlayTypeText}>{type}</Text>
                </View>
            </View>

            <View style={styles.infoContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={[styles.statusBadge, status !== 'Open' && styles.statusClosed]}>
                        <Text style={[styles.statusText, status !== 'Open' && styles.statusTextClosed]}>{status}</Text>
                    </View>
                </View>

                <View style={styles.salaryRow}>
                    <Text style={styles.salary}>{currency}{salaryMinimum} - {currency}{salaryMaximum}</Text>
                    <Text style={styles.salaryPeriod}>{salaryPeriod}</Text>
                </View>

                <View style={styles.row}>
                    <Ionicons name="location" size={16} color="#888" />
                    <Text style={styles.location}>{location}</Text>
                </View>

                <TouchableOpacity style={styles.applyButton} activeOpacity={0.8}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
        marginTop: 10,
        marginBottom: 10,
    },
    imageWrapper: {
        width: '100%',
        height: IMAGE_HEIGHT,
        position: 'relative',
        backgroundColor: '#f0f0f0',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    overlayType: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    overlayTypeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    infoContainer: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontFamily:AppDetails.fontFamily.heading,
        color: '#111',
        flex: 1,
        marginRight: 10,
        lineHeight: 26,
    },
    statusBadge: {
        backgroundColor: '#2e7d32',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#4c8c4fff',
    },
    statusClosed: {
        backgroundColor: '#fff1f0',
        borderColor: '#ffa39e',
    },
    statusText: {
        fontSize: 12,
        fontFamily: AppDetails.fontFamily.body,
        color: '#fff',
    },
    statusTextClosed: {
        color: '#cf1322',
    },
    salaryRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    salary: {
        fontSize: 17,
        fontFamily: AppDetails.fontFamily.body,
        color: '#2e7d32',
    },
    salaryPeriod: {
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.body,
        color: '#888',
        marginLeft: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    location: {
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.body,
        color: '#555',
        marginLeft: 6,
    },
    applyButton: {
        backgroundColor: AppDetails.primaryColor,
        paddingVertical: 12,
        borderRadius: 30,
        alignItems: 'center',
   
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
});

    export default CommentJobPostContent;   
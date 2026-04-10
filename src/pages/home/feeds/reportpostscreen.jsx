import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../helpers/appdetails';
import { Colors } from '../../../theme/colors';
import { getReportCategoriesController, ReportPostController } from '../../../controllers/optionscontroller';
import { useAuth } from '../../../AuthContext';
import BrandLoader from '../../../components/BrandLoader';


const ReportPostScreen = () => {
    const {token} = useAuth()
    const route = useRoute();
    const navigation = useNavigation();
    const {postId, reportedUserFullname } = route.params ?? {};
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const canSubmit = !!selectedReportId;

    const [reportCategories, setReportCategories] = useState([]);



    useEffect(()=>{
        const getReportCategories = async () => {

            const response = await getReportCategoriesController(token)

            setReportCategories(response.data.categories);
            
        };
        getReportCategories();
    },[])

    const handleSubmit = async() => {
        if (!canSubmit || isLoading) return;

        setIsLoading(true);

        try {
            const response = await ReportPostController({ 
                        id:postId,
                        "handle": "post",
                        category: selectedReportId, 
                        reason: description 
                    }, 
                    token
                );

              
        } catch (error) {
            // Handle error if needed
        } finally {
            setIsLoading(false);
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <BrandLoader />
                </View>
            ) : (
                <>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={24} color={Colors.neutral700} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Report Post</Text>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexGrow}>
                        <ScrollView contentContainerStyle={styles.content}>
                            <Text style={styles.sectionTitle}>Why are you reporting this post?</Text>
                            <Text style={styles.sectionSubtitle}>
                                {reportedUserFullname ? `Report a post by ${reportedUserFullname}.` : 'Choose the most relevant reason.'}
                            </Text>

                            {reportCategories.map((option) => {
                                const selected = option.id === selectedReportId;
                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={[styles.optionRow, selected && styles.optionRowSelected]}
                                        onPress={() => setSelectedReportId(option.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.optionRowLeft}>
                                            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.name}</Text>
                                        </View>
                                        {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                                    </TouchableOpacity>
                                );
                            })}

                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Description</Text>
                            <Text style={styles.sectionSubtitle}>Tell us more so our team can review this report.</Text>
                            <TextInput
                                style={styles.textArea}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Add any details that may help..."
                                placeholderTextColor={Colors.neutral430}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, (!canSubmit || isLoading) && styles.submitButtonDisabled]}
                                activeOpacity={0.8}
                                onPress={handleSubmit}
                                disabled={!canSubmit || isLoading}
                            >
                                <Text style={styles.submitButtonText}>Submit Report</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    flexGrow: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.white,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        // paddingTop: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral150,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        fontFamily: AppDetails.fontFamily.redex.semiBold,
        color: Colors.neutral900,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.semiBold,
        marginBottom: 6,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: Colors.neutral700,
        fontFamily: AppDetails.fontFamily.redex.regular,
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.neutral150,
        marginBottom: 12,
        backgroundColor: Colors.white,
    },
    optionRowSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.neutral100,
    },
    optionRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionIcon: {
        marginRight: 12,
    },
    optionLabel: {
        fontSize: 15,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.medium,
        flexShrink: 1,
    },
    optionLabelSelected: {
        color: Colors.primary,
    },
    textArea: {
        minHeight: 120,
        borderWidth: 1,
        borderColor: Colors.neutral150,
        borderRadius: 14,
        padding: 14,
        backgroundColor: Colors.neutral100,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.regular,
        fontSize: 14,
    },
    submitButton: {
        marginTop: 24,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontFamily: AppDetails.fontFamily.redex.semiBold,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ReportPostScreen;

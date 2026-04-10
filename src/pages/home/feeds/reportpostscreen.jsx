import React, { useState } from 'react';
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../../helpers/appdetails';
import { Colors } from '../../../theme/colors';

const ReportOptions = [
    { id: 1, label: 'Nudity', icon: 'alert' },
    { id: 2, label: 'Violence', icon: 'warning' },
    { id: 3, label: 'Harassment', icon: 'person' },
    { id: 4, label: 'Suicide or Self-Injury', icon: 'sad-outline' },
    { id: 5, label: 'False Information', icon: 'document-text-outline' },
    { id: 6, label: 'Spam', icon: 'mail' },
    { id: 7, label: 'Unauthorized Sales', icon: 'pricetag-outline' },
    { id: 8, label: 'Hate Speech', icon: 'warning' },
    { id: 9, label: 'Terrorism', icon: 'alert-circle-outline' },
    { id: 10, label: 'Something Else', icon: 'ellipsis-horizontal' },
];

const ReportPostScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { reportedUserFullname } = route.params ?? {};
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [description, setDescription] = useState('');
    const canSubmit = !!selectedReportId;

    const handleSubmit = () => {
        if (!canSubmit) return;
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
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

                    {ReportOptions.map((option) => {
                        const selected = option.id === selectedReportId;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[styles.optionRow, selected && styles.optionRowSelected]}
                                onPress={() => setSelectedReportId(option.id)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionRowLeft}>
                                    <Ionicons name={option.icon} size={20} color={selected ? Colors.primary : Colors.neutral700} style={styles.optionIcon} />
                                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
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
                        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                        activeOpacity={0.8}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                    >
                        <Text style={styles.submitButtonText}>Submit Report</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
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
});

export default ReportPostScreen;

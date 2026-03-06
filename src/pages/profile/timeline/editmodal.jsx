import React, { useState, useEffect } from "react";
import { View, Modal, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Dimensions, StatusBar, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../../helpers/appdetails";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../AuthContext";
import { updateProfileController as UpdateProfileController } from "../../../controllers/profilecontroller";
import { Colors } from '../../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;

const withOpacity = (hex, opacity) => {
    const normalized = (hex || "").replace("#", "");
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
    return `#${normalized}${alpha}`;
};

// ── Reusable Input Field ─────────────────────────────────────────────────────
const FormField = ({ label, icon, value, onChangeText, placeholder, multiline, numberOfLines, keyboardType, prefix }) => (
    <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.fieldInputWrapper, multiline && styles.fieldInputWrapperMultiline]}>
            {icon && (
                <View style={styles.fieldIconBox}>
                    <Ionicons name={icon} size={15} color={ACCENT} />
                </View>
            )}
            {prefix && <Text style={styles.fieldPrefix}>{prefix}</Text>}
            <TextInput
                style={[styles.fieldInput, multiline && styles.fieldMultiline, !icon && !prefix && { paddingLeft: 12 }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.mutedBlueGrayPlaceholder}
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlignVertical={multiline ? "top" : "center"}
                keyboardType={keyboardType || "default"}
            />
        </View>
    </View>
);

const EditModal = ({ visible, onClose, userDetails }) => {
    const {token} = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [country, setCountry] = useState("");
    const [currentCity, setCurrentCity] = useState("");
    const [hometown, setHometown] = useState("");
    const [gender, setGender] = useState(0);
    const [aboutMe, setAboutMe] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userDetails) {
            setFirstName(userDetails.first_name || "");
            setLastName(userDetails.last_name || "");
            setUsername(userDetails.username || "");
            setPhone(userDetails.phone || userDetails.mobile || "");
            setCountry(userDetails.country || "");
            setCurrentCity(userDetails.current_city || userDetails.city || "");
            setHometown(userDetails.hometown || "");
            setGender(userDetails.gender || 0);
            setAboutMe(userDetails.about_me || "");
        }
    }, [userDetails, visible]);

    const handleSaveUpdate = async () => {
        setIsSaving(true);
        try {
            const updateProfileFormData = new FormData();
            updateProfileFormData.append('first_name', firstName);
            updateProfileFormData.append('last_name', lastName);
            updateProfileFormData.append('username', username);
            updateProfileFormData.append('bio', aboutMe);
            updateProfileFormData.append('phone', phone);
            updateProfileFormData.append('gender', String(gender));
            updateProfileFormData.append('country', country);
            updateProfileFormData.append('current_city', currentCity);
            updateProfileFormData.append('hometown', hometown);

            const response = await UpdateProfileController(token, updateProfileFormData);

            if (response.status === 200) {
                onClose();
            } else {
                Alert.alert("Update Failed", "Something went wrong. Please try again later.");
            }
        } catch (err) {
            console.error('Failed to update profile', err?.data || err);
            Alert.alert("Update Failed", "An error occurred. Please try again later.");
        } finally {
            setIsSaving(false);
        }
    };

    const genderOptions = [
        { value: 1, label: 'Male', icon: 'male' },
        { value: 2, label: 'Female', icon: 'female' },
        { value: 3, label: 'Other', icon: 'transgender' },
    ];
    
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <StatusBar barStyle="dark-content"/>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBackBtn} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={22} color={Colors.textBodyIndigo} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <TouchableOpacity
                        style={[styles.headerSaveBtn, isSaving && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        onPress={handleSaveUpdate}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Text style={styles.headerSaveText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView 
                    style={{ flex: 1 }} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView 
                        style={styles.scrollContent}
                        contentContainerStyle={styles.scrollInner}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ── Warning banner ── */}
                        {userDetails?.verified ? (
                            <View style={styles.warningBanner}>
                                <Ionicons name="shield-checkmark" size={16} color={Colors.warm} />
                                <Text style={styles.warningBannerText}>
                                    Changing your name will remove your verification badge.
                                </Text>
                            </View>
                        ) : null}

                        {/* ── Section: Personal Info ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person-outline" size={15} color={ACCENT} />
                                <Text style={styles.sectionTitle}>Personal Info</Text>
                            </View>

                            {/* Name row (side by side) */}
                            <View style={styles.fieldRow}>
                                <View style={styles.fieldHalf}>
                                    <FormField 
                                        label="First Name" 
                                        value={firstName} 
                                        onChangeText={setFirstName} 
                                        placeholder="First name" 
                                    />
                                </View>
                                <View style={styles.fieldHalf}>
                                    <FormField 
                                        label="Last Name" 
                                        value={lastName} 
                                        onChangeText={setLastName} 
                                        placeholder="Last name" 
                                    />
                                </View>
                            </View>

                            <FormField 
                                label="Username" 
                                icon="at" 
                                value={username} 
                                onChangeText={setUsername} 
                                placeholder="username" 
                            />

                            {/* Gender selector */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Gender</Text>
                                <View style={styles.genderRow}>
                                    {genderOptions.map((opt) => {
                                        const isSelected = gender === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[styles.genderPill, isSelected && styles.genderPillActive]}
                                                onPress={() => setGender(opt.value)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons 
                                                    name={opt.icon} 
                                                    size={16} 
                                                    color={isSelected ? Colors.white : Colors.mutedBlueGray} 
                                                />
                                                <Text style={[styles.genderPillText, isSelected && styles.genderPillTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        {/* ── Section: Contact ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="call-outline" size={15} color={ACCENT} />
                                <Text style={styles.sectionTitle}>Contact</Text>
                            </View>
                            <FormField 
                                label="Phone" 
                                icon="call-outline" 
                                value={phone} 
                                onChangeText={setPhone} 
                                placeholder="Phone number" 
                                keyboardType="phone-pad" 
                            />
                        </View>

                        {/* ── Section: Location ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="location-outline" size={15} color={ACCENT} />
                                <Text style={styles.sectionTitle}>Location</Text>
                            </View>
                            <FormField 
                                label="Country" 
                                icon="globe-outline" 
                                value={country} 
                                onChangeText={setCountry} 
                                placeholder="Country" 
                            />
                            <View style={styles.fieldRow}>
                                <View style={styles.fieldHalf}>
                                    <FormField 
                                        label="Current City" 
                                        value={currentCity} 
                                        onChangeText={setCurrentCity} 
                                        placeholder="City" 
                                    />
                                </View>
                                <View style={styles.fieldHalf}>
                                    <FormField 
                                        label="Hometown" 
                                        value={hometown} 
                                        onChangeText={setHometown} 
                                        placeholder="Hometown" 
                                    />
                                </View>
                            </View>
                        </View>

                        {/* ── Section: About ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="document-text-outline" size={15} color={ACCENT} />
                                <Text style={styles.sectionTitle}>About Me</Text>
                            </View>
                            <FormField 
                                label="Bio"  
                                value={aboutMe} 
                                onChangeText={setAboutMe} 
                                placeholder="Tell people about yourself..." 
                                multiline 
                                numberOfLines={4} 
                            />
                        </View>

                        {/* Bottom spacer */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};


const styles = StyleSheet.create({
    statusBarBackground: {
        backgroundColor: Colors.surfaceBase,
        height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.surfaceBase,
    },

    // ── Header ────────────────────────────────────────────────────
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    headerBackBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.surfaceCool,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textBodyIndigo,
        fontFamily: AppDetails.fontFamily?.inter?.bold,
        letterSpacing: -0.2,
    },
    headerSaveBtn: {
        backgroundColor: ACCENT,
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 18,
        minWidth: 60,
        alignItems: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    headerSaveText: {
        fontSize: 13,
        color: Colors.white,
        fontWeight: '700',
        fontFamily: AppDetails.fontFamily?.outfit?.semiBold,
    },

    // ── Scroll ────────────────────────────────────────────────────
    scrollContent: {
        flex: 1,
    },
    scrollInner: {
        padding: 12,
    },

    // ── Warning banner ────────────────────────────────────────────
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: withOpacity(Colors.warm, 0.12),
        borderWidth: 1,
        borderColor: withOpacity(Colors.warm, 0.25),
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        gap: 8,
    },
    warningBannerText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        color: Colors.textBodyMuted,
        fontFamily: AppDetails.fontFamily?.body,
    },

    // ── Section Cards ─────────────────────────────────────────────
    sectionCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textBodyIndigo,
        fontFamily: AppDetails.fontFamily?.inter?.bold,
        letterSpacing: -0.1,
    },

    // ── Field ─────────────────────────────────────────────────────
    fieldContainer: {
        marginBottom: 10,
    },
    fieldLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: Colors.mutedBlueGray,
        marginBottom: 4,
        fontFamily: AppDetails.fontFamily?.body,
        letterSpacing: 0.15,
    },
    fieldInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceCool,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
        overflow: 'hidden',
    },
    fieldInputWrapperMultiline: {
        alignItems: 'flex-start',
    },
    fieldIconBox: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
    },
    fieldPrefix: {
        paddingLeft: 10,
        fontSize: 13,
        color: Colors.mutedBlueGray,
        fontWeight: '600',
    },
    fieldInput: {
        flex: 1,
        fontSize: 13.5,
        color: Colors.textBodyIndigo,
        paddingVertical: 9,
        paddingRight: 10,
        fontFamily: AppDetails.fontFamily?.body,
    },
    fieldMultiline: {
        minHeight: 76,
        paddingTop: 10,
        paddingLeft: 12,
    },

    // ── Field rows ────────────────────────────────────────────────
    fieldRow: {
        flexDirection: 'row',
        gap: 8,
    },
    fieldHalf: {
        flex: 1,
    },

    // ── Gender pills ──────────────────────────────────────────────
    genderRow: {
        flexDirection: 'row',
        gap: 8,
    },
    genderPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: Colors.surfaceCool,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
        gap: 5,
    },
    genderPillActive: {
        backgroundColor: ACCENT,
        borderColor: ACCENT,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    genderPillText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: Colors.mutedBlueGray,
        fontFamily: AppDetails.fontFamily?.body,
    },
    genderPillTextActive: {
        color: Colors.white,
    },
});

export default EditModal;
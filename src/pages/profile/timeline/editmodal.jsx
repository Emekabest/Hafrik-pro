import React, { useState, useEffect } from "react";
import { View, Modal, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Dimensions, StatusBar, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppDetails from "../../../helpers/appdetails";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../AuthContext";
import { updateProfileController as UpdateProfileController } from "../../../controllers/profilecontroller";
import { Colors } from '../../../theme/colors';

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
    /* Commented out per request: temporarily disable location field
    const [location, setLocation] = useState("");
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    */
    

    // Date state (temporarily disabled)
    /* Commented out per request: temporarily disable birthdate fields
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");
    */



    useEffect(() => {
        if (userDetails) {
            setFirstName(userDetails.first_name || "");
            setLastName(userDetails.last_name || "");
            setUsername(userDetails.username || "");
            setPhone(userDetails.phone || userDetails.mobile || "");
            setCountry(userDetails.country || "");
            setCurrentCity(userDetails.current_city || userDetails.city || "");
            setHometown(userDetails.hometown || "");
            setGender(userDetails.gender || 0); // 1 = Male, 2 = Female
            setAboutMe(userDetails.about_me || "");
            /* Commented out: temporarily disable location initialization
            setLocation(userDetails.location || userDetails.country || "");
            */
            
            /* Birthdate initialization temporarily disabled
            if (userDetails.birth_date) {
                // Assuming YYYY-MM-DD format
                const parts = userDetails.birth_date.split("-");
                if (parts.length === 3) {
                    setYear(parts[0]);
                    setMonth(parts[1]);
                    setDay(parts[2]);
                }
            }
            */
        }
    }, [userDetails, visible]);

    
    const warningText = "Your account is already verified if you changed your name you will lose the verification badge";
    const locations = ['China', 'United Arab Emirates', 'Turkey', 'Malaysia', 'United Kingdom', 'Poland', 'Germany'];


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
            // location intentionally omitted (commented out)

            // Birthdate omitted temporarily
            /*
            if (year && month && day) {
                updateProfileFormData.append('birth_date', `${year}-${month}-${day}`);
            }
            */

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
    }
    
    
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >



            <View style={styles.statusBarBackground}>
                <StatusBar barStyle="light-content"/>
            </View>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={1}>
                        <Ionicons name="arrow-back" size={24} color={Colors.black} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                        activeOpacity={1}
                        onPress={handleSaveUpdate}
                        disabled={isSaving}
                    >
                        
                        {!isSaving && <Text style={styles.saveButtonText}>Save Changes</Text>}
                        {isSaving && <ActivityIndicator size="small" color={Colors.white} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                </View>


                <ScrollView style={styles.scrollContent}>
                    

                    {/**Info Section */}
                    <View >
                        <TouchableOpacity style={styles.moreSettingsButton} activeOpacity={1}>
                            <Ionicons name="arrow-back" size={20} color={Colors.black} />
                            <Text style={styles.moreSettingTitle}>More Settings</Text>
                        </TouchableOpacity>

                        <View style={styles.sectionTitleContainer}>
                            <Text style={styles.sectionTitle}>Basic Settings</Text>
                        </View>

                        <View style={styles.warningContainer}>
                            <Text style={styles.warningHeader}>Attention</Text>
                            <Text style={styles.warningText}>{warningText}</Text>
                        </View>

                    </View>


                    {/**Form Section */}
                    <View style={styles.formContainer}>
                           <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Enter first name"
                            placeholderTextColor={Colors.neutral350}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Enter last name"
                            placeholderTextColor={Colors.neutral350}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter username"
                            placeholderTextColor={Colors.neutral350}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter phone number"
                            placeholderTextColor={Colors.neutral350}
                            keyboardType="phone-pad"
                        />
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Country</Text>
                        <TextInput
                            style={styles.input}
                            value={country}
                            onChangeText={setCountry}
                            placeholder="Country"
                            placeholderTextColor={Colors.neutral350}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current City</Text>
                        <TextInput
                            style={styles.input}
                            value={currentCity}
                            onChangeText={setCurrentCity}
                            placeholder="Current city"
                            placeholderTextColor={Colors.neutral350}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Hometown</Text>
                        <TextInput
                            style={styles.input}
                            value={hometown}
                            onChangeText={setHometown}
                            placeholder="Hometown"
                            placeholderTextColor={Colors.neutral350}
                        />
                    </View>

                    

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.genderContainer}>
                            <TouchableOpacity 
                                style={[styles.genderOption, gender === 1 && styles.genderOptionSelected]}
                                onPress={() => setGender(1)}
                            >
                                <Ionicons name="male" size={18} color={gender === 1 ? Colors.white : Colors.neutral500} />
                                <Text style={[styles.genderText, gender === 1 && styles.genderTextSelected]}>Male</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.genderOption, gender === 2 && styles.genderOptionSelected]}
                                onPress={() => setGender(2)}
                            >
                                <Ionicons name="female" size={18} color={gender === 2 ? Colors.white : Colors.neutral500} />
                                <Text style={[styles.genderText, gender === 2 && styles.genderTextSelected]}>Female</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.genderOption, gender === 3 && styles.genderOptionSelected]}
                                onPress={() => setGender(3)}
                            >
                                <Ionicons name="transgender" size={18} color={gender === 3 ? Colors.white : Colors.neutral500} />
                                <Text style={[styles.genderText, gender === 3 && styles.genderTextSelected]}>Other</Text>
                            </TouchableOpacity>
                        </View>
                    </View>



                    {/* Location selector temporarily commented out per request */}



                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>About Me</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={aboutMe}
                            onChangeText={setAboutMe}
                            placeholder="Write something about yourself..."
                            placeholderTextColor={Colors.neutral350}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>


                    {/* Birthdate fields temporarily commented out per request */}
                    </View>

                </ScrollView>

            </SafeAreaView>
        </Modal>
    );
};




const styles = StyleSheet.create({

    statusBarBackground: {
        backgroundColor: AppDetails.primaryColor,
        height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral180,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    saveButton: {
        backgroundColor: AppDetails.primaryColor,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 50,
    },
    saveButtonText: {
        fontSize: 16,
        color: Colors.white,
       fontFamily:AppDetails.fontFamily.outfit.semiBold,
    },
    scrollContent: {
        padding: 15 ,
    },
    
    moreSettingsButton: {
        backgroundColor:Colors.neutral180, padding:10, borderRadius:50, flexDirection:"row", alignItems:"center", gap:5, justifyContent:"center",
    },
 
 
    moreSettingTitle: {
        fontSize: 15,
        color: Colors.black,
        fontFamily: AppDetails.fontFamily.outfit.medium,
    },


    sectionTitleContainer:{
        marginVertical:15,

    },

    sectionTitle: {
        fontSize: 17,
        fontFamily: AppDetails.fontFamily.outfit.semiBold,
        marginBottom: 5,
        color: Colors.black,
    },

    warningContainer: { minHeight:100, width:"100%", backgroundColor:AppDetails.warningColor, borderRadius:15, marginBottom:15, paddingVertical:10, paddingHorizontal:20 },

    warningHeader:{ fontSize:15, color:Colors.white, fontFamily:AppDetails.fontFamily.inter.bold},

    warningText:{ fontSize:13, color:Colors.white, fontFamily:AppDetails.fontFamily.body, marginTop:5, letterSpacing:0.5, lineHeight:23},

    formContainer: {
        paddingVertical: 10,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.inter.bold,
        color: Colors.neutral700,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: AppDetails.borderLineColor,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.black,
        backgroundColor: Colors.neutral100,
    },
    textArea: {
        minHeight: 100,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: AppDetails.borderLineColor,
        borderRadius: 8,
        padding: 12,
        backgroundColor: Colors.neutral100,
    },
    locationText: {
        fontSize: 16,
        color: Colors.black,
    },
    placeholderText: {
        fontSize: 16,
        color: Colors.neutral350,
    },
    locationPickerContainer: {
        marginTop: 10,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.neutral180,
        borderRadius: 8,
        padding: 5,
    },
    locationOption: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral130,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationOptionText: {
        fontSize: 15,
        color: Colors.neutral700,
    },
    activeLocationOptionText: {
        color: AppDetails.primaryColor,
        fontWeight: '600',
    },
    genderContainer: {
        flexDirection: "row",
        gap: 15,
    },
    genderOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.neutral220,
        backgroundColor: Colors.neutral110,
    },
    genderOptionSelected: {
        backgroundColor: AppDetails.primaryColor,
        borderColor: AppDetails.primaryColor,
    },
    genderText: {
        marginLeft: 8,
        fontSize: 15,
        color: Colors.neutral500,
    },
    genderTextSelected: {
        color: Colors.white,
        fontWeight: "600",
    },
    dateContainer: {
        flexDirection: "row",
        gap: 10,
    },
    dateField: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        color: Colors.neutral500,
        marginBottom: 4,
    },
    dateInput: {
        borderWidth: 1,
        borderColor: Colors.neutral250,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlign: "center",
        color: Colors.black,
        backgroundColor: Colors.neutral100,
    },
    helperText: {
        fontSize: 12,
        color: Colors.neutral350,
        marginTop: 5,
        fontStyle: "italic",
    }
});

export default EditModal;
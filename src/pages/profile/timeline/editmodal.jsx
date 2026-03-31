import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../AuthContext";
import {
    GetEditableProfileController,
    GetProfileFieldController,
    updateProfileController as UpdateProfileController,
} from "../../../controllers/profilecontroller";
import { Colors } from '../../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;

const DEFAULT_GENDERS = [
    { id: 1, label: 'Male' },
    { id: 2, label: 'Female' },
    { id: 3, label: 'Other' },
];

const DEFAULT_RELATIONSHIPS = [
    { id: 'single', label: 'Single' },
    { id: 'relationship', label: 'In a relationship' },
    { id: 'married', label: 'Married' },
    { id: 'complicated', label: "It's complicated" },
];

const TABS = [
    { key: 'personal',  label: 'Personal',  icon: 'person-outline' },
    { key: 'about',     label: 'About',     icon: 'document-text-outline' },
    { key: 'location',  label: 'Location',  icon: 'location-outline' },
    { key: 'work',      label: 'Work',      icon: 'briefcase-outline' },
    { key: 'education', label: 'Education', icon: 'school-outline' },
    { key: 'social',    label: 'Social',    icon: 'share-social-outline' },
];

const EMPTY_FORM = {
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    gender: '',
    birthdate: '',
    biography: '',
    website: '',
    country: '',
    current_city: '',
    hometown: '',
    work_title: '',
    work_place: '',
    work_url: '',
    edu_school: '',
    edu_major: '',
    edu_class: '',
    relationship: '',
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    linkedin: '',
    twitch: '',
};

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const toText = (value) => {
    if (value === undefined || value === null) return '';
    return String(value);
};

const buildFormFromUser = (userDetails = {}) => ({
    first_name: toText(firstDefined(userDetails.first_name, userDetails.user_firstname)).trim(),
    last_name: toText(firstDefined(userDetails.last_name, userDetails.user_lastname)).trim(),
    username: toText(firstDefined(userDetails.username, userDetails.user_name)).trim(),
    email: toText(firstDefined(userDetails.email, userDetails.user_email)).trim(),
    phone: toText(firstDefined(userDetails.phone, userDetails.user_phone, userDetails.mobile)).trim(),
    gender: toText(firstDefined(userDetails.gender, userDetails.user_gender)).trim(),
    birthdate: toText(firstDefined(userDetails.birthdate, userDetails.user_birthdate, userDetails.birth_date)).trim(),
    biography: toText(firstDefined(userDetails.biography, userDetails.user_biography, userDetails.bio, userDetails.about, userDetails.about_me)).trim(),
    website: toText(firstDefined(userDetails.website, userDetails.user_website)).trim(),
    country: toText(firstDefined(userDetails.user_country, userDetails.country_id, userDetails.country)).trim(),
    current_city: toText(firstDefined(userDetails.current_city, userDetails.user_current_city, userDetails.city)).trim(),
    hometown: toText(firstDefined(userDetails.hometown, userDetails.user_hometown)).trim(),
    work_title: toText(firstDefined(userDetails.work_title, userDetails.user_work_title)).trim(),
    work_place: toText(firstDefined(userDetails.work_place, userDetails.user_work_place)).trim(),
    work_url: toText(firstDefined(userDetails.work_url, userDetails.user_work_url)).trim(),
    edu_school: toText(firstDefined(userDetails.edu_school, userDetails.user_edu_school)).trim(),
    edu_major: toText(firstDefined(userDetails.edu_major, userDetails.user_edu_major)).trim(),
    edu_class: toText(firstDefined(userDetails.edu_class, userDetails.user_edu_class)).trim(),
    relationship: toText(firstDefined(userDetails.relationship, userDetails.user_relationship)).trim(),
    facebook: toText(firstDefined(userDetails.facebook, userDetails.user_social_facebook)).trim(),
    instagram: toText(firstDefined(userDetails.instagram, userDetails.user_social_instagram)).trim(),
    twitter: toText(firstDefined(userDetails.twitter, userDetails.user_social_twitter)).trim(),
    youtube: toText(firstDefined(userDetails.youtube, userDetails.user_social_youtube)).trim(),
    linkedin: toText(firstDefined(userDetails.linkedin, userDetails.user_social_linkedin)).trim(),
    twitch: toText(firstDefined(userDetails.twitch, userDetails.user_social_twitch)).trim(),
});

const buildUpdatePayload = (form, initialForm) => {
    const payload = {};

    const setIfChanged = (formKey, apiKey, options = {}) => {
        const { numeric = false, aliases = [] } = options;
        const currentValue = toText(form[formKey]).trim();
        const initialValue = toText(initialForm[formKey]).trim();

        if (currentValue === initialValue) return;

        let nextValue = currentValue;
        if (numeric) nextValue = currentValue === '' ? '' : Number(currentValue);

        payload[apiKey] = nextValue;
        aliases.forEach((alias) => {
            payload[alias] = nextValue;
        });
    };

    setIfChanged('first_name', 'first_name');
    setIfChanged('last_name', 'last_name');
    setIfChanged('username', 'username');
    setIfChanged('email', 'email');
    setIfChanged('phone', 'phone');
    setIfChanged('gender', 'gender', { numeric: true });
    setIfChanged('birthdate', 'birthdate');
    setIfChanged('biography', 'biography', { aliases: ['bio'] });
    setIfChanged('website', 'website');
    setIfChanged('country', 'country', { numeric: true });
    setIfChanged('current_city', 'current_city');
    setIfChanged('hometown', 'hometown');
    setIfChanged('work_title', 'work_title');
    setIfChanged('work_place', 'work_place');
    setIfChanged('work_url', 'work_url');
    setIfChanged('edu_school', 'edu_school');
    setIfChanged('edu_major', 'edu_major');
    setIfChanged('edu_class', 'edu_class');
    setIfChanged('relationship', 'relationship');
    setIfChanged('facebook', 'facebook');
    setIfChanged('instagram', 'instagram');
    setIfChanged('twitter', 'twitter');
    setIfChanged('youtube', 'youtube');
    setIfChanged('linkedin', 'linkedin');
    setIfChanged('twitch', 'twitch');

    return payload;
};

const findSelectedOption = (options, value) => {
    const target = toText(value).trim();
    return options.find((option) => toText(option?.id).trim() === target) || null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FormField = ({ label, icon, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', autoCapitalize = 'sentences' }) => (
    <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={[styles.inputShell, multiline && styles.inputShellMultiline]}>
            {icon ? <Ionicons name={icon} size={16} color={ACCENT} style={styles.leadingIcon} /> : null}
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.mutedBlueGrayPlaceholder}
                style={[styles.input, multiline && styles.inputMultiline]}
                multiline={multiline}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    </View>
);

const SelectField = ({ label, icon, value, placeholder, onPress }) => (
    <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TouchableOpacity style={styles.inputShell} activeOpacity={0.8} onPress={onPress}>
            {icon ? <Ionicons name={icon} size={16} color={ACCENT} style={styles.leadingIcon} /> : null}
            <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
                {value || placeholder}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.mutedBlueGray} />
        </TouchableOpacity>
    </View>
);

const OptionPickerModal = ({ visible, title, options, selectedValue, onSelect, onClose, searchable = false }) => {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!visible) setQuery('');
    }, [visible]);

    const filteredOptions = useMemo(() => {
        if (!searchable || !query.trim()) return options;
        const search = query.trim().toLowerCase();
        return options.filter((option) => {
            const label = toText(option?.label ?? option?.name).toLowerCase();
            const code = toText(option?.code).toLowerCase();
            return label.includes(search) || code.includes(search);
        });
    }, [options, query, searchable]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.pickerBackdrop}>
                <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="close" size={22} color={BRAND} />
                        </TouchableOpacity>
                    </View>

                    {searchable ? (
                        <View style={styles.searchShell}>
                            <Ionicons name="search" size={16} color={Colors.mutedBlueGray} style={styles.leadingIcon} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search..."
                                placeholderTextColor={Colors.mutedBlueGrayPlaceholder}
                                style={styles.input}
                            />
                        </View>
                    ) : null}

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerOptions}>
                        {filteredOptions.map((option) => {
                            const isSelected = toText(option?.id).trim() === toText(selectedValue).trim();
                            return (
                                <TouchableOpacity
                                    key={`${title}-${option?.id}`}
                                    style={[styles.optionRow, isSelected && styles.optionRowActive]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        onSelect(option);
                                        onClose();
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                                            {option?.label ?? option?.name}
                                        </Text>
                                        {!!option?.code || !!option?.phone_code ? (
                                            <Text style={styles.optionMeta}>
                                                {[option?.code, option?.phone_code].filter(Boolean).join(' • ')}
                                            </Text>
                                        ) : null}
                                    </View>
                                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color={ACCENT} /> : null}
                                </TouchableOpacity>
                            );
                        })}

                        {!filteredOptions.length ? (
                            <View style={styles.emptyOptions}>
                                <Ionicons name="file-tray-outline" size={26} color={Colors.mutedBlueGray} />
                                <Text style={styles.emptyOptionsText}>No options found.</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TabBar = ({ activeTab, onSelect }) => {
    const scrollRef = useRef(null);

    const handlePress = useCallback((key, index) => {
        onSelect(key);
        // Scroll tab strip to keep selected tab visible
        scrollRef.current?.scrollTo({ x: index * 80, animated: true });
    }, [onSelect]);

    return (
        <View style={styles.tabBarWrapper}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabBarContent}
                keyboardShouldPersistTaps="handled"
            >
                {TABS.map((tab, index) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tabItem, isActive && styles.tabItemActive]}
                            activeOpacity={0.75}
                            onPress={() => handlePress(tab.key, index)}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={15}
                                color={isActive ? ACCENT : Colors.mutedBlueGray}
                            />
                            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

// ─── Tab content panels ───────────────────────────────────────────────────────

const PersonalTab = ({ form, setField, genderOption, metadata, setPickerState }) => (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
            <View style={styles.halfField}>
                <FormField label="First Name" value={form.first_name} onChangeText={(v) => setField('first_name', v)} placeholder="First name" />
            </View>
            <View style={styles.halfField}>
                <FormField label="Last Name" value={form.last_name} onChangeText={(v) => setField('last_name', v)} placeholder="Last name" />
            </View>
        </View>
        <FormField label="Username" icon="at" value={form.username} onChangeText={(v) => setField('username', v)} placeholder="Username" autoCapitalize="none" />
        <FormField label="Email" icon="mail-outline" value={form.email} onChangeText={(v) => setField('email', v)} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
        <FormField label="Phone" icon="call-outline" value={form.phone} onChangeText={(v) => setField('phone', v)} placeholder="Phone number" keyboardType="phone-pad" />
        <SelectField label="Gender" icon="person-circle-outline" value={genderOption?.label} placeholder="Select gender" onPress={() => setPickerState({ key: 'gender', title: 'Select Gender', searchable: false })} />
        <FormField label="Birthdate" icon="calendar-outline" value={form.birthdate} onChangeText={(v) => setField('birthdate', v)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" />
        <View style={{ height: 32 }} />
    </ScrollView>
);

const AboutTab = ({ form, setField }) => (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="Biography" value={form.biography} onChangeText={(v) => setField('biography', v)} placeholder="Tell people about yourself" multiline />
        <FormField label="Website" icon="globe-outline" value={form.website} onChangeText={(v) => setField('website', v)} placeholder="https://yourwebsite.com" keyboardType="url" autoCapitalize="none" />
        <View style={{ height: 32 }} />
    </ScrollView>
);

const LocationTab = ({ form, setField, countryOption, relationshipOption, setPickerState }) => (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SelectField label="City" icon="flag-outline" value={countryOption?.name || countryOption?.label} placeholder="Select country" onPress={() => setPickerState({ key: 'country', title: 'Select Country', searchable: true })} />
        <FormField label="Current Country" value={form.current_city} onChangeText={(v) => setField('current_city', v)} placeholder="Current city" />
        <FormField label="Hometown" value={form.hometown} onChangeText={(v) => setField('hometown', v)} placeholder="Hometown" />
        <SelectField label="Relationship" icon="heart-outline" value={relationshipOption?.label} placeholder="Select relationship" onPress={() => setPickerState({ key: 'relationship', title: 'Relationship Status', searchable: false })} />
        <View style={{ height: 32 }} />
    </ScrollView>
);

const WorkTab = ({ form, setField }) => (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="Job Title" value={form.work_title} onChangeText={(v) => setField('work_title', v)} placeholder="Job title" />
        <FormField label="Work Place" value={form.work_place} onChangeText={(v) => setField('work_place', v)} placeholder="Company or workplace" />
        <FormField label="Work URL" icon="link-outline" value={form.work_url} onChangeText={(v) => setField('work_url', v)} placeholder="https://company.com" keyboardType="url" autoCapitalize="none" />
        <View style={{ height: 32 }} />
    </ScrollView>
);

const EducationTab = ({ form, setField }) => (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="School" value={form.edu_school} onChangeText={(v) => setField('edu_school', v)} placeholder="School or university" />
        <FormField label="Major" value={form.edu_major} onChangeText={(v) => setField('edu_major', v)} placeholder="Field of study" />
        <FormField label="Class / Year" value={form.edu_class} onChangeText={(v) => setField('edu_class', v)} placeholder="Class or graduation year" />
        <View style={{ height: 32 }} />
    </ScrollView>
);

const SocialTab = ({ form, setField }) => (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="Facebook" icon="logo-facebook" value={form.facebook} onChangeText={(v) => setField('facebook', v)} placeholder="Facebook profile URL" keyboardType="url" autoCapitalize="none" />
        <FormField label="Instagram" icon="logo-instagram" value={form.instagram} onChangeText={(v) => setField('instagram', v)} placeholder="Instagram profile URL" keyboardType="url" autoCapitalize="none" />
        <FormField label="Twitter / X" icon="logo-twitter" value={form.twitter} onChangeText={(v) => setField('twitter', v)} placeholder="Twitter profile URL" keyboardType="url" autoCapitalize="none" />
        <FormField label="YouTube" icon="logo-youtube" value={form.youtube} onChangeText={(v) => setField('youtube', v)} placeholder="YouTube channel URL" keyboardType="url" autoCapitalize="none" />
        <FormField label="LinkedIn" icon="logo-linkedin" value={form.linkedin} onChangeText={(v) => setField('linkedin', v)} placeholder="LinkedIn profile URL" keyboardType="url" autoCapitalize="none" />
        <FormField label="Twitch" icon="logo-twitch" value={form.twitch} onChangeText={(v) => setField('twitch', v)} placeholder="Twitch channel URL" keyboardType="url" autoCapitalize="none" />
        <View style={{ height: 32 }} />
    </ScrollView>
);

// ─── Main modal ───────────────────────────────────────────────────────────────

const EditModal = ({ visible, onClose, userDetails, onProfileUpdated }) => {
    const { token, updateUser, user } = useAuth();
    const [activeTab, setActiveTab] = useState('personal');
    const [form, setFormState] = useState(EMPTY_FORM);
    const [initialForm, setInitialForm] = useState(EMPTY_FORM);
    const [metadata, setMetadata] = useState({ countries: [], genders: DEFAULT_GENDERS, relationships: DEFAULT_RELATIONSHIPS });
    const [pickerState, setPickerState] = useState({ key: null, title: '', searchable: false });
    const [syncing, setSyncing] = useState(false); // background API refresh indicator
    const [saving, setSaving] = useState(false);

    const setField = useCallback((key, value) => {
        setFormState((prev) => ({ ...prev, [key]: value }));
    }, []);

    const bootstrapData = useCallback(async () => {
        if (!token) return;

        // Show form immediately from props — no blocking spinner
        const seedForm = buildFormFromUser(userDetails || user || {});
        setFormState(seedForm);
        setInitialForm(seedForm);

        // Silently fetch fresher data from API in background
        setSyncing(true);
        try {
            const [profileResponse, metadataResponse] = await Promise.all([
                GetEditableProfileController(token),
                GetProfileFieldController(token),
            ]);

            if (profileResponse?.status === 200 && profileResponse.data) {
                const remoteForm = buildFormFromUser(profileResponse.data);
                setFormState(remoteForm);
                setInitialForm(remoteForm);
            }



            if (metadataResponse?.status === 200 && metadataResponse.data) {
                setMetadata({
                    countries: metadataResponse.data.countries || [],
                    genders: metadataResponse.data.genders?.length ? metadataResponse.data.genders : DEFAULT_GENDERS,
                    relationships: metadataResponse.data.relationships?.length ? metadataResponse.data.relationships : DEFAULT_RELATIONSHIPS,
                });
            }
            
        } catch (_) {
            // Silent — user already has seed data from props, no alert needed
        } finally {
            setSyncing(false);
        }
    }, [token, userDetails, user]);

    useEffect(() => {
        if (!visible) return;
        setActiveTab('personal');
        bootstrapData();
    }, [visible, bootstrapData]);

    const countryOption = useMemo(() => findSelectedOption(metadata.countries, form.country), [metadata.countries, form.country]);
    const genderOption = useMemo(() => findSelectedOption(metadata.genders, form.gender), [metadata.genders, form.gender]);
    const relationshipOption = useMemo(() => findSelectedOption(metadata.relationships, form.relationship), [metadata.relationships, form.relationship]);

    const pickerOptions = pickerState.key === 'country'
        ? metadata.countries
        : pickerState.key === 'gender'
            ? metadata.genders
            : metadata.relationships;

    const handlePickerSelect = useCallback((option) => {
        if (!pickerState.key) return;
        setField(pickerState.key, toText(option?.id));
    }, [pickerState.key, setField]);

    const handleSaveUpdate = useCallback(async () => {
        const payload = buildUpdatePayload(form, initialForm);

        if (!Object.keys(payload).length) {
            Alert.alert('Info', 'No changes to save.');
            return;
        }

        setSaving(true);
        try {
            const response = await UpdateProfileController(token, payload);

            if (response.status !== 200) {
                throw new Error(response.message || 'Failed to update profile');
            }

            const selectedCountry = findSelectedOption(metadata.countries, form.country);
            const selectedRelationship = findSelectedOption(metadata.relationships, form.relationship);

            // Build patch from only the changed form fields — never overwrite existing
            // user data with empty strings from an incomplete API response
            const patchForDisplay = Object.keys(payload).reduce((acc, key) => {
                if (key in form) acc[key] = form[key];
                return acc;
            }, {});
            patchForDisplay.country_name  = selectedCountry?.name  || selectedCountry?.label  || '';
            patchForDisplay.relationship_label = selectedRelationship?.label || '';

            await updateUser({ ...(user || {}), ...patchForDisplay });
            onProfileUpdated?.(patchForDisplay);
            setInitialForm({ ...form }); // mark current form state as the new baseline
            Alert.alert('Success', response.message || 'Profile updated successfully.');
            onClose();
        } catch (error) {
            Alert.alert('Update Failed', error?.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [form, initialForm, metadata.countries, metadata.relationships, onClose, onProfileUpdated, token, updateUser, user]);

    const tabProps = { form, setField, genderOption, countryOption, relationshipOption, metadata, setPickerState };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <StatusBar barStyle="dark-content" />

                {/* Header */}
                <LinearGradient
                    colors={Colors.gradientPrimary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.header}
                >
                    <TouchableOpacity onPress={onClose} style={styles.headerIconBtn} activeOpacity={0.8}>
                        <Ionicons name="close" size={22} color={Colors.white} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        {syncing ? (
                            <ActivityIndicator size="small" color={Colors.white + 'CC'} style={{ marginLeft: 6 }} />
                        ) : null}
                    </View>
                    <TouchableOpacity
                        onPress={handleSaveUpdate}
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        activeOpacity={0.85}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator size="small" color={BRAND} /> : <Text style={styles.saveButtonText}>Save</Text>}
                    </TouchableOpacity>
                </LinearGradient>

                {/* Tab bar */}
                <TabBar activeTab={activeTab} onSelect={setActiveTab} />

                {/* Tab content */}
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {activeTab === 'personal'  && <PersonalTab  {...tabProps} />}
                    {activeTab === 'about'     && <AboutTab     {...tabProps} />}
                    {activeTab === 'location'  && <LocationTab  {...tabProps} />}
                    {activeTab === 'work'      && <WorkTab      {...tabProps} />}
                    {activeTab === 'education' && <EducationTab {...tabProps} />}
                    {activeTab === 'social'    && <SocialTab    {...tabProps} />}
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Picker modal rendered INSIDE the parent modal so it stacks correctly on iOS */}
            <OptionPickerModal
                visible={!!pickerState.key}
                title={pickerState.title}
                options={pickerOptions}
                selectedValue={pickerState.key ? form[pickerState.key] : ''}
                searchable={pickerState.searchable}
                onSelect={handlePickerSelect}
                onClose={() => setPickerState({ key: null, title: '', searchable: false })}
            />
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surfaceBase,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white + '22',
        borderWidth: 1,
        borderColor: Colors.white + '33',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
    },
    saveButton: {
        minWidth: 74,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: 16,
    },
    saveButtonDisabled: {
        opacity: 0.65,
    },
    saveButtonText: {
        color: BRAND,
        fontSize: 14,
        fontWeight: '800',
    },
    // Tab bar
    tabBarWrapper: {
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    tabBarContent: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 6,
        gap: 4,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabItemActive: {
        backgroundColor: ACCENT + '15',
        borderColor: ACCENT + '40',
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.mutedBlueGray,
    },
    tabLabelActive: {
        color: ACCENT,
    },
    // Tab content
    tabScroll: {
        flex: 1,
    },
    tabContent: {
        padding: 16,
        paddingBottom: 40,
    },
    // Form fields
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    fieldContainer: {
        marginBottom: 14,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.secondaryText,
        marginBottom: 6,
    },
    inputShell: {
        minHeight: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        backgroundColor: Colors.surfaceCool,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    inputShellMultiline: {
        alignItems: 'flex-start',
        paddingTop: 10,
    },
    leadingIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: Colors.textBodyIndigo,
        paddingVertical: 12,
    },
    inputMultiline: {
        minHeight: 92,
    },
    selectText: {
        flex: 1,
        fontSize: 14,
        color: Colors.textBodyIndigo,
    },
    selectPlaceholder: {
        color: Colors.mutedBlueGrayPlaceholder,
    },
    // Option picker modal
    pickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.32)',
        justifyContent: 'center',
        padding: 20,
    },
    pickerSheet: {
        maxHeight: '78%',
        borderRadius: 22,
        backgroundColor: Colors.white,
        padding: 16,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pickerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: BRAND,
    },
    searchShell: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        backgroundColor: Colors.surfaceCool,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    pickerOptions: {
        paddingBottom: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    optionRowActive: {
        borderColor: ACCENT,
        backgroundColor: Colors.surfaceBase,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textBodyIndigo,
    },
    optionLabelActive: {
        color: ACCENT,
    },
    optionMeta: {
        marginTop: 2,
        fontSize: 12,
        color: Colors.secondaryText,
    },
    emptyOptions: {
        alignItems: 'center',
        paddingVertical: 28,
        gap: 8,
    },
    emptyOptionsText: {
        color: Colors.secondaryText,
        fontSize: 13,
        fontWeight: '600',
    },
});

export default EditModal;

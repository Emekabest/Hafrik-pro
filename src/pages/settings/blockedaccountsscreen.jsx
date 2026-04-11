import React, { useEffect, useState } from "react";
import { Alert, Text, View, FlatList, TouchableOpacity, Image, StyleSheet, Platform, StatusBar, ActivityIndicator, TouchableWithoutFeedback } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {GetBlockedAccountController, UnBlockUserController} from "../../controllers/getblockedaccountcontroller";
import { BlockUserController } from '../../controllers/optionscontroller';
import { useAuth } from "../../AuthContext";
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';


const BlockedAccountScreen = () => {
    const navigation = useNavigation();
    const { token } = useAuth();
    const [blockedAccounts, setBlockedAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        const getBlockedContactList = async () => {
            setIsLoading(true);
            try {
                const response = await GetBlockedAccountController(token);
                if (response.status === 200) {
                    setBlockedAccounts(response.data.blocked || []);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to fetch blocked accounts. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        getBlockedContactList();
    }, [token]);


    const handleRowPress = (item) => {
        setSelectedUser(item);
        setShowUnblockConfirm(true);
    };

    const handleConfirmUnblock = async () => {
        if (!selectedUser) return;
        try {
            const response = await UnBlockUserController({ user_id: selectedUser.user_id }, token);
            if (response?.status === 200) {
                setBlockedAccounts(prev => prev.filter(u => u.user_id !== selectedUser.user_id));
                Alert.alert('Unblocked', `${selectedUser.user_fullname} has been unblocked.`, [{ text: 'OK' }]);
            } else {
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to unblock user. Please try again.');
        } finally {
            setShowUnblockConfirm(false);
            setSelectedUser(null);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => handleRowPress(item)}>
            <Image source={{ uri: item.user_picture }} style={styles.avatar} />
            <View style={styles.rowText}>
                <Text style={styles.name}>{item.user_fullname}</Text>
                <Text style={styles.username}>@{item.user_name}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={22} color={Colors.neutral700} />
                </TouchableOpacity>
                <Text style={styles.title}>Blocked Accounts</Text>
            </View>

            <View style={styles.content}>
                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : blockedAccounts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No blocked accounts</Text>
                    </View>
                ) : (
                    <FlatList
                        data={blockedAccounts}
                        keyExtractor={(item) => String(item.user_id)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 32 }}
                    />
                )}
            </View>
            {/* Unblock confirmation overlay */}
            {showUnblockConfirm && (
                <TouchableWithoutFeedback onPress={() => setShowUnblockConfirm(false)}>
                    <View style={styles.confirmOverlay}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={styles.confirmContainer}>
                                <Text style={styles.confirmTitle}>Unblock {selectedUser?.user_fullname}?</Text>
                                <Text style={styles.confirmMessage}>They will be able to see and interact with your content again.</Text>
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowUnblockConfirm(false)}>
                                        <Text style={styles.confirmCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.confirmBlock} onPress={handleConfirmUnblock}>
                                        <Text style={styles.confirmBlockText}>Unblock</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            )}

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral150,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 18,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.semiBold,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    emptyContainer: {
        marginTop: 32,
        alignItems: 'center',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    confirmContainer: {
        width: '100%',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 20,
    },
    confirmTitle: {
        fontSize: 18,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.semiBold,
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 14,
        color: Colors.neutral700,
        fontFamily: AppDetails.fontFamily.redex.regular,
        marginBottom: 20,
    },
    confirmButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
    },
    confirmCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 12,
    },
    confirmCancelText: {
        color: Colors.neutral700,
        fontSize: 16,
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
    confirmBlock: {
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    confirmBlockText: {
        color: Colors.white,
        fontSize: 16,
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
    emptyText: {
        color: Colors.neutral700,
        fontSize: 14,
        fontFamily: AppDetails.fontFamily.redex.regular,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.neutral150,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: Colors.neutral100,
    },
    rowText: {
        flexDirection: 'column',
    },
    name: {
        fontSize: 15,
        color: Colors.neutral900,
        fontFamily: AppDetails.fontFamily.redex.medium,
    },
    username: {
        fontSize: 13,
        color: Colors.neutral700,
        fontFamily: AppDetails.fontFamily.redex.regular,
    },
});

export default BlockedAccountScreen;
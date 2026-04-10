import React, { useEffect, useState } from "react";
import { Alert, Text, View, FlatList, TouchableOpacity, Image, StyleSheet, Platform, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import GetBlockedAccountController from "../../controllers/getblockedaccountcontroller";
import { useAuth } from "../../AuthContext";
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';


const BlockedAccountScreen = () => {
    const navigation = useNavigation();
    const { token } = useAuth();
    const [blockedAccounts, setBlockedAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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

    console.log('Blocked Accounts:', blockedAccounts);

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.row} activeOpacity={0.8}>
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
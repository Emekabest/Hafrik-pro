import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import CommentMainPostContent from './commentpost/commentmainpostcontent';
import { useAuth } from "../../../../AuthContext";
import AppDetails from "../../../../helpers/appdetails";
import getUserPostInteractionController from '../../../../controllers/getuserpostinteractioncontroller';
import CommentBonds from './commentsbonds';
import AddComment from './addcomment';


const OriginalPostMemo = React.memo(CommentMainPostContent);

const CommentScreen = ({ route }) => {
    const navigation = useNavigation();
    const { user, token } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const { feedId } = route.params;

    const [isLeaving, setIsLeaving] = useState(false);

    // Guard against multiple rapid back-navigation taps
    const isNavigatingBackRef = useRef(false);

    // Forwarded to AddComment — lets the post's comment button focus the input
    const addCommentRef = useRef(null);

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const response = await getUserPostInteractionController(feedId, token);
                if (response.status === 200) {
                    setPost(response.data);
                }
            } catch (e) {
                // silent fail
            }
            setLoading(false);
        };
        getData();
    }, [feedId, token]);


    // Pause video cleanly before leaving the screen
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            e.preventDefault();
            setIsLeaving(true);
            setTimeout(() => {
                navigation.dispatch(e.data.action);
            }, 100);
        });
        return unsubscribe;
    }, [navigation]);


    const handleNavigateBack = useCallback(() => {
        if (isNavigatingBackRef.current) return;
        isNavigatingBackRef.current = true;
        navigation.goBack();
    }, [navigation]);


    const headerElement = useMemo(() => (
        <OriginalPostMemo
            post={post}
            isLeaving={isLeaving}
            textInputRef={addCommentRef}
        />
    ), [post, isLeaving]);


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity activeOpacity={1} onPress={handleNavigateBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hafrik</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={AppDetails.primaryColor} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent}>
                    {headerElement}
                    <CommentBonds postId={feedId} token={token} />
                </ScrollView>
            )}

            <AddComment ref={addCommentRef} user={user} feedId={feedId} token={token} />
        </View>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 50,
        borderBottomWidth: 0.5,
        borderBottomColor: '#efefef',
        backgroundColor: '#fff',
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#000' },
    listContent: { paddingBottom: 120 },
});

export default CommentScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { GetCommentsController } from '../../../../controllers/commentscontroller';
import CalculateElapsedTime from '../../../../helpers/calculateelapsedtime';
import SvgIcon from '../../../../assl.js/svg/svg';
import { Ionicons } from '@expo/vector-icons';


const CommentBonds = ({ postId, token }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const response = await GetCommentsController(postId, token);
                if (!mounted) return;
                if (response && response.status === 200) setComments(Array.isArray(response.data) ? response.data : []);
                else setComments([]);
            } catch (e) {
                if (!mounted) return;
                console.log('Error loading comments', e);
                setComments([]);
            }
            if (mounted) setLoading(false);
        };
        load();
        return () => { mounted = false; };
    }, [postId, token]);

    if (loading) {
        return (
            <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#888" />
            </View>
        );
    }



    if (!comments || comments.length === 0) {
        return (
            <View style={{ paddingHorizontal: 15, paddingTop: 10,  justifyContent: 'center', alignItems: 'center', height:"100%" }}>
                <Text style={{ color: '#777' , fontFamily:"WorkSans_400Regular" }}>Be the first to comment!</Text>
            </View>
        );
    }

    return (
        <View>
            {comments.map((c, i) => (
                <View key={c.id || i} style={styles.commentContainer}>
                    <View style={styles.avatarColumn}>
                        <Image source={{ uri: c.user?.avatar }} style={styles.avatar} />
                    </View>

                    <View style={styles.contentColumn}>
                        <View style={styles.headerRow}>
                            <Text style={styles.username}>{c.user?.full_name || c.user?.username}</Text>
                            <View style={styles.spacer} />
                            <Text style={styles.timeText}>{CalculateElapsedTime(c.created)}</Text>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionItemRow}>
                                <Ionicons name={'heart-outline'} size={17} color={'#333'} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItemRow}>
                                <SvgIcon name="comment" width={16} height={16} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
};



const styles = StyleSheet.create({
    commentContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: 12, alignItems: 'flex-start' },
    avatarColumn: { alignItems: 'center', marginRight: 12, width: 40 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
    contentColumn: { flex: 1, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    username: { fontWeight: '600', marginRight: 3, color: '#000' },
    spacer: { flex: 1 },
    timeText: { color: '#999', fontSize: 13 },
    commentText: { fontSize: 15, color: '#000', lineHeight: 20, marginBottom: 8 },
    loadingRow: { padding: 12, alignItems: 'center', justifyContent: 'center' },
        actionsRow: {
            flexDirection: 'row',
            marginTop: 8,
            alignItems: 'center'
        },

        actionItemRow: {
            marginRight: 14,
            alignItems: 'center',
            justifyContent: 'center'
        }
});

export default CommentBonds;

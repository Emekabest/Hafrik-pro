import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../AuthContext";
import { UserMediaController } from "../../controllers/profilecontroller";
import ProfileTabList from "./profiletablist/profiletablist";
import AppDetails from "../../helpers/appdetails";
import { Colors } from '../../theme/colors';

const ACCENT = Colors.primary;

const FILTERS = [
    { key: 'all',    label: 'All',    icon: 'grid-outline' },
    { key: 'photos', label: 'Photos', icon: 'image-outline' },
    { key: 'reels',  label: 'Reels',  icon: 'film-outline' },
];

// ── Inline filter chips row (rendered inside the list) ────────────────────────
const MediaFilterChips = ({ active, onSelect, counts }) => (
    <View style={chipStyles.wrapper}>
        <View style={chipStyles.row}>
            {FILTERS.map((f) => {
                const isActive = active === f.key;
                const count = counts[f.key] ?? null;
                return (
                    <TouchableOpacity
                        key={f.key}
                        style={[chipStyles.chip, isActive && chipStyles.chipActive]}
                        onPress={() => onSelect(f.key)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={f.icon}
                            size={14}
                            color={isActive ? Colors.white : Colors.mutedBlueGray}
                        />
                        <Text style={[chipStyles.chipText, isActive && chipStyles.chipTextActive]}>
                            {f.label}
                        </Text>
                        {count !== null && count > 0 && (
                            <View style={[chipStyles.badge, isActive && chipStyles.badgeActive]}>
                                <Text style={[chipStyles.badgeText, isActive && chipStyles.badgeTextActive]}>
                                    {count > 99 ? '99+' : count}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const chipStyles = StyleSheet.create({
    wrapper: {
        backgroundColor: Colors.white,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 6,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: Colors.surfaceCool,
        borderWidth: 1,
        borderColor: Colors.borderSoft,
        gap: 5,
    },
    chipActive: {
        backgroundColor: ACCENT,
        borderColor: ACCENT,
    },
    chipText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: Colors.mutedBlueGray,
        fontFamily: AppDetails.fontFamily?.body,
    },
    chipTextActive: {
        color: Colors.white,
    },
    badge: {
        backgroundColor: Colors.borderSoft,
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.mutedBlueGray,
    },
    badgeTextActive: {
        color: Colors.white,
    },
});


const Photos = ({ header, tabs, activeTab, onTabChange, userId }) => {
    const { token } = useAuth();

    const [mediaList, setMediaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Fetch all media (photos + reels) from user_media endpoint
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await UserMediaController(token, userId, 1, 50);
                if (cancelled) return;
                const items = Array.isArray(res.data) ? res.data : [];
                setMediaList(items);
                setHasMore(res.has_more || false);
            } catch (e) {
                console.error('Media fetch error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [userId, token]);

    // Normalise an API item into the shape ProfileTabListCard understands
    // API types: "reel" (media[].type="reel", video_url, thumbnail)
    //            "photos" (media[].type="photo", url)
    const normaliseItem = useCallback((item) => {
        const apiType = item.type || '';
        const mediaArr = item.media || [];
        const firstMedia = mediaArr[0] || {};

        if (apiType === 'reel') {
            // Reel → render as video card with play icon
            return {
                ...item,
                type: 'video',
                media: [{
                    type: 'video',
                    thumbnail: firstMedia.thumbnail || firstMedia.video_url,
                    url: firstMedia.video_url || firstMedia.url,
                }],
            };
        }

        // Photos / album — may have multiple media items
        const normMedia = mediaArr.map(m => ({
            type: 'photo',
            url: m.url || m.thumbnail,
        }));

        return {
            ...item,
            type: normMedia.length > 1 ? 'album' : 'photo',
            media: normMedia.length ? normMedia : [{ type: 'photo', url: null }],
        };
    }, []);

    // Build filtered list
    const filteredList = useMemo(() => {
        const all = mediaList.map(normaliseItem);

        switch (filter) {
            case 'photos':
                return all.filter(m => m.type === 'photo' || m.type === 'album');
            case 'reels':
                return all.filter(m => m.type === 'video');
            default: // 'all'
                return all;
        }
    }, [mediaList, filter, normaliseItem]);

    // Counts for filter badges
    const counts = useMemo(() => {
        const all = mediaList.map(normaliseItem);
        return {
            all: all.length,
            photos: all.filter(m => m.type === 'photo' || m.type === 'album').length,
            reels: all.filter(m => m.type === 'video').length,
        };
    }, [mediaList, normaliseItem]);

    const combinedData = useMemo(() => {
        const data = [
            { type: 'profileHeader', header },
            { type: 'tabs', tabs, activeTab, onTabChange },
            { 
                type: 'mediaFilter', 
                filter, 
                onSelect: setFilter, 
                counts,
                renderChips: () => <MediaFilterChips active={filter} onSelect={setFilter} counts={counts} />,
            },
        ];

        if (loading) {
            data.push({ type: 'loader' });
        } else if (filteredList.length === 0) {
            data.push({ type: 'empty', filter });
        } else {
            filteredList.forEach(item => data.push({ type: 'list', data: item }));
        }

        return data;
    }, [filteredList, loading, filter, counts, header, tabs, activeTab, onTabChange]);

    return <ProfileTabList combinedData={combinedData} />;
};

export { MediaFilterChips };
export default Photos;
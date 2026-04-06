import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import { UserReelsController } from '../../controllers/profilecontroller';
import ProfileTabList from './profiletablist/profiletablist';

const ProfileReels = ({ header, tabs, activeTab, onTabChange, userId }) => {
    const { token } = useAuth();
    const [reelsList, setReelsList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await UserReelsController(token, userId, 1, 50);
                if (cancelled) return;
                const items = Array.isArray(res.data) ? res.data : [];
                setReelsList(items);
            } catch (e) {
                console.error('ProfileReels fetch error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [userId, token]);

    const normaliseReel = useCallback((item) => {
        const media = item.media || {};
        const mediaArr = Array.isArray(media) ? media : [media];
        const first = mediaArr[0] || {};
        return {
            ...item,
            type: 'video',
            media: [{
                type: 'video',
                thumbnail: first.thumbnail || first.video_thumbnail || first.url || null,
                url: first.video_url || first.url || null,
            }],
        };
    }, []);

    const normalised = useMemo(() => reelsList.map(normaliseReel), [reelsList, normaliseReel]);

    const combinedData = useMemo(() => {
        const data = [
            { type: 'profileHeader', header },
            { type: 'tabs', tabs, activeTab, onTabChange },
        ];
        if (loading) {
            data.push({ type: 'loader' });
        } else if (normalised.length === 0) {
            data.push({ type: 'empty', filter: 'reels' });
        } else {
            normalised.forEach(item => data.push({ type: 'list', data: item }));
        }
        return data;
    }, [normalised, loading, header, tabs, activeTab, onTabChange]);

    return <ProfileTabList combinedData={combinedData} />;
};

export default ProfileReels;

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import { UserMediaController } from '../../controllers/profilecontroller';
import ProfileTabList from './profiletablist/profiletablist';

const Videos = ({ header, tabs, activeTab, onTabChange, userId }) => {
    const { token } = useAuth();
    const [mediaList, setMediaList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await UserMediaController(token, userId, 1, 50);
                if (cancelled) return;
                const items = Array.isArray(res.data) ? res.data : [];
                setMediaList(items.filter(i => i.type === 'reel' || i.type === 'video'));
            } catch (e) {
                console.error('Videos fetch error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [userId, token]);

    const normaliseItem = useCallback((item) => {
        const firstMedia = (item.media || [])[0] || {};
        return {
            ...item,
            type: 'video',
            media: [{
                type: 'video',
                thumbnail: firstMedia.thumbnail || firstMedia.video_url,
                url: firstMedia.video_url || firstMedia.url,
            }],
        };
    }, []);

    const videoList = useMemo(() => mediaList.map(normaliseItem), [mediaList, normaliseItem]);

    const combinedData = useMemo(() => {
        const data = [
            { type: 'profileHeader', header },
            { type: 'tabs', tabs, activeTab, onTabChange },
        ];
        if (loading) {
            data.push({ type: 'loader' });
        } else if (videoList.length === 0) {
            data.push({ type: 'empty', filter: 'videos' });
        } else {
            videoList.forEach(item => data.push({ type: 'list', data: item }));
        }
        return data;
    }, [videoList, loading, header, tabs, activeTab, onTabChange]);

    return <ProfileTabList combinedData={combinedData} />;
};

export default Videos;

import apiClient from './apiClient';

const normalizeProfilePayload = (payload, fallbackUsername = '') => {
  const raw = payload?.data ?? payload ?? {};
  const user = raw?.user ?? raw?.profile ?? raw;
  if (!user || typeof user !== 'object') {
    console.log('[ProfileQR] normalizeProfilePayload: no usable user object', payload);
    return null;
  }

  const normalized = {
    ...user,
    id: user.id ?? user.user_id ?? null,
    user_id: user.user_id ?? user.id ?? null,
    username: String(user.username ?? user.user_name ?? user.handle ?? user.subtitle ?? fallbackUsername ?? '').replace(/^@/, ''),
    full_name: user.full_name ?? user.name ?? user.title ?? [user.first_name, user.last_name].filter(Boolean).join(' '),
    avatar: user.avatar ?? user.user_picture ?? user.picture ?? user.thumbnail ?? user.image ?? null,
    is_following: !!(raw?.viewer?.is_following ?? user.is_following ?? user.following),
    is_owner: !!(raw?.viewer?.is_owner ?? user.is_owner),
  };

  console.log('[ProfileQR] normalizeProfilePayload result:', {
    id: normalized.id,
    user_id: normalized.user_id,
    username: normalized.username,
    full_name: normalized.full_name,
    hasAvatar: !!normalized.avatar,
    is_owner: normalized.is_owner,
  });

  return normalized;
};

const normalizeUsername = (value) =>
  String(value || '').trim().replace(/^@/, '').toLowerCase();

const profileMatchesUsername = (profile, username) =>
  normalizeUsername(profile?.username || profile?.user_name) === normalizeUsername(username);

export const extractHafrikUsername = (value) => {
  const text = String(value || '').trim();
  console.log('[ProfileQR] scanned raw text:', text);
  let parsed;

  try {
    parsed = new URL(text);
  } catch {
    console.log('[ProfileQR] invalid URL format');
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (parsed.protocol !== 'https:' || host !== 'hafrik.com') {
    console.log('[ProfileQR] rejected non-Hafrik URL:', { protocol: parsed.protocol, host });
    return null;
  }

  const [username] = parsed.pathname.split('/').filter(Boolean);
  if (!username || username.includes('.') || username.includes('@')) {
    console.log('[ProfileQR] rejected invalid username segment:', username);
    return null;
  }

  const extracted = decodeURIComponent(username);
  console.log('[ProfileQR] extracted username:', extracted);
  return extracted;
};

export const getProfileByUsername = async (username) => {
  console.log('[ProfileQR] getProfileByUsername start:', username);
  try {
    const res = await apiClient.get('/users/profile.php', { params: { username } });
    console.log('[ProfileQR] /users/profile.php response:', {
      status: res.status,
      keys: Object.keys(res.data || {}),
      dataKeys: Object.keys(res.data?.data || {}),
      rawUser: res.data?.data?.user ?? res.data?.user ?? null,
    });
    const profile = normalizeProfilePayload(res.data, username);
    if ((profile?.id || profile?.user_id) && profileMatchesUsername(profile, username)) {
      console.log('[ProfileQR] matched profile endpoint result:', {
        id: profile.id,
        username: profile.username,
      });
      return profile;
    }
    console.log('[ProfileQR] profile endpoint did not match scanned username:', {
      scanned: username,
      returned: profile?.username,
      returnedId: profile?.id,
    });
  } catch {
    console.log('[ProfileQR] /users/profile.php lookup failed, falling back to search');
  }

  const search = await apiClient.get('/search/index.php', { params: { q: username } });
  const results = search.data?.results ?? search.data?.data?.results ?? [];
  console.log('[ProfileQR] /search/index.php response:', {
    status: search.status,
    resultCount: Array.isArray(results) ? results.length : null,
    firstResult: Array.isArray(results) ? results[0] : null,
  });
  const match = Array.isArray(results)
    ? results.find(item => {
        const handle = item.username ?? item.user_name ?? item.subtitle ?? '';
        return normalizeUsername(handle) === normalizeUsername(username);
      })
    : null;

  console.log('[ProfileQR] exact search match:', match);

  return normalizeProfilePayload(match, username);
};

export const followUserById = async (userId) => {
  const res = await apiClient.post('/users/follow.php', { user_id: Number(userId) });
  return res.data;
};

export const startConversationWithUser = async (userId) => {
  const res = await apiClient.post('/messages/start.php', { user_id: Number(userId) });
  return res.data;
};

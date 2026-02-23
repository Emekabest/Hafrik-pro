// src/pages/events/eventsApi.js

const BASE = 'https://hafrik.com/api/v1/events';

async function apiFetch(url, signal, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { ...(signal ? { signal } : {}), headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.message || 'API error');
  return json.data;
}

function buildListUrl({ page = 1, limit = 15, filter = 'upcoming', category = 0 }) {
  let url = `${BASE}/list.php?page=${page}&limit=${limit}`;
  if (filter === 'upcoming') url += '&upcoming=1';
  else if (filter === 'past')    url += '&past=1';
  else if (filter === 'popular') url += '&sort=popular';
  else if (filter === 'latest')  url += '&sort=latest';
  if (category > 0) url += `&category=${category}`;
  return url;
}

/**
 * Fetch paginated events list.
 * filter: 'upcoming' | 'popular' | 'latest' | 'past'
 */
export async function fetchEvents(
  { page = 1, limit = 15, filter = 'upcoming', category = 0 } = {},
  signal,
) {
  const data = await apiFetch(buildListUrl({ page, limit, filter, category }), signal);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch event categories.
 * categories.php returns { categories: [...], _debug: {...} }
 */
export async function fetchEventCategories() {
  const data = await apiFetch(`${BASE}/categories.php`);
  return Array.isArray(data) ? data : (data?.categories ?? []);
}

/**
 * Fetch event community feed (posts).
 * Returns { page, limit, total, count, data: [...posts] }
 */
export async function fetchEventFeed(eventId, { page = 1, limit = 10 } = {}, token) {
  const url = `${BASE}/event_feed.php?event_id=${eventId}&page=${page}&limit=${limit}`;
  return apiFetch(url, undefined, token);
}

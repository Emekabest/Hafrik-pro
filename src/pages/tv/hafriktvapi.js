const BASE = 'https://hafrik.com/api/v1/hafriktv/index.php';

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

/** Extract a short title from the text blob (first sentence / first line, max 80 chars) */
function extractTitle(text = '') {
  if (!text) return '';
  // Take up to the first newline or first '. '
  const firstLine = text.split('\n')[0].trim();
  const firstSentence = firstLine.split(/\.\s/)[0].trim();
  const candidate = firstSentence || firstLine;
  return candidate.length > 80 ? candidate.slice(0, 77) + '…' : candidate;
}

/** Detect YouTube links so the player can open them differently */
export function isYouTubeUrl(url = '') {
  return /youtu\.be\/|youtube\.com\/(watch|embed|shorts)/i.test(url);
}

function normalise(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => {
    const text = v.text ?? '';
    return {
      id:          String(v.post_id ?? v.id ?? Math.random()),
      title:       extractTitle(text),
      description: text,
      thumbnail:   v.thumbnail ?? null,
      video_url:   v.video_url ?? null,
      is_youtube:  isYouTubeUrl(v.video_url ?? ''),
      views:       Number(v.views  ?? 0),
      likes:       Number(v.likes  ?? 0),
      comments:    Number(v.comments ?? 0),
      shares:      Number(v.shares ?? 0),
      type:        v.type ?? 'video',
      time:        v.time ?? null,
    };
  });
}

function buildHeaders(token) {
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Unwrap the real array from the API envelope: data.data */
function extractList(json) {
  if (!json || json.status !== 'success') return [];
  const outer = json.data;
  // Real shape: { data: { data: [...], page, total, … } }
  if (Array.isArray(outer?.data))   return outer.data;
  // Fallback: data is directly an array
  if (Array.isArray(outer))         return outer;
  return [];
}

export async function fetchWeeklyTop(token) {
  try {
    const res  = await fetch(`${BASE}?filter=weekly_top`, { headers: buildHeaders(token) });
    const json = await safeJson(res);
    return normalise(extractList(json));
  } catch { return []; }
}

export async function fetchNewVideos(token, page = 1) {
  try {
    const url  = page > 1 ? `${BASE}?page=${page}` : BASE;
    const res  = await fetch(url, { headers: buildHeaders(token) });
    const json = await safeJson(res);
    const totalPages = json?.data?.total_pages ?? 1;
    return {
      videos:      normalise(extractList(json)),
      totalPages:  Number(totalPages),
      currentPage: Number(json?.data?.page ?? page),
    };
  } catch { return { videos: [], totalPages: 1, currentPage: page }; }
}

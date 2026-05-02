// src/pages/blogs/articlesApi.ts

const BASE = 'https://hafrik.com/api/v1/articles';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ArticleListItem {
  id: number;
  post_id: number;
  title: string;
  snippet?: string;
  image?: string | null;
  category_name?: string;
  /** Returned as `category` by list.php (integer category_id) */
  category?: number;
  /** Legacy alias — some detail endpoints may use this field name */
  category_id?: number;
  tags?: string | string[];
  views?: number;
  date?: string;
  link?: string;
}

export interface SimpleArticle {
  id: number;
  post_id: number;
  title: string;
  image?: string;
  category_name?: string;
  views: number;
  date: string;
}

export interface RelatedArticle {
  id: number;
  post_id: number;
  title: string;
  snippet?: string;
  image?: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  article_count?: number;
  icon?: string | null;
  color?: string | null;
}

export interface ArticleDetail extends ArticleListItem {
  content_html?: string;
  content_plain?: string;
  /** Detail endpoint may return tags as array; list endpoint returns comma-separated string */
  tags?: string | string[];
  reading_time_minutes?: number;
  claps?: number;
  claps_count?: number;
  likes?: number;
  likes_count?: number;
  user_liked?: boolean | 0 | 1;
  word_count?: number;
  author?: {
    id?: number;
    name?: string;
    username?: string;
    avatar?: string;
    verified?: boolean;
  };
  related_articles?: RelatedArticle[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function normalizeTags(tags: string | string[] | undefined | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  return String(tags)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

async function apiFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'API error');
  }

  return json.data as T;
}

// ─────────────────────────────────────────────────────────────
// Core Articles
// ─────────────────────────────────────────────────────────────

export async function fetchArticles(
  params: {
    page?: number;
    limit?: number;
    q?: string;
    category?: number;
  },
  signal?: AbortSignal,
): Promise<ArticleListItem[]> {
  const { page = 1, limit = 20, q, category } = params;

  let url = `${BASE}/list.php?page=${page}&limit=${limit}`;

  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (category) url += `&category=${category}`;

  return apiFetch<ArticleListItem[]>(url, signal);
}

export async function fetchArticleDetail(
  postId: number | string,
  signal?: AbortSignal,
): Promise<ArticleDetail> {
  return apiFetch<ArticleDetail>(
    `${BASE}/view.php?post_id=${postId}`,
    signal,
  );
}

// ─────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────

export async function fetchArticleCategories(): Promise<CategoryItem[]> {
  return apiFetch<CategoryItem[]>(`${BASE}/categories.php`);
}

// ─────────────────────────────────────────────────────────────
// Trending & Popular
// ─────────────────────────────────────────────────────────────

export async function fetchTrendingArticles(limit = 10): Promise<SimpleArticle[]> {
  return apiFetch<SimpleArticle[]>(
    `${BASE}/trending.php?limit=${limit}`,
  );
}

export async function fetchMostReadWeekArticles(limit = 10): Promise<SimpleArticle[]> {
  return apiFetch<SimpleArticle[]>(
    `${BASE}/most_read_week.php?limit=${limit}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Recommended
// ─────────────────────────────────────────────────────────────

export async function fetchRecommendedArticles(
  postId: number | string,
  limit = 6,
): Promise<SimpleArticle[]> {
  return apiFetch<SimpleArticle[]>(
    `${BASE}/recommended.php?post_id=${postId}&limit=${limit}`,
  );
}

// ─────────────────────────────────────────────────────────────
// By Author
// ─────────────────────────────────────────────────────────────

export async function fetchArticlesByAuthor(
  authorId: number | string,
  limit = 10,
): Promise<ArticleListItem[]> {
  return apiFetch<ArticleListItem[]>(
    `${BASE}/by_author.php?author_id=${authorId}&limit=${limit}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Engagement
// ─────────────────────────────────────────────────────────────

export async function clapArticle(postId: number | string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `${BASE}/clap.php?post_id=${postId}`,
  );
}

// Optional future use
export async function fetchTrendingByCategory(
  categoryId: number,
  limit = 10,
): Promise<SimpleArticle[]> {
  return apiFetch<SimpleArticle[]>(
    `${BASE}/trending.php?category=${categoryId}&limit=${limit}`,
  );
}

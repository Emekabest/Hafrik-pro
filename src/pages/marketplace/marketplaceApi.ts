// src/pages/marketplace/marketplaceApi.ts

export type Seller = {
  type: "user" | "page";
  id: number;
  username: string;
  avatar: string | null;
  verified: boolean;
  country_id: number | null;
  page_name?: string | null;
};

export type MarketplaceProduct = {
  id: number;
  post_id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string | null;
  stock_status: "In Stock" | "Out of Stock";
  quantity: number;
  condition: "New" | "Used";
  category_id: number | null;
  download_url: string | null;
  is_digital: boolean;
  thumbnail: string | null;
  photos: string[];
  photos_count: number;
  seller: Seller;
  posted: string | null;
};

export type MarketplaceResponse = {
  status: "success" | "error";
  message?: string;
  data?: {
    page: number;
    limit: number;
    total: number;
    count: number;
    products: MarketplaceProduct[];
  };
};

export type MarketplaceQuery = {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  category?: string | number;
  min_price?: number;
  max_price?: number;
};

const qs = (obj: Record<string, any>) => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params.append(k, String(v));
  });
  return params.toString();
};

export async function fetchMarketplaceProducts(
  baseUrl: string,
  query: MarketplaceQuery = {},
  signal?: AbortSignal,
  token?: string | null,
) {
  const url = `${baseUrl}?${qs(query as any)}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: "GET", headers, signal });
  const json = (await res.json()) as MarketplaceResponse;

  if (!res.ok || json.status !== "success" || !json.data) {
    const msg =
      json.message ||
      `Marketplace API error (${res.status} ${res.statusText})`;
    throw new Error(msg);
  }

  return json.data;
}

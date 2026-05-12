// src/pages/marketplace/marketplaceApi.ts
// Powered by WooCommerce Store API — https://shop.hafrik.com/wp-json/wc/store/v1

import apiClient from '../../api/apiClient';

const WC_BASE = 'https://shop.hafrik.com/wp-json/wc/store/v1';

// ─── Exchange Rate ────────────────────────────────────────────────────────────
// Fetches live rate from open.er-api.com (free, no key required).
// Cached in-memory for 1 hour so repeated renders don't hammer the API.
const _rateCache: Record<string, { rate: number; expiry: number }> = {};

export async function getExchangeRate(from: string, to: string): Promise<number> {
  const key    = `${from}_${to}`;
  const cached = _rateCache[key];
  if (cached && Date.now() < cached.expiry) return cached.rate;

  try {
    const res  = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Rate fetch failed');
    const data = await res.json();
    const rate = Number(data?.rates?.[to]);
    if (!rate) throw new Error(`No rate for ${to}`);
    // Cache for 1 hour
    _rateCache[key] = { rate, expiry: Date.now() + 60 * 60 * 1000 };
    return rate;
  } catch {
    // Approximate fallback (NGN→CNY ~0.0052 as of 2024)
    return from === 'NGN' && to === 'CNY' ? 0.0052 : 1;
  }
}

// ─── Cart Token + Nonce ────────────────────────────────────────────────────────
// The Store API issues a Cart-Token AND a Nonce on every cart/checkout response.
// Both must be forwarded on subsequent state-changing requests (POST/PUT/DELETE).
// Without the Nonce, WooCommerce rejects the request with 401 "Missing Nonce".
let _cartToken: string | null = null;
let _nonce:     string | null = null;

const captureCartToken = (res: Response): void => {
  const tok   = res.headers.get('Cart-Token') ?? res.headers.get('cart-token');
  const nonce = res.headers.get('Nonce')      ?? res.headers.get('nonce');
  if (tok)   _cartToken = tok;
  if (nonce) _nonce     = nonce;
};

const cartHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(_cartToken ? { 'Cart-Token': _cartToken } : {}),
  ...(_nonce     ? { 'Nonce':      _nonce     } : {}),
});

// ─── Price helper ──────────────────────────────────────────────────────────────
// WooCommerce prices are integer strings in the currency's smallest unit.
// e.g. "2999" with minor_unit=2 → 29.99
const parsePrice = (str: string | undefined, minorUnit: number): number =>
  parseInt(str ?? '0', 10) / Math.pow(10, minorUnit);

const decodeHtml = (raw: string): string =>
  String(raw ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&amp;?/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

const stripAndDecode = (raw: string): string =>
  decodeHtml(String(raw ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' '));

const slugifyAttribute = (raw: string): string =>
  stripAndDecode(raw)
    .toLowerCase()
    .replace(/^pa[_-]/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// WordPress generates term slugs with hyphens (e.g. "White purple 22031" → "white-purple-22031").
// slugifyAttribute uses underscores, so we need a second slugifier for term values.
const slugifyWPTermValue = (raw: string): string =>
  stripAndDecode(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueStrings = (items: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  items.forEach(item => {
    const value = stripAndDecode(String(item ?? '')).trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};

function getAttributeCartKey(attr: any): string {
  const rawTaxonomy = String(attr.taxonomy ?? attr.attribute ?? attr.slug ?? '');
  const rawName = String(attr.name ?? '');
  if (rawTaxonomy.startsWith('pa_')) return rawTaxonomy;
  if (attr.taxonomy === true || attr.has_terms === true || attr.terms?.some?.((term: any) => term.slug)) {
    const slug = slugifyAttribute(rawTaxonomy || rawName);
    return slug ? `pa_${slug}` : stripAndDecode(rawName);
  }
  return stripAndDecode(rawName || rawTaxonomy);
}

function normalizeSelectedVariations(
  selectedVariations: Record<string, string> | SelectedCartVariation[],
): SelectedCartVariation[] {
  return Array.isArray(selectedVariations)
    ? selectedVariations
    : Object.entries(selectedVariations).map(([attr, val]) => ({
      attribute: attr,
      value: val,
      attribute_candidates: [attr],
      value_candidates: [val],
    }));
}

function buildVariationPayloads(selectedVariations: SelectedCartVariation[]): Array<Array<{ attribute: string; value: string }>> {
  const base = selectedVariations.map(v => ({ attribute: v.attribute, value: v.value }));
  const candidateSets = selectedVariations.map(v => {
    const attrSlug = slugifyAttribute(v.attribute);
    const attrs = uniqueStrings([
      v.attribute,
      ...(v.attribute_candidates ?? []),
      attrSlug,
      attrSlug ? `pa_${attrSlug}` : '',
    ]);
    const values = uniqueStrings([
      v.value,
      ...(v.value_candidates ?? []),
      slugifyAttribute(v.value),   // underscore slug  e.g. white_purple_22031
      slugifyWPTermValue(v.value), // hyphen slug      e.g. white-purple-22031 (WP standard)
    ]);
    return { attrs, values };
  });

  const payloads: Array<Array<{ attribute: string; value: string }>> = [base];
  const maxRounds = Math.max(
    0,
    ...candidateSets.map(set => Math.max(set.attrs.length, set.values.length)),
  );

  for (let i = 0; i < maxRounds; i += 1) {
    payloads.push(candidateSets.map(set => ({
      attribute: set.attrs[i] ?? set.attrs[0],
      value: set.values[i] ?? set.values[0],
    })));
  }

  const seen = new Set<string>();
  return payloads.filter(payload => {
    const key = JSON.stringify(payload);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeComparable(raw: string | undefined | null): string {
  return slugifyAttribute(String(raw ?? ''));
}

function extractVariationPairs(rawVariation: any): Array<{ attribute: string; value: string }> {
  const rawAttrs = rawVariation?.attributes ?? rawVariation?.variation ?? rawVariation?.options ?? [];

  if (Array.isArray(rawAttrs)) {
    return rawAttrs.map((attr: any) => ({
      attribute: stripAndDecode(String(attr.attribute ?? attr.name ?? attr.slug ?? attr.key ?? '')),
      value: stripAndDecode(String(attr.value ?? attr.option ?? attr.name ?? attr.slug ?? '')),
    })).filter(pair => pair.attribute || pair.value);
  }

  if (rawAttrs && typeof rawAttrs === 'object') {
    return Object.entries(rawAttrs).map(([attribute, value]) => ({
      attribute: stripAndDecode(attribute),
      value: stripAndDecode(String(value ?? '')),
    })).filter(pair => pair.attribute || pair.value);
  }

  return [];
}

function selectedMatchesVariation(
  selected: SelectedCartVariation[],
  pairs: Array<{ attribute: string; value: string }>,
): boolean {
  if (!selected.length || !pairs.length) return false;

  return selected.every(sel => {
    const attrCandidates = uniqueStrings([
      sel.attribute,
      ...(sel.attribute_candidates ?? []),
      slugifyAttribute(sel.attribute),
      `pa_${slugifyAttribute(sel.attribute)}`,
    ]).map(normalizeComparable);

    const valueCandidates = uniqueStrings([
      sel.value,
      ...(sel.value_candidates ?? []),
      slugifyAttribute(sel.value),
    ]).map(normalizeComparable);

    return pairs.some(pair => {
      const pairAttr = normalizeComparable(pair.attribute);
      const pairValue = normalizeComparable(pair.value);
      return attrCandidates.includes(pairAttr) && valueCandidates.includes(pairValue);
    });
  });
}

async function resolveMatchingVariationId(
  productId: number,
  selected: SelectedCartVariation[],
): Promise<number | null> {
  if (!selected.length) return null;

  const res = await fetch(`${WC_BASE}/products/${productId}/variations?per_page=100`, {
    headers: { Accept: 'application/json', ...cartHeaders() },
  });
  if (!res.ok) return null;

  const variations = await res.json().catch(() => []);
  if (!Array.isArray(variations)) return null;

  const match = variations.find(variation => {
    const variationId = Number(variation?.id ?? variation?.variation_id ?? 0);
    if (!variationId) return false;
    return selectedMatchesVariation(selected, extractVariationPairs(variation));
  });

  return match ? Number(match.id ?? match.variation_id) : null;
}

async function postCartAddItem(body: any): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${WC_BASE}/cart/add-item`, {
    method: 'POST',
    headers: cartHeaders(),
    body: JSON.stringify(body),
  });
  captureCartToken(res);
  const json = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    message: json.message,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Seller = {
  type: 'user' | 'page';
  id: number;
  username: string;
  avatar: string | null;
  verified: boolean;
  country_id: number | null;
  page_name?: string | null;
};

export type MarketplaceProduct = {
  id: number;
  post_id: number;            // mirrors id — kept for UI compat
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string | null;
  in_stock: boolean;
  stock_status: 'In Stock' | 'Out of Stock';
  quantity: number;
  condition: 'New' | 'Used';
  category_id: number | null;
  download_url: string | null;
  is_digital: boolean;
  thumbnail: string | null;
  photos: string[];
  photos_count: number;
  seller: Seller;
  posted: string | null;
  average_rating?: string;
  review_count?: number;
};

export type MarketplaceQuery = {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  orderby?: 'date' | 'price' | 'popularity' | 'rating';
  order?: 'asc' | 'desc';
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  min_rating?: number;
};

export type Category = {
  id: number;
  name: string;
  parent_id?: number;
  image?: string | null;
  icon?: string | null;
  count?: number;
};

export type Country = {
  id: number;
  name: string;
  code: string;   // 2-letter ISO code required by WooCommerce checkout
};

export type ProductVariationOption = {
  id: number;
  value: string;
  slug?: string;
  add_to_cart_value?: string;
};

export type ProductVariation = {
  id: number;
  name: string;
  slug?: string;
  add_to_cart_key?: string;
  options: ProductVariationOption[];
};

export type ProductDetail = MarketplaceProduct & {
  variations: ProductVariation[];
};

export type SelectedCartVariation = {
  attribute: string;
  value: string;
  attribute_candidates?: string[];
  value_candidates?: string[];
};

export type CartVariation = {
  variation_name: string;
  option_value: string;
};

export type CartItem = {
  cart_id: string;          // WooCommerce item key (string hash)
  post_id: number;
  title: string;
  thumbnail: string | null;
  price: number;
  currency: string;
  quantity: number;
  variations: CartVariation[];
  subtotal: number;
  total: number;
};

export type Cart = {
  items: CartItem[];
  total: number;
  count: number;
};

export type CheckoutResponse = {
  paid: boolean;
  type?: 'free' | 'payment';
  orders_collection_id: string;
  order_id: string;
  amount: number;
  currency: string;
  total: number;
  message?: string;
  redirect_url?: string;
};

export type CheckoutFields = {
  firstName:   string;
  lastName:    string;
  email:       string;
  street:      string;
  city:        string;
  state?:      string;
  postcode?:   string;
  country:     string;      // 2-letter ISO code, e.g. "NG"
  countryName: string;      // display label
  phone:       string;
  note?:       string;
  amount_ngn?: number;      // order total in NGN — sent so server can convert to CNY
  amount_cny?: number;      // estimated CNY equivalent (informational)
};

export type MarketplaceOrder = {
  id: number | string;
  order_id: string;
  status: string;
  total: number;
  currency: string;
  items_count?: number;
  created_at?: string;
  items?: Array<{ title: string; quantity: number; price: number }>;
};

export type TrendyResponse = {
  page:     number;
  has_more: boolean;
  data:     MarketplaceProduct[];
};

export type CheckoutPreview = {
  subtotal: number;
  shipping_fee: number;
  total: number;
  wallet: {
    balance: number;
    can_pay: boolean;
  };
};

// ─── Normalisers ──────────────────────────────────────────────────────────────

function normalizeProduct(wc: any): MarketplaceProduct {
  const minorUnit = wc.prices?.currency_minor_unit ?? 2;
  const price     = parsePrice(wc.prices?.price, minorUnit);
  const imgs      = (wc.images ?? [])
    .map((img: any) => img.src ?? img.thumbnail ?? '')
    .filter(Boolean);
  const firstCat  = (wc.categories ?? [])[0] ?? null;

  return {
    id:           Number(wc.id),
    post_id:      Number(wc.id),
    title:        stripAndDecode(wc.name ?? ''),
    description:  stripAndDecode(wc.description ?? wc.summary ?? ''),
    price,
    currency:     wc.prices?.currency_code ?? 'USD',
    location:     null,
    in_stock:     wc.is_in_stock === true,
    stock_status: wc.is_in_stock ? 'In Stock' : 'Out of Stock',
    quantity:     wc.quantity_limit ?? 99,
    condition:    'New',
    category_id:  firstCat ? Number(firstCat.id) : null,
    download_url: null,
    is_digital:   wc.type === 'downloadable' || wc.virtual === true,
    thumbnail:    imgs[0] ?? null,
    photos:       imgs,
    photos_count: imgs.length,
    seller: {
      type:       'page',
      id:         0,
      username:   'Trendy Mart',
      page_name:  'Trendy Mart',
      avatar:     null,
      verified:   true,
      country_id: null,
    },
    posted:         wc.date_created ?? null,
    average_rating: wc.average_rating ?? '0',
    review_count:   Number(wc.review_count ?? 0),
  };
}

function normalizeCartItem(item: any): CartItem {
  const minorUnit  = item.prices?.currency_minor_unit ?? 2;
  const price      = parsePrice(item.prices?.price, minorUnit);
  const tMinorUnit = item.totals?.currency_minor_unit ?? minorUnit;
  const total      = parsePrice(item.totals?.line_total, tMinorUnit);
  const thumb      = item.images?.[0]?.thumbnail ?? item.images?.[0]?.src ?? null;
  const variations = (item.variation ?? []).map((v: any) => ({
    variation_name: stripAndDecode(String(v.attribute ?? '').replace(/^pa_/, '')),
    option_value:   stripAndDecode(String(v.value ?? '')),
  }));

  return {
    cart_id:    String(item.key ?? item.id),
    post_id:    Number(item.id),
    title:      stripAndDecode(item.name ?? ''),
    thumbnail:  thumb,
    price,
    currency:   item.prices?.currency_code ?? 'USD',
    quantity:   Number(item.quantity ?? 1),
    variations,
    subtotal:   total,
    total,
  };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function fetchMarketplaceProducts(
  query: MarketplaceQuery = {},
  signal?: AbortSignal,
  _token?: string | null,
): Promise<{ page: number; limit: number; total: number; count: number; products: MarketplaceProduct[] }> {
  const params = new URLSearchParams();
  if (query.page)              params.set('page',     String(query.page));
  if (query.limit)             params.set('per_page', String(query.limit));
  if (query.search)            params.set('search',   query.search);
  if (query.category_id)       params.set('category', String(query.category_id));
  if (query.min_price != null) params.set('min_price', String(Math.round(query.min_price * 100)));
  if (query.max_price != null) params.set('max_price', String(Math.round(query.max_price * 100)));
  if (query.orderby)           params.set('orderby', query.orderby);
  if (query.order)             params.set('order', query.order);
  if (query.stock_status)      params.set('stock_status', query.stock_status);
  if (query.min_rating != null) params.set('rating', String(query.min_rating));

  const res = await fetch(`${WC_BASE}/products?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error(`Products API error (${res.status})`);

  const list: any[] = await res.json();
  const total = parseInt(res.headers.get('X-WP-Total') ?? '0', 10) || list.length;
  const limit = query.limit ?? 12;
  const page  = query.page  ?? 1;

  return {
    page,
    limit,
    total,
    count:    list.length,
    products: list.map(normalizeProduct),
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(
  _token?: string | null,
  options: { parent?: number | null } = { parent: 0 },
): Promise<Category[]> {
  const params = new URLSearchParams({
    per_page: '50',
    hide_empty: 'true',
    orderby: 'count',
    order: 'desc',
  });
  if (options.parent !== null) params.set('parent', String(options.parent ?? 0));

  const res = await fetch(
    `${WC_BASE}/products/categories?${params}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return [];
  const list: any[] = await res.json().catch(() => []);
  return list.map(c => ({
    id:    Number(c.id),
    name:  decodeHtml(String(c.name ?? '')),
    parent_id: Number(c.parent ?? 0),
    image: c.image?.src ?? null,
    icon:  null,
    count: Number(c.count ?? 0),
  }));
}

// ─── Countries ────────────────────────────────────────────────────────────────
// WooCommerce Store API has no dedicated countries endpoint.
// Static list ordered Africa-first then global.

const COUNTRIES: Country[] = [
  { id: 1,  name: 'Nigeria',              code: 'NG' },
  { id: 2,  name: 'Ghana',                code: 'GH' },
  { id: 3,  name: 'Kenya',                code: 'KE' },
  { id: 4,  name: 'South Africa',         code: 'ZA' },
  { id: 5,  name: 'Ethiopia',             code: 'ET' },
  { id: 6,  name: 'Tanzania',             code: 'TZ' },
  { id: 7,  name: 'Uganda',               code: 'UG' },
  { id: 8,  name: 'Senegal',              code: 'SN' },
  { id: 9,  name: 'Cameroon',             code: 'CM' },
  { id: 10, name: "Côte d'Ivoire",        code: 'CI' },
  { id: 11, name: 'Egypt',                code: 'EG' },
  { id: 12, name: 'Morocco',              code: 'MA' },
  { id: 13, name: 'Tunisia',              code: 'TN' },
  { id: 14, name: 'Algeria',              code: 'DZ' },
  { id: 15, name: 'Angola',               code: 'AO' },
  { id: 16, name: 'Mozambique',           code: 'MZ' },
  { id: 17, name: 'Zambia',               code: 'ZM' },
  { id: 18, name: 'Zimbabwe',             code: 'ZW' },
  { id: 19, name: 'Rwanda',               code: 'RW' },
  { id: 20, name: 'Namibia',              code: 'NA' },
  { id: 21, name: 'Botswana',             code: 'BW' },
  { id: 22, name: 'Benin',                code: 'BJ' },
  { id: 23, name: 'Togo',                 code: 'TG' },
  { id: 24, name: 'Sierra Leone',         code: 'SL' },
  { id: 25, name: 'Liberia',              code: 'LR' },
  { id: 26, name: 'Gambia',               code: 'GM' },
  { id: 27, name: 'Guinea',               code: 'GN' },
  { id: 28, name: 'Mali',                 code: 'ML' },
  { id: 29, name: 'Niger',                code: 'NE' },
  { id: 30, name: 'Burkina Faso',         code: 'BF' },
  { id: 31, name: 'Chad',                 code: 'TD' },
  { id: 32, name: 'Sudan',                code: 'SD' },
  { id: 33, name: 'Somalia',              code: 'SO' },
  { id: 34, name: 'Congo (DRC)',           code: 'CD' },
  { id: 35, name: 'Congo (Republic)',      code: 'CG' },
  { id: 36, name: 'Madagascar',           code: 'MG' },
  { id: 37, name: 'United Kingdom',       code: 'GB' },
  { id: 38, name: 'United States',        code: 'US' },
  { id: 39, name: 'Canada',               code: 'CA' },
  { id: 40, name: 'Germany',              code: 'DE' },
  { id: 41, name: 'France',               code: 'FR' },
  { id: 42, name: 'Italy',                code: 'IT' },
  { id: 43, name: 'Spain',                code: 'ES' },
  { id: 44, name: 'Netherlands',          code: 'NL' },
  { id: 45, name: 'Australia',            code: 'AU' },
  { id: 46, name: 'India',                code: 'IN' },
  { id: 47, name: 'China',                code: 'CN' },
  { id: 48, name: 'Brazil',               code: 'BR' },
  { id: 49, name: 'United Arab Emirates', code: 'AE' },
  { id: 50, name: 'Saudi Arabia',         code: 'SA' },
];

export async function getCountries(_token?: string | null): Promise<Country[]> {
  return COUNTRIES;
}

// ─── Product detail ───────────────────────────────────────────────────────────

export async function getProductDetail(
  productId: number,
  _token?: string | null,
): Promise<ProductDetail> {
  const res = await fetch(`${WC_BASE}/products/${productId}`, {
    headers: { Accept: 'application/json' },
  });
  const wc = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(wc.message ?? `Could not load product (${res.status})`);

  const product = normalizeProduct(wc);

  // WC variable products expose their selectable attributes on the base product.
  // `variation: true` marks attributes that are used for variations.
  const rawAttrs: any[] = wc.attributes ?? [];
  const variations: ProductVariation[] = rawAttrs
    .filter((a: any) => a.variation === true || a.has_variations === true)
    .map((a: any, i: number) => ({
      id:   Number(a.id ?? i + 1),
      name: stripAndDecode(String(a.name ?? '')),
      slug: stripAndDecode(String(a.slug ?? a.attribute ?? '')),
      add_to_cart_key: getAttributeCartKey(a),
      options: (a.terms ?? a.options ?? []).map((opt: any, j: number) => ({
        id:    j + 1,
        value: stripAndDecode(String(opt.name ?? opt.slug ?? opt ?? '')),
        slug: stripAndDecode(String(opt.slug ?? opt.name ?? opt ?? '')),
        add_to_cart_value: stripAndDecode(String(opt.slug ?? opt.name ?? opt ?? '')),
      })),
    }));

  return { ...product, variations };
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export async function getCart(_token?: string | null): Promise<Cart> {
  const res = await fetch(`${WC_BASE}/cart`, { headers: cartHeaders() });
  captureCartToken(res);
  const wc = await res.json().catch(() => ({}));
  if (!res.ok) return { items: [], total: 0, count: 0 };

  const minorUnit = wc.totals?.currency_minor_unit ?? 2;
  const total     = parsePrice(wc.totals?.total_price, minorUnit);
  const items     = (wc.items ?? []).map(normalizeCartItem);

  return { items, total, count: items.length };
}

export async function addToCart(
  _token: string,
  productId: number,
  selectedVariations: Record<string, string> | SelectedCartVariation[],
  quantity?: number,
): Promise<{ message: string }> {
  const selected = normalizeSelectedVariations(selectedVariations);
  const variationPayloads = buildVariationPayloads(selected);
  let lastMessage = 'Could not add item to cart.';

  await ensureCartToken();

  // ── Step 1: resolve matching variation ID via /variations endpoint ──────────
  const matchedVariationId = await resolveMatchingVariationId(productId, selected).catch(() => null);

  if (matchedVariationId) {
    const directVariation = await postCartAddItem({ id: matchedVariationId, quantity: quantity ?? 1 });
    if (directVariation.ok) return { message: 'Added to cart' };
    lastMessage = directVariation.message ?? lastMessage;

    for (const variation of variationPayloads) {
      const variationWithAttrs = await postCartAddItem({ id: matchedVariationId, quantity: quantity ?? 1, variation });
      if (variationWithAttrs.ok) return { message: 'Added to cart' };
      lastMessage = variationWithAttrs.message ?? lastMessage;
    }
  }

  // ── Step 2: fallback — parent product ID + each attribute payload ────────────
  for (const variation of variationPayloads) {
    const result = await postCartAddItem({ id: productId, quantity: quantity ?? 1, variation });
    if (result.ok) return { message: 'Added to cart' };

    lastMessage = result.message ?? lastMessage;
    const retryable = /missing attribute|invalid value|variation/i.test(lastMessage);
    if (!retryable) break;
  }

  throw new Error(lastMessage);
}

export async function updateCartItem(
  _token: string,
  cartKey: string,
  quantity: number,
): Promise<{ message: string }> {
  const res = await fetch(`${WC_BASE}/cart/items/${cartKey}`, {
    method:  'PUT',
    headers: cartHeaders(),
    body:    JSON.stringify({ quantity }),
  });
  captureCartToken(res);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? 'Could not update cart.');
  return { message: 'Updated' };
}

export async function removeCartItem(
  _token: string,
  cartKey: string,
): Promise<{ message: string }> {
  const res = await fetch(`${WC_BASE}/cart/items/${cartKey}`, {
    method:  'DELETE',
    headers: cartHeaders(),
  });
  captureCartToken(res);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Could not remove item.');
  }
  return { message: 'Removed' };
}

// ─── Checkout (WooCommerce Store API → Paystack) ─────────────────────────────

export async function ensureCartToken(): Promise<void> {
  if (_cartToken && _nonce) return;
  const res = await fetch(`${WC_BASE}/cart`, { headers: cartHeaders() });
  captureCartToken(res);
}

export async function checkout(
  _token: string | null,
  fields: CheckoutFields,
): Promise<CheckoutResponse> {
  await ensureCartToken();

  const billing = {
    first_name: fields.firstName,
    last_name:  fields.lastName,
    email:      fields.email,
    address_1:  fields.street,
    address_2:  '',
    city:       fields.city,
    state:      fields.state    ?? '',
    postcode:   fields.postcode ?? '',
    country:    fields.country,
    phone:      fields.phone,
    company:    '',
  };

  const res = await fetch(`${WC_BASE}/checkout`, {
    method:  'POST',
    headers: cartHeaders(),
    body: JSON.stringify({
      billing_address:  billing,
      shipping_address: billing,
      customer_note:    fields.note ?? '',
      payment_method:   'paystack',
    }),
  });
  captureCartToken(res);

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Extract the most useful error message from WC's response shape
    const detailVals = Object.values((json?.data?.details ?? json?.details ?? {}) as Record<string, any[]>);
    const wcMsg =
      json?.message ??
      detailVals[0]?.[0]?.message ??
      `Checkout failed (${res.status})`;
    throw new Error(wcMsg);
  }

  // WooCommerce returns payment_result.redirect_url for redirect-based gateways
  const redirectUrl = json?.payment_result?.redirect_url ?? json?.redirect_url ?? null;
  const minorUnit   = json?.totals?.currency_minor_unit ?? 2;
  const total       = parsePrice(json?.totals?.total_price, minorUnit);

  return {
    paid:                 !redirectUrl,
    type:                 redirectUrl ? 'payment' : 'free',
    orders_collection_id: String(json?.order_id ?? ''),
    order_id:             String(json?.order_id ?? ''),
    amount:               total,
    currency:             json?.totals?.currency_code ?? 'NGN',
    total,
    message:              json?.message ?? '',
    redirect_url:         redirectUrl ?? undefined,
  };
}


// ─── Extended types ───────────────────────────────────────────────────────────

export type HafrikOrderItem = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  quantity: number;
  variations: Array<{ variation_name: string; option_value: string }>;
  thumbnail: string | null;
};

export type OrderStatusEntry = {
  id: number;
  status: string;
  note: string;
  created_at: string;
};

export type HafrikOrder = {
  id: number;
  order_ref: string;
  buyer_id: number;
  seller_id: number | null;
  status: string;
  total: number;
  currency: string;
  payment_method: 'wallet' | 'paystack';
  items_count?: number;
  created_at: string;
  updated_at?: string;
  notes?: string;
  wc_order_id?: string | null;
  items?: HafrikOrderItem[];
  history?: OrderStatusEntry[];
  buyer_username?: string | null;
  buyer_avatar?: string | null;
};

// ─── Orders (Hafrik backend) ──────────────────────────────────────────────────

export async function getOrders(_token: string): Promise<HafrikOrder[]> {
  try {
    const res  = await apiClient.get('/marketplace/get_orders.php');
    const rows = res.data?.data ?? [];
    // Normalise native Sngine field names to the app's HafrikOrder shape
    return rows.map((o: any): HafrikOrder => ({
      id:             Number(o.order_id   ?? 0),
      order_ref:      String(o.order_hash ?? o.order_ref ?? ''),
      buyer_id:       0,
      seller_id:      null,
      status:         String(o.status     ?? 'placed'),
      total:          Number(o.total      ?? o.sub_total ?? 0),
      currency:       String(o.currency   ?? 'NGN'),
      payment_method: (o.payment_method ?? 'wallet') as 'wallet' | 'paystack',
      items_count:    Number(o.items_count ?? 0),
      created_at:     String(o.created_at ?? o.insert_time ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function getOrderDetail(_token: string, orderId: string | number): Promise<HafrikOrder | null> {
  try {
    const res = await apiClient.get('/marketplace/get_order_detail.php', {
      params: { order_id: Number(orderId) },
    });
    const d = res.data?.data;
    if (!d) return null;
    return {
      id:             Number(d.order_id   ?? 0),
      order_ref:      String(d.order_hash ?? ''),
      buyer_id:       0,
      seller_id:      null,
      status:         String(d.status     ?? 'placed'),
      total:          Number(d.total      ?? 0),
      currency:       String(d.currency   ?? 'NGN'),
      payment_method: (d.payment_method ?? 'wallet') as 'wallet' | 'paystack',
      created_at:     String(d.created_at ?? ''),
      items:          (d.items ?? []).map((i: any) => ({
        id:         Number(i.item_id    ?? 0),
        product_id: Number(i.product_id ?? 0),
        title:      stripAndDecode(String(i.title ?? '')),
        price:      Number(i.price      ?? 0),
        quantity:   Number(i.quantity   ?? 1),
        variations: (i.variations ?? []).map((v: any) => ({
          variation_name: stripAndDecode(String(v.variation_name ?? v.attribute ?? '')),
          option_value: stripAndDecode(String(v.option_value ?? v.value ?? v ?? '')),
        })),
        thumbnail:  i.thumbnail  ?? null,
      })),
    };
  } catch {
    return null;
  }
}

// ─── Wallet checkout ─────────────────────────────────────────

export async function checkoutPreview(
  _token: string,
  cartItems: CartItem[]
): Promise<CheckoutPreview> {

  if (!cartItems.length) {
    throw new Error('Cart is empty');
  }

  try {
    const [previewRes, balanceRes] = await Promise.all([
      apiClient.post('/marketplace/checkout_preview.php', {
        items: cartItems,
      }),
      apiClient.get('/wallet/balance.php'),
    ]);

    const preview = previewRes.data?.data ?? previewRes.data;
    const balanceData = balanceRes.data?.data ?? balanceRes.data;

    if (!preview) {
      throw new Error('Could not load checkout preview');
    }

    const total = Number(preview.total ?? 0);

    const balance = Number(
      balanceData?.wallet_balance ??
      balanceData?.balance ??
      0
    );

    return {
      subtotal: Number(preview.subtotal ?? 0),
      shipping_fee: Number(preview.shipping_fee ?? 0),
      total,
      wallet: {
        balance,
        can_pay: balance >= total,
      },
    };

  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
      err?.message ||
      'Failed to load checkout preview'
    );
  }
}


// ─── Wallet Checkout ─────────────────────────────────────────

export async function walletCheckout(
  _token: string,
  fields: CheckoutFields,
  cartItems: CartItem[],
): Promise<{ order_id: string; order_ref: string }> {

  if (!cartItems.length) {
    throw new Error('Cart is empty');
  }

  try {
    const res = await apiClient.post('/marketplace/wallet_checkout.php', {
      items: cartItems,
      address: {
        first_name: fields.firstName,
        last_name:  fields.lastName,
        street:     fields.street,
        city:       fields.city,
        state:      fields.state ?? '',
        postcode:   fields.postcode ?? '',
        country:    fields.country,
        phone:      fields.phone,
        email:      fields.email,
      },
      note:       fields.note ?? '',
      // Send both amounts so the server can do the NGN→CNY conversion correctly
      amount_ngn: fields.amount_ngn ?? 0,
      amount_cny: fields.amount_cny ?? 0,
      currency:   'NGN',
    });

    const json = res.data;

    if (json?.status !== 'success') {
      throw new Error(json?.message ?? 'Wallet checkout failed');
    }

    return {
      order_id: String(json.data?.order_id ?? ''),
      order_ref: String(json.data?.order_hash ?? ''),
    };

  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
      err?.message ||
      'Checkout failed'
    );
  }
}

// ─── Save WooCommerce order to Hafrik DB (after Paystack success) ─────────────

export async function saveWcOrder(
  _token: string,
  wcOrderId: string,
  fields: CheckoutFields,
  cartItems: CartItem[],
  total: number,
  currency: string,
): Promise<void> {
  try {
    await apiClient.post('/marketplace/save_wc_order.php', {
      wc_order_id: wcOrderId,
      items: cartItems,
      address: { ...fields },
      total,
      currency,
    });
  } catch { /* silent — non-critical */ }
}

// ─── Wallet top-up ────────────────────────────────────────────────────────────

export async function initWalletTopup(
  _token: string,
  amount: number,
): Promise<{ payment_url: string; reference: string; amount_cny: number; amount_ngn: number }> {
  const res  = await apiClient.post('/marketplace/topup_init.php', { amount });
  const json = res.data;
  if (json?.status !== 'success') throw new Error(json?.message ?? 'Could not initiate top-up');
  return {
    payment_url: json.payment_url,
    reference:   json.reference,
    amount_cny:  json.amount_cny,
    amount_ngn:  json.amount_ngn,
  };
}

// ─── Seller orders ────────────────────────────────────────────────────────────

export async function getSellerOrders(
  _token: string,
  status?: string,
): Promise<{ orders: HafrikOrder[]; counts: Record<string, number> }> {
  try {
    const params: Record<string, string> = {};
    if (status && status !== 'all') params.status = status;
    const res = await apiClient.get('/marketplace/seller_orders.php', { params });
    return { orders: res.data?.data ?? [], counts: res.data?.counts ?? {} };
  } catch {
    return { orders: [], counts: {} };
  }
}

export async function updateOrderStatus(
  _token: string,
  orderRef: string,
  status: string,
  note?: string,
): Promise<void> {
  const res  = await apiClient.post('/marketplace/seller_update_order.php', {
    order_ref: orderRef, status, note: note ?? '',
  });
  const json = res.data;
  if (json?.status !== 'success') throw new Error(json?.message ?? 'Could not update order');
}

// ─── Trending products ────────────────────────────────────────────────────────

export async function fetchTrendyProducts(
  page:    number = 1,
  limit:   number = 10,
  signal?: AbortSignal,
  _token?: string | null,
): Promise<TrendyResponse> {
  const params = new URLSearchParams({
    page:     String(page),
    per_page: String(limit),
    orderby:  'popularity',
    order:    'desc',
  });

  const res = await fetch(`${WC_BASE}/products?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) return { page, has_more: false, data: [] };

  const list: any[] = await res.json().catch(() => []);
  const total    = parseInt(res.headers.get('X-WP-Total') ?? '0', 10);
  const has_more = total > 0 ? page * limit < total : list.length === limit;

  return {
    page,
    has_more,
    data: list.map(wc => ({ ...normalizeProduct(wc), type: 'product' })),
  };
}

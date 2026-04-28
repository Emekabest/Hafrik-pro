// src/pages/marketplace/marketplaceApi.ts
// Powered by WooCommerce Store API — https://shop.itstrendymart.com/wp-json/wc/store/v1

const WC_BASE = 'https://shop.itstrendymart.com/wp-json/wc/store/v1';

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
};

export type Category = {
  id: number;
  name: string;
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
};

export type ProductVariation = {
  id: number;
  name: string;
  options: ProductVariationOption[];
};

export type ProductDetail = MarketplaceProduct & {
  variations: ProductVariation[];
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
    title:        wc.name ?? '',
    description:  wc.description ?? wc.summary ?? '',
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
    variation_name: String(v.attribute ?? '').replace(/^pa_/, ''),
    option_value:   String(v.value ?? ''),
  }));

  return {
    cart_id:    String(item.key ?? item.id),
    post_id:    Number(item.id),
    title:      item.name ?? '',
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

export async function getCategories(_token?: string | null): Promise<Category[]> {
  const res = await fetch(
    `${WC_BASE}/products/categories?per_page=50&hide_empty=true&parent=0&orderby=count&order=desc`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return [];
  const list: any[] = await res.json().catch(() => []);
  return list.map(c => ({
    id:    Number(c.id),
    name:  String(c.name ?? ''),
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
      name: String(a.name ?? ''),
      options: (a.terms ?? a.options ?? []).map((opt: any, j: number) => ({
        id:    j + 1,
        value: String(opt.name ?? opt.slug ?? opt ?? ''),
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
  selectedVariations: Record<string, string>,
  quantity?: number,
): Promise<{ message: string }> {
  // Map { "Color": "Black" } → WC variation array format
  const variation = Object.entries(selectedVariations).map(([attr, val]) => ({
    attribute: `pa_${attr.toLowerCase().replace(/\s+/g, '_')}`,
    value: val,
  }));

  const res = await fetch(`${WC_BASE}/cart/add-item`, {
    method:  'POST',
    headers: cartHeaders(),
    body:    JSON.stringify({ id: productId, quantity: quantity ?? 1, variation }),
  });
  captureCartToken(res);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? 'Could not add item to cart.');
  return { message: 'Added to cart' };
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

// ─── Checkout ─────────────────────────────────────────────────────────────────

// Ensure Cart-Token + Nonce are both initialised before any checkout call.
// WooCommerce requires a valid Nonce on all POST/PUT/DELETE requests.
export async function ensureCartToken(): Promise<void> {
  if (_cartToken && _nonce) return;   // already have both
  try {
    const res = await fetch(`${WC_BASE}/cart`, { headers: cartHeaders() });
    captureCartToken(res);
  } catch { /* ignore — checkout will surface its own error */ }
}

export async function checkout(
  _token: string,
  fields: CheckoutFields,
): Promise<CheckoutResponse> {
  // Ensure the Cart-Token session is established before placing the order
  await ensureCartToken();

  // Always include all standard WooCommerce billing fields to satisfy validation
  const sharedAddr = {
    first_name: fields.firstName,
    last_name:  fields.lastName,
    company:    '',
    address_1:  fields.street,
    address_2:  '',
    city:       fields.city,
    state:      fields.state?.trim()    || '',
    postcode:   fields.postcode?.trim() || '',
    country:    fields.country,   // 2-letter ISO code
    phone:      fields.phone,
  };

  const res = await fetch(`${WC_BASE}/checkout`, {
    method:  'POST',
    headers: cartHeaders(),
    body: JSON.stringify({
      billing_address:  { ...sharedAddr, email: fields.email },
      shipping_address: sharedAddr,
      payment_method:   'paystack',
      customer_note:    fields.note ?? '',
    }),
  });
  captureCartToken(res);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // WC Store API nests details as an object keyed by field name
    const details = json?.data?.details ?? {};
    const firstDetail = Object.values(details)[0] as any;
    const detail =
      firstDetail?.message ??
      json?.data?.message  ??
      json.message;
    throw new Error(detail ?? 'Checkout failed. Please try again.');
  }

  const paymentStatus = json.payment_result?.payment_status ?? '';
  const paid = paymentStatus === 'success' || json.status === 'processing';
  const redirectUrl = json.payment_result?.redirect_url ?? '';

  return {
    paid,
    type:                 paid ? 'free' : 'payment',
    orders_collection_id: String(json.order_key  ?? json.order_id ?? ''),
    order_id:             String(json.order_id   ?? ''),
    amount:               0,
    currency:             '',
    total:                0,
    message:              paid ? 'Order placed successfully!' : 'Proceed to payment',
    redirect_url:         redirectUrl,
  };
}

export async function verifyMarketplacePayment(
  _token: string,
  _orderId: string,
  _paymentRef: string,
): Promise<{ success: boolean; message: string }> {
  // WooCommerce payment verification is handled by the gateway directly.
  // Kept for interface compatibility with MarketplacePaymentScreen.
  return { success: true, message: 'Payment verified' };
}

// ─── Hafrik backend — use apiClient (handles auth + base URL automatically) ───
import apiClient from '../../api/apiClient';

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
    const res = await apiClient.get('/marketplace/get_orders.php');
    return res.data?.data ?? [];
  } catch {
    return [];
  }
}

export async function getOrderDetail(_token: string, orderRef: string): Promise<HafrikOrder | null> {
  try {
    const res = await apiClient.get('/marketplace/get_order_detail.php', {
      params: { order_ref: orderRef },
    });
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

// ─── Wallet checkout ──────────────────────────────────────────────────────────

export async function walletCheckout(
  _token: string,
  fields: CheckoutFields,
  cartItems: CartItem[],
): Promise<{ order_ref: string; order_id: number }> {
  const total    = cartItems.reduce((sum, i) => sum + (Number(i.total ?? 0) || Number(i.price ?? 0) * Number(i.quantity ?? 1)), 0);
  const currency = cartItems[0]?.currency ?? 'CNY';

  const res = await apiClient.post('/marketplace/wallet_checkout.php', {
    amount: total,
    currency,
    items: cartItems,
    address: {
      first_name: fields.firstName,
      last_name:  fields.lastName,
      street:     fields.street,
      city:       fields.city,
      state:      fields.state    ?? '',
      postcode:   fields.postcode ?? '',
      country:    fields.country,
      phone:      fields.phone,
      email:      fields.email,
    },
    note: fields.note ?? '',
  });

  const json = res.data;
  if (json?.status !== 'success') throw new Error(json?.message ?? 'Wallet checkout failed');
  return { order_ref: json.order_ref, order_id: json.order_id };
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { ProductCard } from "../../components/ProductCard";

// TODO: set this to your real endpoint
const MARKETPLACE_ENDPOINT =
  "https://hafrik.com/api/v1/marketplace/get_marketplace.php";

const BRAND = "#1F2937";
const ACCENT = "#3B82F6";

export default function MarketplaceScreen({ navigation }: any) {
  const [items, setItems] = useState<MarketplaceProduct[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const canLoadMore = items.length < total;

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (opts: { reset?: boolean; nextPage?: number } = {}) => {
      const reset = !!opts.reset;
      const nextPage = opts.nextPage ?? (reset ? 1 : page);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        if (reset) setLoading(true);
        const data = await fetchMarketplaceProducts(
          MARKETPLACE_ENDPOINT,
          {
            page: nextPage,
            limit,
            search: appliedSearch,
          },
          ac.signal
        );

        setTotal(data.total);

        if (reset) {
          setItems(data.products);
          setPage(1);
        } else {
          setItems((prev) => {
            const merged = [...prev, ...data.products];
            // prevent duplicates by product id
            const map = new Map<number, MarketplaceProduct>();
            merged.forEach((p) => map.set(p.id, p));
            return Array.from(map.values()).sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime());
          });
        }

        setPage(nextPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [appliedSearch, limit, page]
  );

  useEffect(() => {
    load({ reset: true, nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ reset: true, nextPage: 1 });
  }, [load]);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || refreshing) return;
    if (!canLoadMore) return;
    setLoadingMore(true);
    load({ reset: false, nextPage: page + 1 });
  }, [canLoadMore, load, loading, loadingMore, page, refreshing]);

  const header = useMemo(() => {
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => setAppliedSearch(search.trim())}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => setAppliedSearch(search.trim())}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.smallMeta}>
          Showing {items.length} of {total}
        </Text>
      </View>
    );
  }, [items.length, search, total]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onPress={() =>
              navigation?.navigate?.("MarketplaceProduct", { product: item })
            }
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 14 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

export interface MarketplaceProduct {
  id: number;
  posted: string; // ISO date string, e.g., "2023-10-01T00:00:00Z"
  title: string;
  thumbnail: string;
  price: number;
  currency: string;
  // Add other properties as needed based on your API response, e.g.:
  // description: string;
  // imageUrl?: string;
}

export interface FetchMarketplaceResponse {
  total: number;
  products: MarketplaceProduct[];
}

export async function fetchMarketplaceProducts(
  endpoint: string,
  params: { page: number; limit: number; search: string },
  signal?: AbortSignal
): Promise<FetchMarketplaceResponse> {
  const url = new URL(endpoint);
  url.searchParams.append('page', params.page.toString());
  url.searchParams.append('limit', params.limit.toString());
  if (params.search) {
    url.searchParams.append('search', params.search);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch marketplace products: ${response.status}`);
  }

  const data: FetchMarketplaceResponse = await response.json();
  return data;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F8FA" },
  center: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  header: { marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: BRAND },
  smallMeta: { marginTop: 6, color: "#6B7280", fontSize: 12 },

  searchRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#111827",
  },
  searchBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "900" },
});
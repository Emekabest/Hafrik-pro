// src/pages/marketplace/ProductCard.tsx
import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MarketplaceProduct } from "./marketplaceApi";

const BRAND  = "#0C3F44";
const ACCENT = "#13C296";
const MUTED  = "#7A9198";
const DARK   = "#0D1B1E";

const FALLBACK_AVATAR =
  "https://hafrik.com/content/themes/default/images/blank_profile_male.jpg";

export const ProductCard = memo(function ProductCard({
  item,
  onPress,
}: {
  item: MarketplaceProduct;
  onPress?: () => void;
}) {
  const thumb = item.thumbnail ?? item.photos?.[0] ?? null;
  const inStock = item.stock_status === "In Stock";
  const isPage = item.seller.type === "page";
  const displayName =
    isPage && item.seller.page_name
      ? item.seller.page_name
      : item.seller.username;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Square image */}
      <View style={styles.imgWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, styles.imgEmpty]}>
            <Ionicons name="image-outline" size={28} color={MUTED} />
          </View>
        )}

        {/* Stock badge */}
        <View style={[styles.stockBadge, !inStock && styles.stockOut]}>
          <View style={styles.stockDot} />
          <Text style={styles.stockTxt}>
            {inStock ? "In Stock" : "Out"}
          </Text>
        </View>

        {/* Photos count */}
        {(item.photos_count ?? 0) > 1 && (
          <View style={styles.photoBadge}>
            <Ionicons name="images-outline" size={9} color="#fff" />
            <Text style={styles.photoTxt}>{item.photos_count}</Text>
          </View>
        )}

        {/* Digital pill */}
        {item.is_digital && (
          <View style={styles.digitalBadge}>
            <Text style={styles.digitalTxt}>Digital</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.price}>
          {item.currency} {Number(item.price).toLocaleString()}
        </Text>

        {/* Seller row */}
        <View style={styles.sellerRow}>
          <Image
            source={{ uri: item.seller.avatar ?? FALLBACK_AVATAR }}
            style={styles.avatar}
          />
          <Text style={styles.sellerName} numberOfLines={1}>
            {displayName}
          </Text>
          {item.seller.verified && (
            <View style={styles.verifiedDot}>
              <Ionicons name="checkmark" size={8} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1 }} />
          <View style={[styles.typeBadge, isPage && styles.typeBadgePage]}>
            <Text style={styles.typeTxt}>{isPage ? "PAGE" : "USER"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(12,63,68,0.08)",
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  imgWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F0F4F5",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  imgEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },

  stockBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(19,194,150,0.92)",
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stockOut: { backgroundColor: "rgba(232,93,74,0.92)" },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  stockTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },

  photoBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  photoTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },

  digitalBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: BRAND,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  digitalTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },

  body: { padding: 10, gap: 3 },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: DARK,
    lineHeight: 18,
  },
  price: {
    fontSize: 15,
    fontWeight: "900",
    color: ACCENT,
  },

  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  sellerName: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
    flexShrink: 1,
  },
  verifiedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    backgroundColor: "#374151",
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgePage: { backgroundColor: BRAND },
  typeTxt: { color: "#fff", fontSize: 8, fontWeight: "800" },
});

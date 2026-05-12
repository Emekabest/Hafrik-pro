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
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

const stripHtml = (raw = '') => {
  if (!raw) return '';
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&rsquo;|&lsquo;|&apos;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#039;/g, "'")
    .replace(/&amp;?/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};


const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;

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
  const inStock = item.in_stock === true;
  const isPage = item.seller.type === "page";
  const displayName =
    isPage && item.seller.page_name
      ? item.seller.page_name
      : item.seller.username;
  const cleanTitle = stripHtml(item.title);

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
            {inStock ? "In Stock" : "Out of Stock"}
          </Text>
        </View>

        {/* Photos count */}
        {(item.photos_count ?? 0) > 1 && (
          <View style={styles.photoBadge}>
            <Ionicons name="images-outline" size={9} color={Colors.white} />
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
          {cleanTitle}
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
              <Ionicons name="checkmark" size={8} color={Colors.white} />
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: withOpacity(Colors.primaryDark, 0.08),
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  imgWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: Colors.surfaceSteel,
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
    backgroundColor: withOpacity(Colors.tealAccent, 0.92),
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stockOut: { backgroundColor: withOpacity(Colors.coral, 0.92) },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
  stockTxt: { color: Colors.white, fontSize: 9, fontWeight: "800" },

  photoBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: withOpacity(Colors.black, 0.52),
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  photoTxt: { color: Colors.white, fontSize: 9, fontWeight: "800" },

  digitalBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: BRAND,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  digitalTxt: { color: Colors.white, fontSize: 9, fontWeight: "800" },

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
    backgroundColor: Colors.neutral190,
  },
  sellerName: {
    fontSize: 11,
    color: Colors.neutral600,
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
    backgroundColor: Colors.slate,
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgePage: { backgroundColor: BRAND },
  typeTxt: { color: Colors.white, fontSize: 8, fontWeight: "800" },
});

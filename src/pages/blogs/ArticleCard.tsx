// src/pages/blogs/ArticleCard.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ArticleListItem } from './articlesApi';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate;
const BORDER = withOpacity(Colors.primaryDark, 0.09);

interface ArticleCardProps {
  item: ArticleListItem;
  onPress: () => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ item, onPress }) => {
  // Decode HTML entities
  const decodeHtml = (text: string = ''): string =>
    String(text)
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const isValidImage = (url: string | null): boolean =>
    !!url &&
    !String(url).includes('blank_profile') &&
    !String(url).includes('default-article') &&
    !String(url).includes('/default.');

  const title = decodeHtml(item.title);
  const snippet = decodeHtml(item.snippet || '');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Image */}
      {isValidImage(item.image) ? (
        <Image
          source={{ uri: item.image ! }}
          style={styles.image}
          resizeMode="cover"
          onError={() => console.log('Image failed:', item.image)}
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={32} color={MUTED} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.snippet} numberOfLines={2}>
          {snippet}
        </Text>

        {/* Category badge */}
        {item.category_name && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {item.category_name}
            </Text>
          </View>
        )}
      </View>

      {/* Arrow indicator */}
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={18} color={ACCENT} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  image: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.neutral150,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: withOpacity(Colors.primaryDark, 0.08),
  },

  content: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK,
    lineHeight: 16,
  },

  snippet: {
    fontSize: 11,
    color: MUTED,
    marginTop: 5,
    lineHeight: 14,
  },

  categoryBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: withOpacity(Colors.tealAccent, 0.12),
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: ACCENT,
  },

  arrow: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: withOpacity(Colors.white, 0.9),
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

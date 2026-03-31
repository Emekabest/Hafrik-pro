import React, { useState, useMemo, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, Modal, TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import ImageViewModal from '../../../../imageviewmodal';
import { Ionicons } from '@expo/vector-icons';
import SvgIcon from '../../../../../assl.js/svg/svg';
import CalculateElapsedTime from '../../../../../helpers/calculateelapsedtime';
import PhotoPostContent from '../../feedcardproperties/photocontent';
import PollContent from '../../feedcardproperties/pollcontent';
import ProductContent from '../../feedcardproperties/productcontent';
import AppDetails from '../../../../../helpers/appdetails';
import CommentSharedPostItem from './commentsharedpostitem';
import VideoPostContent from '../../feedcardproperties/videocontent';
import CommentVideoItem from './commentvideoitem';
import CommentArticleItem from './commentarticleitem';
import CommentProductItem from './commentproductitem';
import CommentPollItem from './commentpollitem';
import CommentPageCoverItem from './commentpagecoveritem';
import CleanText from '../../../../../helpers/cleantext';
import getActionText from '../../../../../helpers/getactiontext';
import { Link, useNavigation } from '@react-navigation/native';
import EventPostContent from '../../feedcardproperties/eventpostcontent';
import CommentEventPostCoverContent from './commenteventpostcovercontent';
import CommentJobPostContent from './commentjobpostcontent';
import CommentMediaLinkContent from './commentmedialinkcontent';
import parseLinkFromText from '../../../../../helpers/linkparser';
import CommentMultipleSharedProductMediaCard from './commentmultiplesharedproductmediacard';
import { Colors } from '../../../../../theme/colors';
import { editPost, deletePost } from '../../../../../api/feedApi';

const totalLikes = (reactions, fallback = 0) => {
  if (reactions && typeof reactions === 'object') {
    const sum = Object.entries(reactions)
      .filter(([k]) => k !== 'total')
      .reduce((acc, [, v]) => acc + Number(v || 0), 0);
    if (sum > 0) return sum;
    if (typeof reactions.total === 'number') return reactions.total;
  }
  return Number(fallback) || 0;
};
import LinkPreview from '../../../../../components/LinkPreview';
import ShareModal from '../../share';
import ReactionsModal from '../../feedcardproperties/ReactionsModal';
import EngagementBar from '../../feedcardproperties/engagementbar';
import RepostModal from '../../feedcardproperties/RepostModal';
import SaveCollectionsModal from '../../feedcardproperties/SaveCollectionsModal';
import SaveAsImageModal from '../../SaveAsImageModal';
import { useAuth } from '../../../../../AuthContext';
import useStore from '../../../../../repository/store';

const { width: screenWidth } = Dimensions.get('window');

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;
const horizontalPadding = 15;



const CommentMainPostContent = ({ post, textInputRef, isLeaving = false }) => {
    const navigation = useNavigation();
    const { user: authUser } = useAuth();
    const [viewingImage,               setViewingImage]               = useState(null);
    const [shareModalVisible,          setShareModalVisible]          = useState(false);
    const [saveImageModalVisible,      setSaveImageModalVisible]      = useState(false);
    const [reactionsModalVisible,      setReactionsModalVisible]      = useState(false);
    const [repostModalVisible,         setRepostModalVisible]         = useState(false);
    const [saveCollectionsModalVisible, setSaveCollectionsModalVisible] = useState(false);
    const [textExpanded,   setTextExpanded]   = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editText,       setEditText]       = useState('');
    const [saving,         setSaving]         = useState(false);

    const isOwnPost = authUser?.id && post?.user?.id && String(authUser.id) === String(post.user.id);

    const handleDelete = useCallback(() => {
        setOptionsVisible(false);
        Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await deletePost(post.id);
                        navigation.goBack();
                    } catch {
                        Alert.alert('Error', 'Could not delete post. Please try again.');
                    }
                },
            },
        ]);
    }, [post?.id, navigation]);

    const openEdit = useCallback(() => {
        setOptionsVisible(false);
        setEditText(post?.text || '');
        setEditModalVisible(true);
    }, [post?.text]);

    const handleSaveEdit = useCallback(async () => {
        if (!editText.trim()) return;
        setSaving(true);
        try {
            await editPost(post.id, editText.trim());
            setEditModalVisible(false);
        } catch {
            Alert.alert('Error', 'Could not update post. Please try again.');
        }
        setSaving(false);
    }, [editText, post?.id]);

    // ── Page-post identity swap (mirrors feedcard.jsx logic) ────────────────
    const pageContext = useMemo(() => {
        // 1️⃣ Try the dedicated post.page object first
        const pg = post?.page;
        if (pg) {
            const pageId    = Number(pg.id ?? pg.page_id ?? post?.page_id ?? 0);
            const pageTitle = pg.title || pg.name || pg.page_title || pg.page_name || null;
            if (pageId > 0 && pageTitle) {
                return { id: pageId, title: pageTitle, avatar: pg.avatar || pg.logo || pg.image || null };
            }
        }

        // 2️⃣ Fallback: if user.entity === "page", the user object IS the page
        const u = post?.user;
        if (u && (u.entity || '').toLowerCase() === 'page') {
            const pageId = Number(u.id ?? post?.page_id ?? 0);
            // Build title from page-specific fields first, skip any "Deleted User" values
            const notDeleted = (v) => v && !/deleted/i.test(v);
            const pageTitle = [u.page_title, u.page_name, u.name, u.title,
                               post?.page_title, post?.page_name]
                               .find(notDeleted)
                            || (notDeleted(u.full_name) ? u.full_name : null)
                            || (notDeleted(u.username) ? u.username : null);
            const pageAvatar = u.avatar || u.logo || u.image || null;
            if (pageId > 0 && pageTitle) {
                return { id: pageId, title: pageTitle, avatar: pageAvatar };
            }
            const fallbackId = Number(post?.page_id ?? u.id ?? 0);
            if (fallbackId > 0) {
                return {
                    id: fallbackId,
                    title: pageTitle || 'Page',
                    avatar: pageAvatar,
                };
            }
        }

        return null;
    }, [post?.page, post?.page_id, post?.user]);

    const isPagePost = !!pageContext;

    const displayUser = useMemo(() => {
        const u = post?.user || {};
        const base = {
            ...u,
            full_name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Unknown',
            avatar: u.avatar || 'https://hafrik.com/default-avatar.png',
        };
        if (isPagePost) {
            return {
                ...base,
                full_name: pageContext.title || base.full_name,
                avatar: pageContext.avatar || base.avatar,
                verified: false,
            };
        }
        return base;
    }, [post?.user, isPagePost, pageContext]);

    const handleAuthorPress = () => {
        if (isPagePost && pageContext?.id) {
            navigation.navigate('BusinessDetails', { pageId: pageContext.id });
            return;
        }
        // Also handle entity=page even if pageContext missed (shouldn't happen now, but safety net)
        const entity = (post?.user?.entity || '').toLowerCase();
        if (entity === 'page' && post?.user?.id) {
            navigation.navigate('BusinessDetails', { pageId: post.user.id });
            return;
        }
        if (!post?.user?.id) return;
        navigation.navigate('UserProfile', {
            userId: post.user.id,
            username: post.user.username ?? '',
        });
    };

    if (!post) return null;

    // Always parse + strip URL from text so the LinkPreview card replaces it
    const { text, url: extractedUrl } = parseLinkFromText(post.text || '');
    const postText = post.text ? CleanText(text) : '';

    const actionText = getActionText(post).trim();


    const isMultimediapostMode = post.type === "product" || post.shared_post?.type === "product";

    
    return (
        <View style={styles.postWrapper}>
            {/* ── Options modal ──────────────────────────────────────────── */}
            <Modal visible={optionsVisible} transparent animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
                <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
                    <View style={styles.optionsSheet}>
                        {isOwnPost && (
                            <>
                                <TouchableOpacity style={styles.optionRow} onPress={openEdit}>
                                    <Ionicons name="create-outline" size={20} color={Colors.primaryDark} />
                                    <Text style={styles.optionText}>Edit Post</Text>
                                </TouchableOpacity>
                                <View style={styles.optionDivider} />
                                <TouchableOpacity style={styles.optionRow} onPress={handleDelete}>
                                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                                    <Text style={[styles.optionText, { color: '#E74C3C' }]}>Delete Post</Text>
                                </TouchableOpacity>
                                <View style={styles.optionDivider} />
                            </>
                        )}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setOptionsVisible(false)}>
                            <Ionicons name="close-outline" size={20} color={Colors.secondaryText} />
                            <Text style={[styles.optionText, { color: Colors.secondaryText }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── Edit post modal ─────────────────────────────────────────── */}
            <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setEditModalVisible(false)}>
                        <TouchableOpacity activeOpacity={1} style={styles.editSheet}>
                            <View style={styles.editHeader}>
                                <Text style={styles.editTitle}>Edit Post</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Ionicons name="close" size={22} color={Colors.primaryDark} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.editInput}
                                value={editText}
                                onChangeText={setEditText}
                                multiline
                                autoFocus
                                placeholder="What's on your mind?"
                                placeholderTextColor={Colors.secondaryText}
                            />
                            <TouchableOpacity
                                style={[styles.editSaveBtn, (!editText.trim() || saving) && { opacity: 0.5 }]}
                                onPress={handleSaveEdit}
                                disabled={!editText.trim() || saving}
                            >
                                {saving
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.editSaveBtnText}>Save Changes</Text>
                                }
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Author row ─────────────────────────────────────────────── */}
            <View style={styles.authorRow}>
                {/* Avatar */}
                <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.8}>
                    <ExpoImage
                        source={{ uri: displayUser.avatar }}
                        style={styles.authorAvatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                </TouchableOpacity>

                {/* Name + username + timestamp */}
                <View style={styles.authorInfo}>
                    {/* Top row: full name + verified badge + @username */}
                    <View style={styles.authorNameRow}>
                        <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.7}>
                            <Text style={styles.authorFullName} numberOfLines={1}>
                                {displayUser.full_name}
                            </Text>
                        </TouchableOpacity>

                        {displayUser.verified && (
                            <View style={styles.verifiedIconInline}>
                                <SvgIcon name="verified" width={16} height={16} color={AppDetails.primaryColor} />
                            </View>
                        )}

                        <Text style={styles.userUsername} numberOfLines={1} ellipsizeMode="tail">
                            @{CleanText(displayUser.username || post?.user?.username || '')}
                        </Text>

                        {isPagePost && (
                            <View style={styles.pageBadge}>
                                <Ionicons name="storefront-outline" size={10} color={Colors.primary} />
                                <Text style={styles.pageBadgeText}>Page</Text>
                            </View>
                        )}
                    </View>

                    {/* Context row: action text + group/event link */}
                    {(actionText || post.type === 'group' || post.context?.type === 'event') && (
                        <View style={styles.bottomUserRow}>
                            {!!actionText && <Text style={styles.actionText}>{actionText}</Text>}
                            {post.type === 'group' ? (
                                <Link
                                    to={{ screen: 'GroupScreen', params: { contextId: post.context.id, contextType: post.context.type } }}
                                    style={styles.feedContextWrapper}
                                >
                                    <Text style={styles.feedContextText} numberOfLines={1} ellipsizeMode="tail">
                                        {post.context.name}
                                    </Text>
                                </Link>
                            ) : post.context?.type === 'event' ? (
                                <Link
                                    to={{ screen: 'GroupScreen', params: { contextId: post.context.id, contextType: post.context.type } }}
                                    style={styles.feedContextContainer}
                                >
                                    <Text style={styles.feedContextText}>{CleanText(post.context.title)}</Text>
                                </Link>
                            ) : null}
                        </View>
                    )}

                    {/* Timestamp */}
                    <Text style={styles.timestamp}>
                        {CalculateElapsedTime(post.created)}
                    </Text>
                </View>

                {/* Options button */}
                <TouchableOpacity style={styles.optionsBtn} onPress={() => setOptionsVisible(true)} activeOpacity={0.7}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={Colors.secondaryText} />
                </TouchableOpacity>
            </View>
            
            {/* ── Media (picture / video / shared / article etc.) ── */}
            <View>
                 {post.type === 'shared'   ? (

                     <CommentSharedPostItem post={post.shared_post} isLeaving={isLeaving} parentFeedId={post.id} />

                ) : post.type === 'article' ? (
                    <CommentArticleItem post={post} />
                ) : post.type === 'poll' ? (
                    <CommentPollItem post={post} />
                ) : post.type ==='product' ? (

                    <CommentProductItem post={post} />
                ) : post.type ==='page_cover' ? (

                    <CommentPageCoverItem post={post} />

                ) : post.type === "event_cover" ? (

                    <CommentEventPostCoverContent post={post} />
                ) : post.type === "job" ?(

                    <CommentJobPostContent post={post} />

                ) : post.type === "media" ? (

                <CommentMediaLinkContent text={post.text} />
                ) :

                (
                (() => {
                    const isVideo = post.type === 'video' || post.type === 'reel';
                    if (isVideo) {
                        const mediaItem = post.media && post.media[0];
                        return mediaItem ? <CommentVideoItem
                            videoUrl={mediaItem.video_url}
                            thumbnail={mediaItem.thumbnail}
                            isLeaving={isLeaving}
                            feedId={post.id}
                            isReel={post.type === 'reel'}
                        /> : null;
                    }

                    if (post.media && post.media?.length > 0) {
                        return (
                            <PhotoPostContent
                                media={post.media}
                                imageWidth={screenWidth}
                                onImagePress={(url) => setViewingImage(url)}
                            />
                        );
                    }

                    return null;
                })()
            )}

            </View>

            {/* Post body — inline hashtags are tappable */}
            {!!postText && (
                <View style={styles.textBlock}>
                    <Text style={styles.postBody} numberOfLines={textExpanded ? undefined : 4}>
                        {postText.split(/(\s+)/).map((seg, i) => {
                            if (/^#\w+/.test(seg)) {
                                const tag = seg.slice(1);
                                return (
                                    <Text
                                        key={i}
                                        style={styles.inlineHashtag}
                                        onPress={() => navigation.navigate('SearchScreen', { initialTab: 'posts', initialQuery: tag })}
                                    >
                                        {seg}
                                    </Text>
                                );
                            }
                            return <Text key={i}>{seg}</Text>;
                        })}
                    </Text>
                    {!textExpanded && postText.length > 200 && (
                        <TouchableOpacity onPress={() => setTextExpanded(true)} activeOpacity={0.7} style={styles.readMoreBtn}>
                            <Text style={styles.readMore}>Read more</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Hashtag chips */}
            {post.hashtags?.length > 0 && (
                <View style={styles.hashtagsRow}>
                    {post.hashtags.map((tag, i) => (
                        <TouchableOpacity
                            key={`${tag}-${i}`}
                            activeOpacity={0.7}
                            style={styles.hashtagChipWrap}
                            onPress={() => navigation.navigate('SearchScreen', { initialTab: 'posts', initialQuery: tag })}
                        >
                            <Text style={styles.hashtagChip}>#{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* ── Link Preview (YouTube / Spotify / generic OG card) ── */}
            {extractedUrl && !(post.media && post.media.length > 0) && post.type !== 'shared' && post.type !== 'article' && post.type !== 'product' ? (
                <View style={{ marginHorizontal: horizontalPadding }}>
                    <LinkPreview url={extractedUrl} />
                </View>
            ) : null}

            {/* Engagement bar — same component as feedcard (summary row + 5 actions) */}
            <View style={{ paddingHorizontal: horizontalPadding }}>
                <EngagementBar
                    feedId={post.id}
                    initialLiked={!!(post.is_liked || post.my_reaction || post.user_reaction)}
                    initialLikeCount={totalLikes(post.reactions, post.likes_count)}
                    commentsCount={post.comments_count ?? 0}
                    sharesCount={Number(post.shares ?? post.shares_count ?? post.share_count ?? 0)}
                    isSaved={!!post.is_saved}
                    myReaction={post.my_reaction ?? post.user_reaction ?? null}
                    reactions={post.reactions}
                    viewsCount={post.views_count ?? post.view_count ?? post.views ?? 0}
                    onCommentPress={() => textInputRef?.current?.focus()}
                    onOpenShare={() => setShareModalVisible(true)}
                    onReactionsPress={() => setReactionsModalVisible(true)}
                    onRepost={() => setRepostModalVisible(true)}
                    onCollectionSave={() => setSaveCollectionsModalVisible(true)}
                />
            </View>

            <ImageViewModal
                isVisible={!!viewingImage}
                onClose={() => setViewingImage(null)}
                imageUrl={viewingImage}
            />

            {/* ── Share modal ── */}
            <ShareModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                feed={post}
                onSaveAsImage={() => setSaveImageModalVisible(true)}
            />

            {/* ── Save as Image modal ── */}
            <SaveAsImageModal
                visible={saveImageModalVisible}
                onClose={() => setSaveImageModalVisible(false)}
                feed={post}
            />

            {/* ── Reactions modal ── */}
            <ReactionsModal
                visible={reactionsModalVisible}
                onClose={() => setReactionsModalVisible(false)}
                postId={post.id}
                reactions={post.reactions}
                currentUserId={authUser?.id}
            />

            {/* ── Repost modal ── */}
            <RepostModal
                visible={repostModalVisible}
                postId={post.id}
                onClose={() => setRepostModalVisible(false)}
                onRepostWithComment={() => { setRepostModalVisible(false); setShareModalVisible(true); }}
            />

            {/* ── Save to Collections modal ── */}
            <SaveCollectionsModal
                visible={saveCollectionsModalVisible}
                postId={post.id}
                isSaved={!!post.is_saved}
                onClose={() => setSaveCollectionsModalVisible(false)}
                onSaved={(val) => {
                    const { feeds, updateFeedById } = useStore.getState();
                    const current = feeds.feedsById[post.id];
                    if (current) updateFeedById(post.id, { ...current, is_saved: val });
                }}
            />
        </View>
    );
};


const styles = StyleSheet.create({

    // ── Post wrapper ──────────────────────────────────────────────────────────
    postWrapper: {
        flexDirection: 'column',
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#fff',
        marginBottom: 8,
    },

    // ── Author row ────────────────────────────────────────────────────────────
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: horizontalPadding,
        marginBottom: 12,
    },
    authorAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: Colors.neutral180,
        marginRight: 10,
        flexShrink: 0,
    },
    authorInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    authorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 2,
    },
    authorFullName: {
        fontFamily: AppDetails.fontFamily.heading,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.black,
    },
    verifiedIconInline: {
        marginLeft: 4,
        marginRight: 4,
    },
    userUsername: {
        fontSize: 12,
        color: 'gray',
        fontFamily: AppDetails.fontFamily.bodyItalic,
        marginLeft: 4,
        flexShrink: 1,
    },
    pageBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: Colors.primary + '14',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    pageBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.primary,
    },
    timestamp: {
        fontSize: 12,
        color: Colors.secondaryText,
        fontFamily: AppDetails.fontFamily.body,
        marginTop: 3,
    },

    // ── Context / action ──────────────────────────────────────────────────────
    bottomUserRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 2,
    },
    actionText: {
        color: AppDetails.bodyColor,
        fontFamily: AppDetails.fontFamily.body,
        fontSize: 13,
    },
    feedContextText: {
        fontSize: 13,
        flexWrap: 'wrap',
        marginLeft: 4,
        color: AppDetails.linkColor,
        fontFamily: AppDetails.fontFamily.body,
    },

    // ── Post text ─────────────────────────────────────────────────────────────
    textBlock: {
        marginHorizontal: horizontalPadding,
        marginTop: 14,
        marginBottom: 6,
    },
    postBody: {
        fontSize: 16,
        fontFamily: AppDetails.fontFamily.body,
        color: Colors.deepSlate ?? Colors.black,
        lineHeight: 26,
        letterSpacing: 0.1,
    },
    readMoreBtn: {
        marginTop: 6,
    },
    readMore: {
        color: Colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },

    // ── Options button ────────────────────────────────────────────────────────
    optionsBtn: {
        padding: 6,
        marginLeft: 4,
        alignSelf: 'flex-start',
    },

    // ── Options modal ─────────────────────────────────────────────────────────
    optionsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    optionsSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingVertical: 8,
        paddingBottom: 28,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 22,
        paddingVertical: 16,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primaryDark,
    },
    optionDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.borderLight ?? '#EBEBEB',
        marginHorizontal: 16,
    },

    // ── Edit post modal ───────────────────────────────────────────────────────
    editSheet: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 20,
        paddingBottom: 32,
    },
    editHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    editTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.primaryDark,
    },
    editInput: {
        borderWidth: 1,
        borderColor: Colors.borderLight ?? '#EBEBEB',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: Colors.black,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 14,
    },
    editSaveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    editSaveBtnText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 15,
    },

    // ── Hashtags ──────────────────────────────────────────────────────────────
    inlineHashtag: {
        color: Colors.primary,
        fontWeight: '700',
    },
    hashtagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginHorizontal: horizontalPadding,
        marginTop: 10,
        marginBottom: 6,
    },
    hashtagChipWrap: {
        backgroundColor: Colors.primary + '12',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    hashtagChip: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

})

export default CommentMainPostContent;

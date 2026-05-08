import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  Share,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";
import {
  getBusinessDetails,
  getBusinessFeed,
  followBusiness,
  unfollowBusiness,
  updatePage,
} from "./Businessapi";
import PostComposerModal from "../home/PostComposerModal";
import UploadMediaController from "../../controllers/uploadmediacontroller";
import FeedCard from "../home/feeds/feedcard.jsx";
import CommentModal from "../home/feeds/comments/commentmodal.jsx";
import { Colors } from "../../theme";

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = "#F4F8F8";
const CARD = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border ?? "#E3ECEC";
const TEXT = Colors.black;
const MUTED = Colors.secondaryText;
const WHITE = Colors.white;
const BLACK = Colors.black;
const GOLD = "#F2A900";
const GREEN = "#18A957";
const WA = "#25D366";
const RED = "#E5484D";

const { width: SCREEN_W } = Dimensions.get("window");
const COVER_H = 270;
const AVATAR_S = 92;
const TABS = [
  { key: "posts", label: "Feed", icon: "albums-outline" },
  { key: "info", label: "Info", icon: "sparkles-outline" },
  { key: "contact", label: "Contact", icon: "call-outline" },
];
const FEED_FILTERS = [
  { key: "all", label: "All" },
  { key: "photos", label: "Photos" },
  { key: "video", label: "Videos" },
  { key: "reel", label: "Reels" },
];
const DEFAULT_AVATAR = "https://hafrik.com/default-avatar.png";

const decodeHtml = (str) => {
  if (str == null) return "";
  return String(str)
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};

const cleanText = (str) => {
  if (str == null) return "";
  return decodeHtml(String(str).replace(/<\/?[^>]+(>|$)/g, "").trim());
};

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const firstPresent = (...values) => values.find((v) => cleanText(v).length > 0);

const SectionTitle = ({ icon, title, right }) => (
  <View style={st.sectionTitleRow}>
    <View style={st.sectionTitleLeft}>
      <View style={st.sectionTitleIcon}>
        <Ionicons name={icon} size={15} color={ACCENT} />
      </View>
      <Text style={st.sectionTitle}>{title}</Text>
    </View>
    {right}
  </View>
);

const Metric = ({ value, label }) => (
  <View style={st.metric}>
    <Text style={st.metricValue}>{value}</Text>
    <Text style={st.metricLabel}>{label}</Text>
  </View>
);

const InfoChip = ({ icon, label, tone = ACCENT }) => (
  <View style={[st.infoChip, { backgroundColor: `${tone}12`, borderColor: `${tone}25` }]}>
    <Ionicons name={icon} size={12} color={tone} />
    <Text style={[st.infoChipText, { color: tone }]} numberOfLines={1}>{label}</Text>
  </View>
);

const ContactAction = ({ icon, label, sub, color = ACCENT, onPress, disabled }) => (
  <TouchableOpacity
    style={[st.contactAction, disabled && st.disabledAction]}
    onPress={onPress}
    activeOpacity={disabled ? 1 : 0.82}
    disabled={disabled}
  >
    <View style={[st.contactActionIcon, { backgroundColor: `${color}14` }]}>
      <Ionicons name={icon} size={19} color={disabled ? MUTED : color} />
    </View>
    <Text style={st.contactActionLabel}>{label}</Text>
    {!!sub && <Text style={st.contactActionSub} numberOfLines={1}>{sub}</Text>}
  </TouchableOpacity>
);

const DetailRow = ({ icon, title, value, onPress, color = ACCENT }) => {
  if (!value) return null;
  return (
    <TouchableOpacity style={st.detailRow} onPress={onPress} activeOpacity={onPress ? 0.76 : 1}>
      <View style={[st.detailIcon, { backgroundColor: `${color}13` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={st.detailTextWrap}>
        <Text style={st.detailTitle}>{title}</Text>
        <Text style={[st.detailValue, onPress && st.detailLink]} numberOfLines={2}>{value}</Text>
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={16} color={MUTED} />}
    </TouchableOpacity>
  );
};

const SkeletonHeader = () => (
  <View style={st.skeletonWrap}>
    <View style={st.skeletonHero} />
    <View style={st.skeletonCard}>
      <ActivityIndicator color={ACCENT} />
      <Text style={st.skeletonText}>Loading business page...</Text>
    </View>
  </View>
);

export default function BusinessDetails({ route }) {
  const { pageId } = route.params || {};
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { top } = useSafeAreaInsets();
  const openComposer = useStore((s) => s.openComposer);
  const refreshSignal = useStore((s) => s.refreshSignal);
  const lastCreatedPost = useStore((s) => s.lastCreatedPost);
  const clearLastCreatedPost = useStore((s) => s.clearLastCreatedPost);

  const [page, setPageData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [feedFilter, setFeedFilter] = useState("all");
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [visiblePostId, setVisiblePostId] = useState(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const feedFilterRef = useRef("all");
  const followRef = useRef({ following: false, followLoading: false });
  const prevRefreshSignal = useRef(0);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70, waitForInteraction: false });

  feedFilterRef.current = feedFilter;
  followRef.current = { following, followLoading };

  const headerOpacity = scrollY.interpolate({
    inputRange: [COVER_H - 90, COVER_H - 30],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const coverScale = scrollY.interpolate({
    inputRange: [-90, 0],
    outputRange: [1.18, 1],
    extrapolate: "clamp",
  });

  const pageTitle = cleanText(page?.title) || "Business";
  const pageHandle = cleanText(page?.name || page?.username || page?.slug);
  const category = cleanText(page?.category || page?.page_category || page?.type || page?.business_category);
  const about = cleanText(page?.about || page?.description || page?.bio);
  const phone = cleanText(firstPresent(page?.phone, page?.phone_number, page?.contact_phone, page?.mobile));
  const address = cleanText(firstPresent(page?.address, page?.full_address, page?.location, page?.city));
  const email = cleanText(page?.email);
  const website = cleanText(firstPresent(page?.website, page?.url, page?.web));
  const hours = cleanText(firstPresent(page?.opening_hours, page?.hours, page?.business_hours));
  const cover = page?.cover || page?.cover_image || page?.image;
  const avatar = page?.avatar || page?.logo || DEFAULT_AVATAR;
  const isVerified = page?.verified === true || page?.verified === 1 || page?.verified_value === 1;
  const isOwner = !!page && (
    page.is_owner === true ||
    page.is_owner === 1 ||
    (user?.id && String(page.user_id) === String(user.id))
  );
  const isAdmin = !!page && (page.is_admin === true || page.is_admin === 1);
  const canPost = isOwner || isAdmin || page?.can_post === true || page?.can_post === 1;

  const postsCount = Number(page?.posts ?? page?.posts_count ?? 0);
  const followersCount = Number(page?.likes ?? page?.followers ?? page?.followers_count ?? page?.likes_count ?? 0);
  const rating = Number(page?.rating ?? page?.avg_rating ?? 0);

  const loadFeed = useCallback(async (pNum = 1, filter = feedFilterRef.current) => {
    if (!pageId) return;
    if (pNum === 1) setLoadingFeed(true);
    else setLoadingMore(true);
    try {
      const payload = await getBusinessFeed(pageId, pNum, 10, filter);
      if (payload?.status === "success") {
        const feedPosts = Array.isArray(payload.data?.data)
          ? payload.data.data
          : Array.isArray(payload.data)
            ? payload.data
            : [];
        setPosts((prev) => (pNum === 1 ? feedPosts : [...prev, ...feedPosts]));
        if (pNum === 1 && payload.data?.is_liked != null) setFollowing(!!payload.data.is_liked);
        if (pNum === 1 && payload.data?.is_following != null) setFollowing(!!payload.data.is_following);
        const totalPages = payload.data?.total_pages;
        setHasMore(totalPages != null ? pNum < totalPages : feedPosts.length >= 10);
      }
    } catch (error) {
      console.log("BUSINESS FEED LOAD ERROR:", error?.response?.data || error?.message || error);
      if (pNum === 1) setPosts([]);
      setHasMore(false);
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  }, [pageId]);

  const loadPage = useCallback(async () => {
    if (!pageId) return;
    setLoadingPage(true);
    try {
      const pageData = await getBusinessDetails(pageId);
      if (pageData) {
        setPageData(pageData);
        setFollowing(!!pageData.is_liked || !!pageData.is_following);
      }
    } catch (error) {
      console.log("BUSINESS PAGE LOAD ERROR:", error?.response?.data || error?.message || error);
    } finally {
      setLoadingPage(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPage();
    loadFeed(1);
  }, [loadPage, loadFeed]);

  useEffect(() => {
    if (refreshSignal > 0 && refreshSignal !== prevRefreshSignal.current) {
      prevRefreshSignal.current = refreshSignal;
      loadFeed(1);
    }
  }, [refreshSignal, loadFeed]);

  useEffect(() => {
    if (!lastCreatedPost) return;
    const { post, target_type, target_id } = lastCreatedPost;
    if (target_type === "page" && String(target_id) === String(pageId)) {
      setPosts((prev) => [post, ...prev.filter((p) => String(p.id) !== String(post.id))]);
      setPageData((p) => p ? { ...p, posts: Number(p.posts ?? 0) + 1 } : p);
      setActiveTab("posts");
    }
    clearLastCreatedPost();
  }, [lastCreatedPost, pageId, clearLastCreatedPost]);

  const openPageComposer = useCallback(() => {
    openComposer({
      target_type: "page",
      target_id: pageId,
      title: pageTitle,
      avatar,
      locked: true,
    });
  }, [openComposer, pageId, pageTitle, avatar]);

  const openEditModal = useCallback(() => {
    setEditTitle(page?.title ?? "");
    setEditAbout(page?.about ?? "");
    setShowEdit(true);
  }, [page]);

  const handleUpdatePage = useCallback(async () => {
    if (editSaving) return;
    setEditSaving(true);
    try {
      const res = await updatePage({ page_id: pageId, title: editTitle.trim(), about: editAbout.trim() });
      if (res?.status === "success" || res?.data) {
        setPageData((p) => p ? { ...p, title: editTitle.trim(), about: editAbout.trim() } : p);
        setShowEdit(false);
      }
    } catch (error) {
      console.log("UPDATE PAGE ERROR:", error?.response?.data || error?.message || error);
    } finally {
      setEditSaving(false);
    }
  }, [pageId, editTitle, editAbout, editSaving]);

  const pickAndUploadImage = useCallback(async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === "cover" ? [16, 9] : [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    if (field === "avatar") setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const up = await UploadMediaController(
        { uri: asset.uri, fileName: asset.fileName || "image.jpg", type: asset.mimeType || "image/jpeg" },
        token,
        null,
        "photo",
      );
      if (up?.status === "success" && up?.data?.url) {
        await updatePage({ page_id: pageId, [field]: up.data.url });
        setPageData((p) => p ? { ...p, [field]: up.data.url } : p);
      }
    } catch (error) {
      console.log("BUSINESS IMAGE UPLOAD ERROR:", error?.response?.data || error?.message || error);
    } finally {
      if (field === "avatar") setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  }, [pageId, token]);

  const handleFeedFilter = useCallback((filter) => {
    setFeedFilter(filter);
    feedFilterRef.current = filter;
    setPosts([]);
    setPageNum(1);
    setHasMore(true);
    loadFeed(1, filter);
  }, [loadFeed]);

  const handleLoadMore = useCallback(() => {
    if (activeTab !== "posts" || loadingMore || !hasMore) return;
    const next = pageNum + 1;
    setPageNum(next);
    loadFeed(next);
  }, [activeTab, loadingMore, hasMore, pageNum, loadFeed]);

  const handleFollow = useCallback(async () => {
    const { followLoading: curLoad, following: curFollowing } = followRef.current;
    if (curLoad || canPost) return;
    setFollowLoading(true);
    setFollowing(!curFollowing);
    try {
      const data = await (curFollowing ? unfollowBusiness(pageId) : followBusiness(pageId));
      if (data?.is_liked != null) setFollowing(!!data.is_liked);
      if (data?.is_following != null) setFollowing(!!data.is_following);
      if (data?.likes != null) setPageData((p) => p ? { ...p, likes: Number(data.likes) } : p);
    } catch (error) {
      console.log("BUSINESS FOLLOW ERROR:", error?.response?.data || error?.message || error);
      setFollowing(curFollowing);
    } finally {
      setFollowLoading(false);
    }
  }, [pageId, canPost]);

  const openUrl = useCallback((url, title = "Hafrik") => {
    if (!url) return;
    const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    navigation.navigate("WebView", { url: safeUrl, title });
  }, [navigation]);

  const handleCall = useCallback(() => {
    if (phone) Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  }, [phone]);

  const handleWhatsApp = useCallback(() => {
    if (phone) Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`);
  }, [phone]);

  const handleEmail = useCallback(() => {
    if (email) Linking.openURL(`mailto:${email}`);
  }, [email]);

  const handleWebsite = useCallback(() => {
    if (website) openUrl(website, pageTitle);
  }, [website, openUrl, pageTitle]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out "${pageTitle}" on Hafrik!\nhttps://hafrik.com/page/${pageId}`,
      });
    } catch {}
  }, [pageTitle, pageId]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const next = viewableItems.find((entry) => entry?.isViewable && entry?.item?.id)?.item?.id ?? null;
    setVisiblePostId((prev) => (prev === next ? prev : next));
  });

  const renderFeedItem = useCallback(({ item }) => (
    <FeedCard feed={item} isVisible={visiblePostId === item?.id} />
  ), [visiblePostId]);

  const renderInfoTab = useMemo(() => {
    const hasInfo = about || category || hours || isVerified || rating > 0;
    if (!hasInfo) {
      return (
        <View style={st.emptyPanel}>
          <Ionicons name="business-outline" size={42} color={BORDER} />
          <Text style={st.emptyPanelTitle}>No business info yet</Text>
          <Text style={st.emptyPanelSub}>This page has not added its public details.</Text>
        </View>
      );
    }

    return (
      <View style={st.panelWrap}>
        {!!about && (
          <View style={st.card}>
            <SectionTitle icon="document-text-outline" title="About this business" />
            <TouchableOpacity activeOpacity={0.82} onPress={() => setAboutExpanded((v) => !v)}>
              <Text style={st.aboutText} numberOfLines={aboutExpanded ? undefined : 5}>{about}</Text>
              {about.length > 160 && (
                <Text style={st.seeMore}>{aboutExpanded ? "Show less" : "Read more"}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={st.card}>
          <SectionTitle icon="sparkles-outline" title="Business profile" />
          <View style={st.chipsWrap}>
            {!!category && <InfoChip icon="pricetag-outline" label={category} />}
            {isVerified && <InfoChip icon="shield-checkmark-outline" label="Verified business" tone={GREEN} />}
            {rating > 0 && <InfoChip icon="star" label={`${rating.toFixed(1)} rating`} tone={GOLD} />}
            {!!hours && <InfoChip icon="time-outline" label={hours} />}
          </View>
        </View>
      </View>
    );
  }, [about, aboutExpanded, category, hours, isVerified, rating]);

  const renderContactTab = useMemo(() => {
    const hasContact = phone || address || website || email;
    if (!hasContact) {
      return (
        <View style={st.emptyPanel}>
          <Ionicons name="call-outline" size={42} color={BORDER} />
          <Text style={st.emptyPanelTitle}>No contact details</Text>
          <Text style={st.emptyPanelSub}>This business has not added contact information yet.</Text>
        </View>
      );
    }

    return (
      <View style={st.panelWrap}>
        <View style={st.card}>
          <SectionTitle icon="chatbubbles-outline" title="Quick contact" />
          <View style={st.contactGrid}>
            <ContactAction icon="call" label="Call" sub={phone || "Not added"} color={GREEN} onPress={handleCall} disabled={!phone} />
            <ContactAction icon="logo-whatsapp" label="WhatsApp" sub={phone || "Not added"} color={WA} onPress={handleWhatsApp} disabled={!phone} />
            <ContactAction icon="globe-outline" label="Website" sub={website || "Not added"} color={ACCENT} onPress={handleWebsite} disabled={!website} />
            <ContactAction icon="mail-outline" label="Email" sub={email || "Not added"} color={BRAND} onPress={handleEmail} disabled={!email} />
          </View>
        </View>

        <View style={st.card}>
          <SectionTitle icon="information-circle-outline" title="Details" />
          <DetailRow icon="location-outline" title="Location" value={address} color={RED} />
          <DetailRow icon="call-outline" title="Phone" value={phone} onPress={handleCall} color={GREEN} />
          <DetailRow icon="globe-outline" title="Website" value={website} onPress={handleWebsite} />
          <DetailRow icon="mail-outline" title="Email" value={email} onPress={handleEmail} color={BRAND} />
        </View>
      </View>
    );
  }, [phone, address, website, email, handleCall, handleWhatsApp, handleWebsite, handleEmail]);

  const listHeader = useMemo(() => {
    if (loadingPage) return <SkeletonHeader />;

    return (
      <View>
        <View style={st.heroWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: coverScale }] }]}>
            {cover ? (
              <ExpoImage
                source={{ uri: cover }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="center"
                cachePolicy="memory-disk"
              />
            ) : (
              <LinearGradient
                colors={[BRAND, "#0C4B4D", ACCENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
          </Animated.View>
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.74)"]}
            style={StyleSheet.absoluteFill}
          />

          {(isOwner || isAdmin) && (
            <TouchableOpacity style={st.coverEditBtn} onPress={() => pickAndUploadImage("cover")} activeOpacity={0.82}>
              {uploadingCover ? <ActivityIndicator size="small" color={WHITE} /> : <Ionicons name="camera" size={18} color={WHITE} />}
            </TouchableOpacity>
          )}

          <View style={st.heroBottom}>
            <View style={st.heroBadge}>
              <Ionicons name="storefront-outline" size={13} color={WHITE} />
              <Text style={st.heroBadgeText}>Hafrik Business Page</Text>
            </View>
            {!!category && <Text style={st.heroCategory} numberOfLines={1}>{category}</Text>}
          </View>
        </View>

        <View style={st.profileShell}>
          <View style={st.identityCard}>
            <View style={st.avatarWrap}>
              <ExpoImage source={{ uri: avatar }} style={st.avatar} contentFit="cover" cachePolicy="memory-disk" />
              {isVerified && (
                <View style={st.verifiedDot}>
                  <Ionicons name="checkmark-circle" size={23} color={ACCENT} />
                </View>
              )}
              {(isOwner || isAdmin) && (
                <TouchableOpacity style={st.avatarEditBtn} onPress={() => pickAndUploadImage("avatar")} activeOpacity={0.82}>
                  {uploadingAvatar ? <ActivityIndicator size="small" color={WHITE} /> : <Ionicons name="camera" size={13} color={WHITE} />}
                </TouchableOpacity>
              )}
            </View>

            <View style={st.identityText}>
              <View style={st.titleRow}>
                <Text style={st.pageTitle} numberOfLines={2}>{pageTitle}</Text>
                {isVerified && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
              </View>
              {!!pageHandle && <Text style={st.handle} numberOfLines={1}>@{pageHandle}</Text>}
              <View style={st.badgeRow}>
                {isVerified && <InfoChip icon="shield-checkmark" label="Verified" tone={GREEN} />}
                {isOwner && <InfoChip icon="person-circle-outline" label="Your page" tone={BRAND} />}
                {!!address && <InfoChip icon="location-outline" label={address} tone={RED} />}
              </View>
            </View>
          </View>

          <View style={st.metricsCard}>
            <Metric value={fmtCount(followersCount)} label="Followers" />
            <View style={st.metricDivider} />
            <Metric value={fmtCount(postsCount)} label="Posts" />
            <View style={st.metricDivider} />
            <Metric value={rating > 0 ? rating.toFixed(1) : "New"} label="Rating" />
          </View>

          <View style={st.actionRow}>
            {(isOwner || isAdmin) && (
              <TouchableOpacity style={st.secondaryAction} onPress={openEditModal} activeOpacity={0.82}>
                <Ionicons name="options-outline" size={16} color={BRAND} />
                <Text style={st.secondaryActionText}>Edit</Text>
              </TouchableOpacity>
            )}

            {canPost ? (
              <TouchableOpacity style={st.mainAction} onPress={openPageComposer} activeOpacity={0.88}>
                <LinearGradient colors={[BRAND, ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.mainActionGradient}>
                  <Ionicons name="create-outline" size={17} color={WHITE} />
                  <Text style={st.mainActionText}>Create Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={st.mainAction} onPress={handleFollow} activeOpacity={0.88} disabled={followLoading}>
                <View style={[st.mainActionGradient, following && st.followingAction]}>
                  {followLoading ? (
                    <ActivityIndicator size="small" color={following ? BRAND : WHITE} />
                  ) : (
                    <>
                      <Ionicons name={following ? "checkmark" : "add"} size={18} color={following ? BRAND : WHITE} />
                      <Text style={[st.mainActionText, following && st.followingActionText]}>{following ? "Following" : "Follow Page"}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {!!phone && (
              <TouchableOpacity style={st.iconAction} onPress={handleCall} activeOpacity={0.82}>
                <Ionicons name="call" size={17} color={GREEN} />
              </TouchableOpacity>
            )}
            {!!phone && (
              <TouchableOpacity style={[st.iconAction, { backgroundColor: `${WA}14` }]} onPress={handleWhatsApp} activeOpacity={0.82}>
                <Ionicons name="logo-whatsapp" size={17} color={WA} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.iconAction} onPress={handleShare} activeOpacity={0.82}>
              <Ionicons name="share-social-outline" size={17} color={BRAND} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={st.tabsCard}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.tabButton, active && st.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.78}
              >
                <Ionicons name={tab.icon} size={15} color={active ? WHITE : MUTED} />
                <Text style={[st.tabButtonText, active && st.tabButtonTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "info" && renderInfoTab}
        {activeTab === "contact" && renderContactTab}

        {activeTab === "posts" && (
          <View style={st.postsHeaderWrap}>
            {canPost && (
              <TouchableOpacity style={st.composeBar} onPress={openPageComposer} activeOpacity={0.84}>
                <ExpoImage source={{ uri: avatar }} style={st.composeAvatar} contentFit="cover" />
                <View style={st.composeTextWrap}>
                  <Text style={st.composeTitle}>Post as {pageTitle}</Text>
                  <Text style={st.composeSub}>Share an update, promo, photo or reel</Text>
                </View>
                <View style={st.composeSend}>
                  <Ionicons name="add" size={18} color={WHITE} />
                </View>
              </TouchableOpacity>
            )}

            <View style={st.feedFilterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.feedFilterScroll}>
                {FEED_FILTERS.map((filter) => {
                  const active = feedFilter === filter.key;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[st.feedFilterChip, active && st.feedFilterChipActive]}
                      onPress={() => handleFeedFilter(filter.key)}
                      activeOpacity={0.78}
                    >
                      <Text style={[st.feedFilterText, active && st.feedFilterTextActive]}>{filter.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {loadingFeed && <ActivityIndicator size="small" color={ACCENT} />}
            </View>
          </View>
        )}
      </View>
    );
  }, [
    loadingPage,
    coverScale,
    cover,
    isOwner,
    isAdmin,
    uploadingCover,
    pickAndUploadImage,
    category,
    avatar,
    isVerified,
    uploadingAvatar,
    pageTitle,
    pageHandle,
    address,
    followersCount,
    postsCount,
    rating,
    openEditModal,
    canPost,
    openPageComposer,
    handleFollow,
    followLoading,
    following,
    phone,
    handleCall,
    handleWhatsApp,
    handleShare,
    activeTab,
    renderInfoTab,
    renderContactTab,
    feedFilter,
    handleFeedFilter,
    loadingFeed,
  ]);

  const listData = activeTab === "posts" ? posts : [];

  return (
    <View style={st.root}>
      <Animated.View style={[st.stickyHeader, { paddingTop: top + 8, opacity: headerOpacity }]}>
        <Text style={st.stickyTitle} numberOfLines={1}>{pageTitle}</Text>
      </Animated.View>

      <TouchableOpacity style={[st.navBack, { top: top + 10 }]} onPress={() => navigation.goBack()} activeOpacity={0.86}>
        <Ionicons name="arrow-back" size={19} color={WHITE} />
      </TouchableOpacity>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => `business-post-${item?.id ?? item?.post_id ?? index}-${index}`}
        renderItem={renderFeedItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={loadingMore && activeTab === "posts" ? <ActivityIndicator color={ACCENT} style={st.footerLoader} /> : null}
        ListEmptyComponent={
          activeTab === "posts" && !loadingFeed ? (
            <View style={st.emptyPanel}>
              <Ionicons name="newspaper-outline" size={42} color={BORDER} />
              <Text style={st.emptyPanelTitle}>No posts yet</Text>
              <Text style={st.emptyPanelSub}>Updates from this business will appear here.</Text>
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.45}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        extraData={visiblePostId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      />

      <CommentModal />
      <PostComposerModal />

      <Modal
        visible={showEdit}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEdit(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView style={st.editOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={st.editSheet}>
            <View style={st.editHeader}>
              <View>
                <Text style={st.editTitle}>Edit business page</Text>
                <Text style={st.editSub}>Keep your public profile fresh</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEdit(false)} style={st.editCloseBtn} activeOpacity={0.72}>
                <Ionicons name="close" size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.editBody}>
              <Text style={st.editLabel}>Page name</Text>
              <TextInput
                style={st.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter page name"
                placeholderTextColor={MUTED}
              />

              <Text style={st.editLabel}>About</Text>
              <TextInput
                style={[st.editInput, st.editInputMulti]}
                value={editAbout}
                onChangeText={setEditAbout}
                placeholder="Describe your business"
                placeholderTextColor={MUTED}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[st.saveBtn, editSaving && st.disabledSave]}
              onPress={handleUpdatePage}
              disabled={editSaving}
              activeOpacity={0.86}
            >
              {editSaving ? <ActivityIndicator color={WHITE} /> : <Text style={st.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 120 },

  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: BRAND,
    paddingHorizontal: 68,
    paddingBottom: 12,
    alignItems: "center",
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  stickyTitle: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  navBack: {
    position: "absolute",
    left: 14,
    zIndex: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  heroWrap: {
    width: SCREEN_W,
    height: COVER_H,
    overflow: "hidden",
    backgroundColor: BRAND,
  },
  heroBottom: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 56,
    gap: 8,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "ReadexPro-Bold",
  },
  heroCategory: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "ReadexPro-Medium",
  },
  coverEditBtn: {
    position: "absolute",
    right: 16,
    bottom: 58,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },

  profileShell: {
    marginTop: -44,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  identityCard: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 14,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 9,
  },
  avatarWrap: { width: AVATAR_S, height: AVATAR_S, position: "relative" },
  avatar: {
    width: AVATAR_S,
    height: AVATAR_S,
    borderRadius: 26,
    backgroundColor: BORDER,
    borderWidth: 3,
    borderColor: WHITE,
  },
  verifiedDot: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBtn: {
    position: "absolute",
    right: -3,
    top: -3,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: WHITE,
  },
  identityText: { flex: 1, justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  pageTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: -0.4,
    fontFamily: "ReadexPro-Bold",
  },
  handle: {
    color: MUTED,
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "ReadexPro-Medium",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },

  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "ReadexPro-Bold",
    maxWidth: 160,
  },

  metricsCard: {
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  metric: { flex: 1, alignItems: "center", gap: 3 },
  metricValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  metricLabel: {
    color: MUTED,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "800",
    fontFamily: "ReadexPro-Bold",
  },
  metricDivider: { width: 1, height: 30, backgroundColor: BORDER },

  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  mainAction: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  mainActionGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 24,
    backgroundColor: BRAND,
  },
  mainActionText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  followingAction: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  followingActionText: { color: BRAND },
  secondaryAction: {
    height: 48,
    paddingHorizontal: 15,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryActionText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  iconAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  tabsCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 6,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: BRAND,
  },
  tabButtonText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  tabButtonTextActive: { color: WHITE },

  panelWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  sectionTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: `${ACCENT}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  aboutText: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 23,
    fontFamily: "ReadexPro-Regular",
  },
  seeMore: {
    color: ACCENT,
    marginTop: 8,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contactAction: {
    width: (SCREEN_W - 14 * 2 - 16 * 2 - 10 - 2) / 2,
    backgroundColor: BG,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 104,
  },
  disabledAction: { opacity: 0.55 },
  contactActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  contactActionLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  contactActionSub: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
    fontFamily: "ReadexPro-Regular",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextWrap: { flex: 1 },
  detailTitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "ReadexPro-Bold",
  },
  detailValue: {
    color: TEXT,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 19,
    fontFamily: "ReadexPro-Regular",
  },
  detailLink: { color: ACCENT, fontWeight: "800", fontFamily: "ReadexPro-Bold" },

  postsHeaderWrap: { paddingHorizontal: 14, gap: 10, paddingBottom: 8 },
  composeBar: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: BORDER,
  },
  composeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: BORDER,
  },
  composeTextWrap: { flex: 1 },
  composeTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  composeSub: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
    fontFamily: "ReadexPro-Regular",
  },
  composeSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  feedFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedFilterScroll: { gap: 8, paddingRight: 8 },
  feedFilterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  feedFilterChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  feedFilterText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  feedFilterTextActive: { color: WHITE },

  emptyPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: CARD,
    borderRadius: 24,
    paddingVertical: 42,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyPanelTitle: {
    color: TEXT,
    marginTop: 12,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  emptyPanelSub: {
    color: MUTED,
    textAlign: "center",
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "ReadexPro-Regular",
  },
  footerLoader: { paddingVertical: 22 },

  skeletonWrap: { backgroundColor: BG },
  skeletonHero: { height: COVER_H, backgroundColor: BRAND },
  skeletonCard: {
    marginHorizontal: 14,
    marginTop: -38,
    backgroundColor: CARD,
    borderRadius: 26,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  skeletonText: {
    color: MUTED,
    fontSize: 13,
    fontFamily: "ReadexPro-Regular",
  },

  editOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  editSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 30,
    maxHeight: "82%",
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  editTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
  editSub: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
    fontFamily: "ReadexPro-Regular",
  },
  editCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  editBody: { padding: 20, gap: 8 },
  editLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "ReadexPro-Bold",
  },
  editInput: {
    backgroundColor: BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT,
    fontSize: 14,
    fontFamily: "ReadexPro-Regular",
    marginBottom: 12,
  },
  editInputMulti: {
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  saveBtn: {
    marginHorizontal: 20,
    borderRadius: 999,
    backgroundColor: BRAND,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabledSave: { opacity: 0.65 },
  saveBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: "900",
    fontFamily: "ReadexPro-Bold",
  },
});

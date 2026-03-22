/**
 * BackgroundUploadManager
 * ──────────────────────────────────────────────────────────────────────────────
 * Runs the full upload-then-post flow in the background so the user can
 * navigate freely while it finishes.
 *
 * Flow:
 *   1. Upload all media files (photos in parallel, video+thumb sequentially)
 *   2. Build the final post body with the returned URLs
 *   3. Call posts/create.php to publish
 *
 * Progress updates are pushed into the Zustand store (activeUpload) so the
 * mounted <GlobalUploadBanner /> can render real-time progress.
 */

import UploadMediaController from '../controllers/uploadmediacontroller';
import PostFeedController from '../controllers/postfeedcontroller';
import useStore from '../repository/store';

/**
 * Kick off a background upload + post creation.
 *
 * @param {Object}   params
 * @param {Object}   params.postBody       – base post body (type, target_type, text, location, target_id …)
 * @param {string}   params.activeTab      – 'text' | 'photos' | 'video' | 'reel'
 * @param {Array}    params.selectedImages  – array of image objects (for photos tab)
 * @param {Object}   params.selectedVideo   – video object (for video / reel tab)
 * @param {Object}   params.selectedThumbnail – thumbnail object or null
 * @param {string}   params.selectedCategory  – category id (video only)
 * @param {string}   params.token           – auth token
 */
export async function startBackgroundUpload({
    postBody,
    activeTab,
    selectedImages = [],
    selectedVideo = null,
    selectedThumbnail = null,
    selectedCategory = null,
    token,
}) {
    const { startUpload, updateUploadProgress, completeUpload, failUpload, triggerRefresh } =
        useStore.getState();

    // Friendly labels
    const labelMap = {
        text: 'Publishing post…',
        photos: `Uploading ${selectedImages.length} photo${selectedImages.length > 1 ? 's' : ''}…`,
        video: 'Uploading video…',
        reel: 'Uploading reel…',
    };
    startUpload(labelMap[activeTab] || 'Uploading…');

    try {
        // ── PHOTOS — upload all in parallel ────────────────────────────────
        if (activeTab === 'photos' && selectedImages.length > 0) {
            const total = selectedImages.length;
            // Track per-file progress for accurate overall %
            const fileProgress = new Array(total).fill(0);

            const recalcPct = () => {
                const sum = fileProgress.reduce((a, b) => a + b, 0);
                // Scale upload portion to 0-90% (reserve 10% for publishing)
                return (sum / total) * 90;
            };

            updateUploadProgress({ done: 0, total, pct: 0 });

            const uploadPromises = selectedImages.map((img, i) =>
                UploadMediaController(
                    img,
                    token,
                    (progressEvent) => {
                        if (progressEvent.total) {
                            fileProgress[i] = progressEvent.loaded / progressEvent.total;
                            updateUploadProgress({ pct: recalcPct() });
                        }
                    },
                    'photo',   // explicit upload type
                ).then((res) => {
                    fileProgress[i] = 1;
                    updateUploadProgress({
                        done: fileProgress.filter(p => p >= 1).length,
                        total,
                        pct: recalcPct(),
                    });
                    if (res.status === 'success' && res.data?.url) return res.data.url;
                    throw new Error(`Photo ${i + 1} upload failed`);
                }),
            );

            const urls = await Promise.all(uploadPromises);
            postBody.media = urls;

        // ── VIDEO / REEL — sequential upload ───────────────────────────────
        } else if (activeTab === 'video' || activeTab === 'reel') {
            const uploadType = activeTab === 'reel' ? 'reel' : 'video';
            const total = selectedThumbnail ? 2 : 1;
            updateUploadProgress({ done: 0, total, pct: 0 });

            // 1. Upload video
            updateUploadProgress({ label: `Uploading ${activeTab}…` });
            const vidRes = await UploadMediaController(
                selectedVideo,
                token,
                (progressEvent) => {
                    if (progressEvent.total) {
                        const fileFraction = progressEvent.loaded / progressEvent.total;
                        const overallPct = (fileFraction / total) * 90;
                        updateUploadProgress({ pct: overallPct });
                    }
                },
                uploadType,
            );

            if (vidRes.status !== 'success' || !vidRes.data?.url) {
                throw new Error('Video upload failed. Please try again.');
            }

            postBody.video_url = vidRes.data.url;
            // Use server-generated thumbnail as fallback
            const serverThumbUrl = vidRes.data.thumbnail_url || null;

            updateUploadProgress({ done: 1, total, pct: (1 / total) * 90 });

            // 2. Upload custom thumbnail (if user picked one)
            if (selectedThumbnail) {
                updateUploadProgress({ label: 'Uploading thumbnail…' });
                const tRes = await UploadMediaController(
                    selectedThumbnail,
                    token,
                    (progressEvent) => {
                        if (progressEvent.total) {
                            const fileFraction = progressEvent.loaded / progressEvent.total;
                            const overallPct = ((1 + fileFraction) / total) * 90;
                            updateUploadProgress({ pct: overallPct });
                        }
                    },
                    'thumbnail',
                );
                if (tRes.status === 'success' && tRes.data?.url) {
                    postBody.thumbnail = tRes.data.url;
                } else {
                    // Fall back to server-generated thumbnail
                    if (serverThumbUrl) postBody.thumbnail = serverThumbUrl;
                }
                updateUploadProgress({ done: 2, total, pct: 90 });
            } else if (serverThumbUrl) {
                // No custom thumbnail — use server's auto-generated one
                postBody.thumbnail = serverThumbUrl;
            }

            if (activeTab === 'video' && selectedCategory) {
                postBody.category_id = selectedCategory;
            }
        }

        // ── PUBLISH ────────────────────────────────────────────────────────
        updateUploadProgress({ phase: 'publishing', pct: 92, label: 'Publishing your post…' });

        const response = await PostFeedController(postBody, token);

        if (response.status === 'success' || response.httpStatus === 200) {
            completeUpload();

            // Try optimistic prepend — if API returned the full post object use it;
            // otherwise fall back to triggerRefresh so the feed reloads.
            const createdPost = response.data?.post ?? response.data;
            if (createdPost && createdPost.id) {
                useStore.getState().setLastCreatedPost(
                    createdPost,
                    postBody.target_type ?? 'profile',
                    postBody.target_id   ?? null,
                );
            } else {
                triggerRefresh();
            }

            // Auto-dismiss after 2.5 s
            setTimeout(() => {
                useStore.getState().clearUpload();
            }, 2500);
        } else {
            failUpload(response.data?.message || response.message || 'Post failed. Please try again.');
        }
    } catch (err) {
        useStore.getState().failUpload(err?.message || 'Something went wrong. Please try again.');
    }
}

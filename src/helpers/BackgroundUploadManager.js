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
import { navigate } from './navigationRef';
// Lazy-load compressor — only available after pod install + native rebuild.
// Falls back gracefully (no compression) if the native module isn't linked yet.
let VideoCompressor = null;
try {
    VideoCompressor = require('react-native-compressor').Video;
} catch {
    // Native module not linked — compression skipped until app is rebuilt
}

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
    pollOptions: _pollOptions = [],
}) {
    const { startUpload, updateUploadProgress, completeUpload, failUpload, triggerRefresh } =
        useStore.getState();

    // Friendly labels
    const labelMap = {
        text:   'Publishing post…',
        photos: `Uploading ${selectedImages.length} photo${selectedImages.length > 1 ? 's' : ''}…`,
        video:  'Compressing video…',
        reel:   'Compressing reel…',
        poll:   'Creating poll…',
    };
    startUpload(labelMap[activeTab] || 'Uploading…');

    let fallbackProgressTimer = null;
    const stopFallbackProgress = () => {
        if (fallbackProgressTimer) {
            clearInterval(fallbackProgressTimer);
            fallbackProgressTimer = null;
        }
    };

    // Labels shown while the upload is still in-flight at 99% — rotated every
    // LABEL_INTERVAL_TICKS ticks so the user knows it hasn't frozen.
    const WAITING_LABELS = [
        'Uploading large file…',
        'Still uploading, please wait…',
        'Large file – this may take a while…',
        'Upload in progress, hang tight…',
        'Almost done – server is receiving your file…',
    ];
    const LABEL_INTERVAL_TICKS = 8; // rotate label every ~10 s (8 × 1200 ms)

    const startFallbackProgress = (from = 2, to = 82, step = 3) => {
        stopFallbackProgress();
        let pct = from;
        let ticksAtCeiling = 0;
        updateUploadProgress({ pct });
        fallbackProgressTimer = setInterval(() => {
            if (pct < to) {
                pct = Math.min(to, pct + step);
                updateUploadProgress({ pct: Math.round(pct * 10) / 10 });
            } else if (pct < 99) {
                // Crawl slowly to 99 while the server is still receiving the file.
                pct = Math.min(99, pct + 0.2);
                updateUploadProgress({
                    pct: Math.round(pct * 10) / 10,
                    label: 'Uploading large file…',
                });
            } else {
                // Pinned at 99 — keep the interval alive and rotate labels so the
                // user can see the upload is still active (not frozen / crashed).
                ticksAtCeiling += 1;
                const labelIdx = Math.floor(ticksAtCeiling / LABEL_INTERVAL_TICKS) % WAITING_LABELS.length;
                updateUploadProgress({
                    pct: 99,
                    label: WAITING_LABELS[labelIdx],
                });
            }
        }, 1200);
    };

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

        // ── VIDEO / REEL — compress → upload sequentially ──────────────────
        } else if (activeTab === 'video' || activeTab === 'reel') {
            const uploadType = activeTab === 'reel' ? 'reel' : 'video';
            const total = selectedThumbnail ? 2 : 1;
            updateUploadProgress({ done: 0, total, pct: 0 });

            // Strip iOS metadata fragments from the URI (e.g. spatial/immersive video
            // files on iPhone 15 Pro+ have a #base64plist appended by the OS).
            // The native compressor and upload layer treat the fragment as part of
            // the file path and throw "Compression Failed" / file-not-found errors.
            const cleanVideo = selectedVideo?.uri?.includes('#')
                ? { ...selectedVideo, uri: selectedVideo.uri.split('#')[0] }
                : selectedVideo;

            // ── 1. On-device compression (0 → 20 %) ──────────────────────────
            // Uses AVAssetWriter (manual mode) so the bitrate is enforced exactly.
            // Caps resolution at 1080p — handles 4K automatically via maxSize.
            // Falls back to AVAssetExportSession (auto) for spatial/HEVC videos that
            // manual mode cannot handle, then falls back to the original if both fail.
            let videoToUpload = cleanVideo;
            try {
                updateUploadProgress({ pct: 1, label: `Compressing ${activeTab}…` });

                let compressedUri;
                try {
                    compressedUri = await VideoCompressor.compress(
                        cleanVideo.uri,
                        {
                            compressionMethod: 'manual', // AVAssetWriter — respects bitrate exactly
                            maxSize: 1920,               // caps 4K → 1080p
                            bitrate: 8_000_000,          // 8 Mbps
                            minimumFileSizeForCompress: 30,
                        },
                        (progress) => {
                            updateUploadProgress({
                                pct: 1 + Math.round(progress * 19),
                                label: `Compressing ${activeTab}… ${Math.round(progress * 100)}%`,
                            });
                        },
                    );
                } catch (manualErr) {
                    // manual (AVAssetWriter) fails on spatial/stereo video (multi-track)
                    // and some HEVC profiles — retry with auto (AVAssetExportSession).
                    updateUploadProgress({ pct: 1, label: `Compressing ${activeTab}…` });
                    compressedUri = await VideoCompressor.compress(
                        cleanVideo.uri,
                        {
                            compressionMethod: 'auto', // AVAssetExportSession — handles HEVC/spatial
                            maxSize: 1920,
                            minimumFileSizeForCompress: 30,
                        },
                        (progress) => {
                            updateUploadProgress({
                                pct: 1 + Math.round(progress * 19),
                                label: `Compressing ${activeTab}… ${Math.round(progress * 100)}%`,
                            });
                        },
                    );
                }

                videoToUpload = { ...cleanVideo, uri: compressedUri };
                updateUploadProgress({ pct: 20, label: 'Compression done, uploading…' });
            } catch (compressErr) {
                videoToUpload = cleanVideo;
                updateUploadProgress({ pct: 2, label: `Uploading ${activeTab}…` });
            }

            // ── 2. Upload compressed video (20 → ~92 %) ───────────────────────
            updateUploadProgress({ label: `Uploading ${activeTab}…` });
            startFallbackProgress(20, 92, 1);
            const vidRes = await UploadMediaController(
                videoToUpload,
                token,
                (progressEvent) => {
                    if (progressEvent.total) {
                        stopFallbackProgress();
                        const fileFraction = progressEvent.loaded / progressEvent.total;
                        const overallPct = 20 + (fileFraction / total) * 72;
                        updateUploadProgress({ pct: overallPct });
                    }
                },
                uploadType,
            );

            stopFallbackProgress();

            if (vidRes.status !== 'success' || !vidRes.data?.url) {
                const ffmpegOutput = vidRes.errorData?.ffmpeg_output || vidRes.errorData?.error || vidRes.errorData?.aws_error;
                const reason = ffmpegOutput
                    ? `${vidRes.message || 'Video upload failed'}: ${String(ffmpegOutput).slice(0, 220)}`
                    : vidRes.message || vidRes.errorData?.message || 'Video upload failed. Please try again.';
                throw new Error(reason);
            }

            postBody.video_url = vidRes.data.url;
            // Server may return thumbnail_url or thumbnail — check both
            const serverThumbUrl = vidRes.data.thumbnail_url || vidRes.data.thumbnail || null;

            updateUploadProgress({
                done: 1,
                total,
                pct: selectedThumbnail ? 92 : 98,
                label: selectedThumbnail ? 'Uploading thumbnail…' : 'Finalizing upload…',
            });

            // 3. Upload custom thumbnail (if user picked one)
            if (selectedThumbnail) {
                updateUploadProgress({ label: 'Uploading thumbnail…' });
                startFallbackProgress(92, 97, 1);
                const tRes = await UploadMediaController(
                    selectedThumbnail,
                    token,
                    (progressEvent) => {
                        if (progressEvent.total) {
                            stopFallbackProgress();
                            const fileFraction = progressEvent.loaded / progressEvent.total;
                            const overallPct = ((1 + fileFraction) / total) * 90;
                            updateUploadProgress({ pct: overallPct });
                        }
                    },
                    'thumbnail',
                );
                stopFallbackProgress();
                if (tRes.status === 'success' && tRes.data?.url) {
                    postBody.thumbnail = tRes.data.url;
                } else if (serverThumbUrl) {
                    postBody.thumbnail = serverThumbUrl;
                }
                updateUploadProgress({ done: 2, total, pct: 98 });
            } else if (serverThumbUrl) {
                // No custom thumbnail — use server's auto-generated one
                postBody.thumbnail = serverThumbUrl;
            }

            if (activeTab === 'video' && selectedCategory) {
                postBody.category_id = selectedCategory;
            }

        }

        // ── PUBLISH ────────────────────────────────────────────────────────
        updateUploadProgress({ phase: 'publishing', pct: 99, label: 'Publishing your post…' });

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
                // Always prepend to the Following (community) feed so the user
                // sees their own post there immediately
                useStore.getState().prependFeedsToList('communityFeeds', [createdPost]);
                // Open the newly created post
                navigate('CommentScreen', { feedId: createdPost.id, initialPost: createdPost });
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
        stopFallbackProgress();
        try {
            const current = useStore.getState().activeUpload;
            if (current?.phase === 'uploading') useStore.getState().updateUploadProgress({ pct: Math.max(current.pct ?? 0, 1) });
        } catch {}
        useStore.getState().failUpload(err?.message || 'Something went wrong. Please try again.');
    }
}

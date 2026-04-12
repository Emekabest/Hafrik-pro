/**
 * verificationController
 * Handles verification status fetch and document submission.
 *
 * Endpoints:
 *   GET  /api/v1/verification/status.php?node_type=user
 *        → returns status: "verified" | "pending" | "declined" | "request"
 *
 *   POST /api/v1/verification/submit.php
 *        → multipart/form-data with passport + selfie fields
 */

import apiClient from '../api/apiClient';

// Map API status strings → internal UI status values used by the screens
const mapStatus = (apiStatus) => {
  switch (apiStatus) {
    case 'verified':  return 'approved';
    case 'pending':   return 'pending';
    case 'declined':  return 'rejected';
    case 'request':   return 'not_submitted';
    default:          return 'not_submitted';
  }
};

/**
 * Fetch the current verification status for the authenticated user.
 * Returns one of: not_submitted | pending | approved | rejected
 */
export const getVerificationStatus = async () => {
  try {
    const res = await apiClient.get('/verification/status.php?node_type=user');
    const data = res.data?.data ?? res.data ?? {};
    const raw  = data?.status ?? data ?? 'not_submitted';
    return {
      status:       mapStatus(typeof raw === 'string' ? raw : raw?.status ?? 'not_submitted'),
      rejectedNote: data?.rejected_note ?? data?.note ?? '',
    };
  } catch {
    return { status: 'not_submitted', rejectedNote: '' };
  }
};

/**
 * Submit verification documents.
 * @param {{ uri: string, mimeType?: string, fileName?: string }} passportAsset
 * @param {{ uri: string, mimeType?: string, fileName?: string }} selfieAsset
 */
export const submitVerification = async (token, passportAsset, selfieAsset) => {
  const toExt = (mime) =>
    (mime || 'image/jpeg').split('/')[1]?.replace('jpeg', 'jpg').replace('heic', 'jpg').replace('heif', 'jpg') ?? 'jpg';

  const passportExt = toExt(passportAsset?.mimeType);
  const selfieExt   = toExt(selfieAsset?.mimeType);

  const form = new FormData();
  form.append('passport', {
    uri:  passportAsset.uri,
    name: passportAsset.fileName || `passport_${Date.now()}.${passportExt}`,
    type: passportAsset.mimeType || 'image/jpeg',
  });
  form.append('selfie', {
    uri:  selfieAsset.uri,
    name: selfieAsset.fileName || `selfie_${Date.now()}.${selfieExt}`,
    type: selfieAsset.mimeType || 'image/jpeg',
  });

  // Do NOT set Content-Type manually — React Native's XHR must auto-set it
  // with the correct multipart boundary, otherwise the server can't parse the files.
  const res = await apiClient.post('/verification/submit.php', form, {
    transformRequest: (data, headers) => {
      delete headers['Content-Type'];
      return data;
    },
  });

  if (res.data?.status === 'error' || res.data?.success === false) {
    throw new Error(res.data?.message || 'Submission failed. Please try again.');
  }

  return res.data;
};

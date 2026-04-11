/**
 * verificationController
 * Handles verification status fetch and document submission.
 *
 * Endpoints (assumed):
 *   GET  https://hafrik.com/api/v1/users/verify.php          → { status, submitted_at, reviewed_at }
 *   POST https://hafrik.com/api/v1/users/verify.php          → { success, message }
 */

import axios from "axios";

const BASE = 'https://hafrik.com/api/v1/users/verify.php';

/**
 * Fetch the current verification status for the authenticated user.
 * Returns one of: not_submitted | pending | approved | rejected
 */
export const getVerificationStatus = async (token) => {
  try {
    const res = await fetch(BASE, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return {
      status:       json?.data?.status       ?? json?.status       ?? 'not_submitted',
      submittedAt:  json?.data?.submitted_at  ?? json?.submitted_at  ?? null,
      reviewedAt:   json?.data?.reviewed_at   ?? json?.reviewed_at   ?? null,
      rejectedNote: json?.data?.rejected_note ?? json?.rejected_note ?? '',
    };
  } catch {
    return { status: 'not_submitted', submittedAt: null, reviewedAt: null, rejectedNote: '' };
  }
};

/**
 * Submit verification documents.
 * @param {string} token
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

  const res = await fetch(BASE, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || 'Submission failed. Please try again.');
  }
  return json;
};


export const SubmitVerificationController = async(token, body) => {
  try {
      const API_URL = `https://hafrik.com/api/v1/verification/submit.php`;
      const response = await axios.post(API_URL, body, {
          headers: {  
            Authorization: `Bearer ${token}`
          },
      })

      console.log(response.data);

      return { status: response.data.status, message: response.data.message }

  } catch (error) {
    console.log('Error submitting verification:', error);
  }

}


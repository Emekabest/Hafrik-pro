import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from '../api/apiClient';

const GetFeedsController = async (url, token, page = 1) => {

  const selectedCountry = JSON.parse(await AsyncStorage.getItem('selected_country'));

  // ✅ Fix: use URL object so existing params (like ?content=videos) are preserved
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('page', page);

  // Accept both country_id (normalised) and id (raw API shape)
  const countryId = selectedCountry?.country_id ?? selectedCountry?.id;
  if (countryId && countryId !== 'all') {
    parsedUrl.searchParams.set('country_id', countryId);
  }

  const API_URL = parsedUrl.toString();

  try {
    const response = await apiClient.get(API_URL, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    
    const json = response.data;
    let feedsArray = [];
    let meta = null;
    
    if (json?.status === "success") {
      const envelope = json?.data;

      // Extract pagination metadata from the unified API envelope
      if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)) {
        meta = {
          page:       Number(envelope.page)        || page,
          totalPages: Number(envelope.total_pages)  || 1,
          total:      Number(envelope.total)         || 0,
          newestId:   envelope.newest_id             ?? null,
          newCount:   Number(envelope.new_count)     || 0,
          limit:      Number(envelope.limit)         || 10,
          get:        envelope.get                   ?? null,
        };
      }

      // Nested structure: json.data.data contains the feeds array
      if (Array.isArray(envelope?.data)) {
        feedsArray = envelope.data;
      }
      // Flat structure: json.data is the feeds array directly
      else if (Array.isArray(envelope)) {
        feedsArray = envelope;
      }
    } else if (Array.isArray(json?.data?.data)) {
      feedsArray = json.data.data;
    } else if (Array.isArray(json?.data)) {
      feedsArray = json.data;
    } else if (Array.isArray(json)) {
      feedsArray = json;
    }
    
    return { status: response.status, data: feedsArray, meta };
  } catch (error) {
    console.log("❌ REQUEST FAILED:", error?.response?.status, error?.message);
    console.log("❌ ERROR DETAILS:", error?.response?.data);
    return { status: error?.response?.status ?? 500, data: [], meta: null };
  }

};

export default GetFeedsController;
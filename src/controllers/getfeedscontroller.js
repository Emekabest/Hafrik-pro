import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const GetFeedsController = async (url, token, page = 1) => {

  const selectedCountry = JSON.parse(await AsyncStorage.getItem('selected_country'));

  // ✅ Fix: use URL object so existing params (like ?content=videos) are preserved
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.set('page', page);

  if (selectedCountry?.country_id && selectedCountry.country_id !== 'all') {
    parsedUrl.searchParams.set('country_id', selectedCountry.country_id);
  }

  const API_URL = parsedUrl.toString();

  // (debug log removed)

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
      },
    });
    
    // NOTE: Avoid logging full payload here (can be extremely large)
    
    // API returns { status: "success", data: { page, limit, content, data: [...] } }
    // The actual feeds array is at response.data.data.data
    const json = response.data;
    let feedsArray = [];
    
    if (json?.status === "success") {
      // Nested structure: json.data.data contains the feeds array
      if (Array.isArray(json?.data?.data)) {
        feedsArray = json.data.data;
      }
      // Flat structure: json.data is the feeds array directly
      else if (Array.isArray(json?.data)) {
        feedsArray = json.data;
      }
    } else if (Array.isArray(json?.data?.data)) {
      feedsArray = json.data.data;
    } else if (Array.isArray(json?.data)) {
      feedsArray = json.data;
    } else if (Array.isArray(json)) {
      feedsArray = json;
    }
    
    // (debug log removed)
    
    return { status: response.status, data: feedsArray };
  } catch (error) {
    console.log("❌ REQUEST FAILED:", error?.response?.status, error?.message);
    console.log("❌ ERROR DETAILS:", error?.response?.data);
    return { status: error?.response?.status ?? 500, data: [] };
  }

};

export default GetFeedsController;
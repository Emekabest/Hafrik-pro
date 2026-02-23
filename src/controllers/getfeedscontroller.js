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

  // ✅ Log to confirm full URL with all params
  console.log("🔍 FULL URL BEING CALLED:", API_URL);

  try {
    const response = await axios.get(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
      },
    });
    return { status: response.status, data: response.data.data.data };
  } catch (error) {
    console.log("❌ REQUEST FAILED:", error?.response?.status, error?.message);
    return { status: error?.response?.status, data: error };
  }

};

export default GetFeedsController;
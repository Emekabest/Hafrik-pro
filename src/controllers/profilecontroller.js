import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from '../api/apiClient';

const API_BASE = "https://hafrik.com/api/v1";
const EDIT_PROFILE_URL = `${API_BASE}/users/update_profile.php`;
const PROFILE_FIELDS_URL = `${API_BASE}/auth/profile_field.php`;

const firstDefined = (...values) => values.find(
    (value) => value !== undefined && value !== null && value !== ""
);

const toNumberOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normaliseProfileUser = (payload) => {
    const raw = payload?.user || payload || {};

    const firstName = firstDefined(raw.user_firstname, raw.first_name, raw.firstname, "");
    const lastName = firstDefined(raw.user_lastname, raw.last_name, raw.lastname, "");
    const username = firstDefined(raw.user_name, raw.username, raw.name, "");
    const email = firstDefined(raw.user_email, raw.email, "");
    const phone = firstDefined(raw.user_phone, raw.phone, raw.mobile, "");
    const biography = firstDefined(raw.user_biography, raw.biography, raw.bio, raw.about_me, raw.about, "");
    const website = firstDefined(raw.user_website, raw.website, "");
    const countryId = firstDefined(raw.user_country, raw.country_id, raw.country);
    const countryName = firstDefined(raw.user_country_name, raw.country_name, raw.country_title, raw.country_label, "");
    const currentCity = firstDefined(raw.user_current_city, raw.current_city, raw.city, "");
    const hometown = firstDefined(raw.user_hometown, raw.hometown, "");
    const gender = firstDefined(raw.user_gender, raw.gender);
    const relationship = firstDefined(raw.user_relationship, raw.relationship, "");
    const birthdate = firstDefined(raw.user_birthdate, raw.birthdate, raw.birth_date, "");

    return {
        ...raw,
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        phone,
        gender: toNumberOrNull(gender),
        birthdate,
        bio: biography,
        about: biography,
        about_me: biography,
        biography,
        website,
        country: countryName || countryId || "",
        country_id: toNumberOrNull(countryId),
        country_name: countryName,
        user_country: toNumberOrNull(countryId) ?? countryId ?? "",
        current_city: currentCity,
        hometown,
        relationship,
        work_title: firstDefined(raw.user_work_title, raw.work_title, ""),
        work_place: firstDefined(raw.user_work_place, raw.work_place, ""),
        work_url: firstDefined(raw.user_work_url, raw.work_url, ""),
        edu_school: firstDefined(raw.user_edu_school, raw.edu_school, ""),
        edu_major: firstDefined(raw.user_edu_major, raw.edu_major, ""),
        edu_class: firstDefined(raw.user_edu_class, raw.edu_class, ""),
        facebook: firstDefined(raw.user_social_facebook, raw.facebook, ""),
        instagram: firstDefined(raw.user_social_instagram, raw.instagram, ""),
        twitter: firstDefined(raw.user_social_twitter, raw.twitter, ""),
        youtube: firstDefined(raw.user_social_youtube, raw.youtube, ""),
        linkedin: firstDefined(raw.user_social_linkedin, raw.linkedin, ""),
        twitch: firstDefined(raw.user_social_twitch, raw.twitch, ""),
    };
};

const normaliseSelectableOption = (item, index, fallbackPrefix) => {
    if (item === null || item === undefined) return null;

    if (typeof item === "string" || typeof item === "number") {
        return {
            id: item,
            label: String(item),
        };
    }

    const id = firstDefined(item.id, item.value, item.key, index + 1);
    const label = firstDefined(item.label, item.name, item.title, item.value, `${fallbackPrefix} ${index + 1}`);

    return {
        ...item,
        id,
        label,
    };
};

const normaliseProfileFieldResponse = (payload) => {
    const raw = payload?.data || payload || {};

    const countries = Array.isArray(raw.countries)
        ? raw.countries.map((country) => ({
            ...country,
            id: firstDefined(country.id, country.country_id),
            name: firstDefined(country.name, country.country_name, ""),
            code: firstDefined(country.code, country.country_code, ""),
            phone_code: firstDefined(country.phone_code, country.phoneCode, country.dial_code, ""),
        })).filter((country) => country.id !== undefined && country.id !== null)
        : [];

    const genders = Array.isArray(raw.genders)
        ? raw.genders.map((item, index) => normaliseSelectableOption(item, index, "Gender")).filter(Boolean)
        : [];

    const relationships = Array.isArray(raw.relationships)
        ? raw.relationships.map((item, index) => normaliseSelectableOption(item, index, "Relationship")).filter(Boolean)
        : [];

    return {
        countries,
        genders,
        relationships,
    };
};

const ProfileHeaderController = async(token, userId = null) => {
    try {
        const url = userId
            ? `https://hafrik.com/api/v1/users/profile.php?user_id=${userId}`
            : 'https://hafrik.com/api/v1/users/profile.php';
        const response = await apiClient.get(url);
        // Normalize: handle both { data: { user, counts, viewer } } and { user, counts, viewer }
        const raw = response.data?.data ?? response.data;

        // Flatten nested location object into the user before normalising
        let normalizedUser = raw?.user;
        if (normalizedUser) {
            const loc = normalizedUser.location || {};
            normalizedUser = normaliseProfileUser({
                ...normalizedUser,
                current_city: normalizedUser.current_city || loc.current_city || '',
                hometown:     normalizedUser.hometown     || loc.hometown     || '',
                country_id:   normalizedUser.country_id   || loc.country_id   || '',
            });
        }

        const data = raw ? { ...raw, user: normalizedUser } : null;
        return { status: response.status, data };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}


const getProfileAvatarController = async(token) => {

    try {
        
        const profileData = await ProfileHeaderController(token);

        return {status: profileData.status, data: profileData.data?.user || null};


    } catch (error) {

        console.log("Error fetching profile avatar:", error);
        return {status: error.response?.status || 500, data: null};
    }

}


const UpdateProfileController = async(token, newProfileData) => {
    try {
        // Build a clean JSON payload — only include non-empty fields
        let payload = {};
        const source = newProfileData instanceof FormData
            ? Object.fromEntries(newProfileData.entries())
            : newProfileData;
        Object.entries(source).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                payload[key] = value;
            }
        });

        const response = await apiClient.post(EDIT_PROFILE_URL, payload);

        // Re-fetch from API after update — never trust local state (per API spec)
        const refreshed = await ProfileHeaderController(token);
        const freshUser = refreshed.data?.user ?? response.data?.data ?? response.data;

        return {
            status: response.status,
            message: response.data?.message || 'Profile updated successfully',
            data: normaliseProfileUser(freshUser),
        };
    } catch (error) {
        return {
            status: error.response?.status || 500,
            message: error.response?.data?.message || 'Failed to update profile',
            data: null,
        };
    }
}

const GetEditableProfileController = async(token) => {
    try {
        const res = await ProfileHeaderController(token);
        if (!res.data) {
            return {
                status: res.status,
                message: 'Failed to load profile',
                data: null,
            };
        }
        // res.data is { user, counts, viewer } — extract the user object
        const user = res.data?.user ?? res.data;
        return {
            status: res.status,
            message: '',
            data: normaliseProfileUser(user),
        };
    } catch (error) {
        return {
            status: 500,
            message: 'Failed to load editable profile',
            data: null,
        };
    }
}

const GetProfileFieldController = async(token) => {
    try {
        const response = await apiClient.get(PROFILE_FIELDS_URL);

        return {
            status: response.status,
            message: response.data?.message || '',
            data: normaliseProfileFieldResponse(response.data?.data || response.data),
        };
    } catch (error) {
        return {
            status: error.response?.status || 500,
            message: error.response?.data?.message || 'Failed to load profile field metadata',
            data: null,
        };
    }
}


const UploadProfileImageController = async(media, token, api) => {

    try{
              // Prepare form data
          const formData = new FormData();

        //   formData.append('type', media.fileType);
          formData.append('file', {
            uri: media.uri,
            type: media.mimeType || 'image/jpeg',
            name: media.fileName || `upload_${Date.now()}.jpg`,
          });


        

          const response = await apiClient.post(api, formData, {
             headers: { 'Content-Type': 'multipart/form-data' },
        })

        console.log("Upload response:", response.data);

        const apiStatus = response.data?.status;
        const normalizedStatus =
            apiStatus === 'success' || apiStatus === 1 || apiStatus === true || response.status === 200
                ? 'success'
                : 'error';
        const data = response.data?.data ?? response.data;

        return { status: normalizedStatus, data };

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }
}


const ProfileTimelineController = async(API_URL, token, page = 1) => {

    const profileTimelineFilter = await AsyncStorage.getItem("profile_timeline_filter") || "all";

    // Build unified feed endpoint: ?get=posts_profile&id=USER_ID
    // API_URL already has ?user_id=XX  — extract the user_id and map to the unified endpoint
    let mainUrl;
    try {
      const parsed = new URL(API_URL);
      const userId = parsed.searchParams.get('user_id') || parsed.searchParams.get('id');
      const unified = new URL('https://hafrik.com/api/v1/feed/list.php');
      unified.searchParams.set('get', profileTimelineFilter === 'media' ? 'posts_profile_media' : 'posts_profile');
      if (userId) unified.searchParams.set('id', userId);
      unified.searchParams.set('page', page);
      if (profileTimelineFilter && profileTimelineFilter !== 'all' && profileTimelineFilter !== 'media') {
        unified.searchParams.set('filter', profileTimelineFilter);
      }
      mainUrl = unified.toString();
    } catch {
      // Fallback to legacy URL construction
      const urlWithFilter = `${API_URL}&filter=${profileTimelineFilter}`;
      mainUrl = `${urlWithFilter}&page=${page}`;
    }


    try {
        const response = await apiClient.get(mainUrl);

        // Handle both unified API shape and legacy shape
        const json = response.data;
        let feedsArray;
        if (json?.status === "success" && Array.isArray(json?.data?.data)) {
          feedsArray = json.data.data;
        } else if (Array.isArray(json?.data?.data)) {
          feedsArray = json.data.data;
        } else if (Array.isArray(json?.data)) {
          feedsArray = json.data;
        } else {
          feedsArray = json?.data ?? [];
        }

        return {status: response.status, data: feedsArray};
    } catch (error) {
        return {status: error.response?.status || 500, data: null};
    }

}

const FollowersController = async(token, userId, path) => {

    try{
        
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/${path}?user_id=${userId}`)

        return {status: response.status, data: response.data.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }

}

const ProfileProductsController = async(token, userId, page = 1) => {

     try{
        
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/profile_products.php?user_id=${userId}&page=${page}`)

        return {status: response.status, data: response.data.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }

}


const ProfilePagesController = async(token, userId, page = 1) => {

     try{
        
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/profile_pages.php?user_id=${userId}&page=${page}`)

        return {status: response.status, data: response.data.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }

}


const UserFollowingController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/user_following.php?user_id=${userId}&page=${page}&limit=${limit}`);
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserFollowersController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/user_followers.php?user_id=${userId}&page=${page}&limit=${limit}`);
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserMediaController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/user_media.php?user_id=${userId}&page=${page}&limit=${limit}`);
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserCommunitiesController = async(token, userId, page = 1, limit = 5) => {
    try {
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/user_communities.php?user_id=${userId}&page=${page}&limit=${limit}`);
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserReelsController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await apiClient.get(`https://hafrik.com/api/v1/users/user_reels.php?user_id=${userId}&page=${page}&limit=${limit}`);
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}


export  { 
    ProfileHeaderController,
    getProfileAvatarController, 
    GetEditableProfileController,
    GetProfileFieldController,
    UpdateProfileController as updateProfileController, 
    UploadProfileImageController, 
    ProfileTimelineController,
    FollowersController,
    ProfileProductsController,
    ProfilePagesController,
    UserFollowingController,
    UserFollowersController,
    UserMediaController,
    UserCommunitiesController,
    UserReelsController,
};
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect } from "react";

const ProfileHeaderController = async(token) => {
    
    try{
        const response = await axios.get("https://hafrik.com/api/v1/users/profile.php", {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });


        return {status: response.status, data: response.data.data};
    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
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
    

    try{
        const response = await axios.post("https://hafrik.com/api/v1/users/update_profile.php", newProfileData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });

        return {status: response.status, data: response.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }
}


const UploadProfileImageController = async(media, token, api) => {

    try{
              // Prepare form data
          const formData = new FormData();

        //   formData.append('type', media.fileType);
          formData.append('file', {
            uri: media.uri,
            type:  "image/jpeg",
            name: media.fileName
          });


        

          const response = await axios.post(api, formData, {
             headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
             },
        })

        console.log("Upload response:", response.data);


        return {status:response.data.status, data:response.data.data}

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
        const response = await axios.get(mainUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

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
        
        const response = await axios.get(`https://hafrik.com/api/v1/users/${path}?user_id=${userId}`,{
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        })

        return {status: response.status, data: response.data.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }

}

const ProfileProductsController = async(token, userId, page = 1) => {

     try{
        
        const response = await axios.get(`https://hafrik.com/api/v1/users/profile_products.php?user_id=${userId}&page=${page}`,{
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        })

        return {status: response.status, data: response.data.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }

}


const ProfilePagesController = async(token, userId, page = 1) => {

     try{
        
        const response = await axios.get(`https://hafrik.com/api/v1/users/profile_pages.php?user_id=${userId}&page=${page}`,{
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        })

        return {status: response.status, data: response.data.data.data};

    }
    catch(error){

        return {status: error.response?.status || 500, data: null};
    }

}


const UserFollowingController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await axios.get(`https://hafrik.com/api/v1/users/user_following.php?user_id=${userId}&page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserFollowersController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await axios.get(`https://hafrik.com/api/v1/users/user_followers.php?user_id=${userId}&page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserMediaController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await axios.get(`https://hafrik.com/api/v1/users/user_media.php?user_id=${userId}&page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserCommunitiesController = async(token, userId, page = 1, limit = 5) => {
    try {
        const response = await axios.get(`https://hafrik.com/api/v1/users/user_communities.php?user_id=${userId}&page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}

const UserReelsController = async(token, userId, page = 1, limit = 10) => {
    try {
        const response = await axios.get(`https://hafrik.com/api/v1/users/user_reels.php?user_id=${userId}&page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        return { status: response.status, data: response.data?.data?.data || response.data?.data || [] };
    } catch (error) {
        return { status: error.response?.status || 500, data: null };
    }
}


export  { 
    ProfileHeaderController,
    getProfileAvatarController, 
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
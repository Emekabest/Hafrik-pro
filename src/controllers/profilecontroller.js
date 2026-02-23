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
    const urlWithFilter = `${API_URL}&filter=${profileTimelineFilter}`;
    const mainUrl =  `${urlWithFilter}&page=${page}`;


    try {
        const response = await axios.get(mainUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });


        return {status: response.status, data: response.data.data};
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



export  { 
    ProfileHeaderController,
    getProfileAvatarController, 
    UpdateProfileController as updateProfileController, 
    UploadProfileImageController, 
    ProfileTimelineController,
    FollowersController,
    ProfileProductsController,
    ProfilePagesController
};
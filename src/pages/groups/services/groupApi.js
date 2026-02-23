import axios from "axios";

const BASE_URL = "https://hafrik.com/api/v1";

/* =================================
   AXIOS INSTANCE
================================= */

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

/* =================================
   HELPER (optional auth header)
   If you use token auth, attach it here
================================= */

// Example if you store token somewhere
// api.interceptors.request.use(async (config) => {
//   const token = await getToken();
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

/* =================================
   GROUP LIST
   GET /communities/list.php
================================= */

export const getGroups = async (page = 1, limit = 10, filters = {}) => {
  try {
    const params = {
      page,
      limit,
      ...filters,
    };

    const response = await api.get("/communities/list.php", { params });

    return response.data;

  } catch (error) {
    console.log("GROUP API ERROR (getGroups):", error?.response?.data || error);
    throw error;
  }
};



/* =========================
   GROUP DETAILS
   GET /communities/view.php?group_id=
========================= */

export const getGroupDetails = async (groupId) => {
  try {
    const response = await api.get("/communities/view.php", {
      params: { group_id: groupId },
    });

    console.log("DETAIL RESPONSE:", response.data);

    return response.data;

  } catch (error) {
    console.log(
      "GROUP API ERROR (getGroupDetails):",
      error?.response?.data || error
    );
    throw error;
  }
};


/* =========================
   GROUP FEED
   GET /communities/group_feed.php
========================= */

export const getGroupFeed = async (groupId, page = 1, limit = 10) => {
  try {
    const response = await api.get("/communities/group_feed.php", {
      params: {
        group_id: groupId,
        page,
        limit,
      },
    });

    console.log("FEED RESPONSE:", response.data);

    return response.data;

  } catch (error) {
    console.log(
      "GROUP API ERROR (getGroupFeed):",
      error?.response?.data || error
    );
    throw error;
  }
};
/* =================================
   GROUP MEMBERS
   GET /groups/members.php
================================= */

export const getGroupMembers = async (groupId, page = 1, limit = 20) => {
  try {
    const response = await api.get("/communities/members.php", {
      params: {
        group_id: groupId,
        page,
        limit,
      },
    });

    return response.data;

  } catch (error) {
    console.log("GROUP API ERROR (getGroupMembers):", error?.response?.data || error);
    throw error;
  }
};

/* =================================
   JOIN GROUP
   POST /groups/join.php
================================= */

export const joinGroup = async (groupId) => {
  try {
    const response = await api.post("/communities/join.php", {
      group_id: groupId,
    });

    return response.data;

  } catch (error) {
    console.log("GROUP API ERROR (joinGroup):", error?.response?.data || error);
    throw error;
  }
};

/* =================================
   LEAVE GROUP
   POST /groups/leave.php
================================= */

export const leaveGroup = async (groupId) => {
  try {
    const response = await api.post("/communities/leave.php", {
      group_id: groupId,
    });

    return response.data;

  } catch (error) {
    console.log("GROUP API ERROR (leaveGroup):", error?.response?.data || error);
    throw error;
  }
};

/* =================================
   CREATE GROUP
   POST /groups/create.php
================================= */

export const createGroup = async (payload) => {
  try {
    const response = await api.post("/communities/create.php", payload);

    return response.data;

  } catch (error) {
    console.log("GROUP API ERROR (createGroup):", error?.response?.data || error);
    throw error;
  }
};
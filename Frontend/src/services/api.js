 
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

// Create Axios instance
const api = axios.create({
  baseURL: API_URL,
});

// --------------------------------------------------
// REQUEST INTERCEPTOR
// Automatically adds Access Token to every request
// --------------------------------------------------

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --------------------------------------------------
// RESPONSE INTERCEPTOR
// Automatically refreshes Access Token when expired
// --------------------------------------------------

api.interceptors.response.use(
  // If response is successful, return it normally
  (response) => {
    return response;
  },

  // If response has an error
  async (error) => {

    const originalRequest = error.config;

    // Check if Django returned 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {

      originalRequest._retry = true;

      try {

        const refreshToken =
          localStorage.getItem("refreshToken");

        // No refresh token available
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Ask Django for a new access token
        const response = await axios.post(
          `${API_URL}/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        // Get new access token
        const newAccessToken =
          response.data.access;

        // Save new access token
        localStorage.setItem(
          "accessToken",
          newAccessToken
        );

        // Add new token to original request
        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        // Retry the original request
        return api(originalRequest);

      } catch (refreshError) {

        console.log(
          "Refresh token expired or invalid"
        );

        // Remove authentication data
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        // Send user back to login
        window.location.href = "/";

        return Promise.reject(refreshError);
      }
    }

    // If error is not 401
    return Promise.reject(error);
  }
);

export default api;
 

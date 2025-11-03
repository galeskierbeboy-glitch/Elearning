import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Export base API url for other modules to construct absolute resource URLs
export const API_BASE = API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle auth errors
  // Create an array of paths that should not trigger auth refresh
  const noAuthRefreshPaths = [
    '/users/login',
    '/users/register',
    '/users/dev',
    '/users/profile'
  ];

  // Add response interceptor to handle auth errors
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const token = localStorage.getItem('token');
      const shouldSkipAuthRefresh = noAuthRefreshPaths.some(path => originalRequest.url.includes(path));

      // Handle 401s for authenticated requests that aren't already retrying
      if (error.response?.status === 401 && token && !originalRequest._retry && !shouldSkipAuthRefresh) {
        originalRequest._retry = true;
      
        try {
          // Check if the profile endpoint also returns 401
          const response = await api.get('/users/profile');
          if (response.data) {
            // Token is still valid, retry the original request
            return api(originalRequest);
          }
        } catch (validationError) {
          if (validationError.response?.status === 401) {
            // Profile check confirms token is invalid
            console.warn('Token validation failed, logging out:', {
              url: originalRequest.url,
              method: originalRequest.method
            });
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(error);
          }
          // If profile check failed for other reasons, return original error
          console.error('Profile validation failed:', validationError);
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }
  );

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/users/login', { email, password });
    if (response.data.token) {
      // Normalize user object shape for the frontend
      const rawUser = response.data.user || {};
      const rawId = rawUser.user_id ?? rawUser.id ?? rawUser._id;
      const normalizedUser = {
        id: rawId !== undefined && rawId !== null ? Number(rawId) : undefined,
        // keep both fields to be resilient across frontend code
        full_name: rawUser.full_name ?? rawUser.name ?? rawUser.fullName,
        name: rawUser.full_name ?? rawUser.name ?? rawUser.fullName,
        email: rawUser.email,
        role: rawUser.role,
        created_at: rawUser.created_at ?? rawUser.createdAt
      };
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/users/register', userData);
    if (response.data.token) {
      const rawUser = response.data.user || {};
      const rawId2 = rawUser.user_id ?? rawUser.id ?? rawUser._id;
      const normalizedUser = {
        id: rawId2 !== undefined && rawId2 !== null ? Number(rawId2) : undefined,
        full_name: rawUser.full_name ?? rawUser.name ?? rawUser.fullName,
        name: rawUser.full_name ?? rawUser.name ?? rawUser.fullName,
        email: rawUser.email,
        role: rawUser.role,
        created_at: rawUser.created_at ?? rawUser.createdAt
      };
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getProfile: async () => {
    return api.get('/users/profile');
  }
};

export const courseService = {
  getAllCourses: async () => {
    return api.get('/courses');
  },

  getCourseById: async (id) => {
    return api.get(`/courses/${id}`);
  },

  createCourse: async (courseData) => {
    return api.post('/courses', courseData);
  },
  enrollInCourse: async (courseId) => {
    return api.post(`/courses/${courseId}/enroll`);
  },

  // Unenroll (DELETE /courses/:id/enroll)
  unenrollFromCourse: async (courseId) => {
    return api.delete(`/courses/${courseId}/enroll`);
  },

  getEnrollments: async () => {
    // Backend modular routes expose /courses/enrolled
    return api.get('/courses/enrolled');
  },

  // Delete a course (instructor/admin)
  deleteCourse: async (courseId) => {
    return api.delete(`/courses/${courseId}`);
  }
};

export const userService = {
  getAllUsers: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      return api.get('/users/all', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/users/${userId}/role`, { role });
    // If the updated user is the current user, update stored token and user info
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === userId && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        role: response.data.user.role
      }));
    }
    return response;
  }
  ,
  deleteUser: async (userId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    const response = await api.delete(`/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // If the deleted user is the current user, log them out
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === userId) {
      authService.logout();
      window.location.href = '/login';
    }

    return response;
  }
  ,
  changePassword: async (payload) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    const response = await api.post('/users/change-password', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // If server returns new token, update storage
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  }
  ,
  requestInvite: async (payload) => {
    return api.post('/users/invite-request', payload);
  }
  ,
  listInviteRequests: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    return api.get('/users/invite-requests', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  },
  approveInviteRequest: async (id) => {
    return api.put(`/users/invite-requests/${id}/approve`);
  },
  rejectInviteRequest: async (id) => {
    return api.put(`/users/invite-requests/${id}/reject`);
  }
  ,
  applyInviteToken: async (token) => {
    return api.post('/users/apply-invite', { token });
  }
};

export default api;
import axios from 'axios';

const API = axios.create({
  baseURL: 'https://seeker-smart-education.onrender.com',
});

// Attach JWT token automatically if logged in
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('seeker_token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;